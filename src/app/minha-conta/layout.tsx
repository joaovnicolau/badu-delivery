import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

async function handleLogout() {
  'use server'
  const { createClient: cc } = await import('@/lib/supabase/server')
  const supabase = await cc()
  await supabase.auth.signOut()
  const { redirect: rd } = await import('next/navigation')
  rd('/')
}

export default async function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/minha-conta')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-orange-600">🍱 Badu</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/minha-conta" className="px-3 py-1 hover:text-orange-600">Início</Link>
            <Link href="/minha-conta/pedidos" className="px-3 py-1 hover:text-orange-600">Pedidos</Link>
            <Link href="/minha-conta/perfil" className="px-3 py-1 hover:text-orange-600">Perfil</Link>
            <form action={handleLogout}>
              <Button type="submit" variant="ghost" size="sm">Sair</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
