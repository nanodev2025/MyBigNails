// Galerie simple avec images Unsplash placeholder
const images = [
  'https://images.unsplash.com/photo-1545235617-9465c7e97a9c?w=1200&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80',
  'https://images.unsplash.com/photo-1504198266285-165d6e7c8bd6?w=1200&q=80',
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=1200&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80'
]

export default function Gallery(){
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {images.map((src,i)=> (
        <div key={i} className="rounded-xl overflow-hidden">
          <img src={src} alt={`Ongles ${i+1}`} className="w-full h-36 object-cover" />
        </div>
      ))}
    </div>
  )
}
