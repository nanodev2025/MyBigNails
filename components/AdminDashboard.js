import { useEffect, useState } from 'react'
import Modal from './Modal'
import Toast from './Toast'
import FullscreenModal from './FullscreenModal'

// Dashboard admin minimal pour gérer RDV et planning
export default function AdminDashboard(){
  const [bookings, setBookings] = useState([])
  const [settings, setSettings] = useState(null)
  const [carousel, setCarousel] = useState([])
  const [fileInput, setFileInput] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [blockForm, setBlockForm] = useState({type:'range', start:'', end:''})
  const [selectedDays, setSelectedDays] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState({open:false,message:'',type:'info'})
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState({title:'', price:0, duration:60})
  const [currPassword, setCurrPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)
  const [openServices, setOpenServices] = useState(false)
  const [openBlocks, setOpenBlocks] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)

  useEffect(()=>{
    fetchData()
  },[])

  // prevent background scroll when any modal is open
  useEffect(()=>{
    const anyOpen = openServices || openBlocks || openSettings || modal?.open
    if(anyOpen) document.body.classList.add('overflow-hidden')
    else document.body.classList.remove('overflow-hidden')
    return ()=> document.body.classList.remove('overflow-hidden')
  },[openServices, openBlocks, openSettings, modal])

  async function fetchData(){
    const bk = await fetch('/api/bookings').then(r=>r.json())
    const st = await fetch('/api/admin/settings').then(r=>r.json())
    const car = await fetch('/api/carousel').then(r=>r.json())
    const bl = await fetch('/api/admin/blocks').then(r=>r.json())
    const sv = await fetch('/api/services').then(r=>r.json())
    setBookings(bk)
    setSettings(st)
    setCarousel(car)
    setBlocks(bl)
    setServices(sv)
  }

  async function updateStatus(id, status){
    setLoading(true)
    await fetch('/api/bookings', {method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify({id, status})})
    await fetchData()
    setLoading(false)
    setToast({open:true, message:'Statut mis à jour', type:'success'})
  }

  async function cancelBooking(id){
    setModal({open:true, title:'Annuler le rendez-vous', content:'Voulez-vous vraiment annuler ?', onConfirm: async ()=>{
      setModal({open:false})
      setLoading(true)
      await fetch('/api/bookings?id='+id, {method:'DELETE'})
      await fetchData()
      setLoading(false)
      setToast({open:true, message:'Rendez-vous annulé', type:'warning'})
    }})
  }

  async function toggleDayOff(){
    const newClosed = settings.closedDays && settings.closedDays.length ? [] : [0] // toggle example
    await fetch('/api/admin/settings', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({...settings, closedDays:newClosed})})
    await fetchData()
  }

  // Carousel management
  async function addCarouselImage(){
    if(!fileInput) return setToast({open:true,message:'Fichier manquant',type:'warning'})
    if(carousel.length >= 10) return setToast({open:true,message:'Limite 10 images atteinte',type:'warning'})
    const fd = new FormData()
    fd.append('file', fileInput)
    const res = await fetch('/api/carousel', {method:'POST', body:fd})
    const data = await res.json()
    if(data.success){ setFileInput(null); await fetchData(); setToast({open:true,message:'Image ajoutée',type:'success'}) }
    else setToast({open:true,message:data.message||'Erreur',type:'warning'})
  }
  async function deleteCarouselImage(id){
    await fetch('/api/carousel?id='+id, {method:'DELETE'})
    await fetchData()
    setToast({open:true,message:'Image supprimée',type:'success'})
  }

  // Blocks management
  async function addBlock(){
    // prepare payloads (one or many) and check for conflicts with existing bookings
    const payloads = []
    if(blockForm.type === 'range'){
      if(!blockForm.start || !blockForm.end) return setToast({open:true,message:'Dates de début et fin requises',type:'warning'})
      payloads.push({ type: 'range', start: new Date(blockForm.start + 'T00:00:00').toISOString(), end: new Date(blockForm.end + 'T23:59:59').toISOString() })
    } else if(blockForm.type === 'day'){
      if(!selectedDays || !selectedDays.length) return setToast({open:true,message:'Sélectionnez au moins un jour',type:'warning'})
      for(const d of selectedDays){ payloads.push({ type: 'day', start: new Date(d + 'T00:00:00').toISOString() }) }
    }

    // helper: find bookings that overlap any payload window
    function bookingsForPayloads(plds){
      const conflicts = []
      for(const b of bookings){
        const bt = new Date(b.date).getTime()
        for(const p of plds){
          if(p.type === 'range'){
            const s = new Date(p.start).getTime()
            const e = new Date(p.end).getTime()
            if(bt >= s && bt <= e) conflicts.push(b)
          } else if(p.type === 'day'){
            const dayStart = new Date(p.start).toISOString().slice(0,10)
            const bDay = new Date(b.date).toISOString().slice(0,10)
            if(bDay === dayStart) conflicts.push(b)
          }
        }
      }
      // dedupe by id
      return Array.from(new Map(conflicts.map(c=>[c.id,c])).values())
    }

    const conflicts = bookingsForPayloads(payloads)
    if(conflicts.length){
      setModal({
        open:true,
        title: `Conflits détectés (${conflicts.length})`,
        content: (<div>
          <div className="mb-2">Des rendez-vous existent déjà sur les dates sélectionnées :</div>
          <div className="max-h-48 overflow-auto border rounded p-2">
            {conflicts.map(c=> (
              <div key={c.id} className="py-1 border-b last:border-b-0">
                <div className="font-medium">{c.firstName} {c.lastName}</div>
                <div className="text-sm text-gray-600">{new Date(c.date).toLocaleString()} • {c.serviceTitle}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-700">Voulez-vous quand même appliquer le verrouillage ? Les rendez-vous resteront enregistrés.</div>
        </div>),
        onConfirm: async ()=>{
          setModal({open:false})
          setLoading(true)
          try{
            for(const p of payloads){
              await fetch('/api/admin/blocks', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(p)})
            }
            setBlockForm({type:'range', start:'', end:''})
            setSelectedDays([])
            await fetchData()
            setToast({open:true,message:'Verrouillage appliqué malgré les rendez-vous',type:'success'})
          }catch(e){ setToast({open:true,message:'Erreur lors de l\'ajout',type:'warning'}) }
          setLoading(false)
        },
        onCancel: ()=> setModal({open:false})
      })
      return
    }

    // no conflicts: proceed
    setLoading(true)
    try{
      for(const p of payloads){
        await fetch('/api/admin/blocks', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(p)})
      }
      setBlockForm({type:'range', start:'', end:''})
      setSelectedDays([])
      await fetchData()
      setToast({open:true,message:'Verrouillage ajouté',type:'success'})
    }catch(e){ setToast({open:true,message:'Erreur',type:'warning'}) }
    setLoading(false)
  }
  async function deleteBlock(id){
    await fetch('/api/admin/blocks?id='+id, {method:'DELETE'})
    await fetchData()
    setToast({open:true,message:'Bloc supprimé',type:'success'})
  }

  // Small calendar component (inline) for selecting multiple days
  function SmallCalendar({ selectedDays, onToggleDay }){
    const [month, setMonth] = useState(new Date())
    function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1) }
    function daysInMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate() }
    const first = startOfMonth(month)
    const blanks = first.getDay() // 0-6 (Sun-Sat)
    const total = daysInMonth(month)
    const days = []
    for(let i=1;i<=total;i++) days.push(i)

    function formatDay(day){
      const d = new Date(month.getFullYear(), month.getMonth(), day)
      return d.toISOString().slice(0,10)
    }

    return (
      <div className="mt-2 p-2 border rounded">
        <div className="flex items-center justify-between mb-2">
          <button onClick={()=> setMonth(m=> new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-2 py-1 rounded border">‹</button>
          <div className="font-medium">{month.toLocaleString('fr-FR', {month:'long', year:'numeric'})}</div>
          <button onClick={()=> setMonth(m=> new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-2 py-1 rounded border">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center">
          {['D','L','M','M','J','V','S'].map(h=> <div key={h} className="text-gray-500">{h}</div>)}
          {Array.from({length: blanks}).map((_,i)=>(<div key={'b'+i}></div>))}
          {days.map(d=>{
            const iso = formatDay(d)
            const sel = selectedDays.includes(iso)
            return (
              <button key={iso} onClick={()=>onToggleDay(iso)} className={`p-2 rounded ${sel? 'bg-accent text-white':'hover:bg-gray-100'}`}>
                {d}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const weekRevenue = bookings.reduce((s,b)=> s + (b.price || 0), 0)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-elegant">Tableau de bord</h1>
        <button onClick={()=>setOpenSettings(true)} className="text-gray-600" aria-label="Paramètres">⚙️</button>
      </div>

      <section className="mt-4 bg-white p-4 rounded-xl shadow-soft">
        <h3 className="font-semibold">Statistiques rapides</h3>
        <div className="mt-2 flex gap-4">
          <div className="p-3 bg-nude rounded-lg">
            <div className="text-sm text-gray-600">RDV total</div>
            <div className="text-xl font-bold">{bookings.length}</div>
          </div>
          <div className="p-3 bg-nude rounded-lg">
            <div className="text-sm text-gray-600">Chiffre (prévisionnel)</div>
            <div className="text-xl font-bold">{weekRevenue} €</div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={()=>setOpenServices(true)} className="px-4 py-2 rounded-full btn-accent">Prestations</button>
          <button onClick={()=>setOpenBlocks(true)} className="px-4 py-2 rounded-full border">Vérouillage planning</button>
        </div>
      </section>

      <section className="mt-4 bg-white p-4 rounded-xl shadow-soft">
        <h3 className="font-semibold">Rendez-vous</h3>
        <div className="mt-2">
          {bookings.map(b=> (
            <div key={b.id} className="p-3 border-b flex items-center justify-between">
              <div>
                <div className="font-medium">{b.firstName} {b.lastName}</div>
                <div className="text-sm text-gray-600">{new Date(b.date).toLocaleString()} • {b.serviceTitle}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-end">
                <button onClick={()=>updateStatus(b.id,'confirmed')} className="w-full sm:w-auto px-2 py-1 text-sm rounded-full bg-green-100">Valider</button>
                <button onClick={()=>cancelBooking(b.id)} className="w-full sm:w-auto px-2 py-1 text-sm rounded-full bg-red-100">Annuler</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Modals & Toasts admin */}
      {modal?.open && (
        <Modal open={modal.open} title={modal.title} onConfirm={modal.onConfirm} onCancel={()=>setModal({open:false})} confirmLabel="Oui" cancelLabel="Non" type="warning">
          {modal.content}
        </Modal>
      )}
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={()=>setToast({open:false,message:'',type:'info'})} />

      {/* Fullscreen modals for Services and Blocks */}
      <FullscreenModal open={openServices} title="Gérer les Prestations" onClose={()=>setOpenServices(false)}>
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className="p-2 border rounded" placeholder="Titre" value={serviceForm.title} onChange={e=>setServiceForm(f=>({...f, title:e.target.value}))} />
            <div className="flex items-stretch border rounded overflow-hidden">
              <input type="number" className="p-2 flex-1 border-0" placeholder="Prix" value={serviceForm.price} onChange={e=>setServiceForm(f=>({...f, price: Number(e.target.value)}))} />
              <span className="px-3 bg-gray-50 text-sm flex items-center">€</span>
            </div>
            <div className="flex items-stretch border rounded overflow-hidden">
              <input type="number" className="p-2 flex-1 border-0" placeholder="Durée" value={serviceForm.duration} onChange={e=>setServiceForm(f=>({...f, duration: Number(e.target.value)}))} />
              <span className="px-3 bg-gray-50 text-sm flex items-center">min</span>
            </div>
          </div>
          <div className="mt-2">
            <button onClick={async ()=>{
              if(!serviceForm.title) return setToast({open:true,message:'Titre requis',type:'warning'})
              const res = await fetch('/api/admin/services', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(serviceForm)})
              const data = await res.json()
              if(data.success){ setServiceForm({title:'',price:0,duration:60}); await fetchData(); setToast({open:true,message:'Prestation ajoutée',type:'success'}) }
              else setToast({open:true,message:data.error||'Erreur',type:'warning'})
            }} className="px-3 py-2 rounded-full btn-accent">Ajouter prestation</button>
          </div>

          <div className="mt-4 grid gap-2">
            {services.map(s=> (
              <div key={s.id} className="p-2 border-b flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-gray-600">{s.price} € • {s.duration} min</div>
                </div>
                <div>
                  <button onClick={async ()=>{ await fetch('/api/admin/services?id='+s.id, {method:'DELETE'}); await fetchData(); setToast({open:true,message:'Prestation supprimée',type:'success'}) }} className="px-2 py-1 rounded-full border text-sm">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FullscreenModal>

      <FullscreenModal open={openBlocks} title="Gérer les Verrouillages" onClose={()=>setOpenBlocks(false)}>
        <div>
          <div className="grid grid-cols-1 gap-2">
            <select className="p-2 border rounded" value={blockForm.type} onChange={e=>{ setBlockForm(f=>({...f, type:e.target.value})); setSelectedDays([]); }}>
              <option value="range">Plage (date de début / date de fin)</option>
              <option value="day">Journées (sélection multiple)</option>
            </select>

            {blockForm.type === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="date" className="p-2 border rounded" value={blockForm.start} onChange={e=>setBlockForm(f=>({...f, start:e.target.value}))} />
                <input type="date" className="p-2 border rounded" value={blockForm.end} onChange={e=>setBlockForm(f=>({...f, end:e.target.value}))} />
              </div>
            )}

            {blockForm.type === 'day' && (
              <div>
                <SmallCalendar selectedDays={selectedDays} onToggleDay={(d)=>{
                  setSelectedDays(prev=> prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])
                }} />
                <div className="mt-2 text-sm text-gray-600">Sélectionnées: {selectedDays.length} jour(s)</div>
              </div>
            )}

            <div className="mt-2">
              <button onClick={addBlock} className="px-3 py-2 rounded-full btn-accent">Ajouter verrouillage</button>
            </div>
          </div>

          <div className="mt-4">
            {blocks.map(b=> (
              <div key={b.id} className="p-2 border-b flex items-center justify-between">
                <div>
                  <div className="text-sm">{b.type} • {new Date(b.start).toLocaleString()} {b.end ? ' - ' + new Date(b.end).toLocaleString() : ''}</div>
                </div>
                <div>
                  <button onClick={()=>deleteBlock(b.id)} className="px-2 py-1 rounded-full border text-sm">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FullscreenModal>

      {/* Small settings modal for password change */}
      {openSettings && (
        <Modal open={openSettings} title="Paramètres" onConfirm={()=>setOpenSettings(false)} onCancel={()=>setOpenSettings(false)} confirmLabel="Fermer">
          <div className="grid grid-cols-1 gap-2">
            <input type="password" placeholder="Mot de passe actuel" className="p-2 border rounded" value={currPassword} onChange={e=>setCurrPassword(e.target.value)} />
            <input type="password" placeholder="Nouveau mot de passe" className="p-2 border rounded" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
            <input type="password" placeholder="Confirmer le nouveau mot de passe" className="p-2 border rounded" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={async ()=>{
                if(!currPassword) return setToast({open:true,message:'Mot de passe actuel requis',type:'warning'})
                if(!newPassword || newPassword.length < 6) return setToast({open:true,message:'Nouveau mot de passe invalide (>=6)',type:'warning'})
                if(newPassword !== confirmPassword) return setToast({open:true,message:'Les mots de passe ne correspondent pas',type:'warning'})
                setChangingPwd(true)
                try{
                  const res = await fetch('/api/admin/change-password', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ currentPassword: currPassword, newPassword })})
                  const text = await res.text()
                  let data = {}
                  try{ data = JSON.parse(text) }catch(_){ data = { error: text } }
                  if(res.ok && data.success){ setCurrPassword(''); setNewPassword(''); setConfirmPassword(''); setToast({open:true,message:'Mot de passe changé',type:'success'}); setOpenSettings(false) }
                  else setToast({open:true,message:data.error||'Erreur lors du changement de mot de passe',type:'warning'})
                }catch(e){ setToast({open:true,message:'Erreur réseau — impossible de contacter le serveur',type:'warning'}) }
                setChangingPwd(false)
              }} className="px-3 py-2 rounded-full btn-accent">{changingPwd? 'En cours...' : 'Modifier mot de passe'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Section planning retirée du dashboard admin (contrôle centralisé via verrous) */}

      {/* Carousel moved to services modal for cleaner dashboard */}

      {/* Prestations moved to modal */}

      {/* Password change moved to small settings modal */}

      {/* Inline verrouillages supprimée — accessible via la modale "Vérouillage planning" */}
    </div>
  )
}
