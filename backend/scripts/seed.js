const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const {
  hashPassword,
  generatePickupCode,
  pickupCodeHash,
  encryptPickupCode,
} = require('../lib/auth-helpers');

const prisma = new PrismaClient();

class SafeSeedError extends Error {}

const demoCredentials = [];

function createDemoPasswordHash(email) {
  const password = crypto.randomBytes(24).toString('base64url');
  demoCredentials.push({ email, password });
  return hashPassword(password);
}

function createPickupCodeRecord(secret) {
  const code = generatePickupCode();
  return {
    pickupCode: pickupCodeHash(code, secret),
    pickupCodeEncrypted: encryptPickupCode(code, secret),
  };
}

async function getExistingDataTables() {
  const models = [
    ['users', prisma.user],
    ['donations', prisma.donation],
    ['reservations', prisma.reservation],
    ['pickup tasks', prisma.pickupTask],
    ['recovery events', prisma.recoveryEvent],
    ['notifications', prisma.notification],
    ['audit logs', prisma.auditLog],
  ];
  const counts = await Promise.all(models.map(async ([name, model]) => [name, await model.count()]));
  return counts.filter(([, count]) => count > 0).map(([name]) => name);
}

async function createDemoUser({ data }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  const profiles = [
    ['restaurant', 'restaurantProfile'],
    ['ngo', 'ngoProfile'],
    ['volunteer', 'volunteerProfile'],
  ];

  if (existing) {
    const credentialIndex = demoCredentials.findIndex((credential) => credential.email === data.email);
    if (credentialIndex !== -1) demoCredentials.splice(credentialIndex, 1);
    if (existing.role !== data.role) {
      throw new SafeSeedError(`Demo account ${data.email} already exists with a different role; it was not changed.`);
    }
    for (const [relation, model] of profiles) {
      const profile = data[relation]?.create;
      if (profile) {
        await prisma[model].upsert({
          where: { userId: existing.id },
          create: { ...profile, userId: existing.id },
          update: {},
        });
      }
    }
    console.log(`Preserved existing demo account ${data.email}; its password was not changed.`);
    return existing;
  }

  return prisma.user.create({ data });
}

async function createDemoDonation({ data }) {
  const existing = await prisma.donation.findFirst({
    where: { restaurantId: data.restaurantId, title: data.title },
  });
  return existing || prisma.donation.create({ data });
}

