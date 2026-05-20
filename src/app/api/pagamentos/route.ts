import { createClient } from '@/lib/supabase/server'
import { createPixCharge } from '@/lib/pagarme'
import { NextRequest, NextResponse } from 'next/server'

type PurchaseType = 'fresh_credit_pack' | 'frozen_pack' | 'single'
type Profile = { name: string; cpf: string | null }
type Pack = { price: number; name: string }
type Product = { price: number; name: string }
type ProfileAddr = { address: string | null; lat: number | null; lng: number | null }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { type: PurchaseType; itemId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { type, itemId } = body

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, cpf')
    .eq('id', user.id)
    .single() as unknown as { data: Profile | null }

  if (!profile?.cpf) {
    return NextResponse.json({ error: 'cpf_required' }, { status: 400 })
  }

  let amountInCents = 0
  let code = `BADU-${Date.now()}`
  let paymentInsert: Record<string, unknown> = { customer_id: user.id }

  if (type === 'fresh_credit_pack') {
    const { data: pack } = await supabase
      .from('fresh_credit_packs')
      .select('price, name')
      .eq('id', itemId)
      .eq('active', true)
      .single() as unknown as { data: Pack | null }

    if (!pack) return NextResponse.json({ error: 'pack_not_found' }, { status: 404 })
    amountInCents = Math.round(pack.price * 100)
    code = `BADU-FRESH-${Date.now()}`
    paymentInsert = { ...paymentInsert, fresh_credit_pack_id: itemId, amount: pack.price }
  }

  if (type === 'frozen_pack') {
    const { data: pack } = await supabase
      .from('frozen_packs')
      .select('price, name')
      .eq('id', itemId)
      .eq('active', true)
      .single() as unknown as { data: Pack | null }

    if (!pack) return NextResponse.json({ error: 'pack_not_found' }, { status: 404 })
    amountInCents = Math.round(pack.price * 100)
    code = `BADU-FROZEN-${Date.now()}`
    paymentInsert = { ...paymentInsert, frozen_pack_id: itemId, amount: pack.price }
  }

  if (type === 'single') {
    const { data: product } = await supabase
      .from('products')
      .select('price, name')
      .eq('id', itemId)
      .eq('active', true)
      .single() as unknown as { data: Product | null }

    if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 })
    amountInCents = Math.round(product.price * 100)
    code = `BADU-SINGLE-${Date.now()}`

    const { data: profileAddr } = await supabase
      .from('profiles')
      .select('address, lat, lng')
      .eq('id', user.id)
      .single() as unknown as { data: ProfileAddr | null }

    const { data: order } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        type: 'single',
        status: 'pending',
        total: product.price,
        delivery_address: profileAddr?.address ?? null,
        delivery_lat: profileAddr?.lat ?? null,
        delivery_lng: profileAddr?.lng ?? null,
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null }

    if (order) {
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: itemId,
        quantity: 1,
        unit_price: product.price,
      } as never)
      paymentInsert = { ...paymentInsert, order_id: order.id, amount: product.price }
    }
  }

  const { data: payment } = await supabase
    .from('payments')
    .insert({
      ...paymentInsert,
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    } as never)
    .select('id')
    .single() as unknown as { data: { id: string } | null }

  if (!payment) {
    return NextResponse.json({ error: 'payment_creation_failed' }, { status: 500 })
  }

  try {
    const charge = await createPixCharge({
      code,
      amountInCents,
      customer: {
        name: profile.name,
        email: user.email!,
        cpf: profile.cpf,
      },
      expiresInSeconds: 1800,
      metadata: { payment_id: payment.id },
    })

    await supabase
      .from('payments')
      .update({ pagarme_id: charge.id } as never)
      .eq('id', payment.id)

    return NextResponse.json({
      paymentId: payment.id,
      qr_code: charge.qr_code,
      qr_code_url: charge.qr_code_url,
      expires_at: charge.expires_at,
    })
  } catch {
    await supabase.from('payments').delete().eq('id', payment.id)
    if (paymentInsert.order_id) {
      await supabase.from('orders').delete().eq('id', paymentInsert.order_id as string)
    }
    return NextResponse.json({ error: 'pagarme_unavailable' }, { status: 502 })
  }
}
