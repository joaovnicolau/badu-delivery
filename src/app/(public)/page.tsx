import { createClient } from '@/lib/supabase/server'
import { CategorySection } from '@/components/menu/CategorySection'
import { PackSection } from '@/components/menu/PackSection'

export const revalidate = 60

type Category = { id: string; name: string; active: boolean; position: number }
type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  photo_url: string | null
  price: number
  type: 'fresh' | 'frozen'
  category_id: string
  active: boolean
}
type FreshPack = { id: string; name: string; description: string | null; credits: number; price: number; active: boolean }
type FrozenPack = { id: string; name: string; description: string | null; quantity: number; price: number; active: boolean }

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: categories },
    { data: products },
    { data: freshPacks },
    { data: frozenPacks },
  ] = await Promise.all([
    supabase.from('categories').select('*').eq('active', true).order('position') as unknown as Promise<{ data: Category[] | null }>,
    supabase.from('products').select('*').eq('active', true).order('name') as unknown as Promise<{ data: Product[] | null }>,
    supabase.from('fresh_credit_packs').select('*').eq('active', true).order('credits') as unknown as Promise<{ data: FreshPack[] | null }>,
    supabase.from('frozen_packs').select('*').eq('active', true).order('quantity') as unknown as Promise<{ data: FrozenPack[] | null }>,
  ])

  const productsByCategory = (categories ?? []).map((cat) => ({
    category: cat,
    products: (products ?? []).filter((p) => p.category_id === cat.id),
  }))

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Cardápio</h1>
        <p className="text-gray-500 mt-2">Marmitas frescas e congeladas entregues na sua porta</p>
      </div>

      {productsByCategory.map(({ category, products }) => (
        <CategorySection key={category.id} category={category} products={products} />
      ))}

      <PackSection
        title="Pacotes Antecipados"
        description="Compre créditos e use um por pedido. Economize!"
        packs={(freshPacks ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          quantity: p.credits,
          price: p.price,
          unit: 'créditos',
        }))}
      />

      <PackSection
        title="Marmitas Congeladas"
        description="Receba todas de uma vez e congele para a semana."
        packs={(frozenPacks ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          quantity: p.quantity,
          price: p.price,
          unit: 'marmitas',
        }))}
      />
    </div>
  )
}
