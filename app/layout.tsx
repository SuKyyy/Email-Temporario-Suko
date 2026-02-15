import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'

import './globals.css'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono' })

export const metadata: Metadata = {
  title: 'SuKo Shop - Email Temporario',
  description: 'Acesse sua caixa de entrada temporaria nos dominios SuKo',
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
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${_inter.variable} ${_spaceMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
