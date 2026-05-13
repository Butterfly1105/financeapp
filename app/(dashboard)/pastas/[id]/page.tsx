'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrencyCompact, formatCurrency, formatDateShort, recurrencePeriodLabel } from '@/lib/utils'
import {
  ArrowLeft, Plus, Edit2, Trash2, X,
  RefreshCw, ArrowUpRight, ArrowDownRight, Filter,
  ChevronLeft, ChevronRight, Tag as TagIcon, CreditCard, Repeat
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transaction, Category, Tag } from '@/lib/types'

type Tab = 'todas' | 'receitas' | 'despesas' | 'recorrentes'
type RecurrenceMode = 'none' | 'parcelado' | 'fixo'

function getMonthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

export default function PastaDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [pasta, setPasta] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [tab, setTab] = useState<Tab>('todas')
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)

  // Month navigation (null = all time)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [showAllTime, setShowAllTime] = useState(false)

  // Form state
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [categoriaId, setCategoriaId] = useState('')
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('none')
  const [periodo, setPeriodo] = useState('mensal')
  const [dataFim, setDataFim] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState('')
  const [notas, setNotas] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const loadData = useCallback(async () => {
    const { data: pastaData } = await supabase.from('pastas').select('*').eq('id', id).single()
    if (!pastaData) { router.push('/pastas'); return }
    setPasta(pastaData)

    const { data: txData } = await supabase
      .from('transacoes')
      .select('*, categorias(nome, cor), transacao_tags(tags(id, nome, cor))')
      .eq('pasta_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions((txData || []) as any)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [catRes, tagRes] = await Promise.all([
        supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
        supabase.from('tags').select('*').eq('user_id', user.id).order('nome'),
      ])
      setCategories(catRes.data || [])
      setTags(tagRes.data || [])
    }

    setLoading(false)
  }, [id])

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
    setTipo('despesa')
    setDescricao('')
    setValor('')
    setData(new Date().toISOString().split('T')[0])
    setCategoriaId('')
    setRecurrenceMode('none')
    setPeriodo('mensal')
    setDataFim('')
    setNumeroParcelas('')
    setNotas('')
    setSelectedTags([])
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
    setNotas(tx.notas || '')

    if (tx.recorrente) {
      if (tx.data_fim_recorrencia) {
        setRecurrenceMode('parcelado')
      } else {
        setRecurrenceMode('fixo')
      }
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
      pasta_id: id as string,
      tipo,
      descricao,
      valor: numValor,
      data,
      categoria_id: categoriaId || null,
      recorrente: isRecurrent,
      periodo_recorrencia: isRecurrent ? periodo : null,
      data_inicio_recorrencia: isRecurrent ? data : null,
      data_fim_recorrencia: isRecurrent && dataFim ? dataFim : null,
      notas: notas || null,
      status: 'pago',
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
        await supabase.from('transacao_tags').insert(selectedTags.map(tagId => ({ transacao_id: transactionId, tag_id: tagId })))
      }
    }

    toast.success(editingTx ? 'Transação atualizada!' : 'Transação adicionada!')
    setShowForm(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(txId: string) {
    if (!confirm('Excluir esta transação?')) return
    const { error } = await supabase.from('transacoes').delete().eq('id', txId)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluída!'); loadData() }
  }

  function toggleTag(tagId: string) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  // Month key for filtering
  const monthKey = getMonthKey(selectedMonth)

  const monthFiltered = showAllTime ? transactions : transactions.filter(t => t.data.startsWith(monthKey))

  const filtered = monthFiltered.filter(t => {
    if (tab === 'receitas') return t.tipo === 'receita'
    if (tab === 'despesas') return t.tipo === 'despesa'
    if (tab === 'recorrentes') return t.recorrente
    return true
  })

  // Monthly totals
  const monthReceitas = monthFiltered.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
  const monthDespesas = monthFiltered.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0)
  const monthSaldo = monthReceitas - monthDespesas

  // All-time totals
  const allReceitas = transactions.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
  const allDespesas = transactions.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0)

  const filteredCategories = categories.filter(c => c.tipo === tipo || c.tipo === 'ambos')

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: ptBR })
    .replace(/^\w/, c => c.toUpperCase())

  if (loading) return <div className="p-6"><div className="h-10 skeleton rounded-xl w-64" /></div>
  if (!pasta) return null

  return (
    <div className="p-4 md:p-6 fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${pasta.cor}20` }}>
            <span className="text-lg" style={{ color: pasta.cor }}>📁</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-50 truncate">{pasta.nome}</h1>
            {pasta.descricao && <p className="text-sm text-zinc-500 truncate">{pasta.descricao}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
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

      {/* Month navigator */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => { setSelectedMonth(d => subMonths(d, 1)); setShowAllTime(false) }}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowAllTime(!showAllTime)}
          className={`flex-1 text-center text-sm font-semibold py-1.5 px-4 rounded-xl border transition-all ${showAllTime ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'border-zinc-700 text-zinc-200 hover:border-zinc-600'}`}
        >
          {showAllTime ? 'Tudo' : monthLabel}
        </button>
        <button
          onClick={() => { setSelectedMonth(d => addMonths(d, 1)); setShowAllTime(false) }}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          disabled={monthKey >= getMonthKey(new Date())}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setSelectedMonth(new Date()); setShowAllTime(false) }}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          Hoje
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Receitas</p>
          <p className="text-base font-bold text-green-400">{formatCurrencyCompact(showAllTime ? allReceitas : monthReceitas)}</p>
          {!showAllTime && allReceitas !== monthReceitas && (
            <p className="text-[10px] text-zinc-600 mt-0.5">Total: {formatCurrencyCompact(allReceitas)}</p>
          )}
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Despesas</p>
          <p className="text-base font-bold text-rose-400">{formatCurrencyCompact(showAllTime ? allDespesas : monthDespesas)}</p>
          {!showAllTime && allDespesas !== monthDespesas && (
            <p className="text-[10px] text-zinc-600 mt-0.5">Total: {formatCurrencyCompact(allDespesas)}</p>
          )}
        </div>
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Saldo</p>
          <p className={`text-base font-bold ${(showAllTime ? allReceitas - allDespesas : monthSaldo) >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
            {formatCurrencyCompact(showAllTime ? allReceitas - allDespesas : monthSaldo)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-[#18181b] border border-zinc-800 rounded-xl p-1 mb-4">
        {(['todas', 'receitas', 'despesas', 'recorrentes'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {t === 'recorrentes' ? 'Recorrentes' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Filter className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma transação {!showAllTime ? `em ${monthLabel}` : ''}</p>
            <button onClick={() => openNewForm()} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
              + Adicionar transação
            </button>
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
                          {tx.data_fim_recorrencia ? 'Parcelado' : recurrencePeriodLabel(tx.periodo_recorrencia!)}
                        </span>
                      )}
                      {(tx as any).categorias && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{ color: (tx as any).categorias.cor, background: `${(tx as any).categorias.cor}20` }}
                        >
                          {(tx as any).categorias.nome}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
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
                    <span className={`text-sm font-bold ${tx.tipo === 'receita' ? 'text-green-400' : 'text-rose-400'}`}>
                      {tx.tipo === 'receita' ? '+' : '-'}{formatCurrencyCompact(Number(tx.valor))}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openEditForm(tx)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Excluir"
                      >
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

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-100">
                {editingTx ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setTipo('despesa')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tipo === 'despesa' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                  Despesa
                </button>
                <button type="button" onClick={() => setTipo('receita')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tipo === 'receita' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição *</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel, Salário..." required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Data *</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
                <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Sem categoria</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <span className="flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" />Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Nº de parcelas</label>
                    <input type="number" min="2" max="360" value={numeroParcelas} onChange={e => setNumeroParcelas(e.target.value)}
                      placeholder="12"
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
                  {dataFim && (
                    <div className="col-span-2 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-xs text-zinc-400">
                      Última parcela em: <span className="text-indigo-400 font-semibold">{formatDateShort(dataFim)}</span>
                      {numeroParcelas && ` · ${numeroParcelas}× de ${valor ? formatCurrencyCompact(parseFloat(valor.replace(',', '.'))) : '—'}`}
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
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Notas (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observações..." rows={2}
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className={`flex-1 text-white rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${tipo === 'receita' ? 'bg-green-600 hover:bg-green-500' : 'bg-rose-600 hover:bg-rose-500'}`}>
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
