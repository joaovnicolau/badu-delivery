import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { geocodeAddress } from '@/lib/nominatim'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

async function updateProfile(formData: FormData): Promise<void> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const cpf = (formData.get('cpf') as string ?? '').replace(/\D/g, '')
  if (cpf && cpf.length !== 11) {
    // CPF inválido — retorno silencioso, o formulário não fornece feedback aqui
    // por limitação do Server Action void. Validação visual deve ser feita no cliente.
    return
  }

  const street = formData.get('street') as string || null
  const number = formData.get('number') as string || null
  const neighborhood = formData.get('neighborhood') as string || null
  const city = formData.get('city') as string || null
  const address = [street, number, neighborhood, city].filter(Boolean).join(', ') || null

  let lat: number | null = null
  let lng: number | null = null
  if (address) {
    const coords = await geocodeAddress(address)
    if (coords) {
      lat = coords.lat
      lng = coords.lng
    }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      cpf: cpf || null,
      address,
      street,
      number,
      neighborhood,
      city,
      zip: formData.get('zip') as string || null,
      lat,
      lng,
    } as never)
    .eq('id', user.id)

  if (updateError) {
    console.error('Erro ao atualizar perfil:', updateError)
  }

  revalidatePath('/minha-conta/perfil')
}

type Profile = {
  name: string; phone: string | null; cpf: string | null
  street: string | null; number: string | null; neighborhood: string | null
  city: string | null; zip: string | null
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/minha-conta/perfil')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone, cpf, street, number, neighborhood, city, zip')
    .eq('id', user.id)
    .single() as unknown as { data: Profile | null }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h1>
      <form action={updateProfile} className="space-y-5 bg-white rounded-xl border p-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" name="name" defaultValue={profile?.name ?? ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} placeholder="(11) 99999-9999" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">
            CPF <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-gray-400 ml-1">(obrigatório para pagamento com Pix)</span>
          </Label>
          <Input id="cpf" name="cpf" defaultValue={profile?.cpf ?? ''} placeholder="000.000.000-00" />
        </div>
        <hr />
        <p className="text-sm font-semibold text-gray-700">Endereço de entrega</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="street">Rua</Label>
            <Input id="street" name="street" defaultValue={profile?.street ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input id="number" name="number" defaultValue={profile?.number ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" name="neighborhood" defaultValue={profile?.neighborhood ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={profile?.city ?? ''} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">CEP</Label>
          <Input id="zip" name="zip" defaultValue={profile?.zip ?? ''} placeholder="00000-000" />
        </div>
        <Button type="submit" className="w-full">Salvar alterações</Button>
      </form>
    </div>
  )
}
