import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AdminLogin(){
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e){
    e.preventDefault()
    setLoading(true); setError(null)
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
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <form onSubmit={submit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-4 text-center">Connexion Admin</h2>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
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
