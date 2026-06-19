// Carte de prestation
export default function ServiceCard({ service }){
  return (
    <div className="bg-white p-4 rounded-xl shadow-soft">
      <h3 className="font-elegant">{service.title}</h3>
      <p className="text-sm text-gray-600 mt-1">Durée: {service.duration} min</p>
      <p className="text-lg font-semibold mt-3">{service.price} €</p>
    </div>
  )
}
