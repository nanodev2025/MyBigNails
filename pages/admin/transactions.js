import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [services, setServices] = useState([])
  const [totalAmount, setTotalAmount] = useState(0)
  
  useEffect(() => {
    // Charger les services
    fetch('/api/services').then(r => r.json()).then(setServices)
    
    // Charger les RDV payés (simulation - dans une vraie app, cela viendrait de l'API)
    const paidBookings = JSON.parse(localStorage.getItem('paidBookings') || '{}')
    const bookings = JSON.parse(localStorage.getItem('allBookings') || '[]')
    
    const transactions = bookings
      .filter(b => paidBookings[b.id])
      .map(b => ({
        id: b.id,
        date: new Date(b.date),
        client: `${b.firstName} ${b.lastName}`,
        service: b.serviceTitle,
        amount: paidBookings[b.id],
        duration: b.duration
      }))
    
    setTransactions(transactions)
    setTotalAmount(transactions.reduce((sum, t) => sum + t.amount, 0))
  }, [])
  
  const filteredTransactions = transactions.filter(t => {
    if (filterPeriod !== 'all') {
      const now = new Date()
      const tDate = t.date
      
      if (filterPeriod === 'week' && tDate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)) {
        return false
      }
      if (filterPeriod === 'month' && tDate < new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())) {
        return false
      }
    }
    
    if (filterService !== 'all' && t.service !== filterService) {
      return false
    }
    
    return true
  })
  
  // Calculer les données pour le graphique
  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Revenus (€)',
      data: Array(12).fill(0),
      backgroundColor: 'rgba(255, 182, 193, 0.5)',
      borderColor: 'rgba(255, 105, 180, 1)',
      borderWidth: 2
    }]
  }
  
  // Remplir les données du graphique
  filteredTransactions.forEach(t => {
    const month = t.date.getMonth()
    chartData.datasets[0].data[month] += t.amount
  })
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Historique des transactions - Nail'Art</title>
      </Head>
      
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-elegant mb-6">Historique des transactions</h1>
        
        {/* Filtres */}
        <div className="bg-white p-4 rounded-xl shadow-soft mb-6">
          <h3 className="font-semibold mb-4">Filtres</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">Toutes périodes</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="year">Cette année</option>
            </select>
            
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">Tous services</option>
              {services.map(s => (
                <option key={s.id} value={s.title}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-nude p-4 rounded-xl">
            <div className="text-sm text-gray-600">Transactions totales</div>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
          </div>
          <div className="bg-green-100 p-4 rounded-xl">
            <div className="text-sm text-gray-600">Montant total</div>
            <div className="text-2xl font-bold">{totalAmount.toFixed(2)} €</div>
          </div>
          <div className="bg-rose-100 p-4 rounded-xl">
            <div className="text-sm text-gray-600">Moyenne par transaction</div>
            <div className="text-2xl font-bold">{(totalAmount / filteredTransactions.length || 0).toFixed(2)} €</div>
          </div>
        </div>
        
        {/* Graphique */}
        <div className="bg-white p-4 rounded-xl shadow-soft mb-6">
          <h3 className="font-semibold mb-4">Revenus par mois</h3>
          <div className="h-64 flex items-end justify-around">
            {chartData.labels.map((label, index) => (
              <div key={index} className="flex flex-col items-center w-full">
                <div
                  className="bg-pink-200 rounded-t-md w-full"
                  style={{
                    height: `${Math.min(chartData.datasets[0].data[index] / 20, 200)}px`,
                    transition: 'height 0.3s'
                  }}
                >
                  {chartData.datasets[0].data[index] > 0 && (
                    <div className="text-xs mt-1">{chartData.datasets[0].data[index]} €</div>
                  )}
                </div>
                <div className="text-xs mt-2">{label}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Liste des transactions */}
        <div className="bg-white p-4 rounded-xl shadow-soft">
          <h3 className="font-semibold mb-4">Détail des transactions ({filteredTransactions.length})</h3>
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucune transaction trouvée</div>
            ) : (
              filteredTransactions.sort((a, b) => b.date - a.date).map(t => (
                <div key={t.id} className="p-3 border-b flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.client}</div>
                    <div className="text-sm text-gray-600">
                      {t.date.toLocaleDateString()} • {t.service} • {t.duration} min
                    </div>
                  </div>
                  <div className="font-bold text-green-700">+{t.amount} €</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .font-elegant {
          font-family: 'Playfair Display', serif;
        }
      `}</style>
      {/* Bouton retour au dashboard */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => window.location.href = '/admin'}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-gray-50 transition-colors"
          aria-label="Retour au dashboard"
        >
          🏠
        </button>
      </div>
    </div>
  )
}