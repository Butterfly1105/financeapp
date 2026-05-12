'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transaction } from '@/lib/types'

export default function CalendarioPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('transacoes')
      .select('*, categorias(nome, cor)')
      .eq('user_id', user.id)
      .gte('data', start)
      .lte('data', end)
      .order('data', { ascending: true })

    setTransactions((data || []) as any)
    setLoading(false)
  }, [currentDate])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { locale: ptBR }),
    end: endOfWeek(endOfMonth(currentDate), { locale: ptBR }),
  })

  const getTransactionsForDay = (day: Date) =>
    transactions.filter(t => isSameDay(parseISO(t.data), day))

  const selectedDayTxs = selectedDay ? getTransactionsForDay(selectedDay) : []

  const totalMesReceitas = transactions.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + Number(t.valor), 0)
  const totalMesDespesas = transactions.filter(t => t.tipo === 'despesa' && t.status === 'pago').reduce((s, t) => s + Number(t.valor), 0)

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Calendário</h1>
          <p className="text-zinc-500 text-sm mt-0.5 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Hoje
            </button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Week header */}
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {weekDays.map(day => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayTxs = getTransactionsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isTodayDate = isToday(day)
              const rec = dayTxs.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
              const desp = dayTxs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0)

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date(0)) ? null : day)}
                  className={`min-h-16 p-1.5 border-b border-r border-zinc-800/50 cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-30' : ''} ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-zinc-800/30'}`}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${isTodayDate ? 'bg-indigo-600 text-white' : isSelected ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>
                    {format(day, 'd')}
                  </div>
                  {dayTxs.length > 0 && (
                    <div className="space-y-0.5">
                      {rec > 0 && (
                        <div className="text-[9px] text-green-400 bg-green-500/10 rounded px-1 truncate font-medium">
                          +{formatCurrency(rec)}
                        </div>
                      )}
                      {desp > 0 && (
                        <div className="text-[9px] text-rose-400 bg-rose-500/10 rounded px-1 truncate font-medium">
                          -{formatCurrency(desp)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-zinc-100">
              {selectedDay
                ? format(selectedDay, "d 'de' MMMM", { locale: ptBR })
                : 'Selecione um dia'
              }
            </h3>
            {selectedDay && selectedDayTxs.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">{selectedDayTxs.length} transaç{selectedDayTxs.length !== 1 ? 'ões' : 'ão'}</p>
            )}
          </div>
          <div className="p-4">
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <p className="text-sm">Clique em um dia</p>
                <p className="text-xs mt-1">para ver as transações</p>
              </div>
            ) : selectedDayTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <p className="text-sm">Nenhuma transação</p>
                <p className="text-xs mt-1">neste dia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayTxs.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.tipo === 'receita' ? 'bg-green-500/10' : 'bg-rose-500/10'}`}>
                      {tx.tipo === 'receita'
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                        : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{tx.descricao}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {(tx as any).categorias && (
                          <span className="text-[10px] px-1 rounded" style={{ color: (tx as any).categorias.cor, background: `${(tx as any).categorias.cor}20` }}>
                            {(tx as any).categorias.nome}
                          </span>
                        )}
                        {tx.recorrente && <RefreshCw className="w-3 h-3 text-indigo-400" />}
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${tx.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'}`}>
                      {tx.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(tx.valor))}
                    </span>
                  </div>
                ))}
                {selectedDayTxs.length > 1 && (
                  <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs">
                    <span className="text-zinc-500">Saldo do dia</span>
                    <span className={`font-semibold ${selectedDayTxs.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) - selectedDayTxs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      {formatCurrency(selectedDayTxs.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) - selectedDayTxs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
