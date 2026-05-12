'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FOLDER_COLORS } from '@/lib/utils'
import { Plus, Edit2, Trash2, X, Grid3X3 } from 'lucide-react'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

const CATEGORY_ICONS = ['💼', '🏠', '🍽️', '🚗', '❤️', '📚', '🎮', '✈️', '🎵', '☕', '🎁', '💡', '🛍️', '💊', '📱', '🎓', '💰', '🏦', '🎯', '⚡']

export default function CategoriasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'receita' | 'despesa' | 'ambos'>('despesa')
  const [cor, setCor] = useState('#6366f1')
  const [icone, setIcone] = useState('💡')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('categorias').select('*').eq('user_id', user.id).order('nome')
    setCategories(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditingCat(null); setNome(''); setTipo('despesa'); setCor('#6366f1'); setIcone('💡')
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditingCat(cat); setNome(cat.nome); setTipo(cat.tipo as any); setCor(cat.cor); setIcone(cat.icone)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, nome, tipo, cor, icone }
    const { error } = editingCat
      ? await supabase.from('categorias').update(payload).eq('id', editingCat.id)
      : await supabase.from('categorias').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingCat ? 'Atualizada!' : 'Categoria criada!'); setShowForm(false); loadData() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir categoria? As transações associadas não serão excluídas.')) return
    await supabase.from('categorias').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
  }

  const tipoLabel: Record<string, string> = { receita: 'Receitas', despesa: 'Despesas', ambos: 'Ambos' }

  if (loading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Categorias</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{categories.length} categorias cadastradas</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />Nova
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <Grid3X3 className="w-14 h-14 mb-4 opacity-30" />
          <p className="text-lg font-semibold text-zinc-400 mb-2">Nenhuma categoria</p>
          <button onClick={openNew} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Criar categoria
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {(['receita', 'despesa', 'ambos'] as const).map(t => {
            const cats = categories.filter(c => c.tipo === t)
            if (cats.length === 0) return null
            return (
              <div key={t}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{tipoLabel[t]}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cats.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-3 group hover:border-zinc-700 transition-colors">
                      <span className="text-xl flex-shrink-0">{cat.icone}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.cor }} />
                        <span className="text-sm text-zinc-200 truncate">{cat.nome}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingCat ? 'Editar' : 'Nova'} Categoria</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ICONS.map(e => (
                    <button key={e} type="button" onClick={() => setIcone(e)}
                      className={`w-9 h-9 rounded-xl text-base transition-all hover:scale-110 ${icone === e ? 'bg-indigo-500/20 ring-1 ring-indigo-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da categoria" required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                <div className="flex gap-2">
                  {(['receita', 'despesa', 'ambos'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${tipo === t ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.slice(0, 12).map(c => (
                    <button key={c} type="button" onClick={() => setCor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Salvando...' : editingCat ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
