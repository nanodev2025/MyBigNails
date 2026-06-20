#!/usr/bin/env node

/**
 * Script to generate a bcrypt hash for admin passwords
 * Usage: node scripts/generate-password-hash.js <password>
 */

const bcrypt = require('bcryptjs')

async function generateHash(password) {
  if (!password) {
    console.error('Usage: node scripts/generate-password-hash.js <password>')
    process.exit(1)
  }
  
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)
  
  console.log('Generated password hash:')
  console.log(hash)
  console.log('\nAdd this to your .env.local file:')
  console.log(`ADMIN_PASSWORD_HASH=${hash}`)
}

const password = process.argv[2]
generateHash(password).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})