import { useEffect, useState, useRef } from 'react'
import Modal from './Modal'
import Toast from './Toast'
import { generateSlots, isValidEmail, isValidFrenchPhone } from '../lib/utils'

export default function BookingCalendar({ services }){
  const [selectedService, setSelectedService] = useState(null)
  const [bookings, setBookings] = useState([])
  const [settings, setSettings] = useState(null)
  const [loadedDays, setLoadedDays] = useState([]) // days loaded into the planner
  const [visibleIndex, setVisibleIndex] = useState(0) // first visible day index (for mobile scroll)
  const daysContainerRef = useRef(null)
  const planningRef = useRef(null)
  const formRef = useRef(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({firstName:'', lastName:'', phone:'', email:''})
  const [errors, setErrors] = useState({firstName:'', lastName:'', phone:'', email:''})
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [direction, setDirection] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProps, setModalProps] = useState({})
  const [toast, setToast] = useState({open:false, message:'', type:'info'})

  useEffect(()=>{
    fetch('/api/bookings').then(r=>r.json()).then(setBookings)
    fetch('/api/admin/settings').then(r=>r.json()).then(setSettings)
    fetch('/api/admin/blocks').then(r=>r.json()).then(setBlocks)
  },[])

  // initialise loadedDays (2 semaines)
  useEffect(()=>{
    const now = new Date()
    const arr = []
    for(let i=0;i<14;i++){
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      arr.push(d)
    }
    setLoadedDays(arr)
  },[])

  // helper pour ajouter n jours à la fin
  function appendDays(n){
    setLoadedDays(prev=>{
      const last = prev.length ? new Date(prev[prev.length-1]) : new Date()
      const add = []
      for(let i=1;i<=n;i++){
        const d = new Date(last)
        d.setDate(last.getDate() + i)
        add.push(d)
      }
      return prev.concat(add)
    })
  }

  function monthLabelFor(daysArr){
    if(!daysArr || !daysArr.length) return ''
    const f = daysArr[0]
    const l = daysArr[daysArr.length-1]
    if(f.getMonth() === l.getMonth() && f.getFullYear() === l.getFullYear()){
      return f.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
    }
    return `${f.toLocaleString('fr-FR', { month:'short', year:'numeric' })} - ${l.toLocaleString('fr-FR', { month:'short', year:'numeric' })}`
  }



  function isTaken(slot){
    return bookings.some(b => new Date(b.date).getTime() === slot.getTime())
  }

  function isBlocked(slot){
    if(!blocks || !blocks.length) return false
    const t = slot.getTime()
    return blocks.some(b=>{
      try{
        const s = new Date(b.start).getTime()
        const e = b.end ? new Date(b.end).getTime() : s + 24*3600*1000
        return t >= s && t < e
      }catch(err){ return false }
    })
  }

  // Vérifie si un slot est bloqué par la sélection actuelle en fonction de la durée du service
  function isConflictingWithSelection(slot) {
    if (!selectedSlot || !selectedService || !selectedService.duration) return false
    
    const slotTime = slot.getTime()
    const selectedTime = selectedSlot.getTime()
    const durationMinutes = selectedService.duration || 60
    const selectedEndTime = selectedTime + durationMinutes * 60000
    
    // Si le slot est le même que celui sélectionné, ne pas le bloquer
    if (slotTime === selectedTime) return false
    
    // Ne bloquer que si le slot commence APRES le début du créneau sélectionné ET avant la fin
    // Exemple: sélection à 10h00 avec 90min -> bloque 10h30, 11h00, mais PAS 9h00
    return slotTime > selectedTime && slotTime < selectedEndTime
  }

  // Vérifie si un slot est bloqué par une réservation existante en fonction de la durée du service
  function isConflictingWithExistingBooking(slot) {
    if (!selectedService || !selectedService.duration) return false
    
    const slotTime = slot.getTime()
    const durationMinutes = selectedService.duration || 60
    const slotEndTime = slotTime + durationMinutes * 60000
    
    return bookings.some(b => {
      // Trouver la durée du service de cette réservation
      const bookingService = services.find(s => s.id === b.serviceId || s.id === b.service_id)
      const bookingDuration = bookingService?.duration || 60
      const bookingTime = new Date(b.date).getTime()
      const bookingEndTime = bookingTime + bookingDuration * 60000
      
      // Vérifie si les intervalles se chevauchent vraiment
      // Le slot est bloqué si :
      // 1. Le slot commence DURANT une réservation existante (slotTime >= bookingTime && slotTime < bookingEndTime)
      // OU
      // 2. La réservation existante commence DURANT le slot (bookingTime >= slotTime && bookingTime < slotEndTime)
      // Mais PAS si le slot est complètement AVANT ou complètement APRES
      return (slotTime >= bookingTime && slotTime < bookingEndTime) || 
             (bookingTime >= slotTime && bookingTime < slotEndTime)
    })
  }

  async function submitBooking(){
    const newErrors = {firstName:'', lastName:'', phone:'', email:''}
    let hasError = false
    
    if(!selectedService || !selectedSlot) {
      return setToast({open:true, message:'Veuillez choisir une prestation et un créneau', type:'warning'})
    }
    
    // require first name OR last name
    if(!(form.firstName && form.firstName.trim()) && !(form.lastName && form.lastName.trim())){
      newErrors.firstName = 'Veuillez fournir un prénom'
      newErrors.lastName = 'ou un nom'
      hasError = true
    }
    
    // Validate phone format (10 digits)
    if(form.phone && form.phone.trim() && !isValidFrenchPhone(form.phone)){
      newErrors.phone = 'Le téléphone doit contenir 10 chiffres'
      hasError = true
    }
    
    // Validate email format
    if(form.email && form.email.trim() && !isValidEmail(form.email)){
      newErrors.email = 'Format d\'email invalide'
      hasError = true
    }
    
    // require phone OR email
    if(!(form.phone && form.phone.trim()) && !(form.email && form.email.trim())){
      if(!newErrors.phone) newErrors.phone = 'Veuillez fournir un téléphone'
      if(!newErrors.email) newErrors.email = 'ou un email'
      hasError = true
    }
    
    if(hasError) {
      setErrors(newErrors)
      return
    }
    const payload = { serviceId: selectedService.id, date: selectedSlot.toISOString(), ...form }
    setLoading(true)
    const resp = await fetch('/api/bookings', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) })
    const data = await resp.json()
    setLoading(false)
    if(data.success){
      // Recharger tous les RDV pour être sûr d'avoir les dernières données
      fetch('/api/bookings').then(r=>r.json()).then(setBookings)
      setSelectedSlot(null)
      setToast({open:true, message:'Rendez-vous demandé ✔️', type:'success'})
    } else {
      setToast({open:true, message:'Erreur: ' + (data.message || ''), type:'warning'})
    }
  }

  const animClass = direction===1 ? 'animate-slide-in-left' : 'animate-slide-in-right'

  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(()=>{
    const mq = () => window.matchMedia && window.matchMedia('(min-width: 640px)').matches
    function handle(){ setIsDesktop(mq()) }
    handle()
    window.addEventListener('resize', handle)
    return ()=> window.removeEventListener('resize', handle)
  },[])

  // viewStartIndex used on desktop to show window of 7 days
  const [viewStartIndex, setViewStartIndex] = useState(0)

  // visible days depending on viewport
  const visibleDays = isDesktop ? loadedDays.slice(viewStartIndex, viewStartIndex+7) : loadedDays.slice(visibleIndex, visibleIndex+7)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto p-2.5">
        {services.map(s => (
          <button key={s.id} onClick={()=>{
            setSelectedService(s)
            setTimeout(() => planningRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
          }} className={'flex-1 p-3 rounded-xl ' + (selectedService?.id===s.id ? 'ring-2 ring-accent ' : '') + 'bg-white shadow-soft'}>
            <div className="font-elegant">{s.title}</div>
            <div className="text-sm text-gray-500">{s.duration} min • {s.price}€</div>
          </button>
        ))}
      </div>

      {/* Planning: affiché uniquement si une prestation est sélectionnée */}
      {selectedService && (
        <div ref={planningRef} className="mt-4 bg-white p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between mb-2 max-w-3xl mx-auto">
            <div className="hidden sm:flex justify-start">
              <button onClick={() => {
                setDirection(-1)
                const newIndex = Math.max(0, viewStartIndex - 7)
                setViewStartIndex(newIndex)
                setAnimKey(k => k+1)
                if(loadedDays.length - (newIndex + 7) < 14) appendDays(14)
              }} disabled={viewStartIndex===0} className="px-3 py-1 rounded-full border">Précédent</button>
            </div>
            <div className="text-center text-xl font-semibold text-gray-800">{monthLabelFor(visibleDays)}</div>
            <div className="hidden sm:flex justify-end">
              <button onClick={() => {
                setDirection(1)
                const newIndex = viewStartIndex + 7
                if(newIndex + 7 > loadedDays.length) appendDays(14)
                setViewStartIndex(newIndex)
                setAnimKey(k => k+1)
              }} className="px-3 py-1 rounded-full border">Suivant</button>
            </div>
          </div>

          <div className="text-sm text-gray-600">Choisissez une date et un créneau</div>

          {/* Desktop : 7 jours fixes */}
          {isDesktop ? (
            <div className="max-w-full w-full">
              <div className="flex gap-2 mt-3 w-full whitespace-nowrap">
                {visibleDays.map(d => (
                  <div data-day key={d.toDateString()} className="w-[14%] p-2 bg-nude rounded-lg text-center">
                    <div className="text-xs">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div className="text-sm font-semibold">{d.getDate()}</div>
                    <div className="mt-2 flex flex-col">
                      {generateSlots(d, settings).map((slot, i) => {
                        const blocked = isTaken(slot) || isBlocked(slot) || isConflictingWithExistingBooking(slot) || isConflictingWithSelection(slot);
                        return (
                          <button
                            key={i}
                            disabled={blocked}
                            onClick={() => { 
                              if (!blocked) {
                                setSelectedSlot(slot)
                                setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
                              }
                            }}
                            className={'m-1 p-1 px-2 rounded-full text-xs w-full ' + (blocked ? 'bg-gray-200 text-gray-400 ' : 'bg-beige-warm ') + (selectedSlot && selectedSlot.getTime() === slot.getTime() ? 'ring-2 ring-accent' : '')}
                          >
                            {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Mobile : scroll horizontal */
            <div ref={daysContainerRef} className="flex gap-2 mt-3 w-full overflow-x-auto whitespace-nowrap" key={animKey}>
              {loadedDays.map(d => (
                <div data-day key={d.toDateString()} className="min-w-[120px] p-2 bg-nude rounded-lg text-center">
                  <div className="text-xs">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-sm font-semibold">{d.getDate()}</div>
                  <div className="mt-2 flex flex-col">
                    {generateSlots(d, settings).map((slot, i) => {
                      const blocked = isTaken(slot) || isBlocked(slot) || isConflictingWithExistingBooking(slot) || isConflictingWithSelection(slot);
                      return (
                        <button
                          key={i}
                          disabled={blocked}
                          onClick={() => { if (!blocked) setSelectedSlot(slot); }}
                          className={'m-1 p-1 px-2 rounded-full text-xs w-full ' + (blocked ? 'bg-gray-200 text-gray-400 ' : 'bg-beige-warm ') + (selectedSlot && selectedSlot.getTime() === slot.getTime() ? 'ring-2 ring-accent' : '')}
                        >
                          {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedSlot && (
            <div ref={formRef} className="mt-4">
              <h4 className="font-elegant">Confirmation</h4>
              <div className="text-sm text-gray-600">Prestation: {selectedService?.title || '—'}</div>
              <div className="text-sm">Créneau: {selectedSlot.toLocaleString()}</div>

              <div className="mt-3 flex flex-col gap-3">
                {/* Prénom ou Nom - Desktop: ligne, Mobile: colonne */}
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4">
                  <div className="flex-1 w-full sm:w-auto">
                    {errors.firstName && <div className="text-red-500 text-sm text-center">{errors.firstName}</div>}
                    <input className="p-2 rounded border w-full" placeholder="Prénom" value={form.firstName} onChange={e=>setForm(f=>({...f, firstName:e.target.value}))} />
                  </div>
                  <span className="text-gray-500 text-sm hidden sm:block">ou</span>
                  <div className="flex-1 w-full sm:w-auto">
                    {errors.lastName && <div className="text-red-500 text-sm text-center">{errors.lastName}</div>}
                    <input className="p-2 rounded border w-full" placeholder="Nom" value={form.lastName} onChange={e=>setForm(f=>({...f, lastName:e.target.value}))} />
                  </div>
                </div>
                
                {/* Téléphone ou Email - Desktop: ligne, Mobile: colonne */}
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4">
                  <div className="flex-1 w-full sm:w-auto">
                    {errors.phone && <div className="text-red-500 text-sm text-center">{errors.phone}</div>}
                    <input className="p-2 rounded border w-full" placeholder="Téléphone" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} />
                  </div>
                  <span className="text-gray-500 text-sm hidden sm:block">ou</span>
                  <div className="flex-1 w-full sm:w-auto">
                    {errors.email && <div className="text-red-500 text-sm text-center">{errors.email}</div>}
                    <input className="p-2 rounded border w-full" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => {
                  setModalProps({
                    title: 'Confirmer rendez-vous',
                    children: `Prestation: ${selectedService?.title || '—'}\nCréneau: ${selectedSlot.toLocaleString()}`,
                    onConfirm: async ()=>{ await submitBooking(); setModalOpen(false) },
                    onCancel: ()=> setModalOpen(false),
                    confirmLabel: 'Confirmer',
                    cancelLabel: 'Annuler',
                    type: 'warning'
                  })
                  setModalOpen(true)
                }} disabled={loading} className="btn-accent px-4 py-2 rounded-full">{loading ? 'Envoi...' : 'Valider la demande'}</button>
                <button onClick={()=>setSelectedSlot(null)} className="px-4 py-2 rounded-full border">Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} title={modalProps.title} onConfirm={modalProps.onConfirm} onCancel={modalProps.onCancel} confirmLabel={modalProps.confirmLabel} cancelLabel={modalProps.cancelLabel} type={modalProps.type}>
        {modalProps.children}
      </Modal>
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={()=>setToast({open:false,message:'',type:'info'})} />
    </div>
  )
}
