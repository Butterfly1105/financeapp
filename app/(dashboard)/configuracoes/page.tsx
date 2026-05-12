'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Save, Sun, Moon, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('nome, email').eq('id', user.id).single()
    setNome(profile?.nome || '')
    setEmail(profile?.email || user.email || '')
    const saved = localStorage.getItem('theme') as 'dark' | 'light' || 'dark'
    setTheme(saved)
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

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Configurações</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Perfil e preferências do aplicativo</p>
      </div>

      {/* Perfil */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="font-semibold text-zinc-100">Informações da conta</h2>
        </div>
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
            <p className="text-xs text-zinc-600 mt-1">Email não pode ser alterado aqui</p>
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

      {/* Tema */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </div>
          <h2 className="font-semibold text-zinc-100">Aparência</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {theme === 'dark' ? 'Interface escura (padrão)' : 'Interface clara (experimental)'}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center ${theme === 'light' ? 'bg-indigo-600' : 'bg-zinc-700'}`}
          >
            <span className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 mx-0.5 ${theme === 'light' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
        <p className="px-5 pt-4 pb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gerenciar</p>
        {[
          { href: '/categorias', label: 'Categorias', desc: 'Gerencie categorias de transações' },
          { href: '/tags', label: 'Tags / Etiquetas', desc: 'Organize com tags personalizadas' },
        ].map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors ${i > 0 ? 'border-t border-zinc-800' : ''}`}
          >
            <div>
              <p className="text-sm font-medium text-zinc-200">{item.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
