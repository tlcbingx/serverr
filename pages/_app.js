import './style.css'

import { GlobalProvider } from '../global-context'
import { NextIntlProvider } from 'next-intl'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from "@vercel/speed-insights/next"
export default function MyApp({ Component, pageProps }) {
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
