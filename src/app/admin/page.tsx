import { createClient } from '@/lib/supabase/server'
import { completeReminder } from './clientes/actions'
import { Button } from '@/components/ui/button'

type Reminder = {
  id: string
  note: string
  remind_at: string
  customer_id: string
  profiles: { name: string } | null
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [{ data: todayReminders }, { data: upcomingReminders }] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, note, remind_at, customer_id, profiles(name)')
      .gte('remind_at', todayStart.toISOString())
      .lte('remind_at', todayEnd.toISOString())
      .eq('done', false)
      .order('remind_at', { ascending: true }) as unknown as Promise<{
        data: Reminder[] | null
      }>,
    supabase
      .from('reminders')
      .select('id, note, remind_at, customer_id, profiles(name)')
      .gt('remind_at', todayEnd.toISOString())
      .eq('done', false)
      .order('remind_at', { ascending: true })
      .limit(5) as unknown as Promise<{ data: Reminder[] | null }>,
  ])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Lembretes de hoje */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Lembretes de hoje
          {(todayReminders?.length ?? 0) > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {todayReminders!.length}
            </span>
          )}
        </h2>
        {!(todayReminders?.length) ? (
          <p className="text-gray-500 text-sm">Nenhum lembrete para hoje.</p>
        ) : (
          <div className="space-y-3">
            {todayReminders.map(reminder => (
              <div
                key={reminder.id}
                className="bg-white border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {reminder.profiles?.name ?? 'Cliente'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{reminder.note}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(reminder.remind_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <form
                  action={async () => {
                    'use server'
                    await completeReminder(reminder.id, reminder.customer_id)
                  }}
                >
                  <Button type="submit" size="sm" variant="outline">
                    Feito
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Próximos lembretes */}
      {(upcomingReminders?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Próximos lembretes</h2>
          <div className="bg-white rounded-xl border divide-y">
            {upcomingReminders!.map(reminder => (
              <div
                key={reminder.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium text-gray-700">
                  {reminder.profiles?.name ?? 'Cliente'}
                </span>
                <span className="text-gray-400">
                  {new Date(reminder.remind_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
