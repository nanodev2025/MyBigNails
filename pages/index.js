import Head from 'next/head'
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import ServiceCard from '../components/ServiceCard'
import BookingCalendar from '../components/BookingCalendar'
import Carousel from '../components/Carousel'

export default function Home(){
  const [services, setServices] = useState([])
  const [carouselImages, setCarouselImages] = useState([])

  useEffect(()=>{
    fetch('/api/services').then(r=>r.json()).then(setServices)
    fetch('/api/carousel').then(r=>r.json()).then(setCarouselImages)
  },[])

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Studio Beauté - Prendre Rendez-vous</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <Header />

      <main className="p-4 max-w-3xl mx-auto flex-1 pb-safe">
        {carouselImages.length > 0 && <Carousel images={carouselImages} />}
        <section className="mt-6 bg-white rounded-xl shadow-soft p-6">
          <h1 className="text-2xl font-elegant">Studio Beauté & Bien-être</h1>
          <p className="mt-2 text-sm text-gray-600">Soins esthétiques et bien-être — prenez rendez-vous en quelques clics.</p>
          <div className="mt-4">
            <BookingCalendar services={services} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xl mb-3">Prestations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2.5">
            {services.map(s=> <ServiceCard key={s.id} service={s} />)}
          </div>
        </section>

        {/* Galerie supprimée - section retirée */}
      </main>
    </div>
  )
}

