import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RecurrencePeriod } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`
  }
  return formatCurrency(value)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd 'de' MMM 'de' yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM/yy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function getLastSixMonths(): { start: string; end: string; months: string[] } {
  const now = new Date()
  const sixMonthsAgo = subMonths(startOfMonth(now), 5)
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now }).map(d =>
    format(d, 'yyyy-MM-dd')
  )
  return {
    start: format(sixMonthsAgo, 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
    months,
  }
}

export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function recurrencePeriodLabel(period: RecurrencePeriod): string {
  const labels: Record<RecurrencePeriod, string> = {
    semanal: 'Semanal',
    quinzenal: 'Quinzenal',
    mensal: 'Mensal',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  }
  return labels[period] || period
}

export function calculateCompoundInterest(
  principal: number,
  monthlyRate: number,
  months: number,
  monthlyContribution: number = 0
): { montante: number; totalInvestido: number; totalJuros: number; history: Array<{ mes: number; valor: number; investido: number }> } {
  const history = []
  let valor = principal
  let totalInvestido = principal

  for (let i = 1; i <= months; i++) {
    valor = valor * (1 + monthlyRate / 100)
    if (i > 1) {
      valor += monthlyContribution
      totalInvestido += monthlyContribution
    }
    history.push({ mes: i, valor: Number(valor.toFixed(2)), investido: totalInvestido })
  }

  return {
    montante: Number(valor.toFixed(2)),
    totalInvestido: Number(totalInvestido.toFixed(2)),
    totalJuros: Number((valor - totalInvestido).toFixed(2)),
    history,
  }
}

export function getMonthlyFromRecurrence(valor: number, periodo: RecurrencePeriod): number {
  const multipliers: Record<RecurrencePeriod, number> = {
    semanal: 4.33,
    quinzenal: 2,
    mensal: 1,
    bimestral: 0.5,
    trimestral: 1 / 3,
    semestral: 1 / 6,
    anual: 1 / 12,
  }
  return valor * (multipliers[periodo] || 1)
}

export function getVariationClass(value: number): string {
  if (value > 0) return 'text-green-400'
  if (value < 0) return 'text-rose-400'
  return 'text-zinc-400'
}

export function getVariationLabel(value: number): string {
  if (value > 0) return `+${value.toFixed(1)}%`
  if (value < 0) return `${value.toFixed(1)}%`
  return '0%'
}

export const FOLDER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#a855f7',
  '#14b8a6', '#eab308', '#ef4444', '#84cc16', '#f97316',
]

export const CATEGORY_ICONS = [
  'home', 'car', 'utensils', 'shopping-bag', 'heart', 'book',
  'gamepad', 'plane', 'music', 'coffee', 'gift', 'briefcase',
  'dollar-sign', 'credit-card', 'trending-up', 'zap',
]

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function parseBRLInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
