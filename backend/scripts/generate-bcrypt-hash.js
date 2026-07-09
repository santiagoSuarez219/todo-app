#!/usr/bin/env node

/**
 * One-time utility to generate bcrypt hash for AUTH_PASSWORD_HASH
 * Usage: node backend/scripts/generate-bcrypt-hash.js "your-password"
 * Do NOT commit this file with real passwords or hashes
 */

const bcryptjs = require('bcryptjs');

if (process.argv.length < 3) {
  console.error('Usage: node backend/scripts/generate-bcrypt-hash.js "password"');
  process.exit(1);
}

const password = process.argv[2];
const saltRounds = 10;

bcryptjs.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log('\nSet the following in your .env file:');
  console.log(`AUTH_PASSWORD=${password}`);
  console.log(`AUTH_PASSWORD_HASH=${hash}`);
  console.log('\n⚠️  AUTH_PASSWORD (plain text) is kept only for your own recovery reference —');
  console.log('    the login endpoint always verifies against AUTH_PASSWORD_HASH via bcrypt.compare().');
  console.log('⚠️  Do NOT commit this script output or .env to git\n');
});
