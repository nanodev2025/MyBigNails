export default function Modal({ open, title, children, onConfirm, onCancel, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', type = 'info' }){
  if(!open) return null
  const color = type === 'warning' ? 'bg-yellow-50 border-yellow-200' : type === 'success' ? 'bg-rose-powder border-rose-gold' : 'bg-white border-gray-200'
  
  // If onCancel is not provided, use onConfirm for clicking outside
  const handleBackdropClick = onCancel || onConfirm || (() => {})
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={handleBackdropClick}></div>
      <div className={`relative w-full max-w-md mx-auto p-4 rounded-xl shadow-soft border ${color}`}>
        <div className="mb-3">
          <h3 className="text-lg font-elegant">{title}</h3>
        </div>
        <div className="mb-4 text-sm text-gray-700">{children}</div>
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <button onClick={onCancel} className="px-3 py-2 rounded-full border">{cancelLabel}</button>
          ) : null}
          <button onClick={onConfirm} className="px-3 py-2 rounded-full btn-accent">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
