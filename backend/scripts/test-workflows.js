process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { prisma } = require('../lib/prisma');
const { hashPassword, pickupCodeHash } = require('../lib/auth-helpers');
const { evaluateFssaiCompliance } = require('../lib/fssai');
const { app, prepareDatabase } = require('../server');

let passed = 0;
let failed = 0;
const userIds = [];
const donationIds = [];

function check(condition, label) {
  try {
    assert.ok(condition, label);
    passed += 1;
    console.log(`PASS ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${label}: ${error.message}`);
    throw error;
  }
}

function sessionIdFromCookie(cookie) {
  const token = cookie?.replace(/^breadcycle_session=/, '');
  const payload = token?.split('.')[0];
  return payload ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).sessionId : null;
}

async function request(baseUrl, path, { cookie, method = 'GET', body } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const setCookie = response.headers.get('set-cookie');
  const nextCookie = setCookie?.match(/breadcycle_session=[^;]*/)?.[0] || cookie || null;
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  return { response, data, cookie: setCookie?.includes('breadcycle_session=;') ? null : nextCookie };
}

async function register(baseUrl, role, email, extra = {}) {
  const result = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { name: `Test ${role}`, email, password: 'BreadCycle-Test-Password-93', role, ...extra },
  });
  if (result.data.user?.id) userIds.push(result.data.user.id);
  return result;
}

async function createDonation(baseUrl, cookie, title, quantity = 20, options = {}) {
  const now = new Date();
  const prepTime = options.prepTime || now;
  const pickupDeadline = options.pickupDeadline || new Date(now.getTime() + (options.pickupHours ?? 4) * 3600 * 1000);
  const expiryTime = options.expiryTime || new Date(pickupDeadline.getTime() + 2 * 3600 * 1000);
  const result = await request(baseUrl, '/api/donations', {
    method: 'POST',
    cookie,
    body: {
      title,
      description: 'Automated local workflow test listing.',
      category: options.category || 'BAKERY',
      totalQuantity: quantity,
      unit: 'PORTIONS',
      prepTime: prepTime.toISOString(),
      pickupDeadline: pickupDeadline.toISOString(),
      expiryTime: expiryTime.toISOString(),
      storageType: options.storageType || 'ROOM_TEMP',
      allergens: ['Gluten'],
      dietaryTags: 'VEG',
      pickupAddress: 'Local test pickup point',
      latitude: 0,
      longitude: 0,
      fssaiConfirmed: options.fssaiConfirmed ?? false,
      allergensReviewed: options.allergensReviewed ?? false,
    },
  });
  if (result.data.donation?.id) donationIds.push(result.data.donation.id);
  return result;
}

