import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Validate that required environment variables are set
if (!process.env.ADMIN_JWT_SECRET) {
  console.error('ERROR: ADMIN_JWT_SECRET environment variable is not set!')
  process.exit(1)
}

if (!process.env.ADMIN_PASSWORD_HASH) {
  console.error('ERROR: ADMIN_PASSWORD_HASH environment variable is not set!')
  process.exit(1)
}

const SECRET = process.env.ADMIN_JWT_SECRET
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

// Helper function to hash passwords
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Helper function to verify passwords
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signToken(payload){
  return jwt.sign(payload, SECRET, { expiresIn: '8h' })
}

export function verifyToken(token){
  try{ return jwt.verify(token, SECRET) }catch(e){ return null }
}

export function getTokenFromReq(req){
  const cookie = req.headers?.cookie || ''
  const match = cookie.split(';').map(s=>s.trim()).find(s=> s.startsWith('token='))
  if(!match) return null
  return match.split('=')[1]
}

export function requireAdmin(req,res){
  const token = getTokenFromReq(req)
  if(!token) { res.status(401).json({ error: 'Unauthorized' }); return null }
  const decoded = verifyToken(token)
  if(!decoded){ res.status(401).json({ error: 'Invalid token' }); return null }
  return decoded
}
