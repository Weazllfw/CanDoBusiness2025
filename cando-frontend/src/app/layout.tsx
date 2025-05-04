import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { CompanyProvider } from '@/lib/contexts/CompanyContext'
import { ToastProvider } from '@/components/common/Toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CanDo Business',
  description: 'Connect and grow with businesses across Canada',
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
          <ToastProvider>
            <main className="min-h-screen bg-white">
              {children}
            </main>
          </ToastProvider>
        </CompanyProvider>
      </body>
    </html>
  )
} 