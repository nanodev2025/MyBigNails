import fs from 'fs'
import path from 'path'

const dataPath = path.resolve(process.cwd(), 'data', 'services.json')

function read(){ try{ return JSON.parse(fs.readFileSync(dataPath,'utf8')) }catch(e){ return [] } }
function write(d){ fs.writeFileSync(dataPath, JSON.stringify(d, null, 2)) }

export default async function handler(req,res){
  if(req.method === 'GET') return res.status(200).json(read())
  const { requireAdmin } = await import('../../../lib/auth')
  if(!requireAdmin(req,res)) return

  if(req.method === 'POST'){
    const body = req.body
    if(!body || !body.title) return res.status(400).json({ success:false, error:'title required' })
    const arr = read()
    const item = { id: Date.now().toString(), title: body.title, price: body.price || 0, duration: body.duration || 60 }
    arr.push(item)
    write(arr)
    return res.status(201).json({ success:true, item })
  }

  if(req.method === 'DELETE'){
    const { id } = req.query
    if(!id) return res.status(400).json({ success:false })
    const arr = read().filter(s=> s.id !== id)
    write(arr)
    return res.status(200).json({ success:true })
  }

  res.status(405).end()
}
