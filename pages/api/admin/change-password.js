import { verifyPassword, hashPassword } from '../../../lib/auth'

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const { requireAdmin } = await import('../../../lib/auth')
  if(!requireAdmin(req,res)) return
  
  const { currentPassword, newPassword } = req.body || {}
  
  if(!currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' })
  if(!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe invalide (>=6)' })

  try {
    // Verify current password against the hashed password
    const isValid = await verifyPassword(currentPassword, process.env.ADMIN_PASSWORD_HASH)
    if(!isValid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword)
    
    // In production environments (like Vercel), we cannot write to filesystem
    // Return instructions for setting environment variables
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return res.status(200).json({
        success: true,
        message: 'Mot de passe mis à jour. Veuillez configurer la variable d\'environnement ADMIN_PASSWORD_HASH avec la valeur suivante:',
        newPasswordHash,
        instruction: 'Configurez ADMIN_PASSWORD_HASH dans les paramètres de votre plateforme avec la valeur ci-dessus.'
      })
    }
    
    // For development only: try to update .env.local (not recommended for production)
    try {
      const fs = await import('fs')
      const path = await import('path')
      const envPath = path.resolve(process.cwd(), '.env.local')
      
      let envContent = ''
      try {
        envContent = fs.readFileSync(envPath,'utf8')
      } catch(e) {
        // File doesn't exist, we'll create it
      }
      
      const lines = envContent.split(/\r?\n/)
      let found = false
      const out = lines.map(l=>{
        if(l.startsWith('ADMIN_PASSWORD_HASH=')){
          found = true
          return 'ADMIN_PASSWORD_HASH=' + newPasswordHash
        }
        return l
      })
      
      // Remove old ADMIN_PASSWORD if it exists
      const finalOut = out.filter(l => !l.startsWith('ADMIN_PASSWORD='))
      
      if(!found) finalOut.push('ADMIN_PASSWORD_HASH=' + newPasswordHash)
      
      fs.writeFileSync(envPath, finalOut.join('\n'))
      return res.status(200).json({ success:true })
    } catch(err) {
      console.error('Failed to write .env.local:', err && err.message)
      return res.status(500).json({ 
        error: "Impossible de modifier le fichier .env.local. Configurez manuellement la variable ADMIN_PASSWORD_HASH.",
        newPasswordHash
      })
    }
    
  } catch (error) {
    console.error('Password change error:', error.message)
    return res.status(500).json({ error: 'Erreur lors du changement de mot de passe' })
  }
}
