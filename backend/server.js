const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { prisma } = require('./lib/prisma');
const {
  DEMO_PERSONAS,
  generatePickupCode,
  pickupCodeHash,
  encryptPickupCode,
  decryptPickupCode,
  hashPassword,
  verifyPassword,
} = require('./lib/auth-helpers');
const { assessSafetySignals, evaluateFssaiCompliance } = require('./lib/fssai');
const { rankRecipientsForDonation } = require('./lib/matching-engine');
const { executeFailedPickupRecovery, runAutomatedRecoveryCheck } = require('./lib/recovery-engine');

const app = express();
const PORT = process.env.PORT || 5000;
function loadSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
  }
  const secretPath = path.join(os.homedir(), '.breadcycle-session-secret');
  try {
    const secret = fs.readFileSync(secretPath, 'utf8').trim();
    if (secret.length < 32) throw new Error('Stored BreadCycle session secret is invalid.');
    return secret;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const secret = crypto.randomBytes(48).toString('hex');
    try {
      fs.writeFileSync(secretPath, secret, { flag: 'wx', mode: 0o600 });
      return secret;
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
      return fs.readFileSync(secretPath, 'utf8').trim();
    }
  }
}
const SESSION_SECRET = loadSessionSecret();
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGINS) {
  throw new Error('FRONTEND_ORIGINS must be configured in production.');
}
const SESSION_COOKIE = 'breadcycle_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const pickupSecret = SESSION_SECRET;
const rateLimitBuckets = new Map();

