const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Seeding BreadCycle database with realistic production-grade demo data...');

  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.recoveryEvent.deleteMany({});
  await prisma.pickupTask.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.volunteerProfile.deleteMany({});
  await prisma.ngoProfile.deleteMany({});
  await prisma.restaurantProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = hashPassword('demo1234');
  const now = new Date();

  // Restaurant 1: The Golden Crust Bakery
  const bakeryUser = await prisma.user.create({
    data: {
      email: 'bakery@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const kitchenUser = await prisma.user.create({
    data: {
      email: 'kitchen@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const verifiedNgoUser = await prisma.user.create({
    data: {
      email: 'feedinghope@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const pendingNgoUser = await prisma.user.create({
    data: {
      email: 'citycare@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const priyaUser = await prisma.user.create({
    data: {
      email: 'priya@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const rahulUser = await prisma.user.create({
    data: {
      email: 'rahul@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const volunteerUser = await prisma.user.create({
    data: {
      email: 'arjun@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@breadcycle.demo',
      passwordHash: defaultPasswordHash,
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
  const donation1 = await prisma.donation.create({
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

  const donation2 = await prisma.donation.create({
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

  const donation3 = await prisma.donation.create({
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

  const donation4 = await prisma.donation.create({
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

  // Active reservation with code BC-4819
  const res1 = await prisma.reservation.create({
    data: {
      donationId: donation1.id,
      userId: priyaUser.id,
      reservedQuantity: 4,
      pickupCode: 'BC-4819',
      status: 'PENDING',
      claimType: 'INDIVIDUAL',
      expiresAt: new Date(now.getTime() + 90 * 60 * 1000),
    },
  });

  // NGO Bulk claim
  const res2 = await prisma.reservation.create({
    data: {
      donationId: donation2.id,
      userId: verifiedNgoUser.id,
      reservedQuantity: 20,
      pickupCode: 'BC-9921',
      status: 'PENDING',
      claimType: 'NGO_BULK',
      expiresAt: new Date(now.getTime() + 120 * 60 * 1000),
    },
  });

  await prisma.pickupTask.create({
    data: {
      reservationId: res2.id,
      volunteerId: volunteerUser.id,
      status: 'ASSIGNED',
      notes: 'Pick up 20 hot meal trays from Spice Symphony and transport to Feeding Hope shelter.',
    },
  });

  // Pre-seeded Expired Reservation ready for immediate 1-click recovery demonstration
  const expiredRes = await prisma.reservation.create({
    data: {
      donationId: donation3.id,
      userId: rahulUser.id,
      reservedQuantity: 10,
      pickupCode: 'BC-3108',
      status: 'PENDING',
      claimType: 'INDIVIDUAL',
      expiresAt: new Date(now.getTime() - 15 * 60 * 1000), // Expired 15 mins ago
      createdAt: new Date(now.getTime() - 75 * 60 * 1000),
    },
  });

  // Historical recovery event
  const pastReservation = await prisma.reservation.create({
    data: {
      donationId: donation1.id,
      userId: rahulUser.id,
      reservedQuantity: 4,
      pickupCode: 'BC-1142',
      status: 'RECOVERED',
      claimType: 'INDIVIDUAL',
      expiresAt: new Date(now.getTime() - 3 * 3600 * 1000),
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
    },
  });

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

  await prisma.notification.createMany({
    data: [
      {
        userId: bakeryUser.id,
        title: '🌟 New Surplus Reservation',
        message: 'Priya Sharma reserved 4 portions of Artisan Sourdough Loaves. Pickup code BC-4819 generated.',
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
    ],
  });

  console.log('✅ Backend database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
