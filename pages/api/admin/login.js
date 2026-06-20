import { signToken, verifyPassword } from '../../../lib/auth'

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const { password } = req.body || {}
  
  if(!password) return res.status(401).json({ error: 'Password is required' })
  
  try {
    // Verify password against the hashed password
    const isValid = await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)
    if(!isValid) {
      // Trigger client-side rate limiting
      return res.status(401).json({ 
        error: 'Invalid credentials',
        rateLimitTrigger: true 
      })
    }
  } catch (error) {
    console.error('Password verification error:', error.message)
    return res.status(500).json({ error: 'Authentication error' })
  }

  const token = signToken({ admin: true })
  const maxAge = 8 * 60 * 60 // 8 hours in seconds
  
  // Always use Secure flag in production, HttpOnly for security
  const cookieOptions = [
    `token=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Strict'
  ]
  
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure')
  }
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '))
  return res.status(200).json({ success: true })
}
