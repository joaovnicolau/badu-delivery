'use server'

import { createClient, requireAdmin } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult = { error: string } | undefined

export async function createReminder(
  customerId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const note = (formData.get('note') as string ?? '').trim()
  const remindAt = formData.get('remind_at') as string

  if (!note) return { error: 'A nota é obrigatória.' }
  if (!remindAt) return { error: 'A data/hora é obrigatória.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reminders')
    .insert({ customer_id: customerId, note, remind_at: remindAt } as never)

  if (error) return { error: 'Erro ao criar lembrete.' }

  revalidatePath(`/admin/clientes/${customerId}`)
  revalidatePath('/admin')
}

export async function completeReminder(
  reminderId: string,
  customerId: string
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('reminders')
    .update({ done: true } as never)
    .eq('id', reminderId)
  if (error) console.error('Falha ao concluir lembrete', reminderId, error)

  revalidatePath(`/admin/clientes/${customerId}`)
  revalidatePath('/admin')
}
