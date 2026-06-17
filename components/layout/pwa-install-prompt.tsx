'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_KEY = 'sipra-pwa-install-dismissed'

function isStandaloneDisplayMode() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export function PwaInstallPrompt() {
  const hasWindow = typeof window !== 'undefined'
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos] = useState(() => (hasWindow ? isIosDevice() : false))
  const [isStandalone, setIsStandalone] = useState(() => (hasWindow ? isStandaloneDisplayMode() : true))
  const [isDismissed, setIsDismissed] = useState(() =>
    hasWindow ? window.localStorage.getItem(DISMISSED_KEY) === 'true' : true
  )

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      window.localStorage.setItem(DISMISSED_KEY, 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const shouldShowIosHint = isIos && !isStandalone && !isDismissed
  const shouldShowInstallButton = !isIos && !isStandalone && !isDismissed && !!deferredPrompt

  if (!shouldShowIosHint && !shouldShowInstallButton) {
    return null
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsDismissed(true)
      window.localStorage.setItem(DISMISSED_KEY, 'true')
    }
  }

  function handleDismiss() {
    setIsDismissed(true)
    window.localStorage.setItem(DISMISSED_KEY, 'true')
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 lg:hidden">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {shouldShowInstallButton ? <Download className="h-5 w-5" /> : <Share className="h-5 w-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Instala SIPRA en tu celular</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {shouldShowInstallButton
                ? 'Agrega un icono a tu pantalla de inicio para abrir SIPRA como app.'
                : 'En iPhone, toca Compartir y luego "Agregar a pantalla de inicio".'}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {shouldShowInstallButton ? (
                <Button onClick={handleInstall} size="sm">
                  Instalar app
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                  <Share className="h-3.5 w-3.5" />
                  Compartir
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Ahora no
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Cerrar aviso de instalacion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
