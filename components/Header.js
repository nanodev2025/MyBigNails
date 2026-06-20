import Link from 'next/link'

// Header simple et mobile-first
export default function Header(){
  return (
    <header className="bg-white p-4 shadow-soft">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-nude flex items-center justify-center">💅</div>
          <div>
            <h3 className="font-elegant">Studio Doux Ongles</h3>
            <p className="text-xs text-gray-500">Beauté & soin des ongles</p>
          </div>
        </div>

        <nav className="flex gap-3 items-center">
          <a href="#" className="btn-accent rounded-full text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2">Prendre Rendez-vous</a>
        </nav>
      </div>
    </header>
  )
}
