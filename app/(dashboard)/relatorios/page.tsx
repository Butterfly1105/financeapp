'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { BarChart2, Download, TrendingUp, TrendingDown, Wallet, FolderOpen } from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Pasta } from '@/lib/types'

type Tab = 'geral' | 'pasta' | 'receitas'
const MONTHS_OPTIONS = [3, 6, 12]

export default function RelatoriosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('geral')
  const [period, setPeriod] = useState(6)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryDespData, setCategoryDespData] = useState<any[]>([])
  const [categoryRecData, setCategoryRecData] = useState<any[]>([])
  const [totalReceitas, setTotalReceitas] = useState(0)
  const [totalDespesas, setTotalDespesas] = useState(0)
  const [saldoMedio, setSaldoMedio] = useState(0)
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [selectedPasta, setSelectedPasta] = useState('')
  const [pastaData, setPastaData] = useState<any>(null)
  const [loadingPasta, setLoadingPasta] = useState(false)

  const loadGeral = useCallback(async () => {
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
      const { data: txs } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).gte('data', start).lte('data', end).eq('status', 'pago')
      const rec = txs?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0
      const desp = txs?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0
      sumRec += rec; sumDesp += desp
      months.push({ mes: label, receitas: rec, despesas: desp, saldo: rec - desp })
    }
    setMonthlyData(months)
    setTotalReceitas(sumRec)
    setTotalDespesas(sumDesp)
    setSaldoMedio(period > 0 ? (sumRec - sumDesp) / period : 0)

    const start = format(startOfMonth(subMonths(now, period - 1)), 'yyyy-MM-dd')
    const end = format(endOfMonth(now), 'yyyy-MM-dd')

    const { data: catTxsDesp } = await supabase.from('transacoes').select('valor, categorias(nome, cor)').eq('user_id', user.id).eq('tipo', 'despesa').gte('data', start).lte('data', end).eq('status', 'pago')
    const catDesp: Record<string, { value: number; color: string }> = {}
    catTxsDesp?.forEach((t: any) => {
      const cat = t.categorias?.nome || 'Outros'
      const cor = t.categorias?.cor || '#71717a'
      if (!catDesp[cat]) catDesp[cat] = { value: 0, color: cor }
      catDesp[cat].value += Number(t.valor)
    })
    setCategoryDespData(Object.entries(catDesp).map(([name, { value, color }]) => ({ name, value, color })).sort((a, b) => b.value - a.value))

    const { data: catTxsRec } = await supabase.from('transacoes').select('valor, categorias(nome, cor)').eq('user_id', user.id).eq('tipo', 'receita').gte('data', start).lte('data', end).eq('status', 'pago')
    const catRec: Record<string, { value: number; color: string }> = {}
    catTxsRec?.forEach((t: any) => {
      const cat = t.categorias?.nome || 'Outros'
      const cor = t.categorias?.cor || '#22c55e'
      if (!catRec[cat]) catRec[cat] = { value: 0, color: cor }
      catRec[cat].value += Number(t.valor)
    })
    setCategoryRecData(Object.entries(catRec).map(([name, { value, color }]) => ({ name, value, color })).sort((a, b) => b.value - a.value))

    const { data: pastasData } = await supabase.from('pastas').select('*').eq('user_id', user.id).order('nome')
    setPastas(pastasData || [])
    setLoading(false)
  }, [period])

  useEffect(() => { loadGeral() }, [loadGeral])

  async function loadPastaReport() {
    if (!selectedPasta) return
    setLoadingPasta(true)
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
      const { data: txs } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).eq('pasta_id', selectedPasta).gte('data', start).lte('data', end)
      const rec = txs?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0
      const desp = txs?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0
      sumRec += rec; sumDesp += desp
      months.push({ mes: label, receitas: rec, despesas: desp, saldo: rec - desp })
    }

    const { data: allTxs } = await supabase.from('transacoes').select('*, categorias(nome, cor)').eq('user_id', user.id).eq('pasta_id', selectedPasta).order('data', { ascending: false }).limit(50)
    const pastaNome = pastas.find(p => p.id === selectedPasta)?.nome || ''
    setPastaData({ months, sumRec, sumDesp, allTxs: allTxs || [], pastaNome })
    setLoadingPasta(false)
  }

  useEffect(() => { if (tab === 'pasta' && selectedPasta) loadPastaReport() }, [selectedPasta, tab, period])

  function exportCSV(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n')
    const csv = `${headers}\n${rows}`
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Relatórios</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Análise detalhada do seu desempenho financeiro</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-1">
            {MONTHS_OPTIONS.map(m => (
              <button key={m} onClick={() => setPeriod(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {m}M
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCSV(monthlyData.map(d => ({ Mês: d.mes, Receitas: d.receitas.toFixed(2), Despesas: d.despesas.toFixed(2), Saldo: d.saldo.toFixed(2) })), `relatorio-${period}meses.csv`)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-zinc-700"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'geral', label: 'Geral' },
          { key: 'pasta', label: 'Por Pasta' },
          { key: 'receitas', label: 'Receitas' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* GERAL TAB */}
      {tab === 'geral' && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-xs text-zinc-500">Total Receitas</span></div>
              <p className="text-base md:text-xl font-bold text-green-400 truncate">{formatCurrency(totalReceitas)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{period} meses</p>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-rose-400" /><span className="text-xs text-zinc-500">Total Despesas</span></div>
              <p className="text-base md:text-xl font-bold text-rose-400 truncate">{formatCurrency(totalDespesas)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{period} meses</p>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><Wallet className={`w-4 h-4 ${saldoMedio >= 0 ? 'text-blue-400' : 'text-rose-400'}`} /><span className="text-xs text-zinc-500">Saldo médio/mês</span></div>
              <p className={`text-base md:text-xl font-bold truncate ${saldoMedio >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatCurrency(saldoMedio)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{totalReceitas - totalDespesas >= 0 ? 'superávit' : 'déficit'}</p>
            </div>
          </div>

          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold text-zinc-100 mb-1">Receitas vs Despesas por mês</h3>
            <p className="text-xs text-zinc-500 mb-6">Comparativo mensal</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={44} />
                  <Tooltip content={customTooltip} />
                  <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#6366f1" fill="url(#saldoGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-semibold text-zinc-100 mb-1">Despesas por categoria</h3>
              <p className="text-xs text-zinc-500 mb-4">Distribuição no período</p>
              {categoryDespData.length > 0 ? (
                <div className="space-y-3">
                  {categoryDespData.slice(0, 8).map(cat => {
                    const pct = totalDespesas > 0 ? (cat.value / totalDespesas) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            <span className="text-xs text-zinc-400 truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
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
                <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">Sem dados</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* RECEITAS TAB */}
      {tab === 'receitas' && (
        <>
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Receitas por categoria</h3>
              <button
                onClick={() => exportCSV(categoryRecData.map(c => ({ Categoria: c.name, Valor: c.value.toFixed(2) })), 'receitas-categorias.csv')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />Exportar
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Últimos {period} meses — total: {formatCurrency(totalReceitas)}</p>
            {categoryRecData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryRecData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {categoryRecData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {categoryRecData.slice(0, 8).map(cat => {
                    const pct = totalReceitas > 0 ? (cat.value / totalReceitas) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            <span className="text-xs text-zinc-400 truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-zinc-500">{pct.toFixed(1)}%</span>
                            <span className="text-xs font-medium text-green-400">{formatCurrency(cat.value)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">Sem dados no período</div>
            )}
          </div>
        </>
      )}

      {/* POR PASTA TAB */}
      {tab === 'pasta' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <FolderOpen className="w-4 h-4 text-zinc-400" />
            <select
              value={selectedPasta}
              onChange={e => setSelectedPasta(e.target.value)}
              className="flex-1 max-w-xs bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Selecione uma pasta...</option>
              {pastas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {pastaData && (
              <button
                onClick={() => exportCSV(pastaData.months.map((d: any) => ({ Mês: d.mes, Receitas: d.receitas.toFixed(2), Despesas: d.despesas.toFixed(2), Saldo: d.saldo.toFixed(2) })), `pasta-${pastaData.pastaNome}.csv`)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm transition-colors border border-zinc-700"
              >
                <Download className="w-3.5 h-3.5" />CSV
              </button>
            )}
          </div>

          {!selectedPasta && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
              <FolderOpen className="w-14 h-14 mb-4 opacity-30" />
              <p className="text-sm">Selecione uma pasta para ver o relatório</p>
            </div>
          )}

          {selectedPasta && loadingPasta && (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}</div>
          )}

          {selectedPasta && !loadingPasta && pastaData && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Receitas</p>
                  <p className="text-base md:text-xl font-bold text-green-400 truncate">{formatCurrency(pastaData.sumRec)}</p>
                </div>
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Despesas</p>
                  <p className="text-base md:text-xl font-bold text-rose-400 truncate">{formatCurrency(pastaData.sumDesp)}</p>
                </div>
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Saldo</p>
                  <p className={`text-base md:text-xl font-bold truncate ${pastaData.sumRec - pastaData.sumDesp >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    {formatCurrency(pastaData.sumRec - pastaData.sumDesp)}
                  </p>
                </div>
              </div>

              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-zinc-100 mb-4">Evolução — {pastaData.pastaNome}</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={pastaData.months} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                    <Tooltip content={customTooltip} />
                    <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="font-semibold text-zinc-100">Transações da pasta</h3>
                </div>
                {pastaData.allTxs.length === 0 ? (
                  <p className="text-sm text-zinc-600 text-center py-12">Nenhuma transação encontrada</p>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {pastaData.allTxs.map((tx: any) => (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.tipo === 'receita' ? 'bg-green-500/10' : 'bg-rose-500/10'}`}>
                          {tx.tipo === 'receita'
                            ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{tx.descricao}</p>
                          <p className="text-xs text-zinc-500">{tx.data}</p>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${tx.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'}`}>
                          {tx.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(tx.valor))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
