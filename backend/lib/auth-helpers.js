const crypto = require('crypto');

const DEMO_PERSONAS = [
  {
    email: 'bakery@breadcycle.demo',
    name: 'Marco Rossi',
    role: 'RESTAURANT',
    organization: 'The Golden Crust Bakery',
    description: 'Artisan bakery donating fresh loaves, croissants & baguettes.',
    avatarBadge: '🥖 Bakery Donor',
  },
  {
    email: 'kitchen@breadcycle.demo',
    name: 'Chef Ananya Roy',
    role: 'RESTAURANT',
    organization: 'Spice Symphony Kitchen',
    description: 'Commercial kitchen donating warm, cooked meals with FSSAI compliance.',
    avatarBadge: '🍲 Hot Meals Donor',
  },
  {
    email: 'priya@breadcycle.demo',
    name: 'Priya Sharma',
    role: 'INDIVIDUAL',
    description: 'Community member reserving family portions for evening collection.',
    avatarBadge: '👤 Individual Recipient',
  },
  {
    email: 'feedinghope@breadcycle.demo',
    name: 'David Chen',
    role: 'NGO',
    organization: 'Feeding Hope Foundation (Verified)',
    description: 'Verified shelter & soup kitchen with 200-meal daily capacity.',
    avatarBadge: '🏛️ Verified NGO',
  },
  {
    email: 'citycare@breadcycle.demo',
    name: 'Fatima Al-Mansoor',
    role: 'NGO',
    organization: 'City Care Kitchen (Pending)',
    description: 'Community pantry currently awaiting administrative verification review.',
    avatarBadge: '⏳ Pending NGO',
  },
  {
    email: 'arjun@breadcycle.demo',
    name: 'Arjun Patel',
    role: 'VOLUNTEER',
    description: 'Bicycle & motorcycle courier delivering meals between donors and shelters.',
    avatarBadge: '🚴 Food Rescue Courier',
  },
  {
    email: 'admin@breadcycle.demo',
    name: 'Sarah Jenkins',
    role: 'ADMIN',
    description: 'Platform safety compliance officer and verification supervisor.',
    avatarBadge: '🛡️ Safety Administrator',
  },
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, expectedHash] = storedHash.split(':');
    const actualHash = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');
    return actualHash.length === expected.length && crypto.timingSafeEqual(actualHash, expected);
  }

  // Support existing demo records, which were seeded with SHA-256.
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(legacyHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function generatePickupCode() {
  return `BC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function pickupCodeHash(code, secret) {
  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}

function encryptPickupCode(code, secret) {
  const key = crypto.createHash('sha256').update(`breadcycle-pickup:${secret}`).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptPickupCode(encryptedValue, secret) {
  const [ivValue, tagValue, ciphertext] = encryptedValue.split(':');
  const key = crypto.createHash('sha256').update(`breadcycle-pickup:${secret}`).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  DEMO_PERSONAS,
  hashPassword,
  verifyPassword,
  generatePickupCode,
  pickupCodeHash,
  encryptPickupCode,
  decryptPickupCode,
};
