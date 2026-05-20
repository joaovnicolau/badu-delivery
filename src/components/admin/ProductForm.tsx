'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type Category = { id: string; name: string }

export function ProductForm({
  categories,
  action,
}: {
  categories: Category[]
  action: (formData: FormData) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Nova marmita</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova marmita</DialogTitle>
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
            <Label htmlFor="prod-name">Nome</Label>
            <Input id="prod-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-desc">Descrição</Label>
            <Textarea id="prod-desc" name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prod-price">Preço (R$)</Label>
              <Input id="prod-price" name="price" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-type">Tipo</Label>
              <select id="prod-type" name="type" className="w-full border rounded-md px-3 py-2 text-sm h-10">
                <option value="fresh">Fresca</option>
                <option value="frozen">Congelada</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-cat">Categoria</Label>
            <select id="prod-cat" name="category_id" className="w-full border rounded-md px-3 py-2 text-sm h-10">
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="prod-active" name="active" defaultChecked />
            <Label htmlFor="prod-active">Ativa</Label>
          </div>
          <Button type="submit" className="w-full">Criar marmita</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
