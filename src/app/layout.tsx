import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Forçar rendering dinâmico em todo o app para que process.env seja lido
// em runtime, não em build time. Necessário pois Build Args do EasyPanel
// não são repassados corretamente ao Docker como --build-arg.
export const dynamic = 'force-dynamic'

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
