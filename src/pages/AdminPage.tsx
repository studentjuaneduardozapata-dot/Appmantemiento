import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { db, generateId } from '@/lib/db'
import type { User, Area, AssetCategory } from '@/lib/db'
import { enqueue } from '@/lib/sync/syncQueue'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [storedPin, setStoredPin] = useState('1234')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    db.sync_meta.get('admin_pin').then((m) => {
      if (m) setStoredPin(m.value)
    })
  }, [])

  function handleDigit(d: string) {
    if (input.length >= 4) return
    const next = input + d
    setInput(next)
    setError(false)
    if (next.length === 4) {
      if (next === storedPin) {
        onUnlock()
      } else {
        setError(true)
        setTimeout(() => {
          setInput('')
          setError(false)
        }, 600)
      }
    }
  }

  function handleBackspace() {
    setInput((p) => p.slice(0, -1))
    setError(false)
  }

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <h1 className="text-center text-lg font-semibold text-foreground mb-2">Administración</h1>
        <p className="text-center text-sm text-muted-foreground mb-8">Ingresa el PIN de acceso</p>

        {/* Dots */}
        <div className={cn('flex justify-center gap-4 mb-8', error && 'animate-bounce')}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'w-4 h-4 rounded-full border-2 transition-colors',
                input.length > i
                  ? error
                    ? 'bg-red-500 border-red-500'
                    : 'bg-primary border-primary'
                  : 'border-border bg-card'
              )}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => (k === '⌫' ? handleBackspace() : k ? handleDigit(k) : undefined)}
              disabled={!k && k !== '⌫'}
              className={cn(
                'h-14 rounded-xl text-xl font-semibold transition-colors',
                k
                  ? 'bg-card border border-border text-foreground hover:bg-accent active:bg-accent/80'
                  : 'invisible'
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = 'usuarios' | 'areas' | 'categorias' | 'pin' | 'datos'

const TABS: { id: TabId; label: string }[] = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'areas', label: 'Áreas' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'pin', label: 'PIN' },
  { id: 'datos', label: 'Datos' },
]

// ─── Usuarios Tab ─────────────────────────────────────────────────────────────

