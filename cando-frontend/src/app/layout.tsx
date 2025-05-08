import './globals.css'
import { Inter } from 'next/font/google'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CanDo Business Network',
  description: 'Connect and grow your business with CanDo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  )
} 