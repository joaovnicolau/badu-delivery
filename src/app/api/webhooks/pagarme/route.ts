import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/pagarme'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature') ?? ''
  const secret = process.env.PAGARME_WEBHOOK_SECRET!

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (event.type !== 'charge.paid') {
    return NextResponse.json({ ok: true, skipped: event.type })
  }

  const charge = event.data
  const pagarmeId = charge.id as string

  const supabase = await createServiceClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('id, status, customer_id, fresh_credit_pack_id, frozen_pack_id, order_id, amount')
    .eq('pagarme_id', pagarmeId)
    .single() as unknown as {
      data: {
        id: string
        status: string
        customer_id: string
        fresh_credit_pack_id: string | null
        frozen_pack_id: string | null
        order_id: string | null
        amount: number
      } | null
    }

  if (!payment) {
    return NextResponse.json({ ok: true, unknown: true })
  }

  if (payment.status === 'paid') {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  await supabase
    .from('payments')
    .update({ status: 'paid' } as never)
    .eq('id', payment.id)

  if (payment.fresh_credit_pack_id) {
    const { data: pack } = await supabase
      .from('fresh_credit_packs')
      .select('credits')
      .eq('id', payment.fresh_credit_pack_id)
      .single() as unknown as { data: { credits: number } | null }

    if (pack) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)('rpc_add_credit', {
        p_customer_id: payment.customer_id,
        p_amount: pack.credits,
        p_reason: 'purchase',
        p_reference_id: payment.id,
      })
    }
  }

  if (payment.frozen_pack_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('address, lat, lng')
      .eq('id', payment.customer_id)
      .single() as unknown as { data: { address: string | null; lat: number | null; lng: number | null } | null }

    const { data: order } = await supabase
      .from('orders')
      .insert({
        customer_id: payment.customer_id,
        type: 'frozen_pack',
        status: 'pending',
        total: payment.amount,
        delivery_address: profile?.address ?? null,
        delivery_lat: profile?.lat ?? null,
        delivery_lng: profile?.lng ?? null,
      } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null }

    if (order) {
      await supabase
        .from('payments')
        .update({ order_id: order.id } as never)
        .eq('id', payment.id)
    }
  }

  return NextResponse.json({ ok: true })
}
