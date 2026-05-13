'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatCurrencyCompact, formatDateShort } from '@/lib/utils'
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, RefreshCw,
  X, Edit2, Trash2, Tag as TagIcon, CreditCard, Repeat
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addMonths, parseISO } from 'date-fns'
import type { Transaction, Category, Pasta, Tag } from '@/lib/types'

type RecurrenceMode = 'none' | 'parcelado' | 'fixo'

export default function TransacoesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [tagsAvailable, setTagsAvailable] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<'todas' | 'receita' | 'despesa'>('todas')
  const [filterMes, setFilterMes] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterTag, setFilterTag] = useState('')
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
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('none')
  const [periodo, setPeriodo] = useState('mensal')
  const [dataFim, setDataFim] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState('')
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago')
  const [notas, setNotas] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [txResult, catResult, pastaResult, tagResult] = await Promise.all([
      supabase.from('transacoes')
        .select('*, categorias(nome, cor), pastas(nome), transacao_tags(tags(id, nome, cor))')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('pastas').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('tags').select('*').eq('user_id', user.id).order('nome'),
    ])

    setTransactions((txResult.data || []) as any)
    setCategories(catResult.data || [])
    setPastas(pastaResult.data || [])
    setTagsAvailable(tagResult.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-calc end date for installments
  useEffect(() => {
    if (recurrenceMode === 'parcelado' && numeroParcelas && data) {
      const n = parseInt(numeroParcelas)
      if (n > 1) {
        const startDate = parseISO(data)
        const endDate = addMonths(startDate, n - 1)
        setDataFim(format(endDate, 'yyyy-MM-dd'))
      }
    }
  }, [numeroParcelas, data, recurrenceMode])

  function resetForm() {
    setEditingTx(null)
    setTipo('despesa'); setDescricao(''); setValor('')
    setData(new Date().toISOString().split('T')[0])
    setCategoriaId(''); setPastaId('')
    setRecurrenceMode('none'); setPeriodo('mensal')
    setDataFim(''); setNumeroParcelas('')
    setStatus('pago'); setNotas(''); setSelectedTags([])
  }

  function openEditForm(tx: Transaction) {
    setEditingTx(tx)
    setTipo(tx.tipo); setDescricao(tx.descricao); setValor(String(tx.valor))
    setData(tx.data); setCategoriaId(tx.categoria_id || ''); setPastaId(tx.pasta_id || '')
    setStatus(tx.status === 'pendente' ? 'pendente' : 'pago')
    setNotas(tx.notas || '')

    if (tx.recorrente) {
      setRecurrenceMode(tx.data_fim_recorrencia ? 'parcelado' : 'fixo')
      setPeriodo(tx.periodo_recorrencia || 'mensal')
      setDataFim(tx.data_fim_recorrencia || '')
    } else {
      setRecurrenceMode('none')
    }

    const txTags = (tx as any).transacao_tags?.map((tt: any) => tt.tags?.id).filter(Boolean) || []
    setSelectedTags(txTags)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const numValor = parseFloat(valor.replace(',', '.'))
    if (!numValor || numValor <= 0) { toast.error('Valor inválido'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isRecurrent = recurrenceMode !== 'none'
    const payload = {
      user_id: user.id,
      pasta_id: pastaId || null,
      categoria_id: categoriaId || null,
      tipo, descricao, valor: numValor, data, status,
      recorrente: isRecurrent,
      periodo_recorrencia: isRecurrent ? periodo : null,
      data_inicio_recorrencia: isRecurrent ? data : null,
      data_fim_recorrencia: isRecurrent && dataFim ? dataFim : null,
      notas: notas || null,
    }

    let transactionId: string | null = null

    if (editingTx) {
      const { error } = await supabase.from('transacoes').update(payload).eq('id', editingTx.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      transactionId = editingTx.id
    } else {
      const { data: newTx, error } = await supabase.from('transacoes').insert(payload).select().single()
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      transactionId = newTx?.id
    }

    if (transactionId) {
      await supabase.from('transacao_tags').delete().eq('transacao_id', transactionId)
      if (selectedTags.length > 0) {
        await supabase.from('transacao_tags').insert(
          selectedTags.map(tagId => ({ transacao_id: transactionId, tag_id: tagId }))
        )
      }
    }

    toast.success(editingTx ? 'Atualizado!' : 'Adicionado!')
    setShowForm(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta transação?')) return
    await supabase.from('transacoes').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
  }

  function toggleTag(tagId: string) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const filtered = transactions.filter(t => {
    if (filterTipo !== 'todas' && t.tipo !== filterTipo) return false
    if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMes && !t.data.startsWith(filterMes)) return false
    if (filterCategoria && t.categoria_id !== filterCategoria) return false
    if (filterTag) {
      const txTagIds = (t as any).transacao_tags?.map((tt: any) => tt.tags?.id).filter(Boolean) || []
      if (!txTagIds.includes(filterTag)) return false
    }
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
          <Plus className="w-4 h-4" />Nova
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Receitas filtradas</p>
            <p className="text-sm font-bold text-green-400">{formatCurrencyCompact(totalReceitas)}</p>
          </div>
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Despesas filtradas</p>
            <p className="text-sm font-bold text-rose-400">{formatCurrencyCompact(totalDespesas)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full bg-[#18181b] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as any)}
          className="bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500">
          <option value="todas">Todas</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <input type="month" value={filterMes} onChange={e => setFilterMes(e.target.value)}
          className="bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500" />
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
          className="bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500">
          <option value="">Categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {tagsAvailable.length > 0 && (
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
            className="bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500">
            <option value="">Tag</option>
            {tagsAvailable.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        )}
        {(search || filterTipo !== 'todas' || filterMes || filterCategoria || filterTag) && (
          <button onClick={() => { setSearch(''); setFilterTipo('todas'); setFilterMes(''); setFilterCategoria(''); setFilterTag('') }}
            className="flex items-center gap-1.5 bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-2.5 rounded-xl text-sm transition-colors">
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
            {filtered.map(tx => {
              const txTags = (tx as any).transacao_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
              return (
                <div key={tx.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-800/20 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${tx.tipo === 'receita' ? 'bg-green-500/10' : 'bg-rose-500/10'}`}>
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
                          {tx.data_fim_recorrencia ? <CreditCard className="w-2.5 h-2.5" /> : <Repeat className="w-2.5 h-2.5" />}
                          {tx.data_fim_recorrencia ? 'Parcelado' : 'Fixo'}
                        </span>
                      )}
                      {tx.status === 'pendente' && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-md">Pendente</span>
                      )}
                      {(tx as any).categorias && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{ color: (tx as any).categorias.cor, background: `${(tx as any).categorias.cor}20` }}>
                          {(tx as any).categorias.nome}
                        </span>
                      )}
                      {(tx as any).pastas && (
                        <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-md">
                          📁 {(tx as any).pastas.nome}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-zinc-500">{formatDateShort(tx.data)}</p>
                      {txTags.map((tag: any) => (
                        <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                          style={{ color: tag.cor, background: `${tag.cor}20` }}>
                          <TagIcon className="w-2 h-2" />{tag.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-bold ${tx.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'} ${tx.status === 'pendente' ? 'opacity-50' : ''}`}>
                      {tx.tipo === 'receita' ? '+' : '-'}{formatCurrencyCompact(Number(tx.valor))}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEditForm(tx)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-100">{editingTx ? 'Editar' : 'Nova'} Transação</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="flex gap-2">
                {(['despesa', 'receita'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tipo === t ? (t === 'receita' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400') : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição *</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {recurrenceMode === 'parcelado' ? 'Primeira parcela em *' : 'Data *'}
                  </label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
                  <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Sem categoria</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Pasta</label>
                  <select value={pastaId} onChange={e => setPastaId(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Sem pasta</option>
                    {pastas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Tags */}
              {tagsAvailable.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5" />Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tagsAvailable.map(tag => (
                      <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${selectedTags.includes(tag.id) ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                        style={{
                          color: tag.cor,
                          borderColor: selectedTags.includes(tag.id) ? tag.cor : `${tag.cor}40`,
                          background: selectedTags.includes(tag.id) ? `${tag.cor}20` : 'transparent',
                        }}
                      >
                        {tag.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Recorrência */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Recorrência</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'none', label: 'Único' },
                    { value: 'parcelado', label: 'Parcelado' },
                    { value: 'fixo', label: 'Fixo' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setRecurrenceMode(opt.value as RecurrenceMode)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${recurrenceMode === opt.value ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {recurrenceMode === 'parcelado' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Nº de parcelas</label>
                      <input type="number" min="2" max="360" value={numeroParcelas} onChange={e => setNumeroParcelas(e.target.value)} placeholder="12"
                        className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Período</label>
                      <select value={periodo} onChange={e => setPeriodo(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                      </select>
                    </div>
                  </div>
                  {dataFim && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-xs text-zinc-400">
                      Última parcela em: <span className="text-indigo-400 font-semibold">{dataFim}</span>
                      {numeroParcelas && valor && ` · ${numeroParcelas}× de ${formatCurrencyCompact(parseFloat(valor.replace(',', '.')) || 0)}`}
                    </div>
                  )}
                </div>
              )}

              {recurrenceMode === 'fixo' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Período</label>
                    <select value={periodo} onChange={e => setPeriodo(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                      {['semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Até (opcional)</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving}
                  className={`flex-1 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${tipo === 'receita' ? 'bg-green-600 hover:bg-green-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
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
