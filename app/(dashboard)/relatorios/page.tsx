'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatCurrencyCompact, formatDateShort } from '@/lib/utils'
import { BarChart2, Download, TrendingUp, TrendingDown, Wallet, FolderOpen, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react'
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

    const { data: allTxs } = await supabase
      .from('transacoes')
      .select('*, categorias(nome, cor)')
      .eq('user_id', user.id)
      .eq('pasta_id', selectedPasta)
      .order('data', { ascending: false })
      .order('tipo')
      .limit(200)

    const pastaNome = pastas.find(p => p.id === selectedPasta)?.nome || ''

    const despesas = (allTxs || []).filter((t: any) => t.tipo === 'despesa')
    const receitas = (allTxs || []).filter((t: any) => t.tipo === 'receita')

    setPastaData({ months, sumRec, sumDesp, allTxs: allTxs || [], despesas, receitas, pastaNome })
    setLoadingPasta(false)
  }

  useEffect(() => { if (tab === 'pasta' && selectedPasta) loadPastaReport() }, [selectedPasta, tab, period])

  function exportCSV(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(';')
    const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const csv = `﻿${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPastaReport() {
    if (!pastaData) return
    const rows: any[] = []

    rows.push({ Tipo: '--- DESPESAS ---', Descrição: '', Categoria: '', Data: '', Valor: '', Total: '' })
    pastaData.despesas.forEach((tx: any) => {
      rows.push({
        Tipo: 'Despesa',
        Descrição: tx.descricao,
        Categoria: tx.categorias?.nome || 'Sem categoria',
        Data: formatDateShort(tx.data),
        Valor: `R$ ${Number(tx.valor).toFixed(2).replace('.', ',')}`,
        Total: '',
      })
    })
    const totalDesp = pastaData.despesas.reduce((s: number, t: any) => s + Number(t.valor), 0)
    rows.push({ Tipo: 'TOTAL DESPESAS', Descrição: '', Categoria: '', Data: '', Valor: '', Total: `R$ ${totalDesp.toFixed(2).replace('.', ',')}` })

    rows.push({ Tipo: '', Descrição: '', Categoria: '', Data: '', Valor: '', Total: '' })
    rows.push({ Tipo: '--- RECEITAS ---', Descrição: '', Categoria: '', Data: '', Valor: '', Total: '' })
    pastaData.receitas.forEach((tx: any) => {
      rows.push({
        Tipo: 'Receita',
        Descrição: tx.descricao,
        Categoria: tx.categorias?.nome || 'Sem categoria',
        Data: formatDateShort(tx.data),
        Valor: `R$ ${Number(tx.valor).toFixed(2).replace('.', ',')}`,
        Total: '',
      })
    })
    const totalRec = pastaData.receitas.reduce((s: number, t: any) => s + Number(t.valor), 0)
    rows.push({ Tipo: 'TOTAL RECEITAS', Descrição: '', Categoria: '', Data: '', Valor: '', Total: `R$ ${totalRec.toFixed(2).replace('.', ',')}` })
    rows.push({ Tipo: 'SALDO', Descrição: '', Categoria: '', Data: '', Valor: '', Total: `R$ ${(totalRec - totalDesp).toFixed(2).replace('.', ',')}` })

    exportCSV(rows, `relatorio-pasta-${pastaData.pastaNome}.csv`)
  }

  function exportGeralReport() {
    exportCSV(
      monthlyData.map(d => ({
        'Mês': d.mes,
        'Receitas': `R$ ${d.receitas.toFixed(2).replace('.', ',')}`,
        'Despesas': `R$ ${d.despesas.toFixed(2).replace('.', ',')}`,
        'Saldo': `R$ ${d.saldo.toFixed(2).replace('.', ',')}`,
      })),
      `relatorio-geral-${period}meses.csv`
    )
  }

  function printReport() {
    const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm")
    let title = ''
    let subtitle = ''
    let bodyContent = ''

    if (tab === 'geral') {
      title = 'Relatório Geral'
      subtitle = `Últimos ${period} meses`
      const saldoTotal = totalReceitas - totalDespesas
      bodyContent = `
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-label">Total Receitas</div><div class="kpi-value green">${formatCurrency(totalReceitas)}</div></div>
          <div class="kpi"><div class="kpi-label">Total Despesas</div><div class="kpi-value red">${formatCurrency(totalDespesas)}</div></div>
          <div class="kpi"><div class="kpi-label">Saldo do Período</div><div class="kpi-value ${saldoTotal >= 0 ? 'blue' : 'red'}">${formatCurrency(saldoTotal)}</div></div>
          <div class="kpi"><div class="kpi-label">Saldo Médio/Mês</div><div class="kpi-value ${saldoMedio >= 0 ? 'blue' : 'red'}">${formatCurrency(saldoMedio)}</div></div>
        </div>
        <h2>Evolução Mensal</h2>
        <table>
          <thead><tr><th>Mês</th><th class="right">Receitas</th><th class="right">Despesas</th><th class="right">Saldo</th></tr></thead>
          <tbody>
            ${monthlyData.map(d => `
              <tr>
                <td>${d.mes}</td>
                <td class="right green">${formatCurrency(d.receitas)}</td>
                <td class="right red">${formatCurrency(d.despesas)}</td>
                <td class="right ${d.saldo >= 0 ? 'blue' : 'red'}">${formatCurrency(d.saldo)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="tfoot-row">
              <td><strong>Total</strong></td>
              <td class="right green"><strong>${formatCurrency(totalReceitas)}</strong></td>
              <td class="right red"><strong>${formatCurrency(totalDespesas)}</strong></td>
              <td class="right ${saldoTotal >= 0 ? 'blue' : 'red'}"><strong>${formatCurrency(saldoTotal)}</strong></td>
            </tr>
          </tfoot>
        </table>
        ${categoryDespData.length > 0 ? `
        <h2>Despesas por Categoria</h2>
        <table>
          <thead><tr><th>Categoria</th><th class="right">Valor</th><th class="right">%</th></tr></thead>
          <tbody>
            ${categoryDespData.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td class="right red">${formatCurrency(cat.value)}</td>
                <td class="right muted">${totalDespesas > 0 ? ((cat.value / totalDespesas) * 100).toFixed(1) : 0}%</td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}
      `
    } else if (tab === 'pasta' && pastaData) {
      const saldoPasta = pastaData.sumRec - pastaData.sumDesp
      title = `Relatório — ${pastaData.pastaNome}`
      subtitle = `Últimos ${period} meses`
      bodyContent = `
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-label">Total Receitas</div><div class="kpi-value green">${formatCurrency(pastaData.sumRec)}</div></div>
          <div class="kpi"><div class="kpi-label">Total Despesas</div><div class="kpi-value red">${formatCurrency(pastaData.sumDesp)}</div></div>
          <div class="kpi"><div class="kpi-label">Saldo</div><div class="kpi-value ${saldoPasta >= 0 ? 'blue' : 'red'}">${formatCurrency(saldoPasta)}</div></div>
        </div>
        <h2>Despesas <span class="count">${pastaData.despesas.length} transações</span></h2>
        ${pastaData.despesas.length > 0 ? `
        <table>
          <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th class="right">Valor</th></tr></thead>
          <tbody>
            ${pastaData.despesas.map((tx: any) => `
              <tr>
                <td>${tx.descricao}</td>
                <td class="muted">${tx.categorias?.nome || '—'}</td>
                <td class="muted">${formatDateShort(tx.data)}</td>
                <td class="right red">-${formatCurrency(Number(tx.valor))}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="tfoot-row">
              <td colspan="3"><strong>Total Despesas</strong></td>
              <td class="right red"><strong>-${formatCurrency(pastaData.sumDesp)}</strong></td>
            </tr>
          </tfoot>
        </table>` : '<p class="empty">Nenhuma despesa no período.</p>'}
        <h2>Receitas <span class="count">${pastaData.receitas.length} transações</span></h2>
        ${pastaData.receitas.length > 0 ? `
        <table>
          <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th class="right">Valor</th></tr></thead>
          <tbody>
            ${pastaData.receitas.map((tx: any) => `
              <tr>
                <td>${tx.descricao}</td>
                <td class="muted">${tx.categorias?.nome || '—'}</td>
                <td class="muted">${formatDateShort(tx.data)}</td>
                <td class="right green">+${formatCurrency(Number(tx.valor))}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="tfoot-row">
              <td colspan="3"><strong>Total Receitas</strong></td>
              <td class="right green"><strong>+${formatCurrency(pastaData.sumRec)}</strong></td>
            </tr>
          </tfoot>
        </table>` : '<p class="empty">Nenhuma receita no período.</p>'}
      `
    } else if (tab === 'receitas') {
      title = 'Receitas por Categoria'
      subtitle = `Últimos ${period} meses · Total: ${formatCurrency(totalReceitas)}`
      bodyContent = `
        <table>
          <thead><tr><th>Categoria</th><th class="right">Valor</th><th class="right">%</th></tr></thead>
          <tbody>
            ${categoryRecData.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td class="right green">${formatCurrency(cat.value)}</td>
                <td class="right muted">${totalReceitas > 0 ? ((cat.value / totalReceitas) * 100).toFixed(1) : 0}%</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="tfoot-row">
              <td><strong>Total</strong></td>
              <td class="right green"><strong>${formatCurrency(totalReceitas)}</strong></td>
              <td class="right muted"><strong>100%</strong></td>
            </tr>
          </tfoot>
        </table>
      `
    }

    const printContainer = document.createElement('div')
    printContainer.id = 'rel-print-container'
    printContainer.innerHTML = `
      <style>
        @page { margin: 18mm 20mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #rel-print-container { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 13px; line-height: 1.5; }

        /* Header */
        .rpt-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 2px solid #4f46e5; margin-bottom: 22px; }
        .rpt-brand { display: flex; align-items: center; gap: 12px; }
        .rpt-logo { width: 42px; height: 42px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 800; letter-spacing: -0.5px; }
        .rpt-title { font-size: 19px; font-weight: 700; color: #111827; }
        .rpt-subtitle { font-size: 12px; color: #6b7280; margin-top: 1px; }
        .rpt-date { font-size: 11px; color: #9ca3af; text-align: right; line-height: 1.6; }

        /* KPI strip */
        .kpi-row { display: flex; gap: 10px; margin-bottom: 22px; }
        .kpi { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; background: #f9fafb; }
        .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 5px; }
        .kpi-value { font-size: 18px; font-weight: 700; }

        /* Section heading */
        h2 { font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
        .count { font-size: 11px; font-weight: 400; color: #9ca3af; text-transform: none; letter-spacing: 0; }

        /* Table */
        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        thead th { background: #f3f4f6; color: #374151; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 10px; text-align: left; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #d1d5db; }
        tbody td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #374151; }
        tbody tr:nth-child(even) td { background: #fafafa; }
        tfoot .tfoot-row td { padding: 8px 10px; background: #f3f4f6; border-top: 1px solid #d1d5db; font-size: 12px; }
        .right { text-align: right; }

        /* Colors */
        .green { color: #15803d; }
        .red { color: #b91c1c; }
        .blue { color: #1d4ed8; }
        .muted { color: #6b7280; }

        /* Footer */
        .rpt-footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }

        .empty { font-size: 12px; color: #9ca3af; padding: 12px 0; }
      </style>

      <div class="rpt-header">
        <div class="rpt-brand">
          <div class="rpt-logo">R$</div>
          <div>
            <div class="rpt-title">${title}</div>
            <div class="rpt-subtitle">${subtitle}</div>
          </div>
        </div>
        <div class="rpt-date">Finanças App<br>Gerado em ${dateStr}</div>
      </div>

      ${bodyContent}

      <div class="rpt-footer">
        <span>Finanças App — Controle Financeiro Pessoal</span>
        <span>${dateStr}</span>
      </div>
    `

    const printStyle = document.createElement('style')
    printStyle.id = 'rel-print-style'
    printStyle.innerHTML = `@media print { body > *:not(#rel-print-container) { display: none !important; } #rel-print-container { display: block !important; } }`

    document.body.appendChild(printStyle)
    document.body.appendChild(printContainer)

    window.addEventListener('afterprint', function cleanup() {
      document.getElementById('rel-print-container')?.remove()
      document.getElementById('rel-print-style')?.remove()
      window.removeEventListener('afterprint', cleanup)
    })

    window.print()
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
          {tab === 'geral' && (
            <button onClick={exportGeralReport}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-zinc-700">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span>
            </button>
          )}
          <button onClick={printReport}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-zinc-700">
            <Printer className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
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
              <p className="text-base md:text-xl font-bold text-green-400">{formatCurrencyCompact(totalReceitas)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{period} meses</p>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-rose-400" /><span className="text-xs text-zinc-500">Total Despesas</span></div>
              <p className="text-base md:text-xl font-bold text-rose-400">{formatCurrencyCompact(totalDespesas)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{period} meses</p>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><Wallet className={`w-4 h-4 ${saldoMedio >= 0 ? 'text-blue-400' : 'text-rose-400'}`} /><span className="text-xs text-zinc-500">Saldo médio/mês</span></div>
              <p className={`text-base md:text-xl font-bold ${saldoMedio >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatCurrencyCompact(saldoMedio)}</p>
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
                            <span className="text-xs font-medium text-zinc-300">{formatCurrencyCompact(cat.value)}</span>
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
                onClick={() => exportCSV(categoryRecData.map(c => ({ Categoria: c.name, 'Valor': `R$ ${c.value.toFixed(2).replace('.', ',')}` })), 'receitas-categorias.csv')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                <Download className="w-3.5 h-3.5" />Exportar
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Últimos {period} meses — total: {formatCurrencyCompact(totalReceitas)}</p>
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
                            <span className="text-xs font-medium text-green-400">{formatCurrencyCompact(cat.value)}</span>
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
            <FolderOpen className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <select value={selectedPasta} onChange={e => setSelectedPasta(e.target.value)}
              className="flex-1 max-w-xs bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Selecione uma pasta...</option>
              {pastas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {pastaData && (
              <div className="flex items-center gap-2">
                <button onClick={exportPastaReport}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm transition-colors border border-zinc-700">
                  <Download className="w-3.5 h-3.5" />CSV
                </button>
                <button onClick={printReport}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm transition-colors border border-zinc-700">
                  <Printer className="w-3.5 h-3.5" />PDF
                </button>
              </div>
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
                  <p className="text-base md:text-xl font-bold text-green-400">{formatCurrencyCompact(pastaData.sumRec)}</p>
                </div>
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Despesas</p>
                  <p className="text-base md:text-xl font-bold text-rose-400">{formatCurrencyCompact(pastaData.sumDesp)}</p>
                </div>
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Saldo</p>
                  <p className={`text-base md:text-xl font-bold ${pastaData.sumRec - pastaData.sumDesp >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    {formatCurrencyCompact(pastaData.sumRec - pastaData.sumDesp)}
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

              {/* Despesas */}
              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden mb-4">
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    <h3 className="font-semibold text-zinc-100">Despesas</h3>
                    <span className="text-xs text-zinc-500">({pastaData.despesas.length} transações)</span>
                  </div>
                  <span className="text-sm font-bold text-rose-400">{formatCurrencyCompact(pastaData.sumDesp)}</span>
                </div>
                {pastaData.despesas.length === 0 ? (
                  <p className="text-sm text-zinc-600 text-center py-8">Nenhuma despesa</p>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {pastaData.despesas.map((tx: any) => (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{tx.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-zinc-500">{formatDateShort(tx.data)}</p>
                            {tx.categorias && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{ color: tx.categorias.cor, background: `${tx.categorias.cor}20` }}>
                                {tx.categorias.nome}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-rose-400 flex-shrink-0">
                          -{formatCurrencyCompact(Number(tx.valor))}
                        </span>
                      </div>
                    ))}
                    <div className="px-5 py-3 bg-rose-500/5 flex justify-between">
                      <span className="text-sm font-semibold text-zinc-300">Total despesas</span>
                      <span className="text-sm font-bold text-rose-400">{formatCurrency(pastaData.sumDesp)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Receitas */}
              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                    <h3 className="font-semibold text-zinc-100">Receitas</h3>
                    <span className="text-xs text-zinc-500">({pastaData.receitas.length} transações)</span>
                  </div>
                  <span className="text-sm font-bold text-green-400">{formatCurrencyCompact(pastaData.sumRec)}</span>
                </div>
                {pastaData.receitas.length === 0 ? (
                  <p className="text-sm text-zinc-600 text-center py-8">Nenhuma receita</p>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {pastaData.receitas.map((tx: any) => (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{tx.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-zinc-500">{formatDateShort(tx.data)}</p>
                            {tx.categorias && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{ color: tx.categorias.cor, background: `${tx.categorias.cor}20` }}>
                                {tx.categorias.nome}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-green-400 flex-shrink-0">
                          +{formatCurrencyCompact(Number(tx.valor))}
                        </span>
                      </div>
                    ))}
                    <div className="px-5 py-3 bg-green-500/5 flex justify-between">
                      <span className="text-sm font-semibold text-zinc-300">Total receitas</span>
                      <span className="text-sm font-bold text-green-400">{formatCurrency(pastaData.sumRec)}</span>
                    </div>
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
