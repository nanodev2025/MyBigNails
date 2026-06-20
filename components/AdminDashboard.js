import { useEffect, useState } from 'react'
import Modal from './Modal'
import Toast from './Toast'
import FullscreenModal from './FullscreenModal'
import SmallCalendar from './SmallCalendar'
import { enrichBookings } from '../lib/utils'

// Dashboard admin minimal pour gérer RDV et planning
export default function AdminDashboard(){
  const [bookings, setBookings] = useState([])
  const [settings, setSettings] = useState(null)
  const [carousel, setCarousel] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [fileInput, setFileInput] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [blockForm, setBlockForm] = useState({type:'range', start:'', end:''})
  const [selectedDays, setSelectedDays] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState({open:false,message:'',type:'info'})
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState({title:'', price:0, duration:60})
  const [openServices, setOpenServices] = useState(false)
  const [openBlocks, setOpenBlocks] = useState(false)
  const [billedAmount, setBilledAmount] = useState(0)
  const [paidBookings, setPaidBookings] = useState({}) // {bookingId: amount}
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  useEffect(()=>{
    fetchData()
  },[])

  // prevent background scroll when any modal is open
  useEffect(()=>{
    const anyOpen = openServices || openBlocks || modal?.open
    if(anyOpen) document.body.classList.add('overflow-hidden')
    else document.body.classList.remove('overflow-hidden')
    return ()=> document.body.classList.remove('overflow-hidden')
  },[openServices, openBlocks, modal])

  // Auto-refresh every 30 seconds
  useEffect(()=>{
    const interval = setInterval(()=>{
      fetchData()
    }, 30000)
    return ()=> clearInterval(interval)
  },[])

  async function fetchData(){
    const [bkRaw, st, car, bl, sv] = await Promise.all([
      fetch('/api/bookings').then(r=>r.json()),
      fetch('/api/admin/settings').then(r=>r.json()),
      fetch('/api/carousel').then(r=>r.json()),
      fetch('/api/admin/blocks').then(r=>r.json()),
      fetch('/api/services').then(r=>r.json())
    ])
    
    // Enrichir les bookings avec les données des services
    const enrichedBookings = enrichBookings(bkRaw || [], sv)
    
    setBookings(enrichedBookings)
    setSettings(st)
    setCarousel(car)
    setBlocks(bl)
    setServices(sv)
    setRefreshKey(k => k + 1)
    
    // Stocker dans localStorage pour la page transactions
    localStorage.setItem('allBookings', JSON.stringify(enrichedBookings))
  }

  async function updateStatus(id, status){
    setLoading(true)
    await fetch('/api/bookings', {method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify({id, status})})
    await fetchData()
    setLoading(false)
    setToast({open:true, message:'Statut mis à jour', type:'success'})
  }

  async function cancelBooking(id){
    setModal({open:true, title:'Annuler le rendez-vous', content:'Voulez-vous vraiment annuler ce rendez-vous ?', onConfirm: async ()=>{
      setModal({open:false})
      setLoading(true)
      await fetch('/api/bookings?id='+id, {method:'DELETE'})
      await fetchData()
      setLoading(false)
      setToast({open:true, message:'Rendez-vous annulé', type:'warning'})
    }, onCancel: ()=> setModal({open:false}), confirmLabel: 'Annuler le RDV', cancelLabel: 'Garder'})
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

  const weekRevenue = bookings.reduce((s,b)=> s + (b.price || 0), 0)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-elegant">Tableau de bord</h1>
        <div></div>{/* Espace réservé pour équilibrer le flex */}
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
          <div className="p-3 bg-green-100 rounded-lg cursor-pointer" onClick={()=> window.location.href='/admin/transactions'}>
            <div className="text-sm text-gray-600">Facturé</div>
            <div className="text-xl font-bold">{billedAmount} €</div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={()=>setOpenServices(true)} className="px-4 py-2 rounded-full btn-accent">Prestations</button>
          <button onClick={()=>setOpenBlocks(true)} className="px-4 py-2 rounded-full border">Vérouillage planning</button>
        </div>
      </section>

      <section className="mt-4 bg-white p-4 rounded-xl shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Rendez-vous</h3>
          <button onClick={()=>fetchData()} className="px-3 py-1 rounded-full border text-sm">↻ Rafraîchir</button>
        </div>
        <div className="mt-2">
          {bookings.map(b=> (
            <div key={b.id} className="p-3 border-b flex items-center justify-between">
              <div>
                <div className="font-medium">{b.firstName} {b.lastName} <span className="text-sm text-gray-500">{new Date(b.date).toLocaleString()}</span></div>
                <div className="text-sm text-gray-600">{b.serviceTitle} • {b.duration} min • {b.price} €</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-end">
                <button onClick={()=>cancelBooking(b.id)} className="w-full sm:w-auto px-2 py-1 text-sm rounded-full bg-red-100">Annuler</button>
                {!paidBookings[b.id] && (
                  <button onClick={()=>{
                    const service = services.find(s => s.id === b.serviceId || s.id === b.service_id)
                    const price = service?.price || b.price || 0
                    setSelectedBookingForPayment(b)
                    setPaymentAmount(price.toString())
                    setOpenPaymentModal(true)
                  }} className="w-full sm:w-auto px-2 py-1 text-sm rounded-full bg-green-100 text-green-800">Payé !</button>
                )}
                {paidBookings[b.id] && (
                  <span className="px-2 py-1 text-sm bg-green-100 text-green-800 rounded-full">Payé : {paidBookings[b.id]} €</span>
                )}
                <button onClick={()=>{
                  const content = (
                    <div>
                      {b.phone ? (<div className="mb-1"><a href={`tel:${b.phone}`} className="text-pink-600">Téléphone: {b.phone}</a></div>) : null}
                      {b.email ? (<div className="mb-1"><a href={`mailto:${b.email}`} className="text-pink-600">Email: {b.email}</a></div>) : null}
                      {(!b.phone && !b.email) && (<div className="text-sm text-gray-600">Aucun contact fourni</div>)}
                    </div>
                  )
                  setModal({ open:true, title:`Contact — ${b.firstName} ${b.lastName}`, content, onConfirm: ()=> setModal({open:false}), confirmLabel: 'Fermer' })
                }} className="w-full sm:w-auto px-2 py-1 text-sm rounded-full border">Contact</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Modals & Toasts admin - Updated */}
      {modal?.open && (
        <Modal open={modal.open} title={modal.title} onConfirm={modal.onConfirm} onCancel={modal.onCancel} confirmLabel={modal.confirmLabel || 'Enregistrer'} cancelLabel={modal.cancelLabel || 'Annuler'} type="warning">
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
          <div className="mt-2 flex gap-2">
            <button onClick={async ()=>{
              if(!serviceForm.title) return setToast({open:true,message:'Titre requis',type:'warning'})
              const url = serviceForm.id ? `/api/admin/services?id=${serviceForm.id}` : '/api/admin/services'
              const method = serviceForm.id ? 'PUT' : 'POST'
              const res = await fetch(url, {method, headers:{'content-type':'application/json'}, body:JSON.stringify(serviceForm)})
              const data = await res.json()
              if(data.success){ setServiceForm({title:'',price:0,duration:60, id: null}); await fetchData(); setToast({open:true,message:serviceForm.id ? 'Prestation modifiée' : 'Prestation ajoutée',type:'success'}) }
              else setToast({open:true,message:data.error||'Erreur',type:'warning'})
            }} className="px-3 py-2 rounded-full btn-accent">{serviceForm.id ? 'Modifier prestation' : 'Ajouter prestation'}</button>
            {serviceForm.id && <button onClick={()=>{ setServiceForm({title:'',price:0,duration:60, id: null}); }} className="px-3 py-2 rounded-full border">Annuler</button>}
          </div>

          <div className="mt-4 grid gap-2">
            {services.map(s=> (
              <div key={s.id} className="p-2 border-b flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-gray-600">{s.price} € • {s.duration} min</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>{ 
                    setServiceForm({title: s.title, price: s.price, duration: s.duration, id: s.id});
                  }} className="px-2 py-1 rounded-full border text-sm">Modifier</button>
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

      {/* Fullscreen modal for payment */}
      <FullscreenModal open={openPaymentModal} title={`Marquer comme payé — ${selectedBookingForPayment?.firstName || ''} ${selectedBookingForPayment?.lastName || ''}`} onClose={()=>{
                  const modalElement = document.querySelector('.payment-modal')
                  if(modalElement) {
                    modalElement.classList.add('payment-modal-exit')
                    setTimeout(() => setOpenPaymentModal(false), 400)
                  } else {
                    setOpenPaymentModal(false)
                  }
                }} className="payment-modal">
        <div className="p-4 flex flex-col h-full justify-between">
          <div className="flex-1 min-h-0 flex flex-col justify-start items-center space-y-4 pt-8">
            <div className="w-full max-w-xs flex flex-col items-center gap-6">
              <button
                onClick={() => setPaymentAmount(prev => (parseFloat(prev) || 0) + 5)}
                className="w-20 h-20 bg-pink-200 rounded-full text-5xl hover:bg-pink-300 transition-colors flex items-center justify-center"
              >
                +
              </button>
              <div className="relative w-full px-4">
                <label className="block text-sm font-medium mb-3 text-center">Montant payé (€)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e)=>setPaymentAmount(e.target.value)}
                  className="p-4 border-2 border-pink-200 rounded-full w-full text-center text-xl font-medium bg-rose-50 appearance-none"
                  style={{letterSpacing: '2px'}}
                />
              </div>
              <button
                onClick={() => setPaymentAmount(prev => Math.max(0, (parseFloat(prev) || 0) - 5))}
                className="w-20 h-20 bg-pink-200 rounded-full text-5xl hover:bg-pink-300 transition-colors flex items-center justify-center"
              >
                -
              </button>
            </div>
          </div>
          <div className="p-4 pb-8">
            <button
              onClick={()=>{
                const amount = parseFloat(paymentAmount) || 0
                if(selectedBookingForPayment){
                  setPaidBookings(prev => ({...prev, [selectedBookingForPayment.id]: amount}))
                  setBilledAmount(prev => prev + amount)
                  const modalElement = document.querySelector('.payment-modal')
                  if(modalElement) {
                    modalElement.classList.add('payment-modal-exit')
                    setTimeout(() => setOpenPaymentModal(false), 400)
                  } else {
                    setOpenPaymentModal(false)
                  }
                  setToast({open: true, message: `Montant de ${amount} € enregistré`, type: 'success'})
                }
              }}
              className="w-full py-3 rounded-full btn-accent text-lg font-medium"
            >
              Accepter le paiement
            </button>
          </div>
        </div>
      </FullscreenModal>

      {/* Section planning retirée du dashboard admin (contrôle centralisé via verrous) */}

      {/* Carousel moved to services modal for cleaner dashboard */}

      {/* Prestations moved to modal */}

      {/* Password change moved to small settings modal */}

      {/* Inline verrouillages supprimée — accessible via la modale "Vérouillage planning" */}
      <style jsx global>{`
        .payment-modal {
          animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .payment-modal-exit {
          animation: slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(100%);
          }
        }
        /* Masquer les boutons natifs des inputs number */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          appearance: none;
          margin: 0;
          display: none;
        }
        input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>

    </div>
  )
}