function UsersTab() {
  const users = useLiveQuery(() => db.users.orderBy('name').filter((u) => !u.deleted_at).toArray())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const now = new Date().toISOString()
    const record: User = { id: generateId(), name, created_at: now, updated_at: now, _synced: false }
    await db.users.add(record)
    await enqueue('users', 'insert', record as unknown as Record<string, unknown>)
    setNewName('')
    setAddingNew(false)
    toast.success('Usuario creado')
  }

  async function handleSaveEdit(id: string) {
    const name = editName.trim()
    if (!name) return
    const now = new Date().toISOString()
    await db.users.update(id, { name, updated_at: now, _synced: false })
    const user = await db.users.get(id)
    if (user) await enqueue('users', 'update', user as unknown as Record<string, unknown>)
    setEditingId(null)
    toast.success('Usuario actualizado')
  }

  async function handleDelete(user: User) {
    const now = new Date().toISOString()
    await db.users.update(user.id, { deleted_at: now, _synced: false })
    await enqueue('users', 'delete', { id: user.id })
    setDeleteTarget(null)
    toast.success('Usuario eliminado')
  }

  return (
    <div className="space-y-2">
      <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-gray-100">
        {users === undefined ? (
          <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>
        ) : users.length === 0 && !addingNew ? (
          <p className="text-center text-sm text-gray-400 py-6">Sin usuarios</p>
        ) : (
          <>
            {users.map((u) =>
              editingId === u.id ? (
                <div key={u.id} className="flex items-center gap-2 px-4 py-2.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(u.id)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(u.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-800">{u.name}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(u.id)
                        setEditName(u.name)
                      }}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(u)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
            {addingNew && (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input
                  autoFocus
                  placeholder="Nombre del usuario"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm text-primary font-medium px-1"
        >
          <Plus className="w-4 h-4" />
          Agregar usuario
        </button>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar usuario"
        description={`¿Eliminar a "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ─── Áreas Tab ────────────────────────────────────────────────────────────────

function AreasTab() {
  const areas = useLiveQuery(() => db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray())
  const [editingId, setEditingId] = useState<string | null>(null)

  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null)

  async function handleAdd() {
    const name = newName.trim()
    const code = newCode.trim()
    if (!name || !code) return
    const maxOrder = areas ? Math.max(0, ...areas.map((a) => a.sort_order)) : 0
    const area: Area = {
      id: generateId(),
      code,
      name,
      sort_order: maxOrder + 10,
      created_at: new Date().toISOString(),
    }
    await db.transaction('rw', [db.areas, db.sync_queue], async () => {
      await db.areas.add(area)
      await enqueue('areas', 'insert', area as unknown as Record<string, unknown>)
    })
    setNewCode('')
    setNewName('')
    setAddingNew(false)
    toast.success('Área creada')
  }

  async function handleSaveEdit(id: string) {
    const name = editName.trim()
    const code = editCode.trim()
    if (!name || !code) return
    await db.transaction('rw', [db.areas, db.sync_queue], async () => {
      await db.areas.update(id, { name, code })
      const area = await db.areas.get(id)
      if (area) await enqueue('areas', 'update', area as unknown as Record<string, unknown>)
    })
    setEditingId(null)
    toast.success('Área actualizada')
  }

  async function handleDelete(area: Area) {
    const now = new Date().toISOString()
    await db.transaction('rw', [db.areas, db.sync_queue], async () => {
      await db.areas.update(area.id, { deleted_at: now })
      await enqueue('areas', 'delete', { id: area.id })
    })
    setDeleteTarget(null)
    toast.success('Área eliminada')
  }

  async function handleReorder(area: Area, direction: -1 | 1) {
    if (!areas) return
    const idx = areas.findIndex((a) => a.id === area.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= areas.length) return
    const other = areas[swapIdx]
    await db.transaction('rw', [db.areas, db.sync_queue], async () => {
      await db.areas.update(area.id, { sort_order: other.sort_order })
      await db.areas.update(other.id, { sort_order: area.sort_order })
      await enqueue('areas', 'update', { ...area, sort_order: other.sort_order } as unknown as Record<string, unknown>)
      await enqueue('areas', 'update', { ...other, sort_order: area.sort_order } as unknown as Record<string, unknown>)
    })
  }

  return (
    <div className="space-y-2">
      <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-gray-100">
        {areas === undefined ? (
          <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>
        ) : areas.length === 0 && !addingNew ? (
          <p className="text-center text-sm text-gray-400 py-6">Sin áreas</p>
        ) : (
          <>
            {areas.map((a, idx) =>
              editingId === a.id ? (
                <div key={a.id} className="flex items-center gap-2 px-4 py-2.5">
                  <input
                    autoFocus
                    placeholder="Código"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder="Nombre"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(a.id)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(a.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-xs text-gray-400 mr-2">{a.code}</span>
                    <span className="text-sm text-gray-800">{a.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleReorder(a, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 disabled:opacity-30 hover:text-gray-600"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(a, 1)}
                      disabled={areas !== undefined && idx === areas.length - 1}
                      className="p-1 text-gray-400 disabled:opacity-30 hover:text-gray-600"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(a.id)
                        setEditCode(a.code)
                        setEditName(a.name)
                      }}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(a)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
            {addingNew && (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input
                  autoFocus
                  placeholder="Código"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  placeholder="Nombre del área"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm text-primary font-medium px-1"
        >
          <Plus className="w-4 h-4" />
          Agregar área
        </button>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar área"
        description={`¿Eliminar el área "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ─── Categorías Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const cats = useLiveQuery(() => db.asset_categories.orderBy('sort_order').filter((c) => !c.deleted_at).toArray())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AssetCategory | null>(null)

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const maxOrder = cats ? Math.max(0, ...cats.map((c) => c.sort_order)) : 0
    const cat: AssetCategory = {
      id: generateId(),
      name,
      sort_order: maxOrder + 10,
      created_at: new Date().toISOString(),
    }
    await db.transaction('rw', [db.asset_categories, db.sync_queue], async () => {
      await db.asset_categories.add(cat)
      await enqueue('asset_categories', 'insert', cat as unknown as Record<string, unknown>)
    })
    setNewName('')
    setAddingNew(false)
    toast.success('Categoría creada')
  }

  async function handleSaveEdit(id: string) {
    const name = editName.trim()
    if (!name) return
    await db.transaction('rw', [db.asset_categories, db.sync_queue], async () => {
      await db.asset_categories.update(id, { name })
      const cat = await db.asset_categories.get(id)
      if (cat) await enqueue('asset_categories', 'update', cat as unknown as Record<string, unknown>)
    })
    setEditingId(null)
    toast.success('Categoría actualizada')
  }

  async function handleDelete(cat: AssetCategory) {
    const now = new Date().toISOString()
    await db.transaction('rw', [db.asset_categories, db.sync_queue], async () => {
      await db.asset_categories.update(cat.id, { deleted_at: now })
      await enqueue('asset_categories', 'delete', { id: cat.id })
    })
    setDeleteTarget(null)
    toast.success('Categoría eliminada')
  }

  return (
    <div className="space-y-2">
      <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-gray-100">
        {cats === undefined ? (
          <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>
        ) : cats.length === 0 && !addingNew ? (
          <p className="text-center text-sm text-gray-400 py-6">Sin categorías</p>
        ) : (
          <>
            {cats.map((c) =>
              editingId === c.id ? (
                <div key={c.id} className="flex items-center gap-2 px-4 py-2.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(c.id)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(c.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-800">{c.name}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id)
                        setEditName(c.name)
                      }}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
            {addingNew && (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input
                  autoFocus
                  placeholder="Nombre de categoría"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm text-primary font-medium px-1"
        >
          <Plus className="w-4 h-4" />
          Agregar categoría
        </button>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar categoría"
        description={`¿Eliminar la categoría "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ─── PIN Tab ──────────────────────────────────────────────────────────────────

function PinTab() {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSave() {
    if (!/^\d{4}$/.test(newPin)) {
      setErrorMsg('El PIN debe ser exactamente 4 dígitos numéricos')
      return
    }
    if (newPin !== confirmPin) {
      setErrorMsg('Los PINs no coinciden')
      return
    }
    await db.sync_meta.put({ key: 'admin_pin', value: newPin })
    setNewPin('')
    setConfirmPin('')
    setErrorMsg('')
    toast.success('PIN actualizado')
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nuevo PIN (4 dígitos)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => {
              setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              setErrorMsg('')
            }}
            placeholder="••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => {
              setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              setErrorMsg('')
            }}
            placeholder="••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest"
          />
        </div>
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90"
      >
        Guardar PIN
      </button>
    </div>
  )
}

// ─── Datos Tab ────────────────────────────────────────────────────────────────

function DataTab() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleClearDb() {
    const tablesToClear = db.tables.filter(
      (t) => t.name !== 'sync_meta' && t.name !== 'sync_queue'
    )
    await Promise.all(tablesToClear.map((t) => t.clear()))
    toast.success('Base de datos local limpiada')
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-900 mb-1">Limpiar cache local</p>
        <p className="text-xs text-gray-500">
          Elimina todos los datos locales (activos, fallas, tareas, etc.) excepto la configuración
          del sistema. Los datos sincronizados con el servidor se recuperarán al reconectar.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="w-full py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700"
      >
        Limpiar base de datos local
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Limpiar base de datos"
        description="Esta acción eliminará todos los datos locales no sincronizados. ¿Continuar?"
        confirmLabel="Limpiar todo"
        confirmVariant="danger"
        onConfirm={handleClearDb}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel({ onLock }: { onLock: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('usuarios')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onLock}
          className="p-1 -ml-1 text-foreground hover:text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Administración</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border px-4">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'text-xs font-medium py-3 px-3 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {activeTab === 'usuarios' && <UsersTab />}
        {activeTab === 'areas' && <AreasTab />}
        {activeTab === 'categorias' && <CategoriesTab />}
        {activeTab === 'pin' && <PinTab />}
        {activeTab === 'datos' && <DataTab />}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />
  }

  return <AdminPanel onLock={() => setUnlocked(false)} />
}