async function createDemoReservation({ data }) {
  const existing = await prisma.reservation.findFirst({
    where: {
      donationId: data.donationId,
      userId: data.userId,
      claimType: data.claimType,
    },
  });
  return existing || prisma.reservation.create({ data });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new SafeSeedError('DATABASE_URL is required. Configure it for the intended database before seeding.');
  }
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new SafeSeedError('Set ALLOW_DEMO_SEED=true to explicitly enable demo data seeding.');
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new SafeSeedError('SESSION_SECRET must be configured with at least 32 characters so demo pickup codes can be protected.');
  }

  const existingData = await getExistingDataTables();
  if (existingData.length > 0) {
    console.log(`Preserving existing database records in: ${existingData.join(', ')}.`);
  }
  console.log('Adding BreadCycle demo data without overwriting existing records...');

  const sessionSecret = process.env.SESSION_SECRET;
  const now = new Date();

  // Restaurant 1: The Golden Crust Bakery
  const bakeryUser = await createDemoUser({
    data: {
      email: 'bakery@breadcycle.demo',
      passwordHash: createDemoPasswordHash('bakery@breadcycle.demo'),
      name: 'Marco Rossi',
      role: 'RESTAURANT',
      phone: '+91 98110 12345',
      address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      reliabilityScore: 98.0,
      restaurant: {
        create: {
          businessName: 'The Golden Crust Bakery',
          fssaiLicense: '10022011000842',
          address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
          contactPerson: 'Marco Rossi (Master Baker)',
          cuisineType: 'Artisan Bakery & Pastries',
          latitude: 28.6315,
          longitude: 77.2167,
          isVerified: true,
        },
      },
    },
  });

  // Restaurant 2: Spice Symphony Kitchen
  const kitchenUser = await createDemoUser({
    data: {
      email: 'kitchen@breadcycle.demo',
      passwordHash: createDemoPasswordHash('kitchen@breadcycle.demo'),
      name: 'Chef Ananya Roy',
      role: 'RESTAURANT',
      phone: '+91 98200 54321',
      address: '28 Main Ring Road, South Extension Part II, New Delhi',
      latitude: 28.5714,
      longitude: 77.2201,
      reliabilityScore: 95.0,
      restaurant: {
        create: {
          businessName: 'Spice Symphony Kitchen',
          fssaiLicense: '10021011000319',
          address: '28 Main Ring Road, South Extension Part II, New Delhi',
          contactPerson: 'Chef Ananya Roy (Executive Chef)',
          cuisineType: 'North Indian & Mughlai Catering',
          latitude: 28.5714,
          longitude: 77.2201,
          isVerified: true,
        },
      },
    },
  });

  // NGO 1: Feeding Hope Foundation (VERIFIED)
  const verifiedNgoUser = await createDemoUser({
    data: {
      email: 'feedinghope@breadcycle.demo',
      passwordHash: createDemoPasswordHash('feedinghope@breadcycle.demo'),
      name: 'David Chen',
      role: 'NGO',
      phone: '+91 98765 43210',
      address: 'Community Center 4, Lajpat Nagar III, New Delhi',
      latitude: 28.5682,
      longitude: 77.2435,
      reliabilityScore: 96.0,
      ngo: {
        create: {
          orgName: 'Feeding Hope Foundation',
          registrationNumber: 'NGO-DL-2018-0912',
          fssaiSurplusReg: 'FSSAI-SURPLUS-8842',
          capacityMeals: 200,
          serviceRadiusKm: 15.0,
          verificationStatus: 'VERIFIED',
          verificationDocs: '80G Certificate, FSSAI Food Recovery MoU, Darpan ID DL/2019/02199',
          latitude: 28.5682,
          longitude: 77.2435,
        },
      },
    },
  });

  // NGO 2: City Care Kitchen (PENDING)
  const pendingNgoUser = await createDemoUser({
    data: {
      email: 'citycare@breadcycle.demo',
      passwordHash: createDemoPasswordHash('citycare@breadcycle.demo'),
      name: 'Fatima Al-Mansoor',
      role: 'NGO',
      phone: '+91 98101 99887',
      address: '45 Pusa Road, Karol Bagh, New Delhi',
      latitude: 28.6433,
      longitude: 77.1892,
      reliabilityScore: 80.0,
      ngo: {
        create: {
          orgName: 'City Care Kitchen',
          registrationNumber: 'NGO-DL-2023-4411',
          fssaiSurplusReg: 'PENDING_AUDIT',
          capacityMeals: 80,
          serviceRadiusKm: 10.0,
          verificationStatus: 'PENDING',
          verificationDocs: 'Trust Deed, PAN submitted. Pending FSSAI surplus handling inspection.',
          latitude: 28.6433,
          longitude: 77.1892,
        },
      },
    },
  });

  // Recipient 1: Priya Sharma
  const priyaUser = await createDemoUser({
    data: {
      email: 'priya@breadcycle.demo',
      passwordHash: createDemoPasswordHash('priya@breadcycle.demo'),
      name: 'Priya Sharma',
      role: 'INDIVIDUAL',
      phone: '+91 99112 33445',
      address: 'Block 18, Lodhi Colony, New Delhi',
      latitude: 28.5878,
      longitude: 77.2215,
      reliabilityScore: 92.0,
    },
  });

  // Recipient 2: Rahul Verma
  const rahulUser = await createDemoUser({
    data: {
      email: 'rahul@breadcycle.demo',
      passwordHash: createDemoPasswordHash('rahul@breadcycle.demo'),
      name: 'Rahul Verma',
      role: 'INDIVIDUAL',
      phone: '+91 99554 11223',
      address: 'C-Block, Defence Colony, New Delhi',
      latitude: 28.5726,
      longitude: 77.2324,
      reliabilityScore: 88.0,
    },
  });

  // Volunteer: Arjun Patel
  const volunteerUser = await createDemoUser({
    data: {
      email: 'arjun@breadcycle.demo',
      passwordHash: createDemoPasswordHash('arjun@breadcycle.demo'),
      name: 'Arjun Patel',
      role: 'VOLUNTEER',
      phone: '+91 97118 77665',
      address: 'Jor Bagh Metro Area, New Delhi',
      latitude: 28.5855,
      longitude: 77.2144,
      reliabilityScore: 97.0,
      volunteer: {
        create: {
          vehicleType: 'MOTORCYCLE',
          activeStatus: true,
          maxCapacityKg: 35.0,
          latitude: 28.5855,
          longitude: 77.2144,
        },
      },
    },
  });

  // Admin: Sarah Jenkins
  const adminUser = await createDemoUser({
    data: {
      email: 'admin@breadcycle.demo',
      passwordHash: createDemoPasswordHash('admin@breadcycle.demo'),
      name: 'Sarah Jenkins',
      role: 'ADMIN',
      phone: '+91 99999 00000',
      address: 'BreadCycle HQ, Technology Center, New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      reliabilityScore: 100.0,
    },
  });

  // Realistic Donations
  const donation1 = await createDemoDonation({
    data: {
      restaurantId: bakeryUser.id,
      title: 'Artisan Sourdough Loaves & Croissants',
      description: 'End-of-day surplus of unbaked and fresh-baked French baguettes, country sourdough, and almond croissants. Pristine hygienic packaging in kraft paper bags.',
      category: 'BAKERY',
      totalQuantity: 40,
      remainingQuantity: 32,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 4 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 3.5 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 18 * 3600 * 1000),
      storageType: 'ROOM_TEMP',
      allergens: JSON.stringify(['Gluten / Wheat', 'Dairy / Milk', 'Peanuts & Tree Nuts']),
      dietaryTags: 'VEG',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Baked in certified commercial ovens. Handled using food-grade gloves. FSSAI surplus standard compliant.',
      pickupAddress: 'The Golden Crust Bakery, Inner Circle Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      status: 'AVAILABLE',
    },
  });

  const donation2 = await createDemoDonation({
    data: {
      restaurantId: kitchenUser.id,
      title: 'Nutritious Dal Makhani & Jeera Rice Trays',
      description: 'Catering surplus prepared for corporate lunch. Kept continuously in thermal insulated Cambro hot-holding containers at 64°C. Wholesome vegetarian meals.',
      category: 'COOKED_MEALS',
      totalQuantity: 65,
      remainingQuantity: 45,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 1.5 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 2.5 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 4.5 * 3600 * 1000),
      storageType: 'HOT_HOLDING_60C',
      allergens: JSON.stringify(['Dairy / Milk']),
      dietaryTags: 'VEG',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Holding temperature measured at 64.2°C at 12:00 PM. FSSAI 60°C thermal boundary verified.',
      pickupAddress: 'Spice Symphony Kitchen, South Extension II, New Delhi',
      latitude: 28.5714,
      longitude: 77.2201,
      status: 'AVAILABLE',
    },
  });

  const donation3 = await createDemoDonation({
    data: {
      restaurantId: kitchenUser.id,
      title: 'Vegetable Biryani & Mirchi Salan (Urgent Window)',
      description: 'Fragrant Basmati rice preparation from banquet buffet. Ambient holding safe distribution window expires in 42 minutes.',
      category: 'COOKED_MEALS',
      totalQuantity: 30,
      remainingQuantity: 10,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 2.8 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 42 * 60 * 1000),
      expiryTime: new Date(now.getTime() + 45 * 60 * 1000),
      storageType: 'ROOM_TEMP',
      allergens: JSON.stringify(['Dairy / Milk', 'Peanuts & Tree Nuts']),
      dietaryTags: 'VEG',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Room temp distribution window closing soon under FSSAI 3-hour limit.',
      pickupAddress: 'Spice Symphony Kitchen, South Extension II, New Delhi',
      latitude: 28.5714,
      longitude: 77.2201,
      status: 'AVAILABLE',
    },
  });

  const donation4 = await createDemoDonation({
    data: {
      restaurantId: bakeryUser.id,
      title: 'Fresh Milk & Heavy Cream Dessert Tarts',
      description: 'Perishable custard items reported with compromised refrigeration thermostat in transit.',
      category: 'DAIRY',
      totalQuantity: 25,
      remainingQuantity: 25,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 5 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 2 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 6 * 3600 * 1000),
      storageType: 'CHILLED_4C',
      allergens: JSON.stringify(['Dairy / Milk', 'Eggs']),
      dietaryTags: 'VEG',
      fssaiCompliant: false,
      safetyStatus: 'BLOCKED',
      safetyNotes: 'Blocked by Safety Admin: Chilling temperature exceeded 11°C during storage.',
      pickupAddress: 'The Golden Crust Bakery, Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      status: 'CANCELLED',
    },
  });
  const donation5 = await createDemoDonation({
    data: {
      restaurantId: bakeryUser.id,
      title: 'Fresh Vegetable Sandwiches & Bread Rolls',
      description: 'Freshly prepared vegetable sandwiches and bread rolls remaining after the morning service.',
      category: 'BAKERY',
      totalQuantity: 35,
      remainingQuantity: 35,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 1 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 2 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 3 * 3600 * 1000),
      storageType: 'CHILLED_4C',
      allergens: JSON.stringify(['Gluten / Wheat', 'Dairy / Milk']),
      dietaryTags: 'VEG',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Demo record: refrigeration and packaging checks recorded.',
      pickupAddress: 'The Golden Crust Bakery, Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      status: 'AVAILABLE',
    },
  });

  const donation6 = await createDemoDonation({
    data: {
      restaurantId: kitchenUser.id,
      title: 'Fresh Seasonal Fruit Boxes',
      description: 'Surplus apples, bananas, oranges, and guavas sorted into donation boxes.',
      category: 'FRUITS',
      totalQuantity: 24,
      remainingQuantity: 18,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 2 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 4 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 12 * 3600 * 1000),
      storageType: 'ROOM_TEMP',
      allergens: JSON.stringify([]),
      dietaryTags: 'VEGAN',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Demo record: fruit inspection and sorting completed.',
      pickupAddress: 'Spice Symphony Kitchen, South Extension II, New Delhi',
      latitude: 28.5714,
      longitude: 77.2201,
      status: 'AVAILABLE',
    },
  });

  const donation7 = await createDemoDonation({
    data: {
      restaurantId: kitchenUser.id,
      title: 'Packed Rajma Rice Lunch Boxes',
      description: 'Surplus vegetarian lunch boxes prepared for a corporate event.',
      category: 'COOKED_MEALS',
      totalQuantity: 50,
      remainingQuantity: 28,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 1 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 1.5 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 3 * 3600 * 1000),
      storageType: 'HOT_HOLDING_60C',
      allergens: JSON.stringify([]),
      dietaryTags: 'VEG',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Demo record: hot-holding conditions must be verified at pickup.',
      pickupAddress: 'Spice Symphony Kitchen, South Extension II, New Delhi',
      latitude: 28.5714,
      longitude: 77.2201,
      status: 'AVAILABLE',
    },
  });

  const donation8 = await createDemoDonation({
    data: {
      restaurantId: bakeryUser.id,
      title: 'Packaged Oat Cookies',
      description: 'Sealed surplus oat cookies in their original packaging, with ingredient and allergen labels.',
      category: 'PACKAGED_FOOD',
      totalQuantity: 60,
      remainingQuantity: 60,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 3 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 8 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 72 * 3600 * 1000),
      storageType: 'ROOM_TEMP',
      allergens: JSON.stringify(['Gluten / Wheat', 'Dairy / Milk']),
      dietaryTags: 'VEG',
      fssaiCompliant: true,
      safetyStatus: 'SAFE',
      safetyNotes: 'Demo record: sealed packaging and expiry labels require verification.',
      pickupAddress: 'The Golden Crust Bakery, Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      status: 'AVAILABLE',
    },
  });

  const donation9 = await createDemoDonation({
    data: {
      restaurantId: kitchenUser.id,
      title: 'Mixed Curry Trays — Safety Review Required',
      description: 'Prepared food reported with an incomplete temperature log. Awaiting safety review.',
      category: 'COOKED_MEALS',
      totalQuantity: 20,
      remainingQuantity: 20,
      unit: 'PORTIONS',
      prepTime: new Date(now.getTime() - 3 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 1 * 3600 * 1000),
      expiryTime: new Date(now.getTime() + 2 * 3600 * 1000),
      storageType: 'ROOM_TEMP',
      allergens: JSON.stringify(['Dairy / Milk']),
      dietaryTags: 'VEG',
      fssaiCompliant: false,
      safetyStatus: 'BLOCKED',
      safetyNotes: 'Demo record: blocked until a qualified safety reviewer verifies handling conditions.',
      pickupAddress: 'Spice Symphony Kitchen, South Extension II, New Delhi',
      latitude: 28.5714,
      longitude: 77.2201,
      status: 'CANCELLED',
    },
  });


  // Active reservation with a protected pickup code.
  const res1 = await createDemoReservation({
    data: {
      donationId: donation1.id,
      userId: priyaUser.id,
      reservedQuantity: 4,
      ...createPickupCodeRecord(sessionSecret),
      status: 'PENDING',
      claimType: 'INDIVIDUAL',
      expiresAt: new Date(now.getTime() + 90 * 60 * 1000),
    },
  });

  // NGO Bulk claim
  const res2 = await createDemoReservation({
    data: {
      donationId: donation2.id,
      userId: verifiedNgoUser.id,
      reservedQuantity: 20,
      ...createPickupCodeRecord(sessionSecret),
      status: 'PENDING',
      claimType: 'NGO_BULK',
      expiresAt: new Date(now.getTime() + 120 * 60 * 1000),
    },
  });

  const existingPickupTask = await prisma.pickupTask.findFirst({ where: { reservationId: res2.id } });
  if (!existingPickupTask) {
    await prisma.pickupTask.create({
      data: {
        reservationId: res2.id,
        volunteerId: volunteerUser.id,
        status: 'ASSIGNED',
        notes: 'Pick up 20 hot meal trays from Spice Symphony and transport to Feeding Hope shelter.',
      },
    });
  }

  // Pre-seeded Expired Reservation ready for immediate 1-click recovery demonstration
  const expiredRes = await createDemoReservation({
    data: {
      donationId: donation3.id,
      userId: rahulUser.id,
      reservedQuantity: 10,
      ...createPickupCodeRecord(sessionSecret),
      status: 'PENDING',
      claimType: 'INDIVIDUAL',
      expiresAt: new Date(now.getTime() - 15 * 60 * 1000), // Expired 15 mins ago
      createdAt: new Date(now.getTime() - 75 * 60 * 1000),
    },
  });

  // Historical recovery event
  const pastReservation = await createDemoReservation({
    data: {
      donationId: donation1.id,
      userId: rahulUser.id,
      reservedQuantity: 4,
      ...createPickupCodeRecord(sessionSecret),
      status: 'RECOVERED',
      claimType: 'INDIVIDUAL',
      expiresAt: new Date(now.getTime() - 3 * 3600 * 1000),
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
    },
  });

  const existingRecovery = await prisma.recoveryEvent.findFirst({
    where: { originalReservationId: pastReservation.id, reason: 'MISSED_DEADLINE' },
  });
  if (!existingRecovery) {
    await prisma.recoveryEvent.create({
      data: {
        donationId: donation1.id,
        originalReservationId: pastReservation.id,
        recoveredQuantity: 4,
        previousRecipientId: rahulUser.id,
        newRecipientId: priyaUser.id,
        reason: 'MISSED_DEADLINE',
        status: 'REALLOCATED',
        matchingScore: 94.2,
        notes: 'Auto-recovered 4 portions of artisan bread. Reallocated to Priya Sharma (Distance: 1.8km, Urgency fit: 92%).',
        createdAt: new Date(now.getTime() - 2.5 * 3600 * 1000),
      },
    });
  }

  const demoNotifications = [
    {
      userId: bakeryUser.id,
      title: '🌟 New Surplus Reservation',
      message: 'Priya Sharma reserved 4 portions of Artisan Sourdough Loaves. A pickup code is available in My Pickups.',
      type: 'PICKUP',
      isRead: false,
    },
    {
      userId: kitchenUser.id,
      title: '🏛️ NGO Bulk Claim Received',
      message: 'Feeding Hope Foundation claimed 20 portions of Dal Makhani & Jeera Rice. Volunteer courier Arjun Patel assigned.',
      type: 'PICKUP',
      isRead: false,
    },
  ];
  for (const notification of demoNotifications) {
    const existingNotification = await prisma.notification.findFirst({
      where: { userId: notification.userId, title: notification.title },
    });
    if (!existingNotification) await prisma.notification.create({ data: notification });
  }

  console.log('BreadCycle demo database seeded successfully. Save these one-time demo logins now:');
  for (const { email, password } of demoCredentials) {
    console.log(`${email} | ${password}`);
  }
  console.log('Do not enable Demo Mode for a public production site. Remove ALLOW_DEMO_SEED after setup.');
}

main()
  .catch((error) => {
    if (error instanceof SafeSeedError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    const code = error && typeof error === 'object' && 'code' in error ? ` (${error.code})` : '';
    console.error(`Demo database seeding failed${code}. Existing records were not deliberately deleted or overwritten. Check database connectivity, schema sync, and configuration.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
