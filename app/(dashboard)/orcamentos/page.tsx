'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getCurrentMonthRange } from '@/lib/utils'
import { Plus, PieChart, X, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Budget, Category } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const BUDGET_COLORS = ['#6366f1', '#22c55e', '#f43f5e', '#f59e0b', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899', '#14b8a6', '#f97316']

export default function OrcamentosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<(Budget & { gasto: number })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [valorLimite, setValorLimite] = useState('')
  const [cor, setCor] = useState('#6366f1')
  const [periodo, setPeriodo] = useState<'mensal' | 'trimestral' | 'anual'>('mensal')

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR })

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [budgetsResult, catsResult] = await Promise.all([
      supabase.from('orcamentos').select('*, categorias(nome, cor)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
    ])

    setCategories(catsResult.data || [])
    const { start, end } = getCurrentMonthRange()

    const budgetsWithGasto = await Promise.all(
      (budgetsResult.data || []).map(async budget => {
        let query = supabase.from('transacoes').select('valor').eq('user_id', user.id).eq('tipo', 'despesa').eq('status', 'pago')

        if (budget.categoria_id) query = query.eq('categoria_id', budget.categoria_id)
        if (budget.periodo === 'mensal') query = query.gte('data', start).lte('data', end)

        const { data: txs } = await query
        const gasto = txs?.reduce((s: number, t: any) => s + Number(t.valor), 0) || 0
        return { ...budget, gasto }
      })
    )

    setBudgets(budgetsWithGasto as any)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditingBudget(null)
    setNome(''); setCategoriaId(''); setValorLimite(''); setCor('#6366f1'); setPeriodo('mensal')
    setShowForm(true)
  }

  function openEdit(b: Budget) {
    setEditingBudget(b)
    setNome(b.nome); setCategoriaId(b.categoria_id || ''); setValorLimite(String(b.valor_limite))
    setCor(b.cor); setPeriodo(b.periodo)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, nome, categoria_id: categoriaId || null, valor_limite: parseFloat(valorLimite), cor, periodo }
    const { error } = editingBudget
      ? await supabase.from('orcamentos').update(payload).eq('id', editingBudget.id)
      : await supabase.from('orcamentos').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingBudget ? 'Atualizado!' : 'Orçamento criado!'); setShowForm(false); loadData() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir orçamento?')) return
    await supabase.from('orcamentos').delete().eq('id', id)
    toast.success('Excluído!'); loadData()
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Orçamentos</h1>
          <p className="text-zinc-500 text-sm mt-0.5 capitalize">{currentMonth}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />Novo
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <PieChart className="w-14 h-14 mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">Nenhum orçamento</h3>
          <p className="text-sm text-center max-w-xs">Defina limites de gastos por categoria para manter o controle financeiro.</p>
          <button onClick={openNew} className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Criar orçamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(budget => {
            const pct = Math.min((budget.gasto / budget.valor_limite) * 100, 100)
            const isWarning = pct >= 80 && pct < 100
            const isOver = pct >= 100
            const restante = budget.valor_limite - budget.gasto
            return (
              <div
                key={budget.id}
                className={`bg-[#18181b] border rounded-2xl p-5 transition-all group ${isOver ? 'border-rose-500/30' : isWarning ? 'border-yellow-500/30' : 'border-zinc-800 hover:border-zinc-700'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: budget.cor }} />
                      <h3 className="font-semibold text-zinc-100">{budget.nome}</h3>
                      {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                    </div>
                    {(budget as any).categorias && (
                      <p className="text-xs text-zinc-500 mt-1 ml-4">{(budget as any).categorias.nome}</p>
                    )}
                    <p className="text-xs text-zinc-600 mt-0.5 ml-4 capitalize">{budget.periodo}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(budget)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(budget.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: isOver ? '#f43f5e' : isWarning ? '#f59e0b' : budget.cor,
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Gasto</p>
                    <p className={`text-sm font-bold ${isOver ? 'text-rose-400' : isWarning ? 'text-yellow-400' : 'text-zinc-200'}`}>
                      {formatCurrency(budget.gasto)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">{isOver ? 'Excedido' : 'Restante'}</p>
                    <p className={`text-sm font-bold ${isOver ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {isOver ? '+' : ''}{formatCurrency(Math.abs(restante))}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-2 pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500">Limite</span>
                  <span className="text-xs font-semibold text-zinc-300">{formatCurrency(budget.valor_limite)}</span>
                </div>

                {isOver && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400 bg-rose-500/5 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Limite ultrapassado em {formatCurrency(budget.gasto - budget.valor_limite)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingBudget ? 'Editar' : 'Novo'} Orçamento</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Alimentação mensal" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Limite (R$) *</label>
                  <input type="number" step="0.01" value={valorLimite} onChange={e => setValorLimite(e.target.value)} placeholder="1.000,00" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Período</label>
                  <select value={periodo} onChange={e => setPeriodo(e.target.value as any)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria (opcional)</label>
                <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Todas as despesas</option>
                  {categories.filter(c => c.tipo === 'despesa' || c.tipo === 'ambos').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCor(c)} className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">{saving ? 'Salvando...' : editingBudget ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
