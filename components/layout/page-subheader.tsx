import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageSubheaderProps {
  title: React.ReactNode
  actions?: React.ReactNode
  backHref?: string
  onBack?: () => void
  badge?: React.ReactNode
  className?: string
}

export function PageSubheader({ title, actions, backHref, onBack, badge, className }: PageSubheaderProps) {
  return (
    <div
      className={cn(
        'bg-card/95 backdrop-blur-sm border-b border-border px-4 h-14 flex items-center',
        'sticky top-[56px] z-20 w-full',
        className
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {(backHref || onBack) && (
            backHref ? (
              <Link 
                href={backHref} 
                className="p-1.5 hover:bg-[#22887c]/10 hover:text-[#22887c] active:bg-[#22887c]/15 active:text-[#22887c] active:scale-95 rounded-full transition-[transform,background-color,color,box-shadow] duration-150 text-muted-foreground flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : (
              <button 
                onClick={onBack}
                className="p-1.5 hover:bg-[#22887c]/10 hover:text-[#22887c] active:bg-[#22887c]/15 active:text-[#22887c] active:scale-95 rounded-full transition-[transform,background-color,color,box-shadow] duration-150 text-muted-foreground flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )
          )}
          
          <div className="text-xl font-bold tracking-tight text-foreground truncate flex items-center gap-2">
            {title}
          </div>
          
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
