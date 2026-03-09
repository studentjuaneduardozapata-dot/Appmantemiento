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
          className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-x-4 top-16 bottom-16 z-50 bg-white rounded-xl shadow-xl flex flex-col overflow-hidden md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <Dialog.Title className="font-semibold text-gray-900">
              Seleccionar activo
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-4 py-2 border-b border-gray-100">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar activo..."
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered?.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                Sin resultados
              </p>
            ) : (
              filtered?.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => select(asset.id)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-900">{asset.name}</span>
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
