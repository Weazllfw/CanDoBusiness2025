import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { CompanyProvider } from '@/lib/contexts/CompanyContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CanDo Business',
  description: 'Business management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CompanyProvider>
          <main className="min-h-screen bg-white">
            {children}
          </main>
        </CompanyProvider>
      </body>
    </html>
  )
} 