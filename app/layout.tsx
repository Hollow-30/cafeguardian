import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AppNavigation } from '@/components/app-navigation'
import { resolveRole } from '@/lib/auth/roles'
import { getAuthUser } from '@/lib/auth/session'
import { brand } from '@/content/brand'
import './globals.css'


export const metadata: Metadata = {
  title: brand.metadata.title,
  description: brand.metadata.description,
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#4A2E1E',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getAuthUser()

  return (
    <html lang="es">
      <body className="antialiased">
        <AppNavigation role={user ? resolveRole(user) : null} user={user} />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
