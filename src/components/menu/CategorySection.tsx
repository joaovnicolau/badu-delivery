import { ProductCard } from './ProductCard'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  photo_url: string | null
  price: number
  type: 'fresh' | 'frozen'
}

type Category = {
  id: string
  name: string
}

export function CategorySection({
  category,
  products,
}: {
  category: Category
  products: Product[]
}) {
  if (products.length === 0) return null

  return (
    <section id={`cat-${category.id}`} className="mb-10">
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{category.name}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
