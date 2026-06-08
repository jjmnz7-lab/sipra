'use client'

import { createContext, useContext } from 'react'

interface AcademiaContextValue {
  academiaNombre: string
  academiaLogoUrl: string | null
}

const AcademiaContext = createContext<AcademiaContextValue>({
  academiaNombre: 'Mi Academia',
  academiaLogoUrl: null,
})

export function AcademiaProvider({
  academiaNombre,
  academiaLogoUrl,
  children,
}: {
  academiaNombre: string
  academiaLogoUrl: string | null
  children: React.ReactNode
}) {
  return (
    <AcademiaContext.Provider value={{ academiaNombre, academiaLogoUrl }}>
      {children}
    </AcademiaContext.Provider>
  )
}

export function useAcademia(): AcademiaContextValue {
  return useContext(AcademiaContext)
}
