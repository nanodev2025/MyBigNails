import fs from 'fs'
import path from 'path'
import { requireAdmin } from '../../../lib/auth'

const settingsPath = path.resolve(process.cwd(), 'data', 'settings.json')

function read(){
  try{ return JSON.parse(fs.readFileSync(settingsPath,'utf-8')) } catch(e){ return {} }
}

export default function handler(req,res){
  if(req.method === 'GET'){
    return res.status(200).json(read())
  }
  if(req.method === 'POST'){
    const decoded = requireAdmin(req,res)
    if(!decoded) return
    const body = req.body
    fs.writeFileSync(settingsPath, JSON.stringify(body, null, 2))
    return res.status(200).json({success:true})
  }
  res.status(405).json({error:'Méthode non autorisée'})
}
