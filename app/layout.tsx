import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'

import './globals.css'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono' })

export const metadata: Metadata = {
  title: 'SuKo Shop - Temporary Email Inbox',
  description: 'Access your temporary email mailbox at sukospot.shop',
}

export const viewport: Viewport = {
  themeColor: '#6b46c1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_inter.variable} ${_spaceMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
