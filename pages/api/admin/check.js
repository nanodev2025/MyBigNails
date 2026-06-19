import { requireAdmin } from '../../../lib/auth'

export default function handler(req,res){
  const decoded = requireAdmin(req,res)
  if(!decoded) return
  return res.status(200).json({ ok: true, admin: decoded })
}
