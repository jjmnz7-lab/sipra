'use client'

import { useRouter } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'

export function ConfiguracionSubheader() {
  const router = useRouter()
  return <PageSubheader title="Configuración" onBack={() => router.back()} />
}
