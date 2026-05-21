'use server'

import { createClient, createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendWhatsApp, renderTemplate } from '@/lib/evolution'
import { geocodeAddress } from '@/lib/nominatim'

type ActionResult = { error: string } | undefined

// ---- Helper: notificar cliente via WhatsApp ----

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function notifyCustomer(
  customerId: string,
  orderId: string,
  trigger: 'accepted' | 'rejected' | 'dispatched',
  supabase: SupabaseClient
): Promise<void> {
  const [
    { data: profile },
    { data: template },
    { data: items },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, phone')
      .eq('id', customerId)
      .single() as unknown as Promise<{ data: { name: string; phone: string | null } | null }>,
    supabase
      .from('whatsapp_templates')
      .select('message')
      .eq('trigger', trigger)
      .single() as unknown as Promise<{ data: { message: string } | null }>,
    supabase
      .from('order_items')
      .select('products(name)')
      .eq('order_id', orderId) as unknown as Promise<{
        data: Array<{ products: { name: string } | null }> | null
      }>,
  ])

  if (!profile?.phone || !template?.message) return

  const itemNames =
    (items ?? [])
      .map(i => i.products?.name)
      .filter(Boolean)
      .join(', ') || 'marmita'

  const message = renderTemplate(template.message, {
    nome: profile.name,
    itens: itemNames,
    horario: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  })

  await sendWhatsApp(profile.phone, message)
}

export async function acceptOrder(orderId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id, customer_id, type, delivery_lat, delivery_address')
    .single() as unknown as {
      data: {
        id: string
        customer_id: string
        type: string
        delivery_lat: number | null
        delivery_address: string | null
      } | null
    }

  if (!order) return { error: 'Pedido não encontrado ou já foi processado.' }

  // Última tentativa de geocodificação se ainda sem coordenadas
  if (!order.delivery_lat && order.delivery_address) {
    const coords = await geocodeAddress(order.delivery_address)
    if (coords) {
      await supabase
        .from('orders')
        .update({ delivery_lat: coords.lat, delivery_lng: coords.lng } as never)
        .eq('id', orderId)
    } else {
      console.warn('Geocodificação falhou no aceite do pedido', orderId, order.delivery_address)
    }
  }

  notifyCustomer(order.customer_id, orderId, 'accepted', supabase).catch(console.error)

  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/mapa')
}

export async function rejectOrder(orderId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .update({ status: 'rejected' } as never)
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id, customer_id, type')
    .single() as unknown as {
      data: { id: string; customer_id: string; type: string } | null
    }

  if (!order) return { error: 'Pedido não encontrado ou já foi processado.' }

  // Estornar crédito se pedido foi feito com crédito
  if (order.type === 'fresh_credit') {
    const serviceClient = await createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: creditError } = await (serviceClient.rpc as any)('rpc_add_credit', {
      p_customer_id: order.customer_id,
      p_amount: 1,
      p_reason: 'order_refund',
      p_reference_id: orderId,
    })
    if (creditError) {
      console.error('Falha ao estornar crédito para pedido', orderId, creditError)
    }
  }

  notifyCustomer(order.customer_id, orderId, 'rejected', supabase).catch(console.error)

  revalidatePath('/admin/pedidos')
}

export async function dispatchOrder(orderId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .update({
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId)
    .eq('status', 'accepted')
    .select('id, customer_id, type')
    .single() as unknown as {
      data: { id: string; customer_id: string; type: string } | null
    }

  if (!order) return { error: 'Pedido não está no status aceito.' }

  notifyCustomer(order.customer_id, orderId, 'dispatched', supabase).catch(console.error)

  revalidatePath('/admin/pedidos')
}

export async function updatePrintStatus(
  orderId: string,
  status: 'printed' | 'failed'
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({ print_status: status } as never)
    .eq('id', orderId)
  revalidatePath('/admin/pedidos')
}

export async function saveWhatsAppTemplate(
  trigger: 'accepted' | 'rejected' | 'dispatched',
  message: string
): Promise<ActionResult> {
  await requireAdmin()
  if (!message.trim()) return { error: 'Mensagem não pode estar vazia.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('whatsapp_templates')
    .upsert({ trigger, message } as never, { onConflict: 'trigger' })

  if (error) return { error: 'Erro ao salvar template.' }
  revalidatePath('/admin/configuracoes')
}
