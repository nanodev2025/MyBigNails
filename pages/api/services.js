import fs from 'fs'
import path from 'path'

const dataPath = path.resolve(process.cwd(), 'data', 'services.json')

export default function handler(req, res){
  try{
    const raw = fs.readFileSync(dataPath,'utf-8')
    const services = JSON.parse(raw)
    res.status(200).json(services)
  } catch(e){
    res.status(500).json({error:'Impossible de lire les services'})
  }
}
