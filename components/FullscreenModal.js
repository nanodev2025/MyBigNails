export default function FullscreenModal({ open, title, onClose, children }){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative w-full h-full bg-white overflow-auto p-4 sm:p-8 transform transition duration-300 ease-out animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-elegant">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-600 text-lg px-3 py-2 rounded-md">✕</button>
        </div>
        <div className="min-h-[60vh]">{children}</div>
      </div>
    </div>
  )
}
