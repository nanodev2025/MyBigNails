import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminDashboard from '../components/AdminDashboard'

export default function Admin(){
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(()=>{
    let mounted = true
    fetch('/api/admin/check').then(r=>{
      if(!mounted) return
      if(!r.ok) return router.replace('/admin/login')
      setLoading(false)
    }).catch(()=>{
      if(mounted) router.replace('/admin/login')
    })
    return ()=>{ mounted = false }
  },[])

  if(loading) return <div className="p-8">Vérification en cours...</div>

  return (
    <div>
      <Head>
        <title>Admin - Planning</title>
      </Head>
      <AdminDashboard />
    </div>
  )
}
