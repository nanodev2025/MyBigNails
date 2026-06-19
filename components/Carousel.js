import { useEffect, useState, useRef } from 'react'

// Petit carrousel auto-play avec contrôles manuels
export default function Carousel({ images: propImages = [], interval = 3000 }){
  const images = propImages && propImages.length ? propImages : []
  const [index, setIndex] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(()=>{
    if(!images.length) return
    timeoutRef.current = setInterval(()=>{
      setIndex(i => (i+1) % images.length)
    }, interval)
    return ()=> clearInterval(timeoutRef.current)
  },[interval, images.length])

  function prev(){
    clearInterval(timeoutRef.current)
    setIndex(i => (i-1 + images.length) % images.length)
  }
  function next(){
    clearInterval(timeoutRef.current)
    setIndex(i => (i+1) % images.length)
  }

  if(!images.length) return null

  return (
    <div className="max-w-3xl mx-auto mt-4">
      <div className="relative rounded-xl overflow-hidden h-44 sm:h-52 bg-gray-100">
        <img src={images[index].url || images[index]} alt={`carousel-${index}`} className="w-full h-full object-cover" />

        <button aria-label="Précédent" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow">
          ‹
        </button>
        <button aria-label="Suivant" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow">
          ›
        </button>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_,i)=> (
            <button key={i} onClick={()=>setIndex(i)} className={`w-2 h-2 rounded-full ${i===index? 'bg-accent':'bg-white/60'}`}></button>
          ))}
        </div>
      </div>
    </div>
  )
}
