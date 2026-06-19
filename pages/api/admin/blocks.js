import fs from 'fs'
import path from 'path'

const FILE = path.resolve('./data/blocks.json')

function read(){
  try{ return JSON.parse(fs.readFileSync(FILE,'utf8')) }catch(e){ return [] }
}
function write(data){ fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) }

export default async function handler(req,res){
  if(req.method === 'GET') return res.status(200).json(read())
  if(req.method === 'POST'){
    const { requireAdmin } = await import('../../../lib/auth')
    if(!requireAdmin(req,res)) return
    const payload = req.body
    if(!payload || !payload.start) return res.status(400).json({ success:false, message:'start required' })
    const arr = read()
    const item = { id: Date.now().toString(), ...payload }
    arr.push(item)
    write(arr)
    return res.status(201).json({ success:true, item })
  }
  if(req.method === 'DELETE'){
    const { requireAdmin } = await import('../../../lib/auth')
    if(!requireAdmin(req,res)) return
    const { id } = req.query
    if(!id) return res.status(400).json({ success:false })
    const arr = read().filter(b=> b.id !== id)
    write(arr)
    return res.status(200).json({ success:true })
  }
  res.status(405).end()
}
