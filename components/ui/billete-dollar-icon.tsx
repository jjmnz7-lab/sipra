import { cn } from '@/lib/utils'

/**
 * Ícono de "billete con símbolo $": un billete (rectángulo redondeado) con un
 * signo de pesos en el centro. Pensado para que se lea claramente como dinero
 * en las acciones de cobro. Hereda el color vía `currentColor`.
 */
export function BilleteDollarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      {/* Cuerpo del billete */}
      <rect x="2" y="6" width="20" height="12" rx="2" />
      {/* Símbolo $ */}
      <path d="M14.2 9.6c-.5-.5-1.3-.85-2.2-.85-1.2 0-2.1.65-2.1 1.55 0 .9.9 1.3 2.1 1.45 1.2.15 2.1.55 2.1 1.45 0 .9-.9 1.55-2.1 1.55-.9 0-1.7-.35-2.2-.85" />
      <path d="M12 7.4v9.2" />
    </svg>
  )
}
