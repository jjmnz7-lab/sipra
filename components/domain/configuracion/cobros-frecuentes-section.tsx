'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Plus, Pencil, Archive, Trash2, Loader2, Tag } from 'lucide-react'
import { parseWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { useToast } from '@/components/ui/use-toast'
import {
  guardarCobroFrecuenteAction,
  archivarCobroFrecuenteAction,
  eliminarCobroFrecuenteAction,
} from '@/app/(app)/configuracion/actions'

export type CobroFrecuente = {
  id: string
  concepto: string
  monto: number
  /** true si aún no tiene registros relacionados (se puede eliminar definitivamente). */
  eliminable: boolean
}

type Draft = { id: string | null; concepto: string; monto: number | '' }

export function CobrosFrecuentesSection({ cobros }: { cobros: CobroFrecuente[] }) {
  const router = useRouter()
  const { showToast, toast } = useToast()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CobroFrecuente | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const openAdd = () => { setError(null); setDraft({ id: null, concepto: '', monto: '' }) }
  const openEdit = (c: CobroFrecuente) => { setError(null); setDraft({ id: c.id, concepto: c.concepto, monto: Math.round(c.monto) }) }

  const guardar = () => {
    if (!draft) return
    setError(null)
    const monto = typeof draft.monto === 'number' ? draft.monto : 0
    startTransition(async () => {
      const res = await guardarCobroFrecuenteAction({ id: draft.id, concepto: draft.concepto.trim(), monto })
      if (!res.success) { setError(res.message ?? 'No se pudo guardar.'); return }
      setDraft(null)
      showToast(res.message ?? 'Guardado.')
      router.refresh()
    })
  }

  const archivar = (c: CobroFrecuente) => {
    startTransition(async () => {
      const res = await archivarCobroFrecuenteAction(c.id)
      if (!res.success) { showToast(res.message ?? 'No se pudo archivar.'); return }
      showToast('Cobro frecuente archivado.')
      router.refresh()
    })
  }

  const eliminar = () => {
    if (!confirmDelete) return
    const id = confirmDelete.id
    startTransition(async () => {
      const res = await eliminarCobroFrecuenteAction(id)
      if (!res.success) { setError(res.message ?? 'No se pudo eliminar.'); return }
      setConfirmDelete(null)
      showToast('Cobro frecuente eliminado.')
      router.refresh()
    })
  }

  const montoValido = draft != null && typeof draft.monto === 'number' && draft.monto >= 0
  const conceptoValido = draft != null && draft.concepto.trim().length >= 2

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Catálogo de Cobros Frecuentes</CardTitle>
          <Button type="button" size="sm" onClick={openAdd} className="h-9 flex-shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Agregar cobro frecuente
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {cobros.length === 0 && (
          <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">Aún no hay cobros frecuentes. Agrega el primero.</p>
          </div>
        )}

        {cobros.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{c.concepto}</p>
                <p className="text-xs text-muted-foreground">${Math.round(Number(c.monto))}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                type="button" variant="ghost" size="icon"
                onClick={() => openEdit(c)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label={`Editar ${c.concepto}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon"
                onClick={() => archivar(c)}
                disabled={isPending}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label={`Archivar ${c.concepto}`}
              >
                <Archive className="h-4 w-4" />
              </Button>
              {c.eliminable && (
                <Button
                  type="button" variant="ghost" size="icon"
                  onClick={() => { setError(null); setConfirmDelete(c) }}
                  className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  aria-label={`Eliminar ${c.concepto}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {error && !draft && !confirmDelete && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
        )}
      </CardContent>

      {/* Drawer: agregar / editar cobro frecuente */}
      <Drawer open={!!draft} onOpenChange={(v) => { if (!v) setDraft(null) }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle>{draft?.id ? 'Editar cobro frecuente' : 'Nuevo cobro frecuente'}</DrawerTitle>
              <DrawerDescription>
                {draft?.id
                  ? 'Cambiar el monto no altera los registros históricos ya generados.'
                  : 'Define un concepto y un monto para reutilizarlo al generar cargos.'}
              </DrawerDescription>
            </DrawerHeader>

            {draft && (
              <div className="p-4 pb-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cf_concepto">Concepto</Label>
                  <Input
                    id="cf_concepto"
                    value={draft.concepto}
                    onChange={(e) => setDraft({ ...draft, concepto: e.target.value })}
                    placeholder="Ej. Examen, Uniforme, Material…"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cf_monto">Monto ($)</Label>
                  <Input
                    id="cf_monto"
                    type="number"
                    step="1"
                    min="0"
                    inputMode="numeric"
                    value={draft.monto}
                    placeholder="0"
                    onWheel={preventMoneyWheel}
                    onChange={(e) => setDraft({ ...draft, monto: parseWholeMoneyInput(e.target.value) })}
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
                )}
              </div>
            )}

            <DrawerFooter className="flex flex-row gap-2 mt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 h-11">Cancelar</Button>
              </DrawerClose>
              <Button
                type="button"
                onClick={guardar}
                disabled={isPending || !conceptoValido || !montoValido}
                className="flex-1 h-11"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer: confirmar eliminación definitiva */}
      <Drawer open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null) }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" /> Eliminar cobro frecuente
              </DrawerTitle>
              <DrawerDescription>
                <strong>{confirmDelete?.concepto}</strong> se eliminará de forma definitiva. Esta acción no se puede deshacer.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
              )}
            </div>
            <DrawerFooter className="flex flex-row gap-2 mt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 h-11">Cancelar</Button>
              </DrawerClose>
              <Button type="button" variant="destructive" onClick={eliminar} disabled={isPending} className="flex-1 h-11">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {toast}
    </Card>
  )
}
