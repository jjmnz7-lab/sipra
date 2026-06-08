import {
  Banknote,
  RefreshCcw,
  Receipt,
  CalendarClock,
  FileText,
  XCircle,
  Bell,
  Circle,
  LucideIcon,
} from 'lucide-react'

type IconoConfig = {
  Icon: LucideIcon
  color: string
  bg: string
}

export function iconoEvento(tipo: string): IconoConfig {
  switch (tipo) {
    case 'abono_registrado':
      return { Icon: Banknote, color: 'text-white', bg: 'bg-[#22887c]' }
    case 'pago_anulado':
      return { Icon: RefreshCcw, color: 'text-white', bg: 'bg-destructive' }
    case 'cargo_creado':
    case 'cargo_individual':
      return { Icon: Receipt, color: 'text-white', bg: 'bg-primary' }
    case 'cargo_anulado':
      return { Icon: XCircle, color: 'text-white', bg: 'bg-destructive' }
    case 'promesa_pago':
      return { Icon: CalendarClock, color: 'text-white', bg: 'bg-amber-500' }
    case 'nota':
      return { Icon: FileText, color: 'text-white', bg: 'bg-slate-500' }
    case 'recordatorio_enviado':
      return { Icon: Bell, color: 'text-white', bg: 'bg-[#15435a]' }
    default:
      return { Icon: Circle, color: 'text-white', bg: 'bg-primary' }
  }
}
