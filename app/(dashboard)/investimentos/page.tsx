'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatCurrencyCompact, calculateCompoundInterest } from '@/lib/utils'
import {
  Plus, TrendingUp, Calculator, X, Trash2, Edit2,
  BarChart2, DollarSign, Calendar, Percent, PlusCircle, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { differenceInMonths, parseISO } from 'date-fns'
import type { Investment } from '@/lib/types'

const INVESTMENT_TYPES = ['CDB', 'LCI', 'LCA', 'Tesouro Direto', 'Ações', 'FII', 'Criptomoedas', 'Poupança', 'Outro']

function calcProjected(inv: Investment): number {
  if (!inv.taxa_juros) return Number(inv.valor_atual || inv.valor_inicial)
  const months = Math.max(0, differenceInMonths(new Date(), parseISO(inv.data_inicio)))
  const taxaMensal = Math.pow(1 + Number(inv.taxa_juros) / 100, 1 / 12) - 1
  return Number(inv.valor_inicial) * Math.pow(1 + taxaMensal, months)
}

export default function InvestimentosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingInv, setEditingInv] = useState<Investment | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'lista' | 'calculadora'>('lista')
  const [showAporteModal, setShowAporteModal] = useState(false)
  const [aporteInv, setAporteInv] = useState<Investment | null>(null)
  const [aporteValor, setAporteValor] = useState('')
  const [savingAporte, setSavingAporte] = useState(false)

  // Form state
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('CDB')
  const [valorInicial, setValorInicial] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [taxaJuros, setTaxaJuros] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [dataVencimento, setDataVencimento] = useState('')
  const [notas, setNotas] = useState('')

  // Calculator state
  const [calcPrincipal, setCalcPrincipal] = useState('')
  const [calcAporte, setCalcAporte] = useState('')
  const [calcTaxa, setCalcTaxa] = useState('')
  const [calcPeriodo, setCalcPeriodo] = useState('')
  const [calcPeriodoTipo, setCalcPeriodoTipo] = useState<'meses' | 'anos'>('meses')
  const [calcTaxaTipo, setCalcTaxaTipo] = useState<'mensal' | 'anual'>('anual')
  const [calcResult, setCalcResult] = useState<any>(null)

  const loadInvestments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('investimentos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setInvestments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadInvestments() }, [loadInvestments])

  function openNewForm() {
    setEditingInv(null)
    setNome(''); setTipo('CDB'); setValorInicial(''); setValorAtual('')
    setTaxaJuros(''); setDataInicio(new Date().toISOString().split('T')[0])
    setDataVencimento(''); setNotas('')
    setShowForm(true)
  }

  function openEditForm(inv: Investment) {
    setEditingInv(inv)
    setNome(inv.nome); setTipo(inv.tipo); setValorInicial(String(inv.valor_inicial))
    setValorAtual(inv.valor_atual ? String(inv.valor_atual) : '')
    setTaxaJuros(inv.taxa_juros ? String(inv.taxa_juros) : '')
    setDataInicio(inv.data_inicio)
    setDataVencimento(inv.data_vencimento || ''); setNotas(inv.notas || '')
    setShowForm(true)
  }

  function openAporte(inv: Investment) {
    setAporteInv(inv); setAporteValor(''); setShowAporteModal(true)
  }

  async function handleAporte(e: React.FormEvent) {
    e.preventDefault()
    if (!aporteInv) return
    const valor = parseFloat(aporteValor)
    if (!valor || valor <= 0) { toast.error('Valor inválido'); return }
    setSavingAporte(true)
    const novoInicial = Number(aporteInv.valor_inicial) + valor
    const novoAtual = Number(aporteInv.valor_atual || aporteInv.valor_inicial) + valor
    const { error } = await supabase.from('investimentos').update({ valor_inicial: novoInicial, valor_atual: novoAtual }).eq('id', aporteInv.id)
    if (error) toast.error('Erro ao registrar aporte')
    else { toast.success(`Aporte de ${formatCurrency(valor)} registrado!`); setShowAporteModal(false); loadInvestments() }
    setSavingAporte(false)
  }

  async function handleSyncYield(inv: Investment) {
    const projected = calcProjected(inv)
    const { error } = await supabase.from('investimentos').update({ valor_atual: projected }).eq('id', inv.id)
    if (error) toast.error('Erro ao sincronizar')
    else { toast.success('Valor atualizado com a projeção!'); loadInvestments() }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id, nome, tipo,
      valor_inicial: parseFloat(valorInicial),
      valor_atual: valorAtual ? parseFloat(valorAtual) : null,
      taxa_juros: taxaJuros ? parseFloat(taxaJuros) : null,
      data_inicio: dataInicio,
      data_vencimento: dataVencimento || null,
      notas: notas || null,
    }
    const { error } = editingInv
      ? await supabase.from('investimentos').update(payload).eq('id', editingInv.id)
      : await supabase.from('investimentos').insert(payload)
    if (error) toast.error('Erro ao salvar investimento')
    else { toast.success(editingInv ? 'Atualizado!' : 'Investimento adicionado!'); setShowForm(false); loadInvestments() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este investimento?')) return
    await supabase.from('investimentos').delete().eq('id', id)
    toast.success('Excluído!'); loadInvestments()
  }

  function calculateResult() {
    const p = parseFloat(calcPrincipal) || 0
    const aporte = parseFloat(calcAporte) || 0
    const taxa = parseFloat(calcTaxa) || 0
    const periodoNum = parseInt(calcPeriodo) || 0
    if (!p || !taxa || !periodoNum) { toast.error('Preencha todos os campos obrigatórios'); return }
    const meses = calcPeriodoTipo === 'anos' ? periodoNum * 12 : periodoNum
    const taxaMensal = calcTaxaTipo === 'anual' ? (Math.pow(1 + taxa / 100, 1 / 12) - 1) * 100 : taxa
    setCalcResult({ ...calculateCompoundInterest(p, taxaMensal, meses, aporte), meses, taxaMensal })
  }

  const totalCarteira = investments.reduce((s, i) => s + Number(i.valor_atual || i.valor_inicial), 0)
  const totalInvestido = investments.reduce((s, i) => s + Number(i.valor_inicial), 0)
  const rendimento = totalCarteira - totalInvestido

  const typeDistribution = investments.reduce((acc: any, inv) => {
    if (!acc[inv.tipo]) acc[inv.tipo] = 0
    acc[inv.tipo] += Number(inv.valor_atual || inv.valor_inicial)
    return acc
  }, {})
  const pieData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value }))

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Investimentos</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Portfólio e calculadora de juros compostos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'lista' ? 'calculadora' : 'lista')}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border border-zinc-700"
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Calculadora</span>
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />Adicionar
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500">Portfólio Total</span>
          </div>
          <p className="text-base md:text-xl font-bold text-blue-400">{formatCurrencyCompact(totalCarteira)}</p>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Total Investido</span>
          </div>
          <p className="text-base md:text-xl font-bold text-zinc-200">{formatCurrencyCompact(totalInvestido)}</p>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${rendimento >= 0 ? 'text-green-400' : 'text-rose-400'}`} />
            <span className="text-xs text-zinc-500">Rendimento</span>
          </div>
          <p className={`text-base md:text-xl font-bold ${rendimento >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
            {rendimento >= 0 ? '+' : ''}{formatCurrencyCompact(rendimento)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-1 w-fit">
            {(['lista', 'calculadora'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t === 'lista' ? 'Meus investimentos' : 'Calculadora'}
              </button>
            ))}
          </div>

          {activeTab === 'lista' ? (
            <div className="space-y-3">
              {investments.length === 0 ? (
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-12 flex flex-col items-center text-zinc-600">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum investimento cadastrado</p>
                  <button onClick={openNewForm} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">+ Adicionar investimento</button>
                </div>
              ) : (
                investments.map(inv => {
                  const valorExibido = Number(inv.valor_atual || inv.valor_inicial)
                  const rendInv = valorExibido - Number(inv.valor_inicial)
                  const rendPct = Number(inv.valor_inicial) > 0 ? (rendInv / Number(inv.valor_inicial)) * 100 : 0
                  const projetado = calcProjected(inv)
                  const hasRate = !!inv.taxa_juros
                  const diffProj = projetado - valorExibido

                  return (
                    <div key={inv.id} className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-zinc-100">{inv.nome}</h3>
                          <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-md mt-1 inline-block">
                            {inv.tipo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openAporte(inv)} title="Fazer aporte" className="p-1.5 rounded-lg text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEditForm(inv)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-zinc-500 mb-0.5">Investido</p>
                          <p className="text-sm font-semibold text-zinc-200">{formatCurrency(Number(inv.valor_inicial))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-0.5">Atual</p>
                          <p className="text-sm font-semibold text-blue-400">{formatCurrency(valorExibido)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-0.5">Rendimento</p>
                          <p className={`text-sm font-semibold ${rendInv >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                            {rendInv >= 0 ? '+' : ''}{rendPct.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {hasRate && (
                        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-zinc-500 mb-0.5">Projeção ({inv.taxa_juros}% a.a.)</p>
                            <p className="text-sm font-semibold text-indigo-400">{formatCurrency(projetado)}</p>
                            {Math.abs(diffProj) > 0.01 && (
                              <p className={`text-[10px] mt-0.5 ${diffProj > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                                {diffProj > 0 ? '+' : ''}{formatCurrency(diffProj)} vs atual
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleSyncYield(inv)}
                            title="Atualizar valor atual para o projetado"
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />Sincronizar
                          </button>
                        </div>
                      )}

                      {inv.taxa_juros && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                          <Percent className="w-3 h-3" />
                          Taxa: {inv.taxa_juros}% a.a.
                          {inv.data_vencimento && (<> · <Calendar className="w-3 h-3" />Vence: {inv.data_vencimento}</>)}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-zinc-100">Calculadora de Juros Compostos</h2>
                  <p className="text-xs text-zinc-500">Simule o crescimento do seu investimento</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Capital inicial (R$)</label>
                    <input type="number" value={calcPrincipal} onChange={e => setCalcPrincipal(e.target.value)} placeholder="10.000"
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Aporte mensal (R$)</label>
                    <input type="number" value={calcAporte} onChange={e => setCalcAporte(e.target.value)} placeholder="500"
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Taxa de juros</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" value={calcTaxa} onChange={e => setCalcTaxa(e.target.value)} placeholder="12"
                        className="flex-1 min-w-0 bg-[#1c1c1f] border border-zinc-700 rounded-xl px-3 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                      <select value={calcTaxaTipo} onChange={e => setCalcTaxaTipo(e.target.value as any)}
                        className="bg-[#1c1c1f] border border-zinc-700 rounded-xl px-2 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                        <option value="anual">% a.a.</option>
                        <option value="mensal">% a.m.</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Período</label>
                    <div className="flex gap-2">
                      <input type="number" value={calcPeriodo} onChange={e => setCalcPeriodo(e.target.value)} placeholder="60"
                        className="flex-1 min-w-0 bg-[#1c1c1f] border border-zinc-700 rounded-xl px-3 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                      <select value={calcPeriodoTipo} onChange={e => setCalcPeriodoTipo(e.target.value as any)}
                        className="bg-[#1c1c1f] border border-zinc-700 rounded-xl px-2 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                        <option value="meses">meses</option>
                        <option value="anos">anos</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button onClick={calculateResult} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
                  Calcular
                </button>
                {calcResult && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-xs text-zinc-400 text-center">
                      {calcTaxaTipo === 'anual'
                        ? `${calcTaxa}% a.a. = ${calcResult.taxaMensal.toFixed(4)}% a.m.`
                        : `${calcTaxa}% a.m.`
                      } · {calcPeriodoTipo === 'anos' ? `${calcPeriodo} anos = ${calcResult.meses} meses` : `${calcResult.meses} meses`}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#1c1c1f] rounded-xl p-3 text-center border border-zinc-700">
                        <p className="text-xs text-zinc-500 mb-1">Montante</p>
                        <p className="text-sm font-bold text-indigo-400">{formatCurrencyCompact(calcResult.montante)}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{formatCurrency(calcResult.montante)}</p>
                      </div>
                      <div className="bg-[#1c1c1f] rounded-xl p-3 text-center border border-zinc-700">
                        <p className="text-xs text-zinc-500 mb-1">Investido</p>
                        <p className="text-sm font-bold text-zinc-200">{formatCurrencyCompact(calcResult.totalInvestido)}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{formatCurrency(calcResult.totalInvestido)}</p>
                      </div>
                      <div className="bg-[#1c1c1f] rounded-xl p-3 text-center border border-zinc-700">
                        <p className="text-xs text-zinc-500 mb-1">Juros</p>
                        <p className="text-sm font-bold text-green-400">+{formatCurrencyCompact(calcResult.totalJuros)}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{formatCurrency(calcResult.totalJuros)}</p>
                      </div>
                    </div>
                    <div className="bg-[#1c1c1f] rounded-xl p-4 border border-zinc-700">
                      <p className="text-xs text-zinc-500 mb-3">Evolução do patrimônio</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={calcResult.history.filter((_: any, i: number) => i % Math.max(1, Math.floor(calcResult.history.length / 24)) === 0)}>
                          <defs>
                            <linearGradient id="calcGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={44} />
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: 8 }} />
                          <Area type="monotone" dataKey="investido" name="Investido" stroke="#71717a" fill="none" strokeWidth={1.5} dot={false} />
                          <Area type="monotone" dataKey="valor" name="Patrimônio" stroke="#6366f1" fill="url(#calcGrad)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Distribution */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-semibold text-zinc-100 mb-4">Distribuição por tipo</h3>
          {pieData.length > 0 ? (
            <div className="space-y-3">
              {pieData.map(({ name, value }: any, i) => {
                const pct = totalCarteira > 0 ? (value / totalCarteira) * 100 : 0
                const colors = ['#6366f1', '#22c55e', '#3b82f6', '#f59e0b', '#f43f5e', '#a855f7', '#06b6d4', '#ec4899']
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 truncate">{name}</span>
                      <span className="text-zinc-300 font-medium ml-2">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-8">Sem dados</p>
          )}
        </div>
      </div>

      {/* Investment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingInv ? 'Editar Investimento' : 'Novo Investimento'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tesouro IPCA+ 2029" required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                  {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor investido (R$) *</label>
                  <input type="number" step="0.01" value={valorInicial} onChange={e => setValorInicial(e.target.value)} required placeholder="1000,00"
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor atual (R$)</label>
                  <input type="number" step="0.01" value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder="Opcional"
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Taxa (% a.a.)</label>
                  <input type="number" step="0.01" value={taxaJuros} onChange={e => setTaxaJuros(e.target.value)} placeholder="12,5"
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Vencimento</label>
                <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Salvando...' : editingInv ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aporte Modal */}
      {showAporteModal && aporteInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Fazer Aporte</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{aporteInv.nome}</p>
              </div>
              <button onClick={() => setShowAporteModal(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAporte} className="p-6 space-y-4">
              <div className="bg-zinc-800/50 rounded-xl p-3 text-sm text-zinc-400">
                Saldo atual: <span className="font-semibold text-blue-400">{formatCurrency(Number(aporteInv.valor_atual || aporteInv.valor_inicial))}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Valor do aporte (R$) *</label>
                <input type="number" step="0.01" min="0.01" value={aporteValor} onChange={e => setAporteValor(e.target.value)} placeholder="0,00" required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" autoFocus />
              </div>
              {aporteValor && parseFloat(aporteValor) > 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-sm">
                  <p className="text-zinc-400">Novo saldo após aporte:</p>
                  <p className="font-bold text-green-400">{formatCurrency(Number(aporteInv.valor_atual || aporteInv.valor_inicial) + parseFloat(aporteValor))}</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAporteModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={savingAporte} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                  {savingAporte ? 'Salvando...' : 'Aportar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
