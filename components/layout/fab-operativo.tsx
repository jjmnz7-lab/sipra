'use client'

import React, { useState } from 'react'
import { Plus, Banknote, Calendar, Bell } from 'lucide-react'
import { CrearCargoDrawer } from '@/components/domain/cargo/crear-cargo-drawer'

export function FabOperativo({ alumnos }: { alumnos: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCrearCargoOpen, setIsCrearCargoOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {/* Menú de acciones (se muestra si isOpen es true) */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[160px]">
            <button 
              className="flex items-center gap-2 p-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg w-full text-left"
              onClick={() => {
                setIsCrearCargoOpen(true)
                setIsOpen(false)
              }}
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Crear Cargo</span>
            </button>
            
            <button 
              className="flex items-center gap-2 p-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg w-full text-left" 
              onClick={() => {
                alert('Próximamente: Registrar Pago sin cargo')
                setIsOpen(false)
              }}
            >
              <Banknote className="h-4 w-4 text-slate-500" />
              <span>Registrar Pago</span>
            </button>

            <button 
              className="flex items-center gap-2 p-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg w-full text-left" 
              onClick={() => {
                alert('Próximamente: Crear Aviso')
                setIsOpen(false)
              }}
            >
              <Bell className="h-4 w-4 text-slate-500" />
              <span>Crear Aviso</span>
            </button>
          </div>
        )}

        {/* Botón Principal (FAB) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-transform ${isOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Drawer de Crear Cargo (Controlado) */}
      <CrearCargoDrawer 
        alumnos={alumnos} 
        open={isCrearCargoOpen} 
        onOpenChange={setIsCrearCargoOpen} 
      />
    </>
  )
}
