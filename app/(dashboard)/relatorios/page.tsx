'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { BarChart2, Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MONTHS_OPTIONS = [3, 6, 12]

export default function RelatoriosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(6)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [totalReceitas, setTotalReceitas] = useState(0)
  const [totalDespesas, setTotalDespesas] = useState(0)
  const [saldoMedio, setSaldoMedio] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const months: any[] = []
    let sumRec = 0, sumDesp = 0

    for (let i = period - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd')
      const label = format(monthDate, 'MMM/yy', { locale: ptBR })

      const { data: txs } = await supabase
        .from('transacoes')
        .select('tipo, valor')
        .eq('user_id', user.id)
        .gte('data', start)
        .lte('data', end)
        .eq('status', 'pago')

      const rec = txs?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0
      const desp = txs?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0
      sumRec += rec; sumDesp += desp
      months.push({ mes: label, receitas: rec, despesas: desp, saldo: rec - desp })
    }

    setMonthlyData(months)
    setTotalReceitas(sumRec)
    setTotalDespesas(sumDesp)
    setSaldoMedio(period > 0 ? (sumRec - sumDesp) / period : 0)

    // Category breakdown for the whole period
    const start = format(startOfMonth(subMonths(now, period - 1)), 'yyyy-MM-dd')
    const end = format(endOfMonth(now), 'yyyy-MM-dd')
    const { data: catTxs } = await supabase
      .from('transacoes')
      .select('valor, categorias(nome, cor)')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .gte('data', start)
      .lte('data', end)
      .eq('status', 'pago')

    const catMap: Record<string, { value: number; color: string }> = {}
    catTxs?.forEach((t: any) => {
      const cat = t.categorias?.nome || 'Outros'
      const cor = t.categorias?.cor || '#71717a'
      if (!catMap[cat]) catMap[cat] = { value: 0, color: cor }
      catMap[cat].value += Number(t.valor)
    })

    setCategoryData(Object.entries(catMap).map(([name, { value, color }]) => ({ name, value, color })).sort((a, b) => b.value - a.value))
    setLoading(false)
  }, [period])

  useEffect(() => { loadData() }, [loadData])

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1c1c1f] border border-zinc-700 rounded-xl p-3 shadow-xl">
        <p className="text-zinc-400 text-xs mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-medium" style={{ color: p.color || p.fill }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Relatórios</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Análise do seu desempenho financeiro</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-1">
            {MONTHS_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => setPeriod(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-zinc-500">Total Receitas</span>
          </div>
          <p className="text-xl font-bold text-green-400">{formatCurrency(totalReceitas)}</p>
          <p className="text-xs text-zinc-600 mt-0.5">nos últimos {period} meses</p>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-zinc-500">Total Despesas</span>
          </div>
          <p className="text-xl font-bold text-rose-400">{formatCurrency(totalDespesas)}</p>
          <p className="text-xs text-zinc-600 mt-0.5">nos últimos {period} meses</p>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-4 h-4 ${saldoMedio >= 0 ? 'text-blue-400' : 'text-rose-400'}`} />
            <span className="text-xs text-zinc-500">Saldo médio/mês</span>
          </div>
          <p className={`text-xl font-bold ${saldoMedio >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatCurrency(saldoMedio)}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{totalReceitas - totalDespesas >= 0 ? 'superávit' : 'déficit'} no período</p>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 mb-4">
        <h3 className="font-semibold text-zinc-100 mb-1">Receitas vs Despesas por mês</h3>
        <p className="text-xs text-zinc-500 mb-6">Comparativo mensal</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={customTooltip} />
            <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Saldo Line Chart */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-semibold text-zinc-100 mb-1">Saldo mensal</h3>
          <p className="text-xs text-zinc-500 mb-4">Diferença entre receitas e despesas</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={customTooltip} />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#6366f1" fill="url(#saldoGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-semibold text-zinc-100 mb-1">Despesas por categoria</h3>
          <p className="text-xs text-zinc-500 mb-4">Distribuição no período</p>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.slice(0, 8).map(cat => {
                const pct = totalDespesas > 0 ? (cat.value / totalDespesas) * 100 : 0
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        <span className="text-xs text-zinc-400 truncate max-w-32">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{pct.toFixed(1)}%</span>
                        <span className="text-xs font-medium text-zinc-300">{formatCurrency(cat.value)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
              Sem dados no período
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
