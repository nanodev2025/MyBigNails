import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AdminIndex() {
  const router = useRouter()
  
  useEffect(() => {
    // Rediriger vers /admin (le vrai dashboard)
    router.replace('/admin.js')
  }, [])
  
  return <div>Redirection...</div>
}