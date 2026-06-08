'use client'

import * as React from 'react'
import { useActionState, useEffect, useRef, useState } from 'react'
import {
  guardarMiAcademiaAction,
  guardarLogoAction,
  type FormState,
} from '@/app/(app)/configuracion/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/utils/image'
import { useRouter } from 'next/navigation'
import { SectionFooter } from '@/components/domain/configuracion/section-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'

const initialState: FormState = {}

export function MiAcademiaForm({
  initialNombre,
  academiaId,
  logoUrl,
}: {
  initialNombre: string
  academiaId: string
  logoUrl: string | null
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState(initialNombre)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(logoUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initial = { nombre: initialNombre }
  const current = { nombre }
  const { dirty, snapshot, commitSnapshot } = useDirtySection(current, initial)

  const [state, formAction] = useActionState(guardarMiAcademiaAction, initialState)

  useEffect(() => {
    if (state.success) commitSnapshot()
  }, [state.success, commitSnapshot])

  const onCancel = () => setNombre(snapshot.nombre)

  const handleLogoClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setLogoError(null)
    try {
      const resizedBlob = await resizeImage(file, 128)
      const supabase = createClient()
      const path = `${academiaId}/logo.webp`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, resizedBlob, { contentType: 'image/webp', upsert: true })
      if (uploadError) {
        console.error('Error al subir logo:', uploadError)
        setLogoError(
          uploadError.message === 'Bucket not found'
            ? 'El bucket de logos no está configurado. Aplica la migración de Supabase.'
            : `No se pudo subir el logo: ${uploadError.message}`
        )
        return
      }
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`
      const saveResult = await guardarLogoAction(publicUrl)
      if (saveResult?.success === false) {
        setLogoError(saveResult.message || 'No se pudo guardar el logo.')
        return
      }
      setCurrentLogoUrl(publicUrl)
      // Refresca el server layout para que <GlobalHeader> reciba el nuevo
      // metadata.logo_url vía el AcademiaProvider sin que el usuario tenga
      // que navegar manualmente.
      router.refresh()
    } catch (err: any) {
      console.error('Error al procesar logo:', err)
      setLogoError(err?.message || 'Ocurrió un error inesperado al procesar el logo.')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mi Academia</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Logo Upload — guarda al instante, no participa del dirty */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleLogoClick}
              disabled={uploadingLogo}
              className="relative w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/30 group"
            >
              {currentLogoUrl ? (
                <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {currentLogoUrl && !uploadingLogo && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
            <p className="text-xs text-muted-foreground">
              {currentLogoUrl ? 'Toca para cambiar' : 'Agregar logo'}
            </p>
            {logoError && (
              <p className="text-xs text-destructive text-center max-w-xs">
                {logoError}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_academia" className="text-foreground font-semibold">
              Nombre de la academia
            </Label>
            <Input
              id="nombre_academia"
              name="nombre_academia"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <SectionFooter
            dirty={dirty}
            onCancel={onCancel}
            errorMessage={state.success === false ? state.message : null}
          />
        </form>
      </CardContent>
    </Card>
  )
}
