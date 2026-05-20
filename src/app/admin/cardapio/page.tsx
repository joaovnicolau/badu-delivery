import { createClient, requireAdmin } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { ProductForm } from '@/components/admin/ProductForm'
import { PackForm } from '@/components/admin/PackForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, slugify } from '@/lib/utils'

// ---- Server Actions ----

async function createCategory(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('categories').insert({
    name: formData.get('name') as string,
    position: Number(formData.get('position') ?? 0),
    active: formData.get('active') === 'on',
  } as never)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

async function toggleCategoryActive(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  const active = formData.get('active') === 'true'
  await supabase
    .from('categories')
    .update({ active: !active } as never)
    .eq('id', formData.get('id') as string)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

async function deleteCategory(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('categories').delete().eq('id', formData.get('id') as string)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

async function createProduct(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  const name = formData.get('name') as string
  await supabase.from('products').insert({
    name,
    slug: slugify(name) + '-' + Date.now().toString(36),
    description: (formData.get('description') as string) || null,
    price: Number(formData.get('price')),
    category_id: (formData.get('category_id') as string) || null,
    type: formData.get('type') as string,
    active: formData.get('active') === 'on',
  } as never)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

async function toggleProductActive(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  const active = formData.get('active') === 'true'
  await supabase
    .from('products')
    .update({ active: !active } as never)
    .eq('id', formData.get('id') as string)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

async function createFreshPack(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('fresh_credit_packs').insert({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    credits: Number(formData.get('quantity')),
    price: Number(formData.get('price')),
    active: formData.get('active') === 'on',
  } as never)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

async function createFrozenPack(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('frozen_packs').insert({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    quantity: Number(formData.get('quantity')),
    price: Number(formData.get('price')),
    active: formData.get('active') === 'on',
  } as never)
  revalidatePath('/admin/cardapio')
  revalidatePath('/')
}

// ---- Page ----

type Category = { id: string; name: string; position: number; active: boolean }
type Product = { id: string; name: string; price: number; type: string; active: boolean; categories: { name: string } | null }
type FreshPack = { id: string; name: string; credits: number; price: number }
type FrozenPack = { id: string; name: string; quantity: number; price: number }

export default async function CardapioPage() {
  const supabase = await createClient()

  const [
    { data: categories },
    { data: products },
    { data: freshPacks },
    { data: frozenPacks },
  ] = await Promise.all([
    supabase.from('categories').select('*').order('position') as unknown as Promise<{ data: Category[] | null }>,
    supabase.from('products').select('*, categories(name)').order('name') as unknown as Promise<{ data: Product[] | null }>,
    supabase.from('fresh_credit_packs').select('*').order('credits') as unknown as Promise<{ data: FreshPack[] | null }>,
    supabase.from('frozen_packs').select('*').order('quantity') as unknown as Promise<{ data: FrozenPack[] | null }>,
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Gestão do Cardápio</h1>

      {/* CATEGORIAS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Categorias</h2>
          <CategoryForm action={createCategory} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border divide-y">
          {(categories ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">Nenhuma categoria cadastrada.</p>
          )}
          {(categories ?? []).map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">{cat.name}</span>
                <span className="text-sm text-gray-400">pos: {cat.position}</span>
                <Badge variant={cat.active ? 'default' : 'secondary'}>
                  {cat.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <form action={toggleCategoryActive}>
                  <input type="hidden" name="id" value={cat.id} />
                  <input type="hidden" name="active" value={String(cat.active)} />
                  <Button type="submit" variant="outline" size="sm">
                    {cat.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </form>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={cat.id} />
                  <Button type="submit" variant="destructive" size="sm">Excluir</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Marmitas</h2>
          <ProductForm categories={categories ?? []} action={createProduct} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border divide-y">
          {(products ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">Nenhum produto cadastrado.</p>
          )}
          {(products ?? []).map((product) => (
            <div key={product.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">{product.name}</span>
                {product.categories && (
                  <span className="text-sm text-gray-400">{product.categories.name}</span>
                )}
                <Badge variant={product.type === 'fresh' ? 'default' : 'secondary'}>
                  {product.type === 'fresh' ? 'Fresca' : 'Congelada'}
                </Badge>
                <span className="font-semibold text-orange-600">{formatCurrency(product.price)}</span>
                <Badge variant={product.active ? 'default' : 'outline'}>
                  {product.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <form action={toggleProductActive}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="active" value={String(product.active)} />
                <Button type="submit" variant="outline" size="sm">
                  {product.active ? 'Desativar' : 'Ativar'}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* PACOTES FRESCOS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pacotes Antecipados (Frescos)</h2>
          <PackForm action={createFreshPack} unit="créditos" />
        </div>
        <div className="bg-white rounded-lg shadow-sm border divide-y">
          {(freshPacks ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">Nenhum pacote cadastrado.</p>
          )}
          {(freshPacks ?? []).map((pack) => (
            <div key={pack.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">{pack.name}</span>
                <span className="text-sm text-gray-400">{pack.credits} créditos</span>
                <span className="font-semibold text-orange-600">{formatCurrency(pack.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PACOTES CONGELADOS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pacotes Congelados</h2>
          <PackForm action={createFrozenPack} unit="marmitas" />
        </div>
        <div className="bg-white rounded-lg shadow-sm border divide-y">
          {(frozenPacks ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">Nenhum pacote cadastrado.</p>
          )}
          {(frozenPacks ?? []).map((pack) => (
            <div key={pack.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">{pack.name}</span>
                <span className="text-sm text-gray-400">{pack.quantity} marmitas</span>
                <span className="font-semibold text-orange-600">{formatCurrency(pack.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
