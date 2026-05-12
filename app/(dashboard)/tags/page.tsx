'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FOLDER_COLORS } from '@/lib/utils'
import { Plus, Edit2, Trash2, X, Tag, Info } from 'lucide-react'
import { toast } from 'sonner'
import type { Tag as TagType } from '@/lib/types'

export default function TagsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState<TagType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('nome')
    setTags(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditingTag(null); setNome(''); setCor('#6366f1'); setShowForm(true)
  }

  function openEdit(tag: TagType) {
    setEditingTag(tag); setNome(tag.nome); setCor(tag.cor); setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, nome, cor }
    const { error } = editingTag
      ? await supabase.from('tags').update(payload).eq('id', editingTag.id)
      : await supabase.from('tags').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingTag ? 'Tag atualizada!' : 'Tag criada!'); setShowForm(false); loadData() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir tag?')) return
    await supabase.from('tags').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-10 skeleton rounded-xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Tags / Etiquetas</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{tags.length} tags cadastradas</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />Nova tag
        </button>
      </div>

      {/* Info card */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 mb-6 flex gap-3">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-indigo-300 mb-1">Como usar tags como etiquetas</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Tags funcionam como etiquetas coloridas que você aplica em transações para organizar por contexto.
            Use para agrupar gastos por <span className="text-indigo-300">projeto</span>, <span className="text-indigo-300">cliente</span>, <span className="text-indigo-300">evento</span> ou <span className="text-indigo-300">qualquer categoria personalizada</span>.
            Exemplos: <em className="text-zinc-300">"Projeto X"</em>, <em className="text-zinc-300">"Viagem Janeiro"</em>, <em className="text-zinc-300">"Cliente Alfa"</em>, <em className="text-zinc-300">"Home Office"</em>.
          </p>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <Tag className="w-14 h-14 mb-4 opacity-30" />
          <p className="text-lg font-semibold text-zinc-400 mb-2">Nenhuma tag criada</p>
          <p className="text-sm text-center text-zinc-600 max-w-xs mb-4">Crie tags para etiquetar suas transações e organizá-las por projeto, cliente ou evento.</p>
          <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Criar primeira tag
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-2.5 group bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-2.5 hover:border-zinc-700 transition-colors"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.cor }} />
              <span className="text-sm font-medium text-zinc-200">{tag.nome}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <button onClick={() => openEdit(tag)} className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(tag.id)} className="p-1 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingTag ? 'Editar' : 'Nova'} Tag</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Projeto X, Cliente Y..." required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cor da etiqueta</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.slice(0, 12).map(c => (
                    <button key={c} type="button" onClick={() => setCor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
                {nome && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Pré-visualização:</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${cor}20`, color: cor, border: `1px solid ${cor}40` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
                      {nome}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Salvando...' : editingTag ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