async function runTests() {
  await prepareDatabase();
  const safetyNow = new Date();
  const futurePrep = new Date(safetyNow.getTime() + 60 * 60 * 1000);
  const inconsistentTimes = evaluateFssaiCompliance({
    category: 'COOKED_MEALS',
    storageType: 'ROOM_TEMP',
    prepTime: futurePrep,
    pickupDeadline: new Date(futurePrep.getTime() + 2 * 3600_000),
    expiryTime: new Date(futurePrep.getTime() + 3 * 3600_000),
  }, safetyNow);
  check(!inconsistentTimes.isSafe && inconsistentTimes.status === 'FLAGGED',
    'Future preparation timestamps are rejected by independent timeline consistency checks.');
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const suffix = crypto.randomUUID();
  let restaurantCookie = null;
  let recipientCookie = null;
  let secondRecipientCookie = null;
  let ngoCookie = null;
  let adminCookie = null;

  try {
    const anonymous = await request(baseUrl, '/api/admin/users');
    check(anonymous.response.status === 401, 'Unauthenticated admin API requests are rejected.');

    const missingRole = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { name: 'No role', email: `norole-${suffix}@example.test`, password: 'BreadCycle-Test-Password-93' },
    });
    check(missingRole.response.status === 400, 'Registration requires an explicit public role.');

    const adminRoleSignup = await register(baseUrl, 'ADMIN', `admin-signup-${suffix}@example.test`);
    check(adminRoleSignup.response.status === 400, 'Public registration cannot assign the ADMIN role.');

    const individual = await register(baseUrl, 'INDIVIDUAL', `individual-${suffix}@example.test`);
    recipientCookie = individual.cookie;
    check(individual.response.status === 201 && individual.data.user.role === 'INDIVIDUAL', 'Individual registration creates an authenticated individual account.');
    check(individual.response.headers.get('set-cookie')?.includes('HttpOnly') &&
      individual.response.headers.get('set-cookie')?.includes('SameSite=Lax'), 'Authentication cookie is HttpOnly and SameSite protected.');

    const restaurant = await register(baseUrl, 'RESTAURANT', `restaurant-${suffix}@example.test`, {
      businessName: `Test Bakery ${suffix}`,
      fssaiLicense: 'LOCAL-TEST-LICENSE',
      address: '10 Test Street, New Delhi',
    });
    restaurantCookie = restaurant.cookie;
    check(restaurant.response.status === 201 && restaurant.data.user.restaurant?.businessName, 'Restaurant registration creates its donor profile.');

    const ngo = await register(baseUrl, 'NGO', `ngo-${suffix}@example.test`, {
      businessName: `Test Community Kitchen ${suffix}`,
      registrationNumber: `TEST-NGO-${suffix}`,
    });
    ngoCookie = ngo.cookie;
    check(ngo.response.status === 201 && ngo.data.user.ngo?.verificationStatus === 'PENDING', 'NGO registration creates a pending-verification profile.');

    const duplicate = await register(baseUrl, 'INDIVIDUAL', `individual-${suffix}@example.test`);
    check(duplicate.response.status === 409, 'Duplicate email registration is rejected.');

    const secondRecipient = await register(baseUrl, 'INDIVIDUAL', `second-${suffix}@example.test`);
    secondRecipientCookie = secondRecipient.cookie;
    check(secondRecipient.response.status === 201, 'A second isolated recipient account can register.');
    await prisma.user.update({
      where: { id: secondRecipient.data.user.id },
      data: { latitude: 0, longitude: 0, reliabilityScore: 100 },
    });

    const badLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: `individual-${suffix}@example.test`, password: 'incorrect-password' },
    });
    check(badLogin.response.status === 401, 'Invalid passwords do not authenticate.');

    const loggedOut = await request(baseUrl, '/api/auth/logout', { method: 'POST', cookie: recipientCookie });
    const afterLogout = await request(baseUrl, '/api/auth/session', { cookie: recipientCookie });
    check(loggedOut.response.ok && !afterLogout.data.user, 'Logout revokes the server-side session and clears the browser cookie.');
    recipientCookie = loggedOut.cookie;
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: `individual-${suffix}@example.test`.toUpperCase(), password: 'BreadCycle-Test-Password-93' },
    });
    recipientCookie = login.cookie;
    check(login.response.ok && login.data.user.role === 'INDIVIDUAL', 'Login normalizes email and returns the database-backed role.');

    const adminAccessAsIndividual = await request(baseUrl, '/api/admin/users', { cookie: recipientCookie });
    check(adminAccessAsIndividual.response.status === 403, 'A signed-in individual cannot access administrator APIs.');
    const forbiddenSwitch = await request(baseUrl, '/api/auth/switch', {
      method: 'POST',
      cookie: recipientCookie,
      body: { email: `second-${suffix}@example.test` },
    });
    check(forbiddenSwitch.response.status === 403, 'A non-admin cannot impersonate another user in Demo Mode.');

    const admin = await prisma.user.create({
      data: {
        name: `Local Test Admin ${suffix}`,
        email: `trusted-admin-${suffix}@example.test`,
        passwordHash: hashPassword('BreadCycle-Test-Password-93'),
        role: 'ADMIN',
      },
    });
    userIds.push(admin.id);
    const adminLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: admin.email, password: 'BreadCycle-Test-Password-93' },
    });
    adminCookie = adminLogin.cookie;
    check(adminLogin.response.ok && adminLogin.data.user.role === 'ADMIN', 'A trusted administrator account can authenticate.');
    const adminSwitch = await request(baseUrl, '/api/auth/switch', {
      method: 'POST',
      cookie: adminCookie,
      body: { email: `second-${suffix}@example.test` },
    });
    check(adminSwitch.response.ok && adminSwitch.data.user.role === 'INDIVIDUAL', 'Only a signed-in admin can use the explicitly enabled demo persona switcher.');
    const adminLoginAgain = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: admin.email, password: 'BreadCycle-Test-Password-93' },
    });
    adminCookie = adminLoginAgain.cookie;

    const donation = await createDonation(baseUrl, restaurantCookie, `Integration Bakery ${suffix}`, 30);
    check(donation.response.status === 200 && donation.data.donation.remainingQuantity === 30, 'Restaurant can publish a validated listing using database persistence.');
    check(donation.data.donation.safetyRiskLevel === 'CAUTION' && donation.data.donation.safetyStatus === 'SAFE',
      'Missing donor safety declarations create a caution without interrupting a safe listing.');
    const cautiousFeed = await request(baseUrl, `/api/donations?search=${encodeURIComponent(`Integration Bakery ${suffix}`)}`, { cookie: recipientCookie });
    check(cautiousFeed.data.donations?.[0]?.safetyRiskLevel === 'CAUTION' &&
      cautiousFeed.data.donations[0].safetyRiskReasons.length > 0,
    'Recipients see the donor-report caution and reasons in food discovery.');
    await prisma.donation.update({
      where: { id: donation.data.donation.id },
      data: { latitude: 0, longitude: 0 },
    });
    const pendingNgoClaim = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: ngoCookie,
      body: { donationId: donation.data.donation.id, quantity: 10 },
    });
    check(pendingNgoClaim.response.status === 403, 'Pending NGO cannot make a bulk reservation.');

    const tooMany = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: donation.data.donation.id, quantity: 7 },
    });
    check(tooMany.response.status === 400, 'Individual reservation quota is enforced server-side.');

    const reservationResponse = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: donation.data.donation.id, quantity: 2 },
    });
    const reservation = reservationResponse.data.reservation;
    check(reservationResponse.response.status === 200 && /^BC-[A-F0-9]{12}$/.test(reservationResponse.data.pickupCode), 'Reservation persists with a high-entropy pickup code.');
    const persisted = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    check(persisted.pickupCode === pickupCodeHash(reservationResponse.data.pickupCode, process.env.SESSION_SECRET || require('fs').readFileSync(require('path').join(require('os').homedir(), '.breadcycle-session-secret'), 'utf8').trim()) &&
      persisted.pickupCodeEncrypted && !persisted.pickupCode.includes(reservationResponse.data.pickupCode), 'Pickup code is stored as a keyed digest with encrypted retrieval value.');

    const listResponse = await request(baseUrl, '/api/reservations', { cookie: recipientCookie });
    check(!JSON.stringify(listResponse.data).includes(reservationResponse.data.pickupCode) &&
      !JSON.stringify(listResponse.data).includes('pickupCodeEncrypted'), 'Reservation list does not expose pickup secrets.');
    const ownCode = await request(baseUrl, `/api/reservations/${reservation.id}/pickup-code`, { cookie: recipientCookie });
    const otherCode = await request(baseUrl, `/api/reservations/${reservation.id}/pickup-code`, { cookie: secondRecipientCookie });
    check(ownCode.response.ok && ownCode.data.pickupCode === reservationResponse.data.pickupCode && otherCode.response.status === 404, 'Only the reservation owner can retrieve the pickup code.');
    const expiredSessionId = sessionIdFromCookie(secondRecipientCookie);
    await prisma.userSession.update({
      where: { id: expiredSessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expiredSession = await request(baseUrl, '/api/auth/session', { cookie: secondRecipientCookie });
    check(!expiredSession.data.user, 'Expired persistent sessions are rejected by the backend.');
    const codeVerification = await request(baseUrl, '/api/reservations/verify-pickup', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { pickupCode: ownCode.data.pickupCode },
    });
    check(codeVerification.response.ok && codeVerification.data.reservation.reservedQuantity === 2, 'Restaurant can validate a code and review the reservation before handover.');

    const wrongRestaurant = await register(baseUrl, 'RESTAURANT', `wrong-restaurant-${suffix}@example.test`, {
      businessName: `Wrong Bakery ${suffix}`,
      fssaiLicense: 'LOCAL-TEST-LICENSE-2',
      address: '20 Test Street, New Delhi',
    });
    userIds.push(...(wrongRestaurant.data.user?.id ? [wrongRestaurant.data.user.id] : []));
    const unsafeTimelineListing = await createDonation(
      baseUrl,
      restaurantCookie,
      `Unsafe Timeline ${suffix}`,
      5,
      { category: 'COOKED_MEALS', pickupHours: 4 }
    );
    check(unsafeTimelineListing.response.ok && unsafeTimelineListing.data.donation.safetyStatus === 'FLAGGED' &&
      unsafeTimelineListing.data.donation.status === 'CANCELLED',
    'A deadline beyond the reported cooked-food handling window is saved for review but paused from reservation.');
    const unauthorizedSafetyUpdate = await request(baseUrl, `/api/donations/${unsafeTimelineListing.data.donation.id}/safety-info`, {
      method: 'PATCH',
      cookie: wrongRestaurant.cookie,
      body: {
        prepTime: new Date(Date.now() - 10_000).toISOString(),
        pickupDeadline: new Date(Date.now() + 2 * 3600_000).toISOString(),
        expiryTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
        storageType: 'ROOM_TEMP',
        allergens: [],
        fssaiConfirmed: true,
        allergensReviewed: true,
      },
    });
    check(unauthorizedSafetyUpdate.response.status === 403, 'Only the owning restaurant can update listing safety details.');
    const queueForAdmin = await request(baseUrl, '/api/admin/safety-review', { cookie: adminCookie });
    const queueForRecipient = await request(baseUrl, '/api/admin/safety-review', { cookie: recipientCookie });
    check(queueForAdmin.response.ok &&
      queueForAdmin.data.listings.some((listing) => listing.id === unsafeTimelineListing.data.donation.id) &&
      queueForRecipient.response.status === 403,
    'Risky listings reach the protected administrator review queue.');
    const unsafeApprove = await request(baseUrl, '/api/admin/safety-review', {
      method: 'PATCH',
      cookie: adminCookie,
      body: { donationId: unsafeTimelineListing.data.donation.id, action: 'APPROVE' },
    });
    check(unsafeApprove.response.status === 422, 'Administrators cannot approve an objectively inconsistent safety timeline.');
    const safeTimeline = () => {
      const prepTime = new Date(Date.now() - 10_000);
      const pickupDeadline = new Date(Date.now() + 2 * 3600_000);
      const expiryTime = new Date(pickupDeadline.getTime() + 3600_000);
      return { prepTime: prepTime.toISOString(), pickupDeadline: pickupDeadline.toISOString(), expiryTime: expiryTime.toISOString() };
    };
    const correctedTimeline = await request(baseUrl, `/api/donations/${unsafeTimelineListing.data.donation.id}/safety-info`, {
      method: 'PATCH',
      cookie: restaurantCookie,
      body: {
        ...safeTimeline(),
        storageType: 'ROOM_TEMP',
        allergens: [],
        fssaiConfirmed: true,
        allergensReviewed: true,
      },
    });
    check(correctedTimeline.response.ok && correctedTimeline.data.donation.safetyStatus === 'SAFE' &&
      correctedTimeline.data.donation.status === 'AVAILABLE',
    'Restaurant corrections pass automated checks and restore availability pending administrator review.');
    const safetyReservation = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: unsafeTimelineListing.data.donation.id, quantity: 1 },
    });
    const safetyPause = await request(baseUrl, `/api/donations/${unsafeTimelineListing.data.donation.id}/safety-info`, {
      method: 'PATCH',
      cookie: restaurantCookie,
      body: {
        prepTime: new Date(Date.now() - 10_000).toISOString(),
        pickupDeadline: new Date(Date.now() + 4 * 3600_000).toISOString(),
        expiryTime: new Date(Date.now() + 5 * 3600_000).toISOString(),
        storageType: 'ROOM_TEMP',
        allergens: [],
        fssaiConfirmed: true,
        allergensReviewed: true,
      },
    });
    const cancelledBySafety = await prisma.reservation.findUnique({ where: { id: safetyReservation.data.reservation.id } });
    const safetyAlert = await prisma.notification.findFirst({
      where: { userId: individual.data.user.id, title: 'Pickup paused for a safety review' },
    });
    check(safetyPause.response.ok && cancelledBySafety.status === 'CANCELLED' && safetyAlert,
      'An unsafe update pauses pickup, cancels its reservation, and alerts the affected recipient.');
    const correctedAgain = await request(baseUrl, `/api/donations/${unsafeTimelineListing.data.donation.id}/safety-info`, {
      method: 'PATCH',
      cookie: restaurantCookie,
      body: {
        ...safeTimeline(),
        storageType: 'ROOM_TEMP',
        allergens: [],
        fssaiConfirmed: true,
        allergensReviewed: true,
      },
    });
    const approveCorrected = await request(baseUrl, '/api/admin/safety-review', {
      method: 'PATCH',
      cookie: adminCookie,
      body: { donationId: unsafeTimelineListing.data.donation.id, action: 'APPROVE' },
    });
    check(correctedAgain.response.ok && approveCorrected.response.ok &&
      approveCorrected.data.donation.safetyReviewStatus === 'REVIEWED',
    'Administrator review records approval only after corrected dates pass handling-window checks.');
    const postReviewReservation = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: unsafeTimelineListing.data.donation.id, quantity: 1 },
    });
    check(postReviewReservation.response.ok, 'Normal reservations remain available after a reviewed caution listing is approved.');

    const unauthorizedConfirm = await request(baseUrl, '/api/reservations/confirm-pickup', {
      method: 'POST',
      cookie: wrongRestaurant.cookie,
      body: { pickupCode: ownCode.data.pickupCode },
    });
    check(unauthorizedConfirm.response.status === 403, 'A different restaurant cannot confirm another donor’s handover.');

    const confirm = await request(baseUrl, '/api/reservations/confirm-pickup', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { pickupCode: ownCode.data.pickupCode },
    });
    const replay = await request(baseUrl, '/api/reservations/confirm-pickup', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { pickupCode: ownCode.data.pickupCode },
    });
    check(confirm.response.ok && replay.response.status === 410, 'Handover succeeds once and a reused code is rejected.');

    const concurrentReservations = await Promise.all([0, 1].map(() => request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: donation.data.donation.id, quantity: 1 },
    })));
    check(concurrentReservations.every((result) => result.response.ok), 'Concurrent reservation requests are accepted while inventory is sufficient.');
    const concurrentCode = concurrentReservations[0].data.pickupCode;
    const concurrentConfirms = await Promise.all([0, 1].map(() => request(baseUrl, '/api/reservations/confirm-pickup', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { pickupCode: concurrentCode },
    })));
    check(concurrentConfirms.filter((result) => result.response.ok).length === 1, 'Concurrent handover attempts produce exactly one successful confirmation.');

    const partialReservation = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: donation.data.donation.id, quantity: 2 },
    });
    const inventoryBeforePartial = (await prisma.donation.findUnique({ where: { id: donation.data.donation.id } })).remainingQuantity;
    const partialConfirm = await request(baseUrl, '/api/reservations/confirm-pickup', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { pickupCode: partialReservation.data.pickupCode, quantityCollected: 1 },
    });
    const inventoryAfterPartial = (await prisma.donation.findUnique({ where: { id: donation.data.donation.id } })).remainingQuantity;
    check(partialConfirm.response.ok && partialConfirm.data.reservation.collectedQuantity === 1 &&
      inventoryAfterPartial === inventoryBeforePartial + 1, 'Partial pickup records collected quantity and safely returns the remainder to inventory.');

    const cancelReservation = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: donation.data.donation.id, quantity: 1 },
    });
    const inventoryBeforeCancel = (await prisma.donation.findUnique({ where: { id: donation.data.donation.id } })).remainingQuantity;
    const cancelled = await request(baseUrl, `/api/reservations/${cancelReservation.data.reservation.id}/cancel`, {
      method: 'POST',
      cookie: recipientCookie,
    });
    const inventoryAfterCancel = (await prisma.donation.findUnique({ where: { id: donation.data.donation.id } })).remainingQuantity;
    check(cancelled.response.ok && inventoryAfterCancel === inventoryBeforeCancel + 1, 'Reservation cancellation returns eligible inventory exactly once.');

    const ngoApproval = await request(baseUrl, '/api/ngo/verification', {
      method: 'PATCH',
      cookie: adminCookie,
      body: { ngoId: ngo.data.user.ngo.id, status: 'VERIFIED', notes: 'Approved by local integration test.' },
    });
    check(ngoApproval.response.ok && ngoApproval.data.ngo.verificationStatus === 'VERIFIED', 'Administrator can approve NGO verification.');
    const ngoClaim = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: ngoCookie,
      body: { donationId: donation.data.donation.id, quantity: 10 },
    });
    check(ngoClaim.response.ok && ngoClaim.data.reservation.claimType === 'NGO_BULK', 'Verified NGO can claim eligible bulk food.');

    const expiredReservationResponse = await request(baseUrl, '/api/reservations', {
      method: 'POST',
      cookie: recipientCookie,
      body: { donationId: donation.data.donation.id, quantity: 1 },
    });
    await prisma.reservation.update({
      where: { id: expiredReservationResponse.data.reservation.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const expiredCode = await request(baseUrl, `/api/reservations/${expiredReservationResponse.data.reservation.id}/pickup-code`, { cookie: recipientCookie });
    const recovery = await request(baseUrl, '/api/recovery', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { reservationId: expiredReservationResponse.data.reservation.id, reason: 'MISSED_DEADLINE' },
    });
    check(expiredCode.response.status === 410 && recovery.response.ok && recovery.data.result.isSafeToRedistribute, 'Expired pickup codes are rejected and only truly expired, still-safe reservations recover.');
    const recoveryEvent = await prisma.recoveryEvent.findFirst({
      where: { originalReservationId: expiredReservationResponse.data.reservation.id },
    });
    check(recoveryEvent?.status === 'REALLOCATED' && recoveryEvent.newRecipientId === secondRecipient.data.user.id, 'Failed-pickup recovery atomically creates a real reservation for the best eligible match.');
    const reallocatedReservation = await prisma.reservation.findFirst({
      where: { donationId: donation.data.donation.id, userId: secondRecipient.data.user.id, status: 'PENDING' },
    });
    check(Boolean(reallocatedReservation?.pickupCodeEncrypted), 'Recovery allocations retain a private, retrievable pickup code.');

    const unsafeRestoreDonation = await createDonation(baseUrl, restaurantCookie, `Safety Block ${suffix}`, 2);
    const safetyBlock = await request(baseUrl, '/api/admin/safety-block', {
      method: 'POST',
      cookie: adminCookie,
      body: { donationId: unsafeRestoreDonation.data.donation.id, action: 'BLOCK', reason: 'Automated safety workflow test.' },
    });
    const safetyUnblock = await request(baseUrl, '/api/admin/safety-block', {
      method: 'POST',
      cookie: adminCookie,
      body: { donationId: unsafeRestoreDonation.data.donation.id, action: 'UNBLOCK' },
    });
    check(safetyBlock.response.ok && safetyUnblock.response.ok, 'Administrator can block and safely restore an eligible listing.');
    await prisma.donation.update({
      where: { id: unsafeRestoreDonation.data.donation.id },
      data: { expiryTime: new Date(Date.now() - 60_000) },
    });
    await request(baseUrl, '/api/admin/safety-block', {
      method: 'POST',
      cookie: adminCookie,
      body: { donationId: unsafeRestoreDonation.data.donation.id, action: 'BLOCK', reason: 'Expired-window test.' },
    });
    const unsafeRestore = await request(baseUrl, '/api/admin/safety-block', {
      method: 'POST',
      cookie: adminCookie,
      body: { donationId: unsafeRestoreDonation.data.donation.id, action: 'UNBLOCK' },
    });
    check(unsafeRestore.response.status === 422, 'Admin cannot restore a listing after its safe distribution window expires.');

    const badDonationUpdate = await request(baseUrl, `/api/donations/${donation.data.donation.id}`, {
      method: 'PATCH',
      cookie: restaurantCookie,
      body: { remainingQuantity: 999999, restaurantId: admin.id },
    });
    check(badDonationUpdate.response.status === 405, 'Raw donation update payloads cannot mutate inventory or ownership.');

    const rateLimitAttempts = await Promise.all(Array.from({ length: 9 }, () => request(baseUrl, '/api/reservations/confirm-pickup', {
      method: 'POST',
      cookie: restaurantCookie,
      body: { pickupCode: 'BC-INVALID' },
    })));
    check(rateLimitAttempts.some((result) => result.response.status === 429), 'Repeated pickup verification attempts are rate-limited.');
  } finally {
    if (donationIds.length) {
      await prisma.donation.deleteMany({ where: { id: { in: donationIds } } });
    }
    if (userIds.length) {
      await prisma.reservation.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
}

runTests()
  .then(() => {
    console.log(`\n${passed}/${passed + failed} integration checks passed; ${failed} failed.`);
  })
  .catch((error) => {
    console.error(error);
    console.error(`\n${passed}/${passed + failed} integration checks passed; ${failed} failed.`);
    process.exitCode = 1;
  });
