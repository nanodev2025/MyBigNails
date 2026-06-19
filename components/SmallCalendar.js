import { useState } from 'react'

/**
 * Petit calendrier pour sélectionner plusieurs jours
 * Utilisé dans les modales de verrouillage du planning admin
 */
export default function SmallCalendar({ selectedDays, onToggleDay }){
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
