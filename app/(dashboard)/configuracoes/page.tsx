'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FOLDER_COLORS } from '@/lib/utils'
import { Settings, User, Tag, Grid, Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { Category, Tag as TagType } from '@/lib/types'

type Tab = 'perfil' | 'categorias' | 'tags'

const CATEGORY_ICONS = ['💼', '🏠', '🍽️', '🚗', '❤️', '📚', '🎮', '✈️', '🎵', '☕', '🎁', '💡', '🛍️', '💊', '📱', '🎓']

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('perfil')
  const [loading, setLoading] = useState(true)

  // Profile
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catTipo, setCatTipo] = useState<'receita' | 'despesa' | 'ambos'>('despesa')
  const [catCor, setCatCor] = useState('#6366f1')
  const [catIcone, setCatIcone] = useState('💡')
  const [savingCat, setSavingCat] = useState(false)

  // Tags
  const [tags, setTags] = useState<TagType[]>([])
  const [showTagForm, setShowTagForm] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [tagNome, setTagNome] = useState('')
  const [tagCor, setTagCor] = useState('#6366f1')
  const [savingTag, setSavingTag] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileResult, catsResult, tagsResult] = await Promise.all([
      supabase.from('profiles').select('nome, email').eq('id', user.id).single(),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('tags').select('*').eq('user_id', user.id).order('nome'),
    ])

    setNome(profileResult.data?.nome || '')
    setEmail(profileResult.data?.email || user.email || '')
    setCategories(catsResult.data || [])
    setTags(tagsResult.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ nome }).eq('id', user.id)
    if (error) toast.error('Erro ao salvar')
    else toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  function openNewCat() {
    setEditingCat(null); setCatNome(''); setCatTipo('despesa'); setCatCor('#6366f1'); setCatIcone('💡')
    setShowCatForm(true)
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat); setCatNome(cat.nome); setCatTipo(cat.tipo as any); setCatCor(cat.cor); setCatIcone(cat.icone)
    setShowCatForm(true)
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault()
    setSavingCat(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, nome: catNome, tipo: catTipo, cor: catCor, icone: catIcone }
    const { error } = editingCat
      ? await supabase.from('categorias').update(payload).eq('id', editingCat.id)
      : await supabase.from('categorias').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingCat ? 'Categoria atualizada!' : 'Categoria criada!'); setShowCatForm(false); loadData() }
    setSavingCat(false)
  }

  async function handleDeleteCat(id: string) {
    if (!confirm('Excluir categoria? As transações associadas não serão excluídas.')) return
    await supabase.from('categorias').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
  }

  function openNewTag() {
    setEditingTag(null); setTagNome(''); setTagCor('#6366f1'); setShowTagForm(true)
  }

  function openEditTag(tag: TagType) {
    setEditingTag(tag); setTagNome(tag.nome); setTagCor(tag.cor); setShowTagForm(true)
  }

  async function handleSaveTag(e: React.FormEvent) {
    e.preventDefault()
    setSavingTag(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, nome: tagNome, cor: tagCor }
    const { error } = editingTag
      ? await supabase.from('tags').update(payload).eq('id', editingTag.id)
      : await supabase.from('tags').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingTag ? 'Tag atualizada!' : 'Tag criada!'); setShowTagForm(false); loadData() }
    setSavingTag(false)
  }

  async function handleDeleteTag(id: string) {
    if (!confirm('Excluir tag?')) return
    await supabase.from('tags').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Configurações</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Gerencie seu perfil, categorias e tags</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'perfil', label: 'Perfil', icon: User },
          { key: 'categorias', label: 'Categorias', icon: Grid },
          { key: 'tags', label: 'Tags', icon: Tag },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {tab === 'perfil' && (
        <div className="max-w-md">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-semibold text-zinc-100 mb-5">Informações da conta</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                <input
                  value={email}
                  disabled
                  className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-zinc-600 mt-1">Email não pode ser alterado por aqui</p>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Categorias */}
      {tab === 'categorias' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">{categories.length} categorias</p>
            <button onClick={openNewCat} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
              <Plus className="w-4 h-4" />Nova categoria
            </button>
          </div>

          <div className="space-y-2">
            {['receita', 'despesa', 'ambos'].map(tipo => {
              const cats = categories.filter(c => c.tipo === tipo)
              if (cats.length === 0) return null
              const labels: Record<string, string> = { receita: 'Receitas', despesa: 'Despesas', ambos: 'Ambos' }
              return (
                <div key={tipo}>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">{labels[tipo]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {cats.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 bg-[#18181b] border border-zinc-800 rounded-xl px-4 py-3 group hover:border-zinc-700 transition-colors">
                        <span className="text-base">{cat.icone}</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.cor }} />
                          <span className="text-sm text-zinc-200 truncate">{cat.nome}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditCat(cat)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteCat(cat.id)} className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {showCatForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
              <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-100">{editingCat ? 'Editar' : 'Nova'} Categoria</h2>
                  <button onClick={() => setShowCatForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSaveCat} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Ícone</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_ICONS.map(e => (
                        <button key={e} type="button" onClick={() => setCatIcone(e)} className={`w-9 h-9 rounded-xl text-base transition-all hover:scale-110 ${catIcone === e ? 'bg-indigo-500/20 ring-1 ring-indigo-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                    <input value={catNome} onChange={e => setCatNome(e.target.value)} placeholder="Nome da categoria" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                    <div className="flex gap-2">
                      {(['receita', 'despesa', 'ambos'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setCatTipo(t)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${catTipo === t ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'border-zinc-700 text-zinc-500'}`}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                    <div className="flex flex-wrap gap-2">
                      {FOLDER_COLORS.slice(0, 12).map(c => (
                        <button key={c} type="button" onClick={() => setCatCor(c)} className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${catCor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCatForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                    <button type="submit" disabled={savingCat} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">{savingCat ? 'Salvando...' : editingCat ? 'Salvar' : 'Criar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {tab === 'tags' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">{tags.length} tags</p>
            <button onClick={openNewTag} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
              <Plus className="w-4 h-4" />Nova tag
            </button>
          </div>

          {tags.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-zinc-600">
              <Tag className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma tag criada</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2 group bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 hover:border-zinc-700 transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tag.cor }} />
                  <span className="text-sm text-zinc-200">{tag.nome}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button onClick={() => openEditTag(tag)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteTag(tag.id)} className="p-0.5 text-zinc-600 hover:text-rose-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showTagForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
              <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-100">{editingTag ? 'Editar' : 'Nova'} Tag</h2>
                  <button onClick={() => setShowTagForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSaveTag} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
                    <input value={tagNome} onChange={e => setTagNome(e.target.value)} placeholder="Nome da tag" required className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                    <div className="flex flex-wrap gap-2">
                      {FOLDER_COLORS.slice(0, 10).map(c => (
                        <button key={c} type="button" onClick={() => setTagCor(c)} className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${tagCor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowTagForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                    <button type="submit" disabled={savingTag} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">{savingTag ? 'Salvando...' : editingTag ? 'Salvar' : 'Criar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
