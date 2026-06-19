import jwt from 'jsonwebtoken'

const SECRET = process.env.ADMIN_JWT_SECRET || 'dev_admin_secret_change_me'

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
