import fs from 'fs'
import path from 'path'
import formidable from 'formidable'

const FILE = path.resolve('./data/carousel.json')
const UPLOAD_DIR = path.resolve('./public/uploads')

function read(){
  try{ return JSON.parse(fs.readFileSync(FILE,'utf8')) }catch(e){ return [] }
}
function write(data){ fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) }

export const config = {
  api: {
    bodyParser: false,
  }
}

export default async function handler(req,res){
  if(req.method === 'GET'){
    return res.status(200).json(read())
  }

  if(req.method === 'POST'){
    // parse multipart form
    const { requireAdmin } = await import('../../lib/auth')
    if(!requireAdmin(req,res)) return
    const form = formidable({ multiples:false, uploadDir: UPLOAD_DIR, keepExtensions: true })
    form.parse(req, (err, fields, files)=>{
      if(err) return res.status(500).json({ success:false, message: err.message })
      const file = files?.file || files?.image
      if(!file) return res.status(400).json({ success:false, message:'No file uploaded' })
      const filepath = file.filepath || file.path || file.newFilename ? (file.filepath || file.path) : null
      const filename = path.basename(filepath || file.name || file.newFilename)
      const urlPath = '/uploads/' + filename
      const arr = read()
      if(arr.length >= 10) return res.status(400).json({ success:false, message:'Limit 10 images' })
      const item = { id: Date.now().toString(), url: urlPath }
      arr.push(item)
      write(arr)
      return res.status(201).json({ success:true, item })
    })
    return
  }

  if(req.method === 'DELETE'){
    const { requireAdmin } = await import('../../lib/auth')
    if(!requireAdmin(req,res)) return
    const { id } = req.query
    if(!id) return res.status(400).json({ success:false })
    const arr = read()
    const item = arr.find(i=> i.id === id)
    const remaining = arr.filter(i=> i.id !== id)
    write(remaining)
    // remove file if exists and stored under /uploads
    try{
      if(item && item.url && item.url.startsWith('/uploads/')){
        const p = path.resolve('./public' + item.url)
        if(fs.existsSync(p)) fs.unlinkSync(p)
      }
    }catch(e){}
    return res.status(200).json({ success:true })
  }

  res.status(405).end()
}
