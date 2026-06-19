import { useEffect, useState, useRef } from 'react'
import Modal from './Modal'
import Toast from './Toast'

export default function BookingCalendar({ services }){
  const [selectedService, setSelectedService] = useState(null)
  const [bookings, setBookings] = useState([])
  const [settings, setSettings] = useState(null)
  const [startOffset, setStartOffset] = useState(0) // days offset from today (used for week navigation)
  const [loadedDays, setLoadedDays] = useState([]) // days loaded into the planner
  const [visibleIndex, setVisibleIndex] = useState(0) // first visible day index (for mobile scroll)
  const daysContainerRef = useRef(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({firstName:'', lastName:'', phone:'', email:''})
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

  function generateSlots(day){
    if(!settings) return []
    const open = settings.openHour ?? 9
    const close = settings.closeHour ?? 18
    const interval = settings.slotInterval ?? 60
    const slots = []
    const cur = new Date(day)
    cur.setHours(open,0,0,0)
    while(cur.getHours() < close){
      slots.push(new Date(cur))
      cur.setMinutes(cur.getMinutes() + interval)
    }
    return slots
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

  async function submitBooking(){
    if(!selectedService || !selectedSlot) return setToast({open:true, message:'Veuillez choisir une prestation et un créneau', type:'warning'})
    // require first name AND last name
    if(!(form.firstName && form.firstName.trim()) || !(form.lastName && form.lastName.trim())){
      return setToast({open:true, message:'Le prénom et le nom sont obligatoires', type:'warning'})
    }
    // require phone OR email
    if(!(form.phone && form.phone.trim()) && !(form.email && form.email.trim())){
      return setToast({open:true, message:'Veuillez fournir un téléphone ou un email', type:'warning'})
    }
    const payload = { serviceId: selectedService.id, date: selectedSlot.toISOString(), ...form }
    setLoading(true)
    const resp = await fetch('/api/bookings', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) })
    const data = await resp.json()
    setLoading(false)
    if(data.success){
      setBookings(prev => [...prev, data.booking])
      setSelectedSlot(null)
      setToast({open:true, message:'Rendez-vous demandé ✔️', type:'success'})
    } else {
      setToast({open:true, message:'Erreur: ' + (data.message || ''), type:'warning'})
    }
  }

  const animClass = direction===1 ? 'animate-slide-in-left' : 'animate-slide-in-right'
  // Mobile: horizontal scroll (flex row, touch-scroll). Desktop (sm): grid with 7 cols.
  const gridClass = 'flex gap-2 mt-3 overflow-x-auto touch-scroll sm:grid sm:grid-cols-7 sm:overflow-visible ' + animClass

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
          <button key={s.id} onClick={()=>setSelectedService(s)} className={'flex-1 p-3 rounded-xl ' + (selectedService?.id===s.id ? 'ring-2 ring-accent ' : '') + 'bg-white shadow-soft'}>
            <div className="font-elegant">{s.title}</div>
            <div className="text-sm text-gray-500">{s.duration} min • {s.price}€</div>
          </button>
        ))}
      </div>

      {/* Planning: affiché uniquement si une prestation est sélectionnée */}
      {selectedService && (
        <div className="mt-4 bg-white p-4 rounded-xl shadow-soft">
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

          <div ref={daysContainerRef} className={gridClass} key={animKey} onScroll={(e) => {
            const el = e.currentTarget
            try{
              const itemWidth = el.querySelector('[data-day]')?.offsetWidth || 120
              const firstIdx = Math.round(el.scrollLeft / itemWidth)
              if(firstIdx >= 0) setVisibleIndex(firstIdx)
            } catch(err){}
            if(el.scrollLeft + el.clientWidth >= el.scrollWidth - 40) appendDays(14)
          }}>
            {(isDesktop ? loadedDays.slice(viewStartIndex, viewStartIndex+7) : loadedDays).map(d => (
              <div data-day key={d.toDateString()} className="inline-block min-w-[120px] p-2 bg-nude rounded-lg text-center sm:block">
                <div className="text-xs">{d.toLocaleDateString(undefined,{weekday:'short'})}</div>
                <div className="text-sm font-semibold">{d.getDate()}</div>
                <div className="mt-2">
                  {generateSlots(d).map((slot, i) => {
                    const blocked = isTaken(slot) || isBlocked(slot)
                    return (
                      <button key={i} disabled={blocked} onClick={()=>{ if(!blocked) setSelectedSlot(slot) }} className={'m-1 p-1 px-2 rounded-full text-xs ' + (blocked ? 'bg-gray-200 text-gray-400 ' : 'bg-beige-warm ') + (selectedSlot && selectedSlot.getTime()===slot.getTime() ? 'ring-2 ring-accent' : '')}>
                        {slot.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedSlot && (
            <div className="mt-4">
              <h4 className="font-elegant">Confirmation</h4>
              <div className="text-sm text-gray-600">Prestation: {selectedService?.title || '—'}</div>
              <div className="text-sm">Créneau: {selectedSlot.toLocaleString()}</div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input className="p-2 rounded border" placeholder="Prénom" value={form.firstName} onChange={e=>setForm(f=>({...f, firstName:e.target.value}))} />
                <input className="p-2 rounded border" placeholder="Nom" value={form.lastName} onChange={e=>setForm(f=>({...f, lastName:e.target.value}))} />
                <input className="p-2 rounded border" placeholder="Téléphone" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} />
                <input className="p-2 rounded border" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
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
