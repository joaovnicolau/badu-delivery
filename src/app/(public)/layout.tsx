import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { AddressModal } from '@/components/address-modal'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let showAddressModal = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('street')
      .eq('id', user.id)
      .single()
    showAddressModal = !profile?.street
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-orange-600">
            🍱 Badu Delivery
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link href="/minha-conta">
                <Button variant="outline" size="sm">Minha conta</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm">Cadastrar</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      {showAddressModal && <AddressModal defaultOpen={true} />}
    </div>
  )
}
