'use client'

interface MaintenanceLockProps {
  mensaje: string
}

export default function MaintenanceLock({ mensaje }: MaintenanceLockProps) {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white px-6 font-sans">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        {/* Amber Animated Icon Container */}
        <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.085c.09-.08.21-.08.3 0a9 9 0 010 12.83M11.42 15.085a3 3 0 00-3-3m3 3a3 3 0 003-3m-6 3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Plataforma en Mantenimiento
          </h1>
          <div className="h-0.5 w-16 bg-amber-500 mx-auto rounded-full" />
        </div>

        {/* Message Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
          <p className="text-sm text-slate-300 leading-relaxed text-center whitespace-pre-line">
            {mensaje}
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Estamos mejorando el servicio para brindarte una mejor experiencia. Volveremos en breve.
        </p>

        {/* Reload button */}
        <div>
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white px-5 py-2.5 transition-all border border-slate-700 hover:border-slate-600 focus:outline-none"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Recomprobar Estado
          </button>
        </div>
      </div>
    </div>
  )
}
