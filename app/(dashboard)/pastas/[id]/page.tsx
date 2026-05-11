'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateShort, recurrencePeriodLabel } from '@/lib/utils'
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Edit2, Trash2, X,
  RefreshCw, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction, Category } from '@/lib/types'

type Tab = 'todas' | 'receitas' | 'despesas' | 'recorrentes'

export default function PastaDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [pasta, setPasta] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tab, setTab] = useState<Tab>('todas')
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [categoriaId, setCategoriaId] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [periodo, setPeriodo] = useState('mensal')
  const [dataFim, setDataFim] = useState('')
  const [notas, setNotas] = useState('')

  const loadData = useCallback(async () => {
    const { data: pastaData } = await supabase.from('pastas').select('*').eq('id', id).single()
    if (!pastaData) { router.push('/pastas'); return }
    setPasta(pastaData)

    const { data: txData } = await supabase
      .from('transacoes')
      .select('*, categorias(nome, cor)')
      .eq('pasta_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions((txData || []) as any)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: cats } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .order('nome')
      setCategories(cats || [])
    }

    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setTipo('despesa')
    setDescricao('')
    setValor('')
    setData(new Date().toISOString().split('T')[0])
    setCategoriaId('')
    setRecorrente(false)
    setPeriodo('mensal')
    setDataFim('')
    setNotas('')
    setEditingTx(null)
  }

  function openNewForm(defaultTipo?: 'receita' | 'despesa') {
    resetForm()
    if (defaultTipo) setTipo(defaultTipo)
    setShowForm(true)
  }

  function openEditForm(tx: Transaction) {
    setEditingTx(tx)
    setTipo(tx.tipo)
    setDescricao(tx.descricao)
    setValor(String(tx.valor))
    setData(tx.data)
    setCategoriaId(tx.categoria_id || '')
    setRecorrente(tx.recorrente)
    setPeriodo(tx.periodo_recorrencia || 'mensal')
    setDataFim(tx.data_fim_recorrencia || '')
    setNotas(tx.notas || '')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const numValor = parseFloat(valor.replace(',', '.'))
    if (!numValor || numValor <= 0) { toast.error('Valor inválido'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      pasta_id: id as string,
      tipo,
      descricao,
      valor: numValor,
      data,
      categoria_id: categoriaId || null,
      recorrente,
      periodo_recorrencia: recorrente ? periodo : null,
      data_inicio_recorrencia: recorrente ? data : null,
      data_fim_recorrencia: recorrente && dataFim ? dataFim : null,
      notas: notas || null,
      status: 'pago',
    }

    if (editingTx) {
      const { error } = await supabase.from('transacoes').update(payload).eq('id', editingTx.id)
      if (error) toast.error('Erro ao salvar')
      else { toast.success('Transação atualizada!'); setShowForm(false); loadData() }
    } else {
      const { error } = await supabase.from('transacoes').insert(payload)
      if (error) toast.error('Erro ao salvar')
      else { toast.success('Transação adicionada!'); setShowForm(false); loadData() }
    }
    setSaving(false)
  }

  async function handleDelete(txId: string) {
    if (!confirm('Excluir esta transação?')) return
    const { error } = await supabase.from('transacoes').delete().eq('id', txId)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluída!'); loadData() }
  }

  const filtered = transactions.filter(t => {
    if (tab === 'receitas') return t.tipo === 'receita'
    if (tab === 'despesas') return t.tipo === 'despesa'
    if (tab === 'recorrentes') return t.recorrente
    return true
  })

  const totalReceitas = transactions.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
  const totalDespesas = transactions.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0)
  const saldo = totalReceitas - totalDespesas

  const filteredCategories = categories.filter(c => c.tipo === tipo || c.tipo === 'ambos')

  if (loading) return <div className="p-6"><div className="h-10 skeleton rounded-xl w-64" /></div>
  if (!pasta) return null

  return (
    <div className="p-4 md:p-6 fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${pasta.cor}20` }}>
            <span className="text-lg" style={{ color: pasta.cor }}>📁</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-50">{pasta.nome}</h1>
            {pasta.descricao && <p className="text-sm text-zinc-500">{pasta.descricao}</p>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Receitas</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Despesas</p>
          <p className="text-lg font-bold text-rose-400">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Saldo</p>
          <p className={`text-lg font-bold ${saldo >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>

      {/* Tabs + Add buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center bg-[#18181b] border border-zinc-800 rounded-xl p-1">
          {(['todas', 'receitas', 'despesas', 'recorrentes'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t === 'recorrentes' ? 'Recorrentes' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openNewForm('receita')}
            className="flex items-center gap-1.5 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/20 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />Receita
          </button>
          <button
            onClick={() => openNewForm('despesa')}
            className="flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />Despesa
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Filter className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma transação {tab !== 'todas' ? `(${tab})` : ''}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/20 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.tipo === 'receita' ? 'bg-green-500/10' : 'bg-rose-500/10'}`}>
                  {tx.tipo === 'receita'
                    ? <ArrowUpRight className="w-4 h-4 text-green-400" />
                    : <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{tx.descricao}</span>
                    {tx.recorrente && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
                        <RefreshCw className="w-2.5 h-2.5" />
                        {recurrencePeriodLabel(tx.periodo_recorrencia!)}
                      </span>
                    )}
                    {(tx as any).categorias && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{
                          color: (tx as any).categorias.cor,
                          background: `${(tx as any).categorias.cor}20`,
                        }}
                      >
                        {(tx as any).categorias.nome}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDateShort(tx.data)}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${tx.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'}`}>
                  {tx.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(tx.valor))}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditForm(tx)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">
                {editingTx ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('despesa')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tipo === 'despesa' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('receita')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tipo === 'receita' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição *</label>
                <input
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Aluguel, Salário, Supermercado..."
                  required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    placeholder="0,00"
                    required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Data *</label>
                  <input
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                    required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
                <select
                  value={categoriaId}
                  onChange={e => setCategoriaId(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Sem categoria</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Recorrente toggle */}
              <div className="flex items-center gap-3 p-4 bg-[#1c1c1f] rounded-xl border border-zinc-700">
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">Transação recorrente</p>
                  <p className="text-xs text-zinc-500">Repete automaticamente no período selecionado</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecorrente(!recorrente)}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center ${recorrente ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                >
                  <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${recorrente ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {recorrente && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Período</label>
                    <select
                      value={periodo}
                      onChange={e => setPeriodo(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                      <option value="bimestral">Bimestral</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Data fim (opcional)</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={e => setDataFim(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Observações..."
                  rows={2}
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 text-white rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${tipo === 'receita' ? 'bg-green-600 hover:bg-green-500' : 'bg-rose-600 hover:bg-rose-500'}`}
                >
                  {saving ? 'Salvando...' : editingTx ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
