import { useEffect } from 'react'

export default function Toast({ open, message, onClose, type='info' }){
  useEffect(()=>{
    if(!open) return
    const t = setTimeout(()=> onClose && onClose(), 3500)
    return ()=> clearTimeout(t)
  },[open])

  if(!open) return null
  const bg = type === 'success' ? 'bg-rose-powder' : type === 'warning' ? 'bg-yellow-50' : 'bg-white'
  return (
    <div className="fixed right-4 top-4 z-50">
      <div className={`p-3 rounded-lg shadow-soft border ${bg}`}>
        <div className="text-sm text-gray-800">{message}</div>
      </div>
    </div>
  )
}
