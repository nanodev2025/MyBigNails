import Head from 'next/head'
import '../styles/globals.css'

// Application wrapper
export default function App({ Component, pageProps }){
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" />
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=(), payment=()" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