app.use(cors({
  origin: (origin, callback) => {
    const defaultOrigins = process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001';
    const configured = (process.env.FRONTEND_ORIGINS || defaultOrigins)
      .split(',').map((value) => value.trim()).filter(Boolean);
    if (!origin || configured.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

function rateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const now = Date.now();
    if (rateLimitBuckets.size > 10000) {
      for (const [key, bucket] of rateLimitBuckets) {
        if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
      }
    }
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    return next();
  };
}

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: 'auth' });
const pickupRateLimit = rateLimit({ windowMs: 60 * 1000, max: 8, keyPrefix: 'pickup-verify' });

async function createSessionToken(userId) {
  const sessionId = crypto.randomUUID();
  const payload = Buffer.from(JSON.stringify({
    userId,
    sessionId,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const token = `${payload}.${signature}`;
  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  return token;
}

function readSession(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof session.userId === 'string' && typeof session.sessionId === 'string' &&
      session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  };
}

function safeUser(user) {
  const { passwordHash, ...result } = user;
  return result;
}

function safeReservation(reservation) {
  if (!reservation) return reservation;
  const { pickupCode, pickupCodeEncrypted, ...safe } = reservation;
  return safe;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function cancelPendingReservationsForSafety(tx, donationId, message) {
  const reservations = await tx.reservation.findMany({
    where: { donationId, status: 'PENDING' },
    select: { id: true, userId: true, reservedQuantity: true },
  });
  if (reservations.length === 0) return;

  await tx.reservation.updateMany({
    where: { id: { in: reservations.map(({ id }) => id) }, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });
  await tx.donation.update({
    where: { id: donationId },
    data: { remainingQuantity: { increment: reservations.reduce((sum, item) => sum + item.reservedQuantity, 0) } },
  });
  await tx.notification.createMany({
    data: [...new Set(reservations.map(({ userId }) => userId))].map((userId) => ({
      userId,
      title: 'Pickup paused for a safety review',
      message,
      type: 'ALERT',
    })),
  });
}

// Resolve identity only from a valid signed session; never infer a user from a missing cookie.
async function getActiveUser(req) {
  const token = req.cookies[SESSION_COOKIE];
  const session = readSession(token);
  if (!session) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const activeSession = await prisma.userSession.findFirst({
    where: {
      id: session.sessionId,
      userId: session.userId,
      tokenHash,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
    select: { id: true },
  });
  if (!activeSession) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      restaurant: true,
      ngo: true,
      volunteer: true,
    },
  });
}

// ----------------------------------------------------------------------
// 1. AUTH & PERSONA SESSIONS
// ----------------------------------------------------------------------
app.get('/api/auth/session', async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json({
      user: user ? safeUser(user) : null,
      demoMode: DEMO_MODE,
      ...(DEMO_MODE ? { demoPersonas: DEMO_PERSONAS } : {}),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, name, role, phone, businessName, fssaiLicense, address, registrationNumber } = req.body;
    const selectedRole = role;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || typeof name !== 'string' ||
        !email.trim() || !name.trim() || name.trim().length > 100 || password.length < 8 || password.length > 128 ||
        !['INDIVIDUAL', 'RESTAURANT', 'NGO'].includes(selectedRole) ||
        (phone != null && (typeof phone !== 'string' || phone.trim().length > 32)) ||
        (selectedRole === 'RESTAURANT' && (typeof businessName !== 'string' || !businessName.trim() ||
          typeof fssaiLicense !== 'string' || !fssaiLicense.trim() || typeof address !== 'string' || !address.trim())) ||
        (selectedRole === 'NGO' && (typeof businessName !== 'string' || !businessName.trim() ||
          typeof registrationNumber !== 'string' || !registrationNumber.trim()))) {
      return res.status(400).json({ error: 'Provide a valid name, email, password, public role, and the required organization details.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) return res.status(409).json({ error: 'An account with that email already exists.' });
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        name: name.trim(),
        phone: cleanPhone,
        role: selectedRole,
        ...(selectedRole === 'RESTAURANT' ? {
          restaurant: {
            create: {
              businessName: businessName.trim(),
              fssaiLicense: fssaiLicense.trim(),
              address: address.trim(),
              contactPerson: name.trim(),
              latitude: 28.6139,
              longitude: 77.2090,
            },
          },
          address: address.trim(),
          latitude: 28.6139,
          longitude: 77.2090,
        } : {}),
        ...(selectedRole === 'NGO' ? {
          ngo: {
            create: {
              orgName: businessName.trim(),
              registrationNumber: registrationNumber.trim(),
              latitude: 28.6139,
              longitude: 77.2090,
              verificationStatus: 'PENDING',
            },
          },
          latitude: 28.6139,
          longitude: 77.2090,
        } : {}),
      },
      include: { restaurant: true, ngo: true, volunteer: true },
    });
    res.cookie(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions());
    res.status(201).json({ success: true, user: safeUser(user) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'An account with that email already exists.' });
    console.error('Registration failed:', error.message);
    res.status(500).json({ error: 'Unable to create account at this time.' });
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || password.length > 128) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { restaurant: true, ngo: true, volunteer: true },
    });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!user.passwordHash.startsWith('scrypt:')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }
    res.cookie(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions());
    res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ error: 'Unable to sign in at this time.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies[SESSION_COOKIE];
  const session = readSession(token);
  const revoke = session
    ? prisma.userSession.updateMany({
      where: {
        id: session.sessionId,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
    : Promise.resolve();
  revoke.then(() => {
    res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
    res.json({ success: true });
  }).catch((error) => {
    console.error('Logout session revocation failed:', error.message);
    res.status(500).json({ error: 'Unable to end the session.' });
  });
});

app.post('/api/auth/switch', async (req, res) => {
  try {
    if (!DEMO_MODE) return res.status(403).json({ error: 'Demo Mode is disabled.' });
    const { email } = req.body;
    const currentUser = await getActiveUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Sign in before using Demo Mode.' });
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the authenticated demo administrator can switch demo personas.' });
    }
    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: {
        restaurant: true,
        ngo: true,
        volunteer: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: `User with email ${email} not found` });
    }
    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Administrator access requires logging in with administrator credentials.' });
    }

    await prisma.userSession.updateMany({
      where: {
        id: readSession(req.cookies[SESSION_COOKIE])?.sessionId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    res.cookie(SESSION_COOKIE, await createSessionToken(targetUser.id), sessionCookieOptions());
    const user = safeUser(targetUser);
    res.json({
      success: true,
      user,
      message: `Switched active persona to ${user.name} (${user.role})`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  try {
    const currentUser = await getActiveUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.currentUser = currentUser;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------
// 2. DONATIONS
// ----------------------------------------------------------------------
app.get('/api/donations', async (req, res) => {
  try {
    const { category, safetyStatus, search, restaurantId, activeOnly } = req.query;
    const whereClause = {};
    const currentUser = req.currentUser;
    const now = new Date();
    const canReviewAllListings = currentUser.role === 'ADMIN';

    if (currentUser.role === 'RESTAURANT') {
      if (restaurantId && restaurantId !== currentUser.id) {
        return res.status(403).json({ error: 'You can only review listings owned by your restaurant.' });
      }
      whereClause.restaurantId = currentUser.id;
    } else if (restaurantId) {
      return res.status(403).json({ error: 'Restaurant listing filters are not available for this account.' });
    }

    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    if (canReviewAllListings && safetyStatus && safetyStatus !== 'ALL') {
      whereClause.safetyStatus = safetyStatus;
    } else if (!canReviewAllListings && currentUser.role !== 'RESTAURANT') {
      whereClause.safetyStatus = 'SAFE';
      whereClause.status = 'AVAILABLE';
      whereClause.remainingQuantity = { gt: 0 };
      whereClause.pickupDeadline = { gt: now };
      whereClause.expiryTime = { gt: now };
    } else if (activeOnly !== 'false') {
      whereClause.status = 'AVAILABLE';
      whereClause.remainingQuantity = { gt: 0 };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { pickupAddress: { contains: search } },
      ];
    }

    const donations = await prisma.donation.findMany({
      where: whereClause,
      include: {
        restaurantUser: {
          select: { id: true, name: true, role: true, restaurant: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedDonations = donations.map((d) => {
      const parsedAllergens = parseJsonArray(d.allergens);
      const safetyAssessment = assessSafetySignals({
        category: d.category,
        storageType: d.storageType,
        prepTime: d.prepTime,
        pickupDeadline: d.pickupDeadline,
        expiryTime: d.expiryTime,
        allergens: parsedAllergens,
        reportedSafetyDeclaration: d.reportedSafetyDeclaration,
        allergensReviewed: d.allergensReviewed,
        adminBlocked: d.safetyStatus === 'BLOCKED',
      }, now);

      return {
        ...d,
        allergensList: parsedAllergens,
        fssaiAssessment: safetyAssessment,
        safetyRiskLevel: d.safetyStatus === 'BLOCKED' ? 'HIGH' : safetyAssessment.riskLevel,
        safetyRiskReasons: parseJsonArray(d.safetyRiskReasons).length > 0
          ? parseJsonArray(d.safetyRiskReasons)
          : safetyAssessment.riskReasons,
        safetyReviewStatus: d.safetyReviewStatus === 'NOT_REVIEWED' && safetyAssessment.requiresReview
          ? 'PENDING'
          : d.safetyReviewStatus,
        isExpired: now > new Date(d.pickupDeadline) || now > new Date(d.expiryTime),
      };
    });

    res.json({ donations: enrichedDonations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/donations', async (req, res) => {
  try {
    const currentUser = req.currentUser;
    if (currentUser.role !== 'RESTAURANT' || !currentUser.restaurant) {
      return res.status(403).json({
        error: 'Only registered restaurants with a donor profile can list surplus food.',
      });
    }

    const {
      title,
      description,
      category,
      totalQuantity,
      unit = 'PORTIONS',
      prepTime,
      pickupDeadline,
      expiryTime,
      storageType = 'ROOM_TEMP',
      allergens = [],
      dietaryTags = 'VEG',
      pickupAddress,
      latitude,
      longitude,
      fssaiConfirmed = false,
      allergensReviewed = false,
    } = req.body;

    const categories = ['BAKERY', 'COOKED_MEALS', 'PACKAGED', 'PRODUCE', 'DAIRY'];
    const storageTypes = ['ROOM_TEMP', 'HOT_HOLDING_60C', 'CHILLED_4C'];
    const units = ['PORTIONS', 'KGS', 'BOXES'];
    const quantity = Number(totalQuantity);
    if (typeof title !== 'string' || !title.trim() || title.length > 150 ||
        (description != null && (typeof description !== 'string' || description.length > 2000)) ||
        !categories.includes(category) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000 ||
        !units.includes(unit) || !storageTypes.includes(storageType) ||
        !['VEG', 'NON_VEG', 'VEGAN'].includes(dietaryTags) ||
        typeof pickupAddress !== 'string' || !pickupAddress.trim() || pickupAddress.length > 250 ||
        !Array.isArray(allergens) || allergens.length > 30 ||
        allergens.some((allergen) => typeof allergen !== 'string' || allergen.length > 80)) {
      return res.status(400).json({
        error: 'Provide valid food details, quantity, category, storage type, and pickup location.',
      });
    }

    const prepDate = prepTime ? new Date(prepTime) : new Date();
    const deadlineDate = new Date(pickupDeadline);
    const calculatedExpiry = expiryTime
      ? new Date(expiryTime)
      : new Date(deadlineDate.getTime() + 2 * 3600 * 1000);
    if (Number.isNaN(prepDate.getTime()) || Number.isNaN(deadlineDate.getTime()) ||
        Number.isNaN(calculatedExpiry.getTime()) || prepDate > new Date() ||
        deadlineDate <= new Date() || calculatedExpiry <= new Date()) {
      return res.status(400).json({ error: 'Preparation, pickup, and expiry times must be valid and in the future.' });
    }

    if (typeof fssaiConfirmed !== 'boolean' || typeof allergensReviewed !== 'boolean') {
      return res.status(400).json({ error: 'Safety declarations must be boolean values.' });
    }

    const safetyAssessment = assessSafetySignals({
      category,
      storageType,
      prepTime: prepDate,
      pickupDeadline: deadlineDate,
      expiryTime: calculatedExpiry,
      allergens,
      reportedSafetyDeclaration: fssaiConfirmed,
      allergensReviewed,
    });
    const isObjectivelySafe = safetyAssessment.isSafe;
    const needsReview = safetyAssessment.requiresReview;

    const lat = currentUser.restaurant.latitude;
    const lng = currentUser.restaurant.longitude;

    const donation = await prisma.donation.create({
      data: {
        restaurantId: currentUser.id,
        title: title.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : 'Fresh wholesome surplus food.',
        category,
        totalQuantity: quantity,
        remainingQuantity: quantity,
        unit,
        prepTime: prepDate,
        pickupDeadline: deadlineDate,
        expiryTime: calculatedExpiry,
        storageType,
        allergens: JSON.stringify(Array.isArray(allergens) ? allergens : [allergens]),
        dietaryTags,
        fssaiCompliant: isObjectivelySafe,
        safetyStatus: isObjectivelySafe ? 'SAFE' : 'FLAGGED',
        safetyNotes: safetyAssessment.riskReasons.length > 0
          ? safetyAssessment.riskReasons.join(', ')
          : 'Automated time and handling-window checks passed; no independent inspection is implied.',
        safetyRiskLevel: safetyAssessment.riskLevel,
        safetyReviewStatus: needsReview ? 'PENDING' : 'NOT_REVIEWED',
        safetyRiskReasons: JSON.stringify(safetyAssessment.riskReasons),
        reportedSafetyDeclaration: fssaiConfirmed,
        allergensReviewed,
        pickupAddress,
        latitude: lat,
        longitude: lng,
        status: isObjectivelySafe ? 'AVAILABLE' : 'CANCELLED',
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
        userId: currentUser.id,
        action: needsReview ? 'SAFETY_RISK_DETECTED' : 'DONATION_CREATED',
        entity: 'Donation',
        entityId: donation.id,
        detailsJson: JSON.stringify({
          title: donation.title,
          quantity: donation.totalQuantity,
          category: donation.category,
          riskLevel: safetyAssessment.riskLevel,
          reasons: safetyAssessment.riskReasons,
        }),
        },
      });
      if (needsReview) {
        const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        await tx.notification.createMany({
          data: [
            {
              userId: currentUser.id,
              title: isObjectivelySafe ? 'Safety information needs review' : 'Listing paused for safety review',
              message: safetyAssessment.riskReasons.join(' '),
              type: 'ALERT',
            },
            ...admins.map(({ id }) => ({
              userId: id,
              title: isObjectivelySafe ? 'Safety review requested' : 'Food listing paused',
              message: `${donation.title}: ${safetyAssessment.riskReasons.join(' ')}`,
              type: 'ALERT',
            })),
          ],
        });
      }
    });

    res.json({
      success: true,
      donation,
      message: isObjectivelySafe
        ? needsReview
          ? 'Listing published with a visible safety-information caution and sent for review.'
          : 'Surplus food listing passed automated checks and is available.'
        : 'Listing saved but paused because automated safety checks found an issue. Update its safety information for review.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/donations/:id/safety-info', async (req, res) => {
  try {
    const currentUser = req.currentUser;
    if (currentUser.role !== 'RESTAURANT') {
      return res.status(403).json({ error: 'Only the listing restaurant can update its safety information.' });
    }
    const donation = await prisma.donation.findUnique({ where: { id: req.params.id } });
    if (!donation) return res.status(404).json({ error: 'Listing not found.' });
    if (donation.restaurantId !== currentUser.id) {
      return res.status(403).json({ error: 'You can only update safety information for your own listings.' });
    }

    const { prepTime, pickupDeadline, expiryTime, storageType, allergens, fssaiConfirmed, allergensReviewed } = req.body;
    if (!['ROOM_TEMP', 'HOT_HOLDING_60C', 'CHILLED_4C'].includes(storageType) ||
        !Array.isArray(allergens) || allergens.length > 30 ||
        allergens.some((item) => typeof item !== 'string' || item.length > 80) ||
        typeof fssaiConfirmed !== 'boolean' || typeof allergensReviewed !== 'boolean') {
      return res.status(400).json({ error: 'Provide valid storage, allergen, and safety declaration information.' });
    }
    const prepDate = new Date(prepTime);
    const deadlineDate = new Date(pickupDeadline);
    const expiryDate = new Date(expiryTime);
    if ([prepDate, deadlineDate, expiryDate].some((date) => Number.isNaN(date.getTime()))) {
      return res.status(400).json({ error: 'Preparation, pickup, and expiry times must be valid dates.' });
    }

    const assessment = assessSafetySignals({
      category: donation.category,
      storageType,
      prepTime: prepDate,
      pickupDeadline: deadlineDate,
      expiryTime: expiryDate,
      allergens,
      reportedSafetyDeclaration: fssaiConfirmed,
      allergensReviewed,
    });
    const permanentlyBlocked = donation.safetyStatus === 'BLOCKED';
    const pause = permanentlyBlocked || !assessment.isSafe;
    const saved = await prisma.$transaction(async (tx) => {
      if (pause) {
        await cancelPendingReservationsForSafety(
          tx,
          donation.id,
          `The restaurant updated listing safety information and the listing is paused: ${assessment.riskReasons.join(' ')}`
        );
      }
      const updated = await tx.donation.update({
        where: { id: donation.id },
        data: {
          prepTime: prepDate,
          pickupDeadline: deadlineDate,
          expiryTime: expiryDate,
          storageType,
          allergens: JSON.stringify(allergens),
          reportedSafetyDeclaration: fssaiConfirmed,
          allergensReviewed,
          fssaiCompliant: assessment.isSafe,
          safetyStatus: permanentlyBlocked ? 'BLOCKED' : assessment.isSafe ? 'SAFE' : 'FLAGGED',
          safetyRiskLevel: permanentlyBlocked ? 'HIGH' : assessment.riskLevel,
          safetyRiskReasons: JSON.stringify(permanentlyBlocked
            ? [...assessment.riskReasons, 'This listing remains administratively blocked until reviewed.']
            : assessment.riskReasons),
          safetyReviewStatus: 'PENDING',
          safetyNotes: assessment.riskReasons.join(', ') || 'Updated by restaurant; automated checks passed, pending review.',
          status: pause ? 'CANCELLED' : donation.remainingQuantity > 0 ? 'AVAILABLE' : 'COMPLETED',
        },
      });
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'SAFETY_INFORMATION_UPDATED',
          entity: 'Donation',
          entityId: donation.id,
          detailsJson: JSON.stringify({ riskLevel: assessment.riskLevel, reasons: assessment.riskReasons }),
        },
      });
      const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      const notifications = [
        {
          userId: currentUser.id,
          title: 'Safety information updated',
          message: pause
            ? 'Your listing is paused pending administrator review. Check the reported time and storage information.'
            : 'The listing passed automated checks and is awaiting administrator review.',
          type: 'ALERT',
        },
        ...admins.map(({ id }) => ({
          userId: id,
          title: 'Restaurant safety information updated',
          message: `${donation.title}: ${assessment.riskReasons.join(' ') || 'Automated checks passed; restaurant update awaits review.'}`,
          type: 'ALERT',
        })),
      ];
      await tx.notification.createMany({ data: notifications });
      return updated;
    });
    res.json({
      success: true,
      donation: saved,
      safetyAssessment: assessment,
      message: pause
        ? 'Information saved. This listing remains paused pending administrator review.'
        : 'Information saved. Automated checks passed; the listing is awaiting administrator review.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/donations/:id', async (req, res) => {
  try {
    const currentUser = req.currentUser;
    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: {
        restaurantUser: {
          select: {
            id: true,
            name: true,
            role: true,
            restaurant: { select: { businessName: true, address: true, cuisineType: true } },
          },
        },
        reservations: {
          where: currentUser.role === 'ADMIN'
            ? {}
            : currentUser.role === 'RESTAURANT'
            ? { donation: { restaurantId: currentUser.id } }
            : { userId: currentUser.id },
          include: {
            user: { select: { id: true, name: true, role: true } },
            pickupTasks: true,
          },
        },
        recoveryEvents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    let allergensList = [];
    try {
      allergensList = JSON.parse(donation.allergens);
    } catch {
      allergensList = [];
    }

    const safeReservations = donation.reservations.map(safeReservation);
    res.json({ donation: { ...donation, reservations: safeReservations, allergensList } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/donations/:id', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    const donation = await prisma.donation.findUnique({ where: { id: req.params.id } });
    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    if (donation.restaurantId !== currentUser?.id && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(405).json({ error: 'Donation updates must use the dedicated safety or reservation workflow.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------
// 3. RESERVATIONS & HANDOVER
// ----------------------------------------------------------------------
app.get('/api/reservations', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const whereClause = {};
    if (currentUser.role === 'ADMIN') {
      if (req.query.donationId) whereClause.donationId = req.query.donationId;
    } else if (currentUser.role === 'RESTAURANT') {
      whereClause.donation = { restaurantId: currentUser.id };
      if (req.query.donationId) whereClause.donationId = req.query.donationId;
    } else if (currentUser.role === 'INDIVIDUAL' || currentUser.role === 'NGO') {
      whereClause.userId = currentUser.id;
    } else {
      return res.status(403).json({ error: 'Your role cannot view reservations.' });
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        donation: {
          include: {
            restaurantUser: {
              select: {
                id: true,
                name: true,
                role: true,
                restaurant: { select: { businessName: true, address: true, cuisineType: true } },
              },
            },
          },
        },
        user: { select: { id: true, name: true, role: true } },
        pickupTasks: { include: { volunteer: { select: { id: true, name: true, role: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      reservations: reservations.map(safeReservation),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Please sign in to reserve food.' });

    const { donationId, quantity = 1, notes } = req.body;
    const requestedQuantity = typeof quantity === 'number'
      ? quantity
      : typeof quantity === 'string' && /^\d+$/.test(quantity)
        ? Number(quantity)
        : Number.NaN;

    if (typeof donationId !== 'string' || !donationId || !Number.isSafeInteger(requestedQuantity) || requestedQuantity <= 0 ||
        (notes != null && (typeof notes !== 'string' || notes.length > 500))) {
      return res.status(400).json({ error: 'Invalid reservation parameters.' });
    }

    if (currentUser.role === 'NGO') {
      if (!currentUser.ngo || currentUser.ngo.verificationStatus !== 'VERIFIED') {
        return res.status(403).json({
          error: 'Verification required: Only verified NGOs can claim bulk food allocations.',
        });
      }
    } else if (currentUser.role === 'INDIVIDUAL') {
      if (requestedQuantity > 6) {
        return res.status(400).json({
          error: 'Individual quota limit: Recipient reservations are capped at 6 portions per order.',
        });
      }
    } else if (currentUser.role !== 'INDIVIDUAL') {
      return res.status(403).json({ error: 'Only individuals and verified NGOs can reserve surplus food.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({ where: { id: donationId } });
      if (!donation) throw new Error('Donation not found');

      const now = new Date();
      if (donation.restaurantId === currentUser.id) {
        throw new Error('You cannot reserve food from your own listing.');
      }
      if (donation.status !== 'AVAILABLE' || donation.safetyStatus !== 'SAFE') {
        throw new Error(`This donation cannot be reserved because it is ${donation.safetyStatus}.`);
      }

      const safetyCheck = evaluateFssaiCompliance({
        category: donation.category,
        storageType: donation.storageType,
        prepTime: donation.prepTime,
        pickupDeadline: donation.pickupDeadline,
        expiryTime: donation.expiryTime,
        adminBlocked: donation.safetyStatus === 'BLOCKED',
      }, now);
      if (!safetyCheck.isSafe || new Date(donation.pickupDeadline) <= now) {
        throw new Error('This donation is no longer eligible for reservation.');
      }

      const inventoryUpdate = await tx.donation.updateMany({
        where: {
          id: donationId,
          status: 'AVAILABLE',
          safetyStatus: 'SAFE',
          remainingQuantity: { gte: requestedQuantity },
          pickupDeadline: { gt: now },
          expiryTime: { gt: now },
        },
        data: {
          remainingQuantity: { decrement: requestedQuantity },
          version: { increment: 1 },
        },
      });
      if (inventoryUpdate.count !== 1) {
        throw new Error('Insufficient portions available or the listing is no longer active.');
      }
      const updatedDonation = await tx.donation.update({
        where: { id: donationId },
        data: { status: donation.remainingQuantity - requestedQuantity === 0 ? 'RESERVED' : 'AVAILABLE' },
      });

      const defaultHoldMs = 90 * 60 * 1000;
      const deadlineMs = new Date(donation.pickupDeadline).getTime();
      const expiresAt = new Date(Math.min(now.getTime() + defaultHoldMs, deadlineMs, new Date(donation.expiryTime).getTime()));

      const pickupCode = generatePickupCode();
      const pickupCodeDigest = pickupCodeHash(pickupCode, pickupSecret);

      const claimType = currentUser.role === 'NGO' ? 'NGO_BULK' : 'INDIVIDUAL';
      const reservation = await tx.reservation.create({
        data: {
          donationId,
          userId: currentUser.id,
          reservedQuantity: requestedQuantity,
          pickupCode: pickupCodeDigest,
          pickupCodeEncrypted: encryptPickupCode(pickupCode, pickupSecret),
          status: 'PENDING',
          claimType,
          expiresAt,
        },
        include: {
          donation: { include: { restaurantUser: { select: { id: true, name: true, restaurant: true } } } },
          user: { select: { id: true, name: true, role: true, email: true } },
        },
      });

      if (claimType === 'NGO_BULK') {
        await tx.pickupTask.create({
          data: {
            reservationId: reservation.id,
            status: 'UNASSIGNED',
            notes: notes || `Bulk transfer of ${requestedQuantity} ${donation.unit} to shelter.`,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: donation.restaurantId,
          title: '📦 New Surplus Reservation',
          message: `${currentUser.name} reserved ${requestedQuantity} ${donation.unit} of "${donation.title}".`,
          type: 'PICKUP',
        },
      });

      return { reservation, pickupCode, updatedDonation };
    });

    res.json({
      success: true,
      reservation: safeReservation(result.reservation),
      pickupCode: result.pickupCode,
      message: 'Portions secured! Your pickup code is available in My Pickups.',
    });
  } catch (error) {
    const clientErrors = ['Donation not found', 'You cannot reserve food from your own listing.', 'This donation is no longer eligible for reservation.'];
    const status = clientErrors.includes(error.message) ? (error.message === 'Donation not found' ? 404 : 400) : 400;
    res.status(status).json({ error: error.message });
  }
});

app.get('/api/reservations/:id/pickup-code', async (req, res) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { donation: true },
    });
    if (!reservation || reservation.userId !== req.currentUser.id) {
      return res.status(404).json({ error: 'Pickup reservation not found.' });
    }
    const now = new Date();
    const safetyCheck = evaluateFssaiCompliance({
      category: reservation.donation.category,
      storageType: reservation.donation.storageType,
      prepTime: reservation.donation.prepTime,
      pickupDeadline: reservation.donation.pickupDeadline,
      expiryTime: reservation.donation.expiryTime,
      adminBlocked: reservation.donation.safetyStatus !== 'SAFE',
    }, now);
    if (reservation.status !== 'PENDING' || reservation.expiresAt <= now ||
        !safetyCheck.isSafe ||
        reservation.donation.pickupDeadline <= now || reservation.donation.expiryTime <= now) {
      return res.status(410).json({ error: 'This pickup code is no longer valid.' });
    }
    if (!reservation.pickupCodeEncrypted) {
      return res.status(410).json({ error: 'A pickup code is unavailable for this legacy reservation.' });
    }
    return res.json({ pickupCode: decryptPickupCode(reservation.pickupCodeEncrypted, pickupSecret) });
  } catch (error) {
    console.error('Pickup code retrieval failed:', error.message);
    return res.status(500).json({ error: 'Unable to retrieve pickup code.' });
  }
});

app.post('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: req.params.id },
        include: { donation: true },
      });
      if (!reservation || reservation.userId !== req.currentUser.id) {
        return { status: 404, error: 'Reservation not found.' };
      }
      if (reservation.status !== 'PENDING' || reservation.expiresAt <= now) {
        return { status: 409, error: 'This reservation can no longer be cancelled.' };
      }
      const safetyCheck = evaluateFssaiCompliance({
        category: reservation.donation.category,
        storageType: reservation.donation.storageType,
        prepTime: reservation.donation.prepTime,
        pickupDeadline: reservation.donation.pickupDeadline,
        expiryTime: reservation.donation.expiryTime,
        adminBlocked: reservation.donation.safetyStatus !== 'SAFE',
      }, now);
      const canReturnInventory = safetyCheck.isSafe && reservation.donation.pickupDeadline > now;
      const cancelled = await tx.reservation.updateMany({
        where: { id: reservation.id, userId: req.currentUser.id, status: 'PENDING', expiresAt: { gt: now } },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count !== 1) return { status: 409, error: 'This reservation has already changed.' };
      if (canReturnInventory) {
        const donation = await tx.donation.findUnique({ where: { id: reservation.donationId } });
        await tx.donation.update({
          where: { id: reservation.donationId },
          data: {
            remainingQuantity: { increment: reservation.reservedQuantity },
            status: donation.safetyStatus === 'SAFE' ? 'AVAILABLE' : 'CANCELLED',
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: req.currentUser.id,
          action: 'RESERVATION_CANCELLED',
          entity: 'Reservation',
          entityId: reservation.id,
          detailsJson: JSON.stringify({ quantityReturned: canReturnInventory ? reservation.reservedQuantity : 0 }),
        },
      });
      return { status: 200, success: true };
    });
    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Reservation cancellation failed:', error.message);
    return res.status(500).json({ error: 'Unable to cancel reservation.' });
  }
});

app.post('/api/reservations/verify-pickup', pickupRateLimit, async (req, res) => {
  try {
    const { pickupCode } = req.body;
    if (typeof pickupCode !== 'string' || !/^BC-[A-F0-9]{12}$/i.test(pickupCode.trim())) {
      return res.status(400).json({ error: 'Enter a valid pickup verification code.' });
    }
    const reservation = await prisma.reservation.findUnique({
      where: { pickupCode: pickupCodeHash(pickupCode.trim().toUpperCase(), pickupSecret) },
      include: { donation: true, user: { select: { id: true, name: true } } },
    });
    if (!reservation || (req.currentUser.role !== 'ADMIN' &&
        (req.currentUser.role !== 'RESTAURANT' || reservation.donation.restaurantId !== req.currentUser.id))) {
      return res.status(404).json({ error: 'Pickup code is invalid or not available.' });
    }
    const now = new Date();
    const safetyCheck = evaluateFssaiCompliance({
      category: reservation.donation.category,
      storageType: reservation.donation.storageType,
      prepTime: reservation.donation.prepTime,
      pickupDeadline: reservation.donation.pickupDeadline,
      expiryTime: reservation.donation.expiryTime,
      adminBlocked: reservation.donation.safetyStatus !== 'SAFE',
    }, now);
    if (reservation.status !== 'PENDING' || reservation.expiresAt <= now || !safetyCheck.isSafe) {
      return res.status(410).json({ error: 'This pickup is expired, already used, or no longer eligible.' });
    }
    return res.json({
      valid: true,
      reservation: {
        id: reservation.id,
        reservedQuantity: reservation.reservedQuantity,
        unit: reservation.donation.unit,
        foodName: reservation.donation.title,
        recipientName: reservation.user.name,
      },
    });
  } catch (error) {
    console.error('Pickup code validation failed:', error.message);
    return res.status(500).json({ error: 'Unable to validate pickup code at this time.' });
  }
});

app.post('/api/reservations/confirm-pickup', pickupRateLimit, async (req, res) => {
  try {
    const { pickupCode, quantityCollected } = req.body;
    if (typeof pickupCode !== 'string' || !/^BC-[A-F0-9]{12}$/i.test(pickupCode.trim())) {
      return res.status(400).json({ error: 'Enter a valid pickup verification code.' });
    }

    const formattedCode = pickupCode.trim().toUpperCase();
    const reservation = await prisma.reservation.findUnique({
      where: { pickupCode: pickupCodeHash(formattedCode, pickupSecret) },
      include: {
        donation: true,
        user: { select: { id: true, name: true, reliabilityScore: true } },
        pickupTasks: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Pickup code is invalid or not available.' });
    }
    if (req.currentUser.role !== 'ADMIN' && (
      req.currentUser.role !== 'RESTAURANT' || reservation.donation.restaurantId !== req.currentUser.id
    )) {
      return res.status(403).json({ error: 'Only the donating restaurant or an administrator can confirm this pickup.' });
    }

    const now = new Date();
    if (reservation.status !== 'PENDING' || reservation.expiresAt <= now ||
        reservation.donation.pickupDeadline <= now || reservation.donation.expiryTime <= now ||
        reservation.donation.safetyStatus !== 'SAFE') {
      return res.status(410).json({ error: 'This pickup is expired, already used, or no longer eligible.' });
    }
    const collectedQuantity = quantityCollected === undefined ? reservation.reservedQuantity : quantityCollected;
    if (!Number.isSafeInteger(collectedQuantity) || collectedQuantity < 1 ||
        collectedQuantity > reservation.reservedQuantity) {
      return res.status(400).json({ error: 'Collected quantity must be from 1 up to the reserved amount.' });
    }
    const safetyCheck = evaluateFssaiCompliance({
      category: reservation.donation.category,
      storageType: reservation.donation.storageType,
      prepTime: reservation.donation.prepTime,
      pickupDeadline: reservation.donation.pickupDeadline,
      expiryTime: reservation.donation.expiryTime,
      adminBlocked: reservation.donation.safetyStatus !== 'SAFE',
    }, now);
    if (!safetyCheck.isSafe) {
      return res.status(410).json({ error: 'This pickup is no longer eligible under the food-safety rules.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.updateMany({
        where: {
          id: reservation.id,
          status: 'PENDING',
          expiresAt: { gt: now },
          donation: { pickupDeadline: { gt: now }, expiryTime: { gt: now }, safetyStatus: 'SAFE' },
        },
        data: { status: 'CONFIRMED_PICKUP', confirmedAt: now, collectedQuantity },
      });
      if (updated.count !== 1) return null;

      const uncollectedQuantity = reservation.reservedQuantity - collectedQuantity;
      if (uncollectedQuantity > 0) {
        const donation = await tx.donation.findUnique({ where: { id: reservation.donationId } });
        const stillSafeToOffer = donation.safetyStatus === 'SAFE' &&
          donation.pickupDeadline > now && donation.expiryTime > now && safetyCheck.isSafe;
        if (stillSafeToOffer) {
          const nextQuantity = donation.remainingQuantity + uncollectedQuantity;
          await tx.donation.update({
            where: { id: donation.id },
            data: {
              remainingQuantity: { increment: uncollectedQuantity },
              status: nextQuantity > 0 ? 'AVAILABLE' : 'RESERVED',
            },
          });
        }
      }

      await tx.user.update({
        where: { id: reservation.userId },
        data: {
          reliabilityScore: Math.min(100, (reservation.user.reliabilityScore || 85) + 1.5),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.currentUser.id,
          action: 'HANDOVER_CONFIRMED',
          entity: 'Reservation',
          entityId: reservation.id,
          detailsJson: JSON.stringify({
            reservedQuantity: reservation.reservedQuantity,
            collectedQuantity,
            returnedQuantity: reservation.reservedQuantity - collectedQuantity,
          }),
        },
      });

      return tx.reservation.findUnique({ where: { id: reservation.id } });
    });
    if (!result) return res.status(409).json({ error: 'This pickup has already been confirmed or is no longer eligible.' });

    res.json({
      success: true,
      reservation: safeReservation(result),
      message: `Handover confirmed! Collected ${collectedQuantity} of ${reservation.reservedQuantity} ${reservation.donation.unit} for ${reservation.user.name}.`,
    });
  } catch (error) {
    console.error('Pickup verification failed:', error.message);
    res.status(500).json({ error: 'Unable to verify pickup at this time.' });
  }
});

// ----------------------------------------------------------------------
// 4. RECOVERY ENGINE
// ----------------------------------------------------------------------
app.get('/api/recovery', async (req, res) => {
  try {
    if (req.currentUser.role !== 'ADMIN' && req.currentUser.role !== 'RESTAURANT') {
      return res.status(403).json({ error: 'Recovery oversight is available to restaurants and administrators.' });
    }
    const recoveryEvents = await prisma.recoveryEvent.findMany({
      where: req.currentUser.role === 'RESTAURANT'
        ? { donation: { restaurantId: req.currentUser.id } }
        : undefined,
      include: {
        donation: {
          select: {
            id: true,
            title: true,
            pickupAddress: true,
            unit: true,
            restaurantUser: {
              select: {
                id: true,
                name: true,
                role: true,
                restaurant: { select: { businessName: true, address: true, cuisineType: true } },
              },
            },
          },
        },
        originalReservation: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const now = new Date();
    const pendingExpiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
        ...(req.currentUser.role === 'RESTAURANT'
          ? { donation: { restaurantId: req.currentUser.id } }
          : {}),
      },
      include: {
        donation: true,
        user: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { expiresAt: 'asc' },
    });

    res.json({
      recoveryEvents,
      pendingExpiredReservations,
      stats: {
        totalRecoveries: recoveryEvents.length,
        successfulReallocations: recoveryEvents.filter((r) => r.status === 'REALLOCATED').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recovery', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'RESTAURANT') {
      return res.status(403).json({ error: 'Only restaurants and administrators can run failed-pickup recovery.' });
    }
    const { reservationId, reason = 'MISSED_DEADLINE', runBatch = false } = req.body;
    if (typeof runBatch !== 'boolean' || !['MISSED_DEADLINE', 'NO_SHOW', 'CANCELLED'].includes(reason)) {
      return res.status(400).json({ error: 'Provide a supported recovery reason and batch flag.' });
    }

    if (runBatch) {
      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only administrators can run the global recovery batch.' });
      }
      const batchResult = await runAutomatedRecoveryCheck();
      return res.json({
        success: true,
        ...batchResult,
        message: `Automated recovery scanner evaluated ${batchResult.scanned} reservations and routed ${batchResult.recoveredCount} meals back into network.`,
      });
    }

    if (typeof reservationId !== 'string' || !reservationId) return res.status(400).json({ error: 'reservationId is required' });
    if (currentUser.role === 'RESTAURANT') {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { donation: { select: { restaurantId: true } } },
      });
      if (!reservation || reservation.donation.restaurantId !== currentUser.id) {
        return res.status(403).json({ error: 'You can only recover reservations for your own donations.' });
      }
    }

    const result = await executeFailedPickupRecovery(reservationId, reason, currentUser?.id);
    res.json({ success: true, result, message: result.message });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------
// 5. SMART MATCHING RANK
// ----------------------------------------------------------------------
app.post('/api/matching/rank', async (req, res) => {
  try {
    if (!['ADMIN', 'RESTAURANT'].includes(req.currentUser.role)) {
      return res.status(403).json({ error: 'Recipient matching is restricted to restaurants and administrators.' });
    }
    const { donationId } = req.body;
    if (typeof donationId !== 'string' || !donationId) return res.status(400).json({ error: 'donationId is required' });

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { id: true, restaurantId: true, title: true, remainingQuantity: true, unit: true, latitude: true, longitude: true, pickupDeadline: true, expiryTime: true, safetyStatus: true, category: true },
    });
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (req.currentUser.role === 'RESTAURANT' && donation.restaurantId !== req.currentUser.id) {
      return res.status(403).json({ error: 'You can only view matches for your own listings.' });
    }

    const candidates = await prisma.user.findMany({
      where: {
        role: { in: ['NGO', 'INDIVIDUAL'] },
        latitude: { not: null },
        longitude: { not: null },
      },
      include: { ngo: true },
    });

    const formattedCandidates = candidates.map((u) => ({
      id: u.id,
      name: u.ngo?.orgName || u.name,
      role: u.role,
      latitude: u.latitude,
      longitude: u.longitude,
      reliabilityScore: u.reliabilityScore,
      capacityMeals: u.ngo?.capacityMeals,
      serviceRadiusKm: u.ngo?.serviceRadiusKm,
      verificationStatus: u.ngo?.verificationStatus,
    }));

    const ranked = rankRecipientsForDonation(
      formattedCandidates,
      {
        id: donation.id,
        title: donation.title,
        remainingQuantity: donation.remainingQuantity,
        unit: donation.unit,
        latitude: donation.latitude,
        longitude: donation.longitude,
        pickupDeadline: donation.pickupDeadline,
        expiryTime: donation.expiryTime,
        safetyStatus: donation.safetyStatus,
        category: donation.category,
      },
      new Date()
    );

    res.json({
      donation: {
        id: donation.id,
        title: donation.title,
        remainingQuantity: donation.remainingQuantity,
        unit: donation.unit,
      },
      rankedMatches: ranked,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------
// 6. NGO VERIFICATION & ADMIN
// ----------------------------------------------------------------------
app.get('/api/ngo/verification', async (req, res) => {
  try {
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const ngos = await prisma.ngoProfile.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ ngos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/ngo/verification', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const { ngoId, status, notes } = req.body;
    if (typeof ngoId !== 'string' || !['VERIFIED', 'REJECTED', 'PENDING'].includes(status) ||
        (notes != null && (typeof notes !== 'string' || notes.length > 500))) {
      return res.status(400).json({ error: 'Provide a valid NGO and verification status.' });
    }
    const updated = await prisma.ngoProfile.update({
      where: { id: ngoId },
      data: { verificationStatus: status, verificationDocs: notes?.trim() || undefined },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: updated.userId,
        title: status === 'VERIFIED' ? '🎉 NGO Verification Approved!' : '⚠️ NGO Verification Update',
        message: status === 'VERIFIED' ? 'Your organization is authorized for bulk claiming.' : `Status: ${status}`,
        type: status === 'VERIFIED' ? 'INFO' : 'ALERT',
      },
    });

    res.json({ success: true, ngo: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/safety-block', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Admin credentials required.' });
    }

    const { donationId, action, reason } = req.body;
    if (typeof donationId !== 'string' || !['BLOCK', 'UNBLOCK'].includes(action) ||
        (action === 'BLOCK' && (typeof reason !== 'string' || !reason.trim() || reason.length > 500))) {
      return res.status(400).json({ error: 'Provide a donation, a valid safety action, and a reason when blocking.' });
    }
    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) return res.status(404).json({ error: 'Donation not found.' });
    const safetyAssessment = assessSafetySignals({
        category: donation.category,
        storageType: donation.storageType,
        prepTime: donation.prepTime,
        pickupDeadline: donation.pickupDeadline,
        expiryTime: donation.expiryTime,
        allergens: parseJsonArray(donation.allergens),
        reportedSafetyDeclaration: donation.reportedSafetyDeclaration,
        allergensReviewed: donation.allergensReviewed,
    });
    if (action === 'UNBLOCK') {
      if (!safetyAssessment.isSafe || donation.remainingQuantity <= 0) {
        return res.status(422).json({ error: 'This listing cannot be restored because its food-safety window has passed or no inventory remains.' });
      }
    }
    const newSafetyStatus = action === 'BLOCK' ? 'BLOCKED' : 'SAFE';
    const newStatus = action === 'BLOCK' ? 'CANCELLED' : 'AVAILABLE';
    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'BLOCK') {
        await cancelPendingReservationsForSafety(
          tx,
          donationId,
          `This listing has been paused by an administrator for safety review: ${reason.trim()}`
        );
      }
      await tx.donation.update({
        where: { id: donationId },
        data: {
          safetyStatus: newSafetyStatus,
          status: newStatus,
          safetyNotes: action === 'BLOCK' ? `Safety block: ${reason.trim()}` : 'Cleared after automated handling-window checks; no independent inspection is implied.',
          safetyRiskLevel: action === 'BLOCK' ? 'HIGH' : safetyAssessment.riskLevel,
          safetyRiskReasons: JSON.stringify(action === 'BLOCK' ? [reason.trim()] : safetyAssessment.riskReasons),
          safetyReviewStatus: action === 'BLOCK' ? 'PENDING' : 'REVIEWED',
          safetyReviewedAt: action === 'UNBLOCK' ? new Date() : null,
          safetyReviewedBy: action === 'UNBLOCK' ? currentUser.id : null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: action === 'BLOCK' ? 'SAFETY_BLOCKED' : 'SAFETY_UNBLOCKED',
          entity: 'Donation',
          entityId: donationId,
          detailsJson: JSON.stringify({ reason: action === 'BLOCK' ? reason.trim() : 'Passed current safety checks.' }),
        },
      });
      await tx.notification.create({
        data: {
          userId: donation.restaurantId,
          title: action === 'BLOCK' ? 'Listing paused for safety review' : 'Listing restored after review',
          message: action === 'BLOCK'
            ? `An administrator paused this listing: ${reason.trim()}`
            : 'Automated handling-window checks passed; no independent inspection is implied.',
          type: action === 'BLOCK' ? 'ALERT' : 'INFO',
        },
      });
      return tx.donation.findUnique({ where: { id: donationId } });
    });

    res.json({ success: true, donation: updated, message: `Donation safety status updated to ${newSafetyStatus}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/safety-review', async (req, res) => {
  try {
    if (req.currentUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
    const donations = await prisma.donation.findMany({
      where: {
        OR: [
          { safetyReviewStatus: { in: ['PENDING', 'NEEDS_UPDATE'] } },
          { safetyStatus: { in: ['FLAGGED', 'BLOCKED'] } },
          {
            AND: [
              { safetyReviewStatus: 'NOT_REVIEWED' },
              { OR: [{ reportedSafetyDeclaration: false }, { allergensReviewed: false }] },
            ],
          },
        ],
      },
      include: {
        restaurantUser: { select: { id: true, name: true, email: true, restaurant: { select: { businessName: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({
      listings: donations.map((donation) => ({
        ...donation,
        allergensList: parseJsonArray(donation.allergens),
        safetyRiskReasons: parseJsonArray(donation.safetyRiskReasons),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/safety-review', async (req, res) => {
  try {
    const currentUser = req.currentUser;
    if (currentUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
    const { donationId, action, reason } = req.body;
    const actions = ['APPROVE', 'NEEDS_UPDATE', 'BLOCK', 'RESTORE'];
    if (typeof donationId !== 'string' || !actions.includes(action) ||
        (reason != null && (typeof reason !== 'string' || reason.length > 500))) {
      return res.status(400).json({ error: 'Provide a listing, valid review action, and concise reason.' });
    }
    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) return res.status(404).json({ error: 'Listing not found.' });
    if (action === 'RESTORE' && donation.safetyStatus !== 'BLOCKED') {
      return res.status(409).json({ error: 'Only an administratively blocked listing can be restored.' });
    }
    if (action === 'APPROVE' && donation.safetyStatus === 'BLOCKED') {
      return res.status(409).json({ error: 'Use RESTORE to clear an administrative safety block.' });
    }

    const assessment = assessSafetySignals({
      category: donation.category,
      storageType: donation.storageType,
      prepTime: donation.prepTime,
      pickupDeadline: donation.pickupDeadline,
      expiryTime: donation.expiryTime,
      allergens: parseJsonArray(donation.allergens),
      reportedSafetyDeclaration: donation.reportedSafetyDeclaration,
      allergensReviewed: donation.allergensReviewed,
    });
    const shouldActivate = ['APPROVE', 'RESTORE'].includes(action);
    if (shouldActivate && (!assessment.isSafe || donation.remainingQuantity <= 0 ||
        donation.pickupDeadline <= new Date() || donation.expiryTime <= new Date())) {
      return res.status(422).json({
        error: `Listing cannot be approved or restored: ${assessment.riskReasons.join(' ') || 'No eligible inventory remains.'}`,
      });
    }
    const message = typeof reason === 'string' && reason.trim()
      ? reason.trim()
      : action === 'NEEDS_UPDATE'
        ? 'Please review the preparation time, storage details, and allergen information.'
        : `Administrator reviewed the listing (${action.toLowerCase()}).`;
    const remainsBlocked = donation.safetyStatus === 'BLOCKED' && action !== 'RESTORE';

    const updated = await prisma.$transaction(async (tx) => {
      if (['NEEDS_UPDATE', 'BLOCK'].includes(action)) {
        await cancelPendingReservationsForSafety(tx, donation.id, `Pickup paused: ${message}`);
      }
      const result = await tx.donation.update({
        where: { id: donation.id },
        data: {
          safetyStatus: action === 'BLOCK' || remainsBlocked ? 'BLOCKED' : action === 'NEEDS_UPDATE' ? 'FLAGGED' : 'SAFE',
          status: shouldActivate ? 'AVAILABLE' : 'CANCELLED',
          safetyRiskLevel: action === 'BLOCK' || remainsBlocked ? 'HIGH' : assessment.riskLevel,
          safetyRiskReasons: JSON.stringify(action === 'NEEDS_UPDATE'
            ? [...(remainsBlocked ? parseJsonArray(donation.safetyRiskReasons) : assessment.riskReasons), message]
            : action === 'BLOCK'
              ? [message]
              : assessment.riskReasons),
          safetyReviewStatus: action === 'NEEDS_UPDATE' ? 'NEEDS_UPDATE' : action === 'BLOCK' ? 'PENDING' : 'REVIEWED',
          safetyReviewedAt: new Date(),
          safetyReviewedBy: currentUser.id,
          safetyNotes: message,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: `SAFETY_REVIEW_${action}`,
          entity: 'Donation',
          entityId: donation.id,
          detailsJson: JSON.stringify({ reason: message, riskLevel: assessment.riskLevel, risks: assessment.riskReasons }),
        },
      });
      await tx.notification.create({
        data: {
          userId: donation.restaurantId,
          title: action === 'APPROVE' || action === 'RESTORE' ? 'Safety review completed' : 'Safety action required',
          message,
          type: action === 'APPROVE' || action === 'RESTORE' ? 'INFO' : 'ALERT',
        },
      });
      return result;
    });
    res.json({ success: true, donation: updated, message: `Safety review action ${action} recorded.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const users = await prisma.user.findMany({
      include: {
        restaurant: true,
        ngo: true,
        volunteer: true,
        _count: {
          select: {
            donations: true,
            reservations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const safeUsers = users.map(({ passwordHash, ...u }) => u);
    res.json({ users: safeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    if (req.currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------
// 7. VOLUNTEER TASKS, STATS, NOTIFICATIONS
// ----------------------------------------------------------------------
app.get('/api/volunteers/tasks', async (req, res) => {
  try {
    const currentUser = req.currentUser;
    if (currentUser.role !== 'VOLUNTEER' && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Volunteer task access is restricted to volunteers and administrators.' });
    }
    const tasks = await prisma.pickupTask.findMany({
      where: currentUser.role === 'VOLUNTEER'
        ? { OR: [{ volunteerId: currentUser.id }, { volunteerId: null, status: 'UNASSIGNED' }] }
        : undefined,
      include: {
        volunteer: { select: { id: true, name: true, role: true } },
        reservation: {
          select: {
            id: true,
            donationId: true,
            userId: true,
            reservedQuantity: true,
            status: true,
            claimType: true,
            expiresAt: true,
            donation: {
              include: {
                restaurantUser: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    restaurant: { select: { businessName: true, address: true, cuisineType: true } },
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                address: true,
                ngo: { select: { orgName: true, registrationNumber: true, capacityMeals: true, verificationStatus: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/volunteers/tasks', async (req, res) => {
  try {
    const currentUser = req.currentUser;
    if (currentUser.role !== 'VOLUNTEER') {
      return res.status(403).json({ error: 'Only volunteers can update pickup tasks.' });
    }
    const { taskId, action, notes } = req.body;
    if (typeof taskId !== 'string' || (notes != null && (typeof notes !== 'string' || notes.length > 500))) {
      return res.status(400).json({ error: 'Provide a valid task identifier and optional notes.' });
    }
    const task = await prisma.pickupTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Pickup task not found.' });

    let expectedState = {};
    let updatedData = {};
    if (action === 'ACCEPT') {
      if (task.status !== 'UNASSIGNED' || task.volunteerId) {
        return res.status(409).json({ error: 'This pickup task has already been assigned.' });
      }
      expectedState = { status: 'UNASSIGNED', volunteerId: null };
      updatedData = { volunteerId: currentUser.id, status: 'ASSIGNED', notes: notes?.trim() || null };
    } else if (action === 'MARK_PICKED_UP') {
      if (task.volunteerId !== currentUser.id || task.status !== 'ASSIGNED') {
        return res.status(403).json({ error: 'Only the assigned volunteer can confirm this pickup.' });
      }
      expectedState = { status: 'ASSIGNED', volunteerId: currentUser.id };
      updatedData = { status: 'PICKED_UP', notes: notes?.trim() || null };
    } else if (action === 'MARK_DELIVERED') {
      if (task.volunteerId !== currentUser.id || task.status !== 'PICKED_UP') {
        return res.status(403).json({ error: 'Only the assigned volunteer can confirm this delivery.' });
      }
      expectedState = { status: 'PICKED_UP', volunteerId: currentUser.id };
      updatedData = { status: 'DELIVERED', notes: notes?.trim() || null };
    } else {
      return res.status(400).json({ error: 'Unsupported pickup task action.' });
    }

    const changed = await prisma.pickupTask.updateMany({
      where: { id: taskId, ...expectedState },
      data: updatedData,
    });
    if (changed.count !== 1) return res.status(409).json({ error: 'This pickup task changed before your update was saved.' });
    const updated = await prisma.pickupTask.findUnique({ where: { id: taskId } });
    res.json({ success: true, task: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/impact/stats', async (req, res) => {
  try {
    const confirmedReservations = await prisma.reservation.findMany({
      where: { status: 'CONFIRMED_PICKUP' },
      select: { reservedQuantity: true, collectedQuantity: true },
    });
    const confirmedPortions = confirmedReservations.reduce((sum, r) => sum + (r.collectedQuantity || r.reservedQuantity), 0);

    const activeDonations = await prisma.donation.findMany({
      where: { safetyStatus: 'SAFE', status: 'AVAILABLE', remainingQuantity: { gt: 0 } },
      select: { remainingQuantity: true },
    });
    const availablePortions = activeDonations.reduce((sum, d) => sum + d.remainingQuantity, 0);

    const totalMealsRescued = confirmedPortions;
    const totalKgRescued = Math.round(totalMealsRescued * 0.45);
    const co2SavedKg = Math.round(totalKgRescued * 2.5);

    const allRecoveries = await prisma.recoveryEvent.findMany();
    const successfulRecoveries = allRecoveries.filter((r) => r.status === 'REALLOCATED').length;
    const recoverySuccessRate = allRecoveries.length > 0 ? Math.round((successfulRecoveries / allRecoveries.length) * 100) : 0;

    const restaurantCount = await prisma.restaurantProfile.count();
    const verifiedNgoCount = await prisma.ngoProfile.count({ where: { verificationStatus: 'VERIFIED' } });
    const pendingNgoCount = await prisma.ngoProfile.count({ where: { verificationStatus: 'PENDING' } });
    const volunteerCount = await prisma.volunteerProfile.count();
    const safetyBlockedCount = await prisma.donation.count({ where: { safetyStatus: 'BLOCKED' } });
    const auditLogsCount = await prisma.auditLog.count();

    res.json({
      impact: {
        totalMealsRescued,
        totalKgRescued,
        co2SavedKg,
        recoverySuccessRate,
        confirmedPortions,
        availablePortions,
        network: {
          restaurants: restaurantCount,
          verifiedNgos: verifiedNgoCount,
          pendingNgos: pendingNgoCount,
          volunteers: volunteerCount,
          safetyBlocked: safetyBlockedCount,
          auditLogs: auditLogsCount,
        },
        fssaiComplianceRate: null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (!currentUser) return res.json({ notifications: [] });

    const notifications = await prisma.notification.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications', async (req, res) => {
  try {
    const currentUser = await getActiveUser(req);
    if (currentUser) {
      await prisma.notification.updateMany({
        where: { userId: currentUser.id, isRead: false },
        data: { isRead: true },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function migrateLegacyPickupCodes() {
  const legacyReservations = await prisma.reservation.findMany({
    where: { pickupCodeEncrypted: null },
    select: { id: true, pickupCode: true },
  });
  for (const reservation of legacyReservations) {
    const code = reservation.pickupCode.toUpperCase();
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        pickupCode: pickupCodeHash(code, pickupSecret),
        pickupCodeEncrypted: encryptPickupCode(code, pickupSecret),
      },
    });
  }

  const notifications = await prisma.notification.findMany({
    where: { message: { contains: 'Code: BC-' } },
    select: { id: true, message: true },
  });
  for (const notification of notifications) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { message: notification.message.replace(/Code:\s*BC-[A-Z0-9-]+/gi, 'Pickup code available to the recipient only.') },
    });
  }

  const logs = await prisma.auditLog.findMany({
    where: { detailsJson: { contains: 'pickupCode' } },
    select: { id: true, detailsJson: true },
  });
  for (const log of logs) {
    await prisma.auditLog.update({
      where: { id: log.id },
      data: { detailsJson: log.detailsJson.replace(/"pickupCode"\s*:\s*"[^"]*"/g, '"pickupCode":"[redacted]"') },
    });
  }

  const legacyCompletedReservations = await prisma.reservation.findMany({
    where: { status: 'CONFIRMED_PICKUP', collectedQuantity: 0 },
    select: { id: true, reservedQuantity: true },
  });
  for (const reservation of legacyCompletedReservations) {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { collectedQuantity: reservation.reservedQuantity },
    });
  }
}

async function prepareDatabase() {
  await prisma.$connect();
  await migrateLegacyPickupCodes();
}

async function startServer() {
  await prepareDatabase();
  return app.listen(PORT, () => {
    console.log(`🍞 BreadCycle Backend Server listening on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('BreadCycle startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer, prepareDatabase, migrateLegacyPickupCodes };
