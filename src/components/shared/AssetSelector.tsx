import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { SearchInput } from './SearchInput'

interface AssetSelectorProps {
  value: string
  onChange: (id: string) => void
  placeholder?: string
  excludeId?: string
}

export function AssetSelector({
  value,
  onChange,
  placeholder = 'Seleccionar activo',
  excludeId,
}: AssetSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const assets = useLiveQuery(
    () =>
      db.assets
        .filter((a) => !a.deleted_at && a.id !== excludeId)
        .toArray(),
    [excludeId]
  )

  const selected = assets?.find((a) => a.id === value)

  const filtered = assets?.filter(
    (a) =>
      !search || a.name.toLowerCase().includes(search.toLowerCase())
  )

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-lg bg-input hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-x-4 top-16 bottom-16 z-50 bg-card rounded-xl shadow-xl flex flex-col overflow-hidden md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Dialog.Title className="font-semibold text-foreground">
              Seleccionar activo
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-4 py-2 border-b border-border">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar activo..."
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Sin resultados
              </p>
            ) : (
              filtered?.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => select(asset.id)}
                  className="gmao-list-row px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">{asset.name}</span>
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
