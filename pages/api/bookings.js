import fs from 'fs'
import path from 'path'
import { sanitizeText } from '../../lib/sanitize'
import { createClient } from '@supabase/supabase-js'

// simple in-memory rate limiter per IP
const RATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_MAX = 8
const rateMap = global._booking_rate_map || (global._booking_rate_map = new Map())

const bookingsPath = path.resolve(process.cwd(), 'data', 'bookings.json')
const servicesPath = path.resolve(process.cwd(), 'data', 'services.json')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

// Mask sensitive keys in error messages
const maskedSupabaseKey = SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 4)}...${SUPABASE_KEY.slice(-4)}` : null

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

function readJSON(p){
  try{ return JSON.parse(fs.readFileSync(p,'utf-8')) } catch(e){ return [] }
}

export default async function handler(req,res){
  if(req.method === 'GET'){
    if(supabase){
      try{
        const { data, error } = await supabase.from('bookings').select('*').order('date', { ascending: true })
        if(error) throw error
        return res.status(200).json(data)
      }catch(err){
        console.error('Supabase GET bookings error', err && err.message)
        // fallback to local file
      }
    }
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

    const body = req.body || {}
    // sanitize inputs
    const firstName = sanitizeText(body.firstName)
    const lastName = sanitizeText(body.lastName)
    const phone = sanitizeText(body.phone)
    const email = sanitizeText(body.email)
    const serviceId = body.serviceId
    const date = new Date(body.date)

    if(isNaN(date.getTime())) return res.status(400).json({ success:false, error: 'Date invalide' })

    // load services (from supabase or local)
    let service = null
    if(supabase){
      try{
        const { data: svs, error: svError } = await supabase.from('services').select('*')
        if(!svError) service = svs.find(s=> s.id === serviceId)
      }catch(e){ console.error('Supabase services read error', e && e.message) }
    }
    if(!service){
      const services = readJSON(servicesPath)
      service = services.find(s=> s.id === serviceId) || null
    }

    // conflict check
    if(supabase){
      try{
        const { data: exists, error: exErr } = await supabase.from('bookings').select('id').eq('date', date.toISOString()).limit(1)
        if(exErr) throw exErr
        if(exists && exists.length) return res.status(400).json({ success:false, message:'Créneau déjà réservé' })
      }catch(e){ console.error('Supabase conflict check error', e && e.message) }
    } else {
      const bookingsLocal = readJSON(bookingsPath)
      if(bookingsLocal.some(b=> new Date(b.date).getTime() === date.getTime())) return res.status(400).json({success:false, message:'Créneau déjà réservé'})
    }

    const bookingItem = {
      service_id: serviceId,
      service_title: service ? (service.title || service.service_title) : '—',
      price: service ? (service.price || 0) : 0,
      date: date.toISOString(),
      first_name: firstName || '',
      last_name: lastName || '',
      phone: phone || '',
      email: email || '',
      status: 'pending'
    }

    if(supabase){
      try{
        const { data, error } = await supabase.from('bookings').insert([bookingItem]).select().single()
        if(error) throw error
        return res.status(200).json({ success:true, booking: data })
      }catch(err){
        console.error('Supabase insert booking error', err && err.message)
        return res.status(500).json({ success:false, error: String(err.message || err) })
      }
    }

    // fallback local file (dev)
    const bookings = readJSON(bookingsPath)
    const id = 'b_' + Math.random().toString(36).slice(2,9)
    const booking = {
      id,
      serviceId: serviceId,
      serviceTitle: bookingItem.service_title,
      price: bookingItem.price,
      date: bookingItem.date,
      firstName: bookingItem.first_name,
      lastName: bookingItem.last_name,
      phone: bookingItem.phone,
      email: bookingItem.email,
      status: bookingItem.status
    }
    bookings.push(booking)
    try{
      fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2))
    }catch(err){
      console.error('Failed to write bookings.json:', err && err.message)
      return res.status(500).json({ success:false, error: 'Impossible d\'enregistrer la réservation sur cet environnement.' })
    }
    return res.status(200).json({success:true, booking})
  }

  if(req.method === 'PUT'){
    // protect: only admin can update status
    const { requireAdmin } = await import('../../lib/auth')
    if(!requireAdmin(req,res)) return
    const body = req.body
    if(supabase){
      try{
        // map camelCase keys from frontend to snake_case DB columns
        const updatePayload = { ...body }
        if(updatePayload.firstName !== undefined){ updatePayload.first_name = updatePayload.firstName; delete updatePayload.firstName }
        if(updatePayload.lastName !== undefined){ updatePayload.last_name = updatePayload.lastName; delete updatePayload.lastName }
        if(updatePayload.serviceId !== undefined){ updatePayload.service_id = updatePayload.serviceId; delete updatePayload.serviceId }
        if(updatePayload.serviceTitle !== undefined){ updatePayload.service_title = updatePayload.serviceTitle; delete updatePayload.serviceTitle }
        if(updatePayload.datetime !== undefined){ updatePayload.date = new Date(updatePayload.datetime).toISOString(); delete updatePayload.datetime }
        if(updatePayload.date !== undefined){ updatePayload.date = new Date(updatePayload.date).toISOString() }
        // don't try to update primary key
        delete updatePayload.id

        const { data, error } = await supabase.from('bookings').update(updatePayload).eq('id', body.id).select().single()
        if(error) throw error
        return res.status(200).json({ success:true, booking: data })
      }catch(err){
        console.error('Supabase update booking error', err && err.message)
        return res.status(500).json({ success:false, error: String(err.message || err) })
      }
    }
    const bookings = readJSON(bookingsPath)
    const idx = bookings.findIndex(b=> b.id === body.id)
    if(idx === -1) return res.status(404).json({error:'Not found'})
    bookings[idx] = {...bookings[idx], ...body}
    try{
      fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2))
    }catch(err){
      console.error('Failed to write bookings.json (PUT):', err && err.message)
      return res.status(500).json({ success:false, error: 'Impossible de mettre à jour la réservation sur cet environnement.' })
    }
    return res.status(200).json({success:true})
  }

  if(req.method === 'DELETE'){
    const { requireAdmin } = await import('../../lib/auth')
    if(!requireAdmin(req,res)) return
    const id = req.query.id
    if(supabase){
      try{
        const { error } = await supabase.from('bookings').delete().eq('id', id)
        if(error) throw error
        return res.status(200).json({ success:true })
      }catch(err){
        console.error('Supabase delete booking error', err && err.message)
        return res.status(500).json({ success:false, error: String(err.message || err) })
      }
    }
    let bookings = readJSON(bookingsPath)
    bookings = bookings.filter(b=> b.id !== id)
    try{
      fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2))
    }catch(err){
      console.error('Failed to write bookings.json (DELETE):', err && err.message)
      return res.status(500).json({ success:false, error: 'Impossible de supprimer la réservation sur cet environnement.' })
    }
    return res.status(200).json({success:true})
  }

  res.status(405).json({error:'Méthode non autorisée'})
}
