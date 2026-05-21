import { createClient } from '@/lib/supabase/server'
import { saveWhatsAppTemplate } from '@/app/admin/pedidos/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type Template = { trigger: string; message: string }

const TRIGGER_LABEL: Record<string, string> = {
  accepted:   '✅ Aceito',
  rejected:   '❌ Recusado',
  dispatched: '🚀 Despachado',
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('whatsapp_templates')
    .select('trigger, message')
    .order('trigger') as unknown as { data: Template[] | null }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <p className="text-gray-500 text-sm mb-8">
        Configure as mensagens automáticas enviadas ao cliente via WhatsApp.
        Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code>{' '}
        <code className="bg-gray-100 px-1 rounded">{'{{itens}}'}</code>{' '}
        <code className="bg-gray-100 px-1 rounded">{'{{horario}}'}</code>
      </p>

      <div className="space-y-6">
        {(templates ?? []).map(template => (
          <form
            key={template.trigger}
            action={async (fd) => {
              'use server'
              await saveWhatsAppTemplate(
                template.trigger as 'accepted' | 'rejected' | 'dispatched',
                fd.get('message') as string
              )
            }}
            className="bg-white rounded-xl border p-5 space-y-3"
          >
            <Label className="text-base font-semibold">
              {TRIGGER_LABEL[template.trigger] ?? template.trigger}
            </Label>
            <Textarea
              name="message"
              defaultValue={template.message}
              rows={4}
              className="font-mono text-sm"
            />
            <Button type="submit" size="sm">Salvar</Button>
          </form>
        ))}
      </div>
    </div>
  )
}
