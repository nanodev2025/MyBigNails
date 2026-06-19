import Head from 'next/head'
import '../styles/globals.css'

// Application wrapper
export default function App({ Component, pageProps }){
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
