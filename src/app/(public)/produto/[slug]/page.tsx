import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await (supabase
    .from('products')
    .select('*, categories(name)')
    .eq('slug', slug)
    .eq('active', true)
    .single() as unknown as Promise<{
      data: {
        id: string
        name: string
        description: string | null
        photo_url: string | null
        price: number
        type: string
        categories: { name: string } | null
      } | null
    }>)

  if (!product) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        &larr; Voltar ao cardápio
      </Link>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {product.photo_url && (
          <div className="relative h-64">
            <Image
              src={product.photo_url}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="p-6">
          <p className="text-sm text-orange-600 font-medium mb-1">
            {product.categories?.name}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          {product.description && (
            <p className="text-gray-600 mt-3">{product.description}</p>
          )}
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-500">Preço por unidade: <span className="font-bold text-orange-600">{formatCurrency(product.price)}</span></p>
            <Link href={`/checkout?tipo=credito&produtoId=${product.id}`} className="block">
              <Button size="lg" className="w-full">Usar 1 crédito</Button>
            </Link>
            <Link href={`/checkout?tipo=single&produtoId=${product.id}`} className="block">
              <Button size="lg" variant="outline" className="w-full">
                Pagar {formatCurrency(product.price)} com Pix
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
