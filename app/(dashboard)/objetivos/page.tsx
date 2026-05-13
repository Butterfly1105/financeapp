'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateShort, FOLDER_COLORS } from '@/lib/utils'
import { Plus, Target, X, Edit2, Trash2, CheckCircle, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import type { Goal } from '@/lib/types'

export default function ObjetivosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDeposit, setShowDeposit] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)
  const [depositValue, setDepositValue] = useState('')

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorAlvo, setValorAlvo] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [dataPrazo, setDataPrazo] = useState('')
  const [cor, setCor] = useState('#6366f1')
  const [icone, setIcone] = useState('🎯')

  const EMOJIS = ['🎯', '🏠', '🚗', '✈️', '💍', '📚', '💰', '🏖️', '🎓', '🏥', '💻', '🎮']

  const loadGoals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('objetivos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadGoals() }, [loadGoals])

  function openNew() {
    setEditingGoal(null)
    setNome(''); setDescricao(''); setValorAlvo(''); setValorAtual(''); setDataPrazo(''); setCor('#6366f1'); setIcone('🎯')
    setShowForm(true)
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal)
    setNome(goal.nome); setDescricao(goal.descricao || ''); setValorAlvo(String(goal.valor_alvo))
    setValorAtual(String(goal.valor_atual)); setDataPrazo(goal.data_prazo || ''); setCor(goal.cor); setIcone(goal.icone)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id, nome, descricao: descricao || null,
      valor_alvo: parseFloat(valorAlvo), valor_atual: parseFloat(valorAtual || '0'),
      data_prazo: dataPrazo || null, cor, icone,
    }
    const { error } = editingGoal
      ? await supabase.from('objetivos').update(payload).eq('id', editingGoal.id)
      : await supabase.from('objetivos').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingGoal ? 'Atualizado!' : 'Objetivo criado!'); setShowForm(false); loadGoals() }
    setSaving(false)
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault()
    if (!showDeposit) return
    const value = parseFloat(depositValue)
    if (!value || value <= 0) { toast.error('Valor inválido'); return }
    const newValue = Math.min(showDeposit.valor_atual + value, showDeposit.valor_alvo)
    const isCompleted = newValue >= showDeposit.valor_alvo
    const { error } = await supabase.from('objetivos').update({
      valor_atual: newValue,
      status: isCompleted ? 'concluido' : 'ativo',
    }).eq('id', showDeposit.id)
    if (error) toast.error('Erro')
    else {
      toast.success(isCompleted ? '🎉 Objetivo concluído!' : `+${formatCurrency(value)} adicionado!`)
      setShowDeposit(null); setDepositValue(''); loadGoals()
    }
  }

  async function toggleStatus(goal: Goal) {
    const newStatus = goal.status === 'ativo' ? 'pausado' : 'ativo'
    await supabase.from('objetivos').update({ status: newStatus }).eq('id', goal.id)
    toast.success(newStatus === 'ativo' ? 'Objetivo retomado' : 'Objetivo pausado')
    loadGoals()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir objetivo?')) return
    await supabase.from('objetivos').delete().eq('id', id)
    toast.success('Excluído!'); loadGoals()
  }

  const ativas = goals.filter(g => g.status === 'ativo')
  const pausadas = goals.filter(g => g.status === 'pausado')
  const concluidas = goals.filter(g => g.status === 'concluido')

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-36 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Objetivos</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{ativas.length} ativo{ativas.length !== 1 ? 's' : ''} · {concluidas.length} concluído{concluidas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />Novo objetivo
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <Target className="w-14 h-14 mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">Nenhum objetivo</h3>
          <p className="text-sm text-center max-w-xs">Defina metas financeiras e acompanhe seu progresso.</p>
          <button onClick={openNew} className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Criar objetivo</button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ativos */}
          {ativas.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Ativos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ativas.map(goal => {
                  const pct = Math.min((goal.valor_atual / goal.valor_alvo) * 100, 100)
                  const restante = goal.valor_alvo - goal.valor_atual
                  return (
                    <div key={goal.id} className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${goal.cor}20` }}>
                            {goal.icone}
                          </div>
                          <div>
                            <h3 className="font-semibold text-zinc-100">{goal.nome}</h3>
                            {goal.descricao && <p className="text-xs text-zinc-500 mt-0.5 max-w-36 truncate">{goal.descricao}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleStatus(goal)} className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Pausar">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-400 font-medium">{pct.toFixed(1)}%</span>
                          {goal.data_prazo && <span className="text-zinc-600">até {formatDateShort(goal.data_prazo)}</span>}
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: goal.cor }} />
                        </div>
                      </div>

                      <div className="flex justify-between mb-4">
                        <div>
                          <p className="text-xs text-zinc-500">Acumulado</p>
                          <p className="text-sm font-bold" style={{ color: goal.cor }}>{formatCurrency(goal.valor_atual)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">Falta</p>
                          <p className="text-sm font-bold text-zinc-300">{formatCurrency(restante)}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => { setShowDeposit(goal); setDepositValue('') }}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-xl py-2.5 text-xs font-semibold transition-all border border-zinc-700"
                      >
                        + Adicionar valor
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pausados */}
          {pausadas.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider mb-3">Pausados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pausadas.map(goal => {
                  const pct = Math.min((goal.valor_atual / goal.valor_alvo) * 100, 100)
                  return (
                    <div key={goal.id} className="bg-[#18181b] border border-zinc-800/50 rounded-2xl p-5 opacity-60 hover:opacity-80 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{goal.icone}</span>
                          <span className="font-medium text-zinc-300">{goal.nome}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleStatus(goal)} className="p-1.5 rounded-lg text-zinc-500 hover:text-green-400" title="Retomar"><Play className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#52525b' }} />
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">{formatCurrency(goal.valor_atual)} / {formatCurrency(goal.valor_alvo)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Concluídos */}
          {concluidas.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-3">Concluídos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {concluidas.map(goal => (
                  <div key={goal.id} className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{goal.icone}</span>
                        <div>
                          <span className="font-medium text-zinc-300">{goal.nome}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">Meta atingida</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className="text-sm font-bold text-green-400 mt-2">{formatCurrency(goal.valor_alvo)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Adicionar valor</h2>
            <p className="text-sm text-zinc-500 mb-6">{showDeposit.nome} · Falta {formatCurrency(showDeposit.valor_alvo - showDeposit.valor_atual)}</p>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Valor a adicionar (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositValue}
                  onChange={e => setDepositValue(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDeposit(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingGoal ? 'Editar' : 'Novo'} Objetivo</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setIcone(e)} className={`w-9 h-9 rounded-xl text-lg transition-all hover:scale-110 ${icone === e ? 'bg-indigo-500/20 ring-1 ring-indigo-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Casa própria, Viagem, Reserva..." required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição (opcional)</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do objetivo..." className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Meta (R$) *</label>
                  <input type="number" step="0.01" value={valorAlvo} onChange={e => setValorAlvo(e.target.value)} placeholder="50.000,00" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Já tenho (R$)</label>
                  <input type="number" step="0.01" value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder="0,00" className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Data prazo (opcional)</label>
                <input type="date" value={dataPrazo} onChange={e => setDataPrazo(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.slice(0, 10).map(c => (
                    <button key={c} type="button" onClick={() => setCor(c)} className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">{saving ? 'Salvando...' : editingGoal ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
