import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Badu Delivery',
  description: 'Marmitas fresquinhas entregues na sua porta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_URL__=${JSON.stringify(supabaseUrl)};window.__SUPABASE_ANON_KEY__=${JSON.stringify(supabaseAnonKey)};`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
