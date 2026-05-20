'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function CategoryForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Nova categoria</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
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
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" name="name" required placeholder="Ex: Fit, Tradicional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-position">Posição (ordem)</Label>
            <Input id="cat-position" name="position" type="number" defaultValue="0" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cat-active" name="active" defaultChecked />
            <Label htmlFor="cat-active">Ativa</Label>
          </div>
          <Button type="submit" className="w-full">Criar categoria</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
