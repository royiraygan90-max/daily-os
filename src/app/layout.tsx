import type { Metadata, Viewport } from 'next'
import './globals.css'
import ThemeWrapper from '@/components/ThemeWrapper'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import MobileNav from '@/components/MobileNav'

export const metadata: Metadata = {
  title: 'Daily OS ⚡',
  description: 'RPG-style personal productivity system',
  appleWebApp: {
    capable: true,
    title: 'Daily OS',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeWrapper>
          <div className="flex min-h-screen pt-[env(safe-area-inset-top)]">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <TopBar />
              <main className="flex-1 p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
                {children}
              </main>
            </div>
          </div>
          <MobileNav />
        </ThemeWrapper>
      </body>
    </html>
  )
}
