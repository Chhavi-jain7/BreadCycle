const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const { hashPassword } = require('../lib/auth-helpers');

async function main() {
  if (process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') {
    throw new Error('Set DEMO_MODE=true in a non-production environment before creating a demo admin.');
  }

  const email = (process.env.DEMO_ADMIN_EMAIL || 'admin@breadcycle.demo').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('DEMO_ADMIN_EMAIL must be a valid email address.');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`${email} already exists; left the account and its password unchanged.`);
    return;
  }

  const password = crypto.randomBytes(18).toString('base64url');
  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: 'Local Demo Administrator',
      role: 'ADMIN',
    },
  });

  console.log('Created a local-only demo administrator. Save this generated password now:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
