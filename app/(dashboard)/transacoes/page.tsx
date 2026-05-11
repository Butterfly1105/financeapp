'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, RefreshCw,
  Filter, X, Edit2, Trash2, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction, Category, Pasta } from '@/lib/types'

export default function TransacoesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<'todas' | 'receita' | 'despesa'>('todas')
  const [filterMes, setFilterMes] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [categoriaId, setCategoriaId] = useState('')
  const [pastaId, setPastaId] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [periodo, setPeriodo] = useState('mensal')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago')
  const [notas, setNotas] = useState('')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [txResult, catResult, pastaResult] = await Promise.all([
      supabase.from('transacoes').select('*, categorias(nome, cor), pastas(nome)').eq('user_id', user.id).order('data', { ascending: false }).order('created_at', { ascending: false }).limit(200),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('pastas').select('*').eq('user_id', user.id).order('nome'),
    ])

    setTransactions((txResult.data || []) as any)
    setCategories(catResult.data || [])
    setPastas(pastaResult.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setEditingTx(null)
    setTipo('despesa'); setDescricao(''); setValor('')
    setData(new Date().toISOString().split('T')[0])
    setCategoriaId(''); setPastaId(''); setRecorrente(false)
    setPeriodo('mensal'); setDataFim(''); setStatus('pago'); setNotas('')
  }

  function openEditForm(tx: Transaction) {
    setEditingTx(tx)
    setTipo(tx.tipo); setDescricao(tx.descricao); setValor(String(tx.valor))
    setData(tx.data); setCategoriaId(tx.categoria_id || ''); setPastaId(tx.pasta_id || '')
    setRecorrente(tx.recorrente); setPeriodo(tx.periodo_recorrencia || 'mensal')
    setDataFim(tx.data_fim_recorrencia || ''); setStatus(tx.status === 'pendente' ? 'pendente' : 'pago')
    setNotas(tx.notas || ''); setShowForm(true)
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
      pasta_id: pastaId || null,
      categoria_id: categoriaId || null,
      tipo, descricao, valor: numValor, data, status,
      recorrente,
      periodo_recorrencia: recorrente ? periodo : null,
      data_inicio_recorrencia: recorrente ? data : null,
      data_fim_recorrencia: recorrente && dataFim ? dataFim : null,
      notas: notas || null,
    }

    const { error } = editingTx
      ? await supabase.from('transacoes').update(payload).eq('id', editingTx.id)
      : await supabase.from('transacoes').insert(payload)

    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingTx ? 'Atualizado!' : 'Adicionado!'); setShowForm(false); loadData() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta transação?')) return
    await supabase.from('transacoes').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
  }

  const filtered = transactions.filter(t => {
    if (filterTipo !== 'todas' && t.tipo !== filterTipo) return false
    if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMes && !t.data.startsWith(filterMes)) return false
    return true
  })

  const totalReceitas = filtered.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + Number(t.valor), 0)
  const totalDespesas = filtered.filter(t => t.tipo === 'despesa' && t.status === 'pago').reduce((s, t) => s + Number(t.valor), 0)

  const filteredCategories = categories.filter(c => c.tipo === tipo || c.tipo === 'ambos')

  if (loading) return <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Transações</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{filtered.length} transaç{filtered.length !== 1 ? 'ões' : 'ão'}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Receitas filtradas</p>
            <p className="text-sm font-bold text-green-400">{formatCurrency(totalReceitas)}</p>
          </div>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Despesas filtradas</p>
            <p className="text-sm font-bold text-rose-400">{formatCurrency(totalDespesas)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar transações..."
            className="w-full bg-[#18181b] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value as any)}
          className="bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="todas">Todas</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <input
          type="month"
          value={filterMes}
          onChange={e => setFilterMes(e.target.value)}
          className="bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500"
        />
        {(search || filterTipo !== 'todas' || filterMes) && (
          <button
            onClick={() => { setSearch(''); setFilterTipo('todas'); setFilterMes('') }}
            className="flex items-center gap-1.5 bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-2.5 rounded-xl text-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />Limpar
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Search className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma transação encontrada</p>
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
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-zinc-200">{tx.descricao}</span>
                    {tx.recorrente && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
                        <RefreshCw className="w-2.5 h-2.5" />Recorrente
                      </span>
                    )}
                    {tx.status === 'pendente' && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-md">
                        Pendente
                      </span>
                    )}
                    {(tx as any).categorias && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ color: (tx as any).categorias.cor, background: `${(tx as any).categorias.cor}20` }}>
                        {(tx as any).categorias.nome}
                      </span>
                    )}
                    {(tx as any).pastas && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-md">
                        📁 {(tx as any).pastas.nome}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{formatDateShort(tx.data)}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${tx.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'} ${tx.status === 'pendente' ? 'opacity-50' : ''}`}>
                  {tx.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(tx.valor))}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditForm(tx)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingTx ? 'Editar' : 'Nova'} Transação</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex gap-2">
                {(['despesa', 'receita'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize ${tipo === t ? (t === 'receita' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400') : 'border-zinc-700 text-zinc-500'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição *</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor *</label>
                  <input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Data *</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
                  <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Sem categoria</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Pasta</label>
                  <select value={pastaId} onChange={e => setPastaId(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Sem pasta</option>
                    {pastas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button type="button" onClick={() => setRecorrente(!recorrente)} className={`w-11 h-6 rounded-full transition-colors flex items-center ${recorrente ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${recorrente ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm text-zinc-400">Recorrente</span>
                </div>
              </div>
              {recorrente && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Período</label>
                    <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                      {['semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Até (opcional)</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className={`flex-1 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${tipo === 'receita' ? 'bg-green-600 hover:bg-green-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
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
