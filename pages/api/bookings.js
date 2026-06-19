import fs from 'fs'
import path from 'path'
import { sanitizeText } from '../../lib/sanitize'

// simple in-memory rate limiter per IP
const RATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_MAX = 8
const rateMap = global._booking_rate_map || (global._booking_rate_map = new Map())

const bookingsPath = path.resolve(process.cwd(), 'data', 'bookings.json')
const servicesPath = path.resolve(process.cwd(), 'data', 'services.json')

function readJSON(p){
  try{ return JSON.parse(fs.readFileSync(p,'utf-8')) } catch(e){ return [] }
}

export default async function handler(req,res){
  if(req.method === 'GET'){
    const bookings = readJSON(bookingsPath)
    return res.status(200).json(bookings)
  }

  if(req.method === 'POST'){
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const now = Date.now()
    const arr = rateMap.get(ip) || []
    const recent = arr.filter(t=> now - t < RATE_WINDOW_MS)
    if(recent.length >= RATE_MAX) return res.status(429).json({ success:false, message:'Trop de requêtes, réessayez plus tard' })
    recent.push(now)
    rateMap.set(ip, recent)

    const body = req.body
    // sanitize inputs
    body.firstName = sanitizeText(body.firstName)
    body.lastName = sanitizeText(body.lastName)
    body.phone = sanitizeText(body.phone)
    body.email = sanitizeText(body.email)
    const bookings = readJSON(bookingsPath)
    const services = readJSON(servicesPath)
    const service = services.find(s=> s.id === body.serviceId)
    const date = new Date(body.date)

    // conflit si timestamp identique
    if(bookings.some(b=> new Date(b.date).getTime() === date.getTime())){
      return res.status(400).json({success:false, message:'Créneau déjà réservé'})
    }

    const id = 'b_' + Math.random().toString(36).slice(2,9)
    const booking = {
      id,
      serviceId: body.serviceId,
      serviceTitle: service ? service.title : '—',
      price: service ? service.price : 0,
      date: date.toISOString(),
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      phone: body.phone || '',
      email: body.email || '',
      status: 'pending'
    }
    bookings.push(booking)
    fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2))
    return res.status(200).json({success:true, booking})
  }

  if(req.method === 'PUT'){
    // protect: only admin can update status
    const { requireAdmin } = await import('../../lib/auth')
    if(!requireAdmin(req,res)) return
    const body = req.body
    const bookings = readJSON(bookingsPath)
    const idx = bookings.findIndex(b=> b.id === body.id)
    if(idx === -1) return res.status(404).json({error:'Not found'})
    bookings[idx] = {...bookings[idx], ...body}
    fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2))
    return res.status(200).json({success:true})
  }

  if(req.method === 'DELETE'){
    const { requireAdmin } = await import('../../lib/auth')
    if(!requireAdmin(req,res)) return
    const id = req.query.id
    let bookings = readJSON(bookingsPath)
    bookings = bookings.filter(b=> b.id !== id)
    fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2))
    return res.status(200).json({success:true})
  }

  res.status(405).json({error:'Méthode non autorisée'})
}
