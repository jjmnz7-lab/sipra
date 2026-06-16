import type { WheelEvent } from 'react'

export function normalizeWholeMoneyInput(value: string): string {
  return value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
}

export function parseWholeMoneyInput(value: string): number | '' {
  const normalized = normalizeWholeMoneyInput(value)
  return normalized === '' ? '' : Number(normalized)
}

export function formatWholeMoney(value: number): string {
  return String(Math.round(value))
}

export function preventMoneyWheel(event: WheelEvent<HTMLInputElement>): void {
  event.currentTarget.blur()
}
