'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Target, Plus,
  ArrowUpRight, ArrowDownRight, Clock, FolderOpen,
  BarChart2, PieChart as PieChartIcon, X
} from 'lucide-react'
import { formatCurrency, formatCurrencyCompact, formatDateShort, getGreeting, getCurrentMonthRange } from '@/lib/utils'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Transaction, Goal } from '@/lib/types'

interface MonthlyData { mes: string; receitas: number; despesas: number }
interface CategoryData { name: string; value: number; color: string }

const quickOptions = [
  { label: 'Receita', href: '/transacoes', icon: ArrowUpRight, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', desc: 'Nova receita' },
  { label: 'Despesa', href: '/transacoes', icon: ArrowDownRight, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', desc: 'Nova despesa' },
  { label: 'Pasta', href: '/pastas', icon: FolderOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', desc: 'Nova pasta' },
  { label: 'Investimento', href: '/investimentos', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', desc: 'Novo investimento' },
  { label: 'Orçamento', href: '/orcamentos', icon: PieChartIcon, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', desc: 'Nova proposta' },
  { label: 'Objetivo', href: '/objetivos', icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'Novo objetivo' },
]

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [saldoTotal, setSaldoTotal] = useState(0)
  const [receitasMes, setReceitasMes] = useState(0)
  const [despesasMes, setDespesasMes] = useState(0)
  const [totalInvestimentos, setTotalInvestimentos] = useState(0)
  const [receitasAnterior, setReceitasAnterior] = useState(0)
  const [despesasAnterior, setDespesasAnterior] = useState(0)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  const loadDashboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
    setUserName(profile?.nome || 'Usuário')

    const now = new Date()
    const { start: mesStart, end: mesEnd } = getCurrentMonthRange()
    const mesAnteriorStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
    const mesAnteriorEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')

    const { data: transacoesMes } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).gte('data', mesStart).lte('data', mesEnd).eq('status', 'pago')
    const recMes = transacoesMes?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0
    const despMes = transacoesMes?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0
    setReceitasMes(recMes)
    setDespesasMes(despMes)

    const { data: transacoesAnterior } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).gte('data', mesAnteriorStart).lte('data', mesAnteriorEnd).eq('status', 'pago')
    setReceitasAnterior(transacoesAnterior?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0)
    setDespesasAnterior(transacoesAnterior?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0)

    const { data: allTransacoes } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).eq('status', 'pago')
    const totalRec = allTransacoes?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0
    const totalDesp = allTransacoes?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0
    setSaldoTotal(totalRec - totalDesp)

    const { data: invData } = await supabase.from('investimentos').select('valor_atual, valor_inicial').eq('user_id', user.id)
    setTotalInvestimentos(invData?.reduce((s, i) => s + Number(i.valor_atual || i.valor_inicial), 0) || 0)

    const monthsData: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd')
      const label = format(monthDate, 'MMM', { locale: ptBR })
      const { data: monthTransactions } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).gte('data', start).lte('data', end).eq('status', 'pago')
      monthsData.push({
        mes: label.charAt(0).toUpperCase() + label.slice(1),
        receitas: monthTransactions?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0,
        despesas: monthTransactions?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0,
      })
    }
    setMonthlyData(monthsData)

    const { data: catData } = await supabase.from('transacoes').select('valor, categorias(nome, cor)').eq('user_id', user.id).eq('tipo', 'despesa').gte('data', mesStart).lte('data', mesEnd).eq('status', 'pago')
    const catMap: Record<string, { value: number; color: string }> = {}
    catData?.forEach((t: any) => {
      const cat = t.categorias?.nome || 'Outros'
      const cor = t.categorias?.cor || '#71717a'
      if (!catMap[cat]) catMap[cat] = { value: 0, color: cor }
      catMap[cat].value += Number(t.valor)
    })
    setCategoryData(Object.entries(catMap).map(([name, { value, color }]) => ({ name, value, color })).sort((a, b) => b.value - a.value).slice(0, 6))

    const { data: recent } = await supabase.from('transacoes').select('*, categorias(nome, cor)').eq('user_id', user.id).order('data', { ascending: false }).order('created_at', { ascending: false }).limit(6)
    setRecentTransactions((recent || []) as any)

    const { data: goalsData } = await supabase.from('objetivos').select('*').eq('user_id', user.id).eq('status', 'ativo').order('created_at', { ascending: false }).limit(3)
    setGoals(goalsData || [])

    setLoading(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const variationReceitas = receitasAnterior > 0 ? ((receitasMes - receitasAnterior) / receitasAnterior) * 100 : 0
  const variationDespesas = despesasAnterior > 0 ? ((despesasMes - despesasAnterior) / despesasAnterior) * 100 : 0

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#1c1c1f] border border-zinc-700 rounded-xl p-3 shadow-xl">
          <p className="text-zinc-400 text-xs mb-2">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="text-xs font-medium" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 skeleton rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 skeleton rounded-2xl lg:col-span-2" />
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-50">
            {getGreeting()}, {userName.split(' ')[0]}! 👋
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => setShowQuickCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Criar</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] md:text-xs text-zinc-500 font-medium">Saldo Total</span>
          </div>
          <p className={`text-base md:text-xl font-bold truncate ${saldoTotal >= 0 ? 'text-zinc-50' : 'text-rose-400'}`}>
            {formatCurrencyCompact(saldoTotal)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">acumulado</p>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${variationReceitas >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
              {variationReceitas >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(variationReceitas).toFixed(0)}%
            </div>
          </div>
          <p className="text-base md:text-xl font-bold text-green-400 truncate">{formatCurrencyCompact(receitasMes)}</p>
          <p className="text-xs text-zinc-500 mt-1">receitas do mês</p>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${variationDespesas <= 0 ? 'text-green-400' : 'text-rose-400'}`}>
              {variationDespesas > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(variationDespesas).toFixed(0)}%
            </div>
          </div>
          <p className="text-base md:text-xl font-bold text-rose-400 truncate">{formatCurrencyCompact(despesasMes)}</p>
          <p className="text-xs text-zinc-500 mt-1">despesas do mês</p>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-[10px] md:text-xs text-zinc-500 font-medium">Portfólio</span>
          </div>
          <p className="text-base md:text-xl font-bold text-blue-400 truncate">{formatCurrencyCompact(totalInvestimentos)}</p>
          <p className="text-xs text-zinc-500 mt-1">em investimentos</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-zinc-100">Receitas vs Despesas</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />Receitas
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Despesas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="receitasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="despesasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={customTooltip} />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#22c55e" fill="url(#receitasGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#f43f5e" fill="url(#despesasGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-zinc-100">Por Categoria</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Despesas do mês</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {categoryData.slice(0, 4).map(cat => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs text-zinc-400 truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-300 ml-2 flex-shrink-0">{formatCurrencyCompact(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
              Nenhuma despesa no mês
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-100">Últimas Transações</h3>
            <Link href="/transacoes" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Ver todas</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.tipo === 'receita' ? 'bg-green-500/10' : 'bg-rose-500/10'}`}>
                    {t.tipo === 'receita' ? <ArrowUpRight className="w-3.5 h-3.5 text-green-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{t.descricao}</p>
                    <p className="text-xs text-zinc-500">{formatDateShort(t.data)}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${t.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'}`}>
                    {t.tipo === 'receita' ? '+' : '-'}{formatCurrencyCompact(Number(t.valor))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
              <Clock className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhuma transação ainda</p>
            </div>
          )}
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-100">Objetivos</h3>
            <Link href="/objetivos" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Ver todos</Link>
          </div>
          {goals.length > 0 ? (
            <div className="space-y-4">
              {goals.map(goal => {
                const progress = Math.min((goal.valor_atual / goal.valor_alvo) * 100, 100)
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-200 truncate flex-1 mr-2">{goal.nome}</span>
                      <span className="text-xs text-zinc-400 flex-shrink-0">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: goal.cor }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-zinc-500">{formatCurrencyCompact(goal.valor_atual)}</span>
                      <span className="text-xs text-zinc-500">{formatCurrencyCompact(goal.valor_alvo)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
              <Target className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhum objetivo criado</p>
              <Link href="/objetivos" className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">Criar objetivo</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-100">O que deseja criar?</h2>
              <button onClick={() => setShowQuickCreate(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {quickOptions.map(opt => {
                const Icon = opt.icon
                return (
                  <Link
                    key={opt.label}
                    href={opt.href}
                    onClick={() => setShowQuickCreate(false)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${opt.bg} hover:scale-105 transition-all duration-150 cursor-pointer`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${opt.bg}`}>
                      <Icon className={`w-4 h-4 ${opt.color}`} />
                    </div>
                    <span className={`text-xs font-semibold ${opt.color}`}>{opt.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
