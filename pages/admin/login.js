import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AdminLogin(){
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e){
    e.preventDefault()
    setLoading(true); setError(null)
    
    // Basic client-side validation
    if(!password || password.length < 6){
      setError('Mot de passe requis (minimum 6 caractères)')
      setLoading(false)
      return
    }
    
    try{
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if(!res.ok) throw new Error((await res.json()).error || 'Erreur')
      router.push('/admin')
    }catch(err){
      setError(err.message)
      setLoading(false)
      
      // Trigger client-side rate limiting if server indicates it
      if(err.message.includes('Invalid credentials') && window._handleFailedAttempt){
        window._handleFailedAttempt()
      }
    }
  }
  
  // Add rate limiting on client side to prevent brute force
  useEffect(() => {
    let failedAttempts = 0
    let lastAttempt = 0
    const MAX_ATTEMPTS = 5
    const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes
    
    const handleFailedAttempt = () => {
      failedAttempts++
      lastAttempt = Date.now()
      
      if(failedAttempts >= MAX_ATTEMPTS){
        const remainingTime = Math.ceil((lastAttempt + LOCKOUT_TIME - Date.now()) / 1000 / 60)
        setError(`Trop de tentatives. Veuillez patienter ${remainingTime} minutes.`)
        setLoading(false)
        
        // Disable form temporarily
        setTimeout(() => {
          failedAttempts = 0
        }, LOCKOUT_TIME)
      }
    }
    
    // Expose the function to be called on failed login
    window._handleFailedAttempt = handleFailedAttempt
    
    return () => {
      delete window._handleFailedAttempt
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <form onSubmit={submit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-4 text-center">Connexion Admin</h2>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <label className="block text-sm font-medium text-gray-700">Mot de passe Admin</label>
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          className="mt-1 mb-4 block w-full rounded border-gray-200 shadow-sm"
          placeholder="Entrez le mot de passe"
          required
        />
        <button className="w-full bg-pink-500 text-white py-2 rounded" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
