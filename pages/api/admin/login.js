import { signToken } from '../../../lib/auth'

export default function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password } = req.body || {}
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpass'
  if(!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ admin: true })
  const maxAge = 8 * 60 * 60 // 8 hours in seconds
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict; ${secure}`)
  return res.status(200).json({ success: true })
}
