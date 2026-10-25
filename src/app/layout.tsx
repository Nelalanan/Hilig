import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { SITE_NAME, siteUrl } from '@/lib/site'
import './globals.css'

// next/font downloads these at build time and serves them from our own domain,
// which is faster than the old @import from Google Fonts.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Hilig: find your hobby',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Try something new, meet your people, and make space for more of what you love. Book small-group hobby experiences hosted by locals in Metro Manila.',
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_PH',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
