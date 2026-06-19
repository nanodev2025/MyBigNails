import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const envPath = path.resolve(process.cwd(), '.env.local')

function readEnv(){
  try{ return fs.readFileSync(envPath,'utf8') }catch(e){ return '' }
}

function writeEnv(content){
  fs.writeFileSync(envPath, content, 'utf8')
}

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { requireAdmin } = await import('../../../lib/auth')
  if(!requireAdmin(req,res)) return
  const { currentPassword, newPassword } = req.body || {}
  if(!currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' })
  if(!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe invalide (>=6)' })

  // determine current admin password from .env.local (fallback to process.env)
  const envRaw = readEnv()
  const match = envRaw.match(/^ADMIN_PASSWORD=(.*)$/m)
  const existing = match ? match[1].trim() : (process.env.ADMIN_PASSWORD || '')
  if(currentPassword !== existing) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })

  // replace ADMIN_PASSWORD value in .env.local (or append)
  const lines = envRaw.split(/\r?\n/)
  let found = false
  const out = lines.map(l=>{
    if(l.startsWith('ADMIN_PASSWORD=')){
      found = true
      return 'ADMIN_PASSWORD=' + newPassword
    }
    return l
  })
  if(!found) out.push('ADMIN_PASSWORD=' + newPassword)
  try{
    writeEnv(out.join('\n'))
    return res.status(200).json({ success:true })
  }catch(err){
    // In serverless environments (Vercel) filesystem may be read-only.
    // Return a clear JSON error so frontend can show a helpful message.
    console.error('Failed to write .env.local:', err && err.message)
    return res.status(500).json({ error: "Impossible de modifier le mot de passe sur cet environnement. Configurez ADMIN_PASSWORD dans les variables d'environnement de la plateforme (ex: Vercel)." })
  }
}
