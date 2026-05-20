'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function PackForm({
  action,
  unit,
}: {
  action: (formData: FormData) => Promise<void>
  unit: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Novo pacote</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo pacote</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (fd) => {
            await action(fd)
            formRef.current?.reset()
            setOpen(false)
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="pack-name">Nome</Label>
            <Input
              id="pack-name"
              name="name"
              required
              placeholder={`Ex: Pacote ${unit === 'créditos' ? 'Econômico' : 'Congelado 10'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pack-desc">Descrição</Label>
            <Textarea id="pack-desc" name="description" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pack-qty">Quantidade ({unit})</Label>
              <Input id="pack-qty" name="quantity" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-price">Preço (R$)</Label>
              <Input id="pack-price" name="price" type="number" step="0.01" min="0" required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pack-active" name="active" defaultChecked />
            <Label htmlFor="pack-active">Ativo</Label>
          </div>
          <Button type="submit" className="w-full">Criar pacote</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
