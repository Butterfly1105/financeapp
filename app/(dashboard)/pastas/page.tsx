'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatCurrencyCompact, FOLDER_COLORS } from '@/lib/utils'
import { Plus, FolderOpen, Folder, Edit2, Trash2, TrendingUp, TrendingDown, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { PastaWithStats } from '@/lib/types'

export default function PastasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [pastas, setPastas] = useState<PastaWithStats[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingPasta, setEditingPasta] = useState<PastaWithStats | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cor, setCor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadPastas = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: pastasData } = await supabase
      .from('pastas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!pastasData) { setLoading(false); return }

    const pastasWithStats = await Promise.all(
      pastasData.map(async pasta => {
        const { data: transactions } = await supabase
          .from('transacoes')
          .select('tipo, valor')
          .eq('pasta_id', pasta.id)
          .eq('status', 'pago')

        const receitas = transactions?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0
        const despesas = transactions?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0
        return {
          ...pasta,
          total_receitas: receitas,
          total_despesas: despesas,
          saldo: receitas - despesas,
          transaction_count: transactions?.length || 0,
        }
      })
    )

    setPastas(pastasWithStats)
    setLoading(false)
  }, [])

  useEffect(() => { loadPastas() }, [loadPastas])

  function openNewForm() {
    setEditingPasta(null)
    setNome('')
    setDescricao('')
    setCor('#6366f1')
    setShowForm(true)
  }

  function openEditForm(pasta: PastaWithStats) {
    setEditingPasta(pasta)
    setNome(pasta.nome)
    setDescricao(pasta.descricao || '')
    setCor(pasta.cor)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingPasta) {
      const { error } = await supabase
        .from('pastas')
        .update({ nome, descricao, cor })
        .eq('id', editingPasta.id)
      if (error) toast.error('Erro ao atualizar pasta')
      else { toast.success('Pasta atualizada!'); setShowForm(false); loadPastas() }
    } else {
      const { error } = await supabase
        .from('pastas')
        .insert({ user_id: user.id, nome, descricao, cor })
      if (error) toast.error('Erro ao criar pasta')
      else { toast.success('Pasta criada!'); setShowForm(false); loadPastas() }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('pastas').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir pasta')
    else { toast.success('Pasta excluída'); loadPastas() }
    setConfirmDeleteId(null)
  }

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-44 skeleton rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Pastas</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{pastas.length} pasta{pastas.length !== 1 ? 's' : ''} criada{pastas.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova Pasta
        </button>
      </div>

      {/* Grid */}
      {pastas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">Nenhuma pasta criada</h3>
          <p className="text-sm text-center max-w-xs">Crie pastas para organizar suas receitas e despesas por tema, projeto ou categoria.</p>
          <button
            onClick={openNewForm}
            className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Criar primeira pasta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastas.map(pasta => (
            <div
              key={pasta.id}
              className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${pasta.cor}20` }}
                  >
                    <Folder className="w-5 h-5" style={{ color: pasta.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100 leading-tight">{pasta.nome}</h3>
                    {pasta.descricao && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-40">{pasta.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(pasta)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(pasta.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <TrendingUp className="w-3 h-3 text-green-500" />Receitas
                  </div>
                  <span className="text-sm font-semibold text-green-400">{formatCurrencyCompact(pasta.total_receitas)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <TrendingDown className="w-3 h-3 text-rose-500" />Despesas
                  </div>
                  <span className="text-sm font-semibold text-rose-400">{formatCurrencyCompact(pasta.total_despesas)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-xs font-medium text-zinc-400">Saldo</span>
                  <span className={`text-sm font-bold ${pasta.saldo >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
                    {formatCurrencyCompact(pasta.saldo)}
                  </span>
                </div>
              </div>

              <Link
                href={`/pastas/${pasta.id}`}
                className="flex items-center justify-between w-full bg-zinc-800/60 hover:bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors group/link"
              >
                <span>{pasta.transaction_count} transaç{pasta.transaction_count !== 1 ? 'ões' : 'ão'}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-xs shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-zinc-200 mb-1">Excluir pasta?</p>
            <p className="text-xs text-zinc-500 mb-5">As transações dentro dela não serão excluídas.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-2.5 text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">
                {editingPasta ? 'Editar Pasta' : 'Nova Pasta'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome da pasta *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Casa, Trabalho, Viagem..."
                  required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Breve descrição..."
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingPasta ? 'Salvar' : 'Criar Pasta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
