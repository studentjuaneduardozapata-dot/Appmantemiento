import { Plus, Trash2 } from 'lucide-react'
import type { AssetSpec } from '@/lib/db'

interface SpecsEditorProps {
  value: AssetSpec[]
  onChange: (specs: AssetSpec[]) => void
}

export function SpecsEditor({ value, onChange }: SpecsEditorProps) {
  function add() {
    onChange([...value, { key: '', value: '' }])
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateKey(index: number, key: string) {
    const next = value.map((s, i) => (i === index ? { ...s, key } : s))
    onChange(next)
  }

  function updateValue(index: number, val: string) {
    const next = value.map((s, i) => (i === index ? { ...s, value: val } : s))
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {value.map((spec, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={spec.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder="Campo"
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={spec.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder="Valor"
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus className="w-4 h-4" />
        Agregar especificación
      </button>
    </div>
  )
}
