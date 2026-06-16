import { Link2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Ícono compuesto: burbuja de WhatsApp con una insignia de "link" abajo a la
 * derecha. Hereda el color del texto (currentColor) y la insignia lleva un
 * fondo (bg-card) para separarse visualmente de la burbuja.
 */
export function WhatsappLinkIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center', className)}>
      <MessageCircle className="h-5 w-5" />
      <span className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-card p-[1.5px]">
        <Link2 className="h-2.5 w-2.5" strokeWidth={2.75} />
      </span>
    </span>
  )
}
