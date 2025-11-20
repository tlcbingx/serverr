import './style.css'

import { GlobalProvider } from '../global-context'
import { NextIntlProvider } from 'next-intl'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/react"
import { useEffect } from 'react'

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Обработка ошибок загрузки чанков Next.js
    const handleChunkError = (event) => {
      const error = event.error || event.reason
      
      if (error && (
        error.message?.includes('Loading chunk') ||
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('ChunkLoadError') ||
        error.toString().includes('chunk')
      )) {
        console.warn('Chunk loading error detected, reloading page...', error)
        
        // Перезагружаем страницу через небольшую задержку
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    }

    // Обработка ошибок загрузки скриптов
    window.addEventListener('error', handleChunkError, true)
    window.addEventListener('unhandledrejection', handleChunkError)

    return () => {
      window.removeEventListener('error', handleChunkError, true)
      window.removeEventListener('unhandledrejection', handleChunkError)
    }
  }, [])

  return (
    <NextIntlProvider messages={pageProps?.messages}>
      <GlobalProvider>
        <Component {...pageProps} />
        <Analytics />
        <SpeedInsights />
      </GlobalProvider>
    </NextIntlProvider>
  )
}
