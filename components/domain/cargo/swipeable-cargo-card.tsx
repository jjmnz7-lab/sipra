'use client'

import React, { useState, useRef } from 'react'
import { Phone, Banknote } from 'lucide-react'
import { RegistrarPagoDrawer } from './registrar-pago-drawer'

interface SwipeableCargoCardProps {
  cargo: any
  children: React.ReactNode
}

export function SwipeableCargoCard({ cargo, children }: SwipeableCargoCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    
    // Solo permitir deslizar hacia la izquierda (revelar acciones a la derecha)
    if (diff < 0) {
      // Aplicar resistencia si pasa de 140px
      const limitedDiff = diff < -140 ? -140 + (diff + 140) * 0.2 : diff
      setOffsetX(limitedDiff)
    } else {
      setOffsetX(0)
    }
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    const diff = currentX.current - startX.current
    
    // Umbral para mantener abierto (ej. 70px)
    if (diff < -70) {
      setOffsetX(-140) // Ancho de los dos botones
    } else {
      setOffsetX(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100">
      {/* Botones de acción en el fondo (revelados al hacer swipe) */}
      <div className="absolute inset-0 flex justify-end items-center gap-2 pr-2">
        {cargo.persona?.telefono_whatsapp && (
          <a 
            href={`https://wa.me/${cargo.persona.telefono_whatsapp}`} 
            target="_blank" 
            rel="noreferrer" 
            className="flex flex-col items-center justify-center bg-emerald-500 text-white w-14 h-14 rounded-xl shadow-sm active:scale-95 transition-transform"
          >
            <Phone className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">WA</span>
          </a>
        )}
        
        <RegistrarPagoDrawer cargo={cargo}>
          <button className="flex flex-col items-center justify-center bg-amber-500 text-white w-14 h-14 rounded-xl shadow-sm active:scale-95 transition-transform">
            <Banknote className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">Cobrar</span>
          </button>
        </RegistrarPagoDrawer>
      </div>

      {/* Contenido de la tarjeta (se desliza) */}
      <div 
        style={{ transform: `translateX(${offsetX}px)` }}
        className={`relative bg-white rounded-xl ${isSwiping ? 'transition-none' : 'transition-transform duration-300 ease-out'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
