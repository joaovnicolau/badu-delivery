'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddressModal({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const address = [street, number, neighborhood, city].filter(Boolean).join(', ') || null

    await supabase.from('profiles').update({
      street: street || null,
      number: number || null,
      neighborhood: neighborhood || null,
      city: city || null,
      zip: zip || null,
      address,
    } as never).eq('id', user.id)

    setSaved(true)
    setLoading(false)
    setTimeout(() => setOpen(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Endereço de entrega</DialogTitle>
          <DialogDescription>
            Escreva seu endereço de entrega aqui. Ah e não se preocupe que essa informação ficará salva para facilitar nos seus próximos pedidos.
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <p className="text-green-600 text-sm text-center py-4 font-medium">
            Endereço salvo com sucesso!
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="modal-street">Rua</Label>
                <Input id="modal-street" value={street} onChange={e => setStreet(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-number">Número</Label>
                <Input id="modal-number" value={number} onChange={e => setNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="modal-neighborhood">Bairro</Label>
                <Input id="modal-neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-city">Cidade</Label>
                <Input id="modal-city" value={city} onChange={e => setCity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="modal-zip">CEP</Label>
              <Input id="modal-zip" value={zip} onChange={e => setZip(e.target.value)} placeholder="00000-000" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Pular por agora
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
