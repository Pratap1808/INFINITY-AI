/**
 * Utility script — generates a bcrypt hash of the owner password so it can
 * be stored in .env as OWNER_PASSWORD_HASH. The plain password is NEVER
 * stored anywhere.
 *
 * Usage:
 *   node backend/utils/hashPassword.js "yourStrongPassword"
 */
const bcrypt = require('bcryptjs');

const plain = process.argv[2];

if (!plain) {
  console.error('Usage: node hashPassword.js "yourPassword"');
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 12);
console.log('\nAdd this line to your backend/.env file:\n');
console.log(`OWNER_PASSWORD_HASH=${hash}\n`);
