'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, X, Trash2, Edit2, FileText, Send, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Printer, Download, PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PROPOSTA_COLORS = ['#6366f1', '#22c55e', '#f43f5e', '#f59e0b', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  rascunho: { label: 'Rascunho', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20', icon: FileText },
  enviado: { label: 'Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Send },
  aprovado: { label: 'Aprovado', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle },
  recusado: { label: 'Recusado', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: XCircle },
}

interface Proposta {
  id: string
  cliente_nome: string
  cliente_email?: string
  titulo: string
  descricao?: string
  status: string
  data_validade?: string
  cor: string
  created_at: string
}

interface PropostaItem {
  id: string
  proposta_id: string
  descricao: string
  categoria?: string
  quantidade: number
  valor_unitario: number
}

export default function OrcamentosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProposta, setEditingProposta] = useState<Proposta | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [itensByProposta, setItensByProposta] = useState<Record<string, PropostaItem[]>>({})
  const [saving, setSaving] = useState(false)

  // Proposta form
  const [clienteNome, setClienteNome] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState('rascunho')
  const [dataValidade, setDataValidade] = useState('')
  const [cor, setCor] = useState('#6366f1')

  // Item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PropostaItem | null>(null)
  const [itemPropostaId, setItemPropostaId] = useState('')
  const [itemDescricao, setItemDescricao] = useState('')
  const [itemCategoria, setItemCategoria] = useState('')
  const [itemQtd, setItemQtd] = useState('1')
  const [itemValor, setItemValor] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('propostas').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setPropostas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function loadItens(propostaId: string) {
    const { data } = await supabase.from('proposta_itens').select('*').eq('proposta_id', propostaId).order('created_at')
    setItensByProposta(prev => ({ ...prev, [propostaId]: data || [] }))
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!itensByProposta[id]) await loadItens(id)
  }

  function openNew() {
    setEditingProposta(null)
    setClienteNome(''); setClienteEmail(''); setTitulo(''); setDescricao('')
    setStatus('rascunho'); setDataValidade(''); setCor('#6366f1')
    setShowForm(true)
  }

  function openEdit(p: Proposta) {
    setEditingProposta(p)
    setClienteNome(p.cliente_nome); setClienteEmail(p.cliente_email || '')
    setTitulo(p.titulo); setDescricao(p.descricao || '')
    setStatus(p.status); setDataValidade(p.data_validade || ''); setCor(p.cor)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, cliente_nome: clienteNome, cliente_email: clienteEmail || null, titulo, descricao: descricao || null, status, data_validade: dataValidade || null, cor }
    const { error } = editingProposta
      ? await supabase.from('propostas').update(payload).eq('id', editingProposta.id)
      : await supabase.from('propostas').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else { toast.success(editingProposta ? 'Proposta atualizada!' : 'Proposta criada!'); setShowForm(false); loadData() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta proposta e todos os seus itens?')) return
    await supabase.from('propostas').delete().eq('id', id)
    toast.success('Excluída!'); loadData()
    if (expandedId === id) setExpandedId(null)
  }

  async function handleUpdateStatus(id: string, newStatus: string) {
    await supabase.from('propostas').update({ status: newStatus }).eq('id', id)
    toast.success('Status atualizado!')
    loadData()
  }

  function openItemForm(propostaId: string) {
    setEditingItem(null)
    setItemPropostaId(propostaId); setItemDescricao(''); setItemCategoria(''); setItemQtd('1'); setItemValor('')
    setShowItemForm(true)
  }

  function openEditItem(item: PropostaItem) {
    setEditingItem(item)
    setItemPropostaId(item.proposta_id)
    setItemDescricao(item.descricao)
    setItemCategoria(item.categoria || '')
    setItemQtd(String(item.quantidade))
    setItemValor(String(item.valor_unitario))
    setShowItemForm(true)
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(itemValor)
    const qtd = parseFloat(itemQtd) || 1
    if (!valor || valor < 0) { toast.error('Valor inválido'); return }
    setSavingItem(true)
    if (editingItem) {
      const { error } = await supabase.from('proposta_itens').update({
        descricao: itemDescricao, categoria: itemCategoria || null, quantidade: qtd, valor_unitario: valor,
      }).eq('id', editingItem.id)
      if (error) toast.error('Erro ao atualizar item')
      else { toast.success('Item atualizado!'); setShowItemForm(false); loadItens(itemPropostaId) }
    } else {
      const { error } = await supabase.from('proposta_itens').insert({
        proposta_id: itemPropostaId, descricao: itemDescricao, categoria: itemCategoria || null, quantidade: qtd, valor_unitario: valor,
      })
      if (error) toast.error('Erro ao adicionar item')
      else { toast.success('Item adicionado!'); setShowItemForm(false); loadItens(itemPropostaId) }
    }
    setSavingItem(false)
  }

  async function handleDeleteItem(itemId: string, propostaId: string) {
    await supabase.from('proposta_itens').delete().eq('id', itemId)
    toast.success('Item removido!'); loadItens(propostaId)
  }

  function printProposta(proposta: Proposta) {
    const itens = itensByProposta[proposta.id] || []
    const total = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0)
    const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm")
    const statusCfg = STATUS_CONFIG[proposta.status]

    const css = `
      @page { margin: 20mm 22mm; size: A4 portrait; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
      #orca-print-container {
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
        color: #0f172a; font-size: 12px; line-height: 1.6; background: #fff;
      }
      .ph { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 16px; margin-bottom: 26px; border-bottom: 2px solid #6366f1; }
      .ph-brand { display: flex; align-items: center; gap: 14px; }
      .ph-logo {
        width: 48px; height: 48px;
        background: linear-gradient(140deg, #6366f1 0%, #4338ca 100%);
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 14px; font-weight: 800; letter-spacing: -0.5px;
      }
      .ph-title { font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.2; }
      .ph-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
      .ph-meta { text-align: right; font-size: 10.5px; color: #94a3b8; line-height: 1.9; }
      .kpi-row { display: flex; gap: 10px; margin-bottom: 28px; }
      .kpi { flex: 1; padding: 13px 14px 13px 17px; background: #fff; border: 1px solid #e2e8f0; border-left: 3px solid #e2e8f0; border-radius: 9px; }
      .kv { border-left-color: #22c55e; }
      .kd { border-left-color: #f43f5e; }
      .ki { border-left-color: #6366f1; }
      .kn { border-left-color: #94a3b8; }
      .kpi-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 7px; }
      .kpi-value { font-size: 15px; font-weight: 700; color: #0f172a; }
      .sec-title {
        font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
        color: #64748b; margin: 0 0 10px;
        padding-bottom: 7px; border-bottom: 1px solid #e2e8f0;
      }
      .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 11.5px; color: #475569; font-style: italic; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 4px; }
      thead th {
        background: #f8fafc; color: #475569;
        font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
        padding: 9px 13px; text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }
      tbody td { padding: 8px 13px; font-size: 11.5px; color: #334155; border-bottom: 1px solid #f1f5f9; }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:nth-child(even) td { background: #fafafa; }
      tfoot td { padding: 9px 13px; font-size: 11.5px; font-weight: 700; background: #f1f5f9; border-top: 2px solid #e2e8f0; color: #0f172a; }
      .ar { text-align: right; }
      .ac { text-align: center; }
      .cv { color: #16a34a; }
      .ci { color: #4f46e5; }
      .mu { color: #94a3b8; font-size: 11px; }
      .pf { margin-top: 34px; padding-top: 11px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    `

    const statusColor = proposta.status === 'aprovado' ? '#16a34a' : proposta.status === 'recusado' ? '#dc2626' : proposta.status === 'enviado' ? '#2563eb' : '#94a3b8'

    const printContainer = document.createElement('div')
    printContainer.id = 'orca-print-container'
    printContainer.innerHTML = `
      <style>${css}</style>
      <div class="ph">
        <div class="ph-brand">
          <div class="ph-logo">R$</div>
          <div>
            <div class="ph-title">${proposta.titulo}</div>
            <div class="ph-sub">Orçamento / Proposta Comercial</div>
          </div>
        </div>
        <div class="ph-meta">
          Finanças App<br>
          Gerado em ${dateStr}
        </div>
      </div>
      <div class="kpi-row">
        <div class="kpi kn">
          <div class="kpi-label">Cliente</div>
          <div class="kpi-value">${proposta.cliente_nome}</div>
          ${proposta.cliente_email ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px">${proposta.cliente_email}</div>` : ''}
        </div>
        <div class="kpi kn">
          <div class="kpi-label">Status</div>
          <div class="kpi-value" style="color:${statusColor}">${statusCfg?.label || proposta.status}</div>
        </div>
        <div class="kpi kn">
          <div class="kpi-label">Data</div>
          <div class="kpi-value">${format(new Date(proposta.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
          ${proposta.data_validade ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px">Válido até: ${proposta.data_validade}</div>` : ''}
        </div>
        <div class="kpi ki">
          <div class="kpi-label">Total da Proposta</div>
          <div class="kpi-value ci" style="font-size:19px">${formatCurrency(total)}</div>
        </div>
      </div>
      ${proposta.descricao ? `<div class="desc-box">${proposta.descricao}</div>` : ''}
      <div class="sec-title">Itens da Proposta</div>
      ${itens.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th class="ac">Qtd</th>
            <th class="ar">Valor Unit.</th>
            <th class="ar">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map(i => `
            <tr>
              <td>${i.descricao}</td>
              <td class="mu">${i.categoria || '—'}</td>
              <td class="ac mu">${i.quantidade}</td>
              <td class="ar mu">${formatCurrency(i.valor_unitario)}</td>
              <td class="ar" style="font-weight:600">${formatCurrency(i.quantidade * i.valor_unitario)}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4">Total Geral</td>
            <td class="ar ci">${formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>` : '<p style="font-size:11.5px;color:#94a3b8;font-style:italic;padding:8px 0">Nenhum item adicionado.</p>'}
      <div class="pf">
        <span>Finanças App — Controle Financeiro Pessoal</span>
        <span>${dateStr}</span>
      </div>
    `

    const printStyle = document.createElement('style')
    printStyle.id = 'orca-print-style'
    printStyle.innerHTML = `@media print { body > *:not(#orca-print-container) { display: none !important; } #orca-print-container { display: block !important; } }`

    document.body.appendChild(printStyle)
    document.body.appendChild(printContainer)

    window.addEventListener('afterprint', function cleanup() {
      document.getElementById('orca-print-container')?.remove()
      document.getElementById('orca-print-style')?.remove()
      window.removeEventListener('afterprint', cleanup)
    })

    window.print()
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}</div>

  return (
    <div className="p-4 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Orçamentos</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Propostas de orçamento para clientes</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />Nova proposta
        </button>
      </div>

      {/* Status summary */}
      {propostas.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = propostas.filter(p => p.status === key).length
            const Icon = cfg.icon
            return (
              <div key={key} className={`bg-[#18181b] border ${cfg.bg} rounded-xl p-3 flex items-center gap-2`}>
                <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                <div>
                  <p className={`text-sm font-bold ${cfg.color}`}>{count}</p>
                  <p className="text-[10px] text-zinc-500">{cfg.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {propostas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <FileText className="w-14 h-14 mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">Nenhuma proposta criada</h3>
          <p className="text-sm text-center max-w-xs">Crie orçamentos profissionais para seus clientes com itens detalhados e exporte em PDF.</p>
          <button onClick={openNew} className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Criar primeira proposta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {propostas.map(proposta => {
            const cfg = STATUS_CONFIG[proposta.status]
            const itens = itensByProposta[proposta.id] || []
            const total = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0)
            const Icon = cfg.icon
            const isExpanded = expandedId === proposta.id

            return (
              <div key={proposta.id} className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                {/* Header */}
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${proposta.cor}20`, border: `1px solid ${proposta.cor}30` }}>
                      <FileText className="w-4 h-4" style={{ color: proposta.cor }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-100 truncate">{proposta.titulo}</h3>
                      <p className="text-sm text-zinc-400">{proposta.cliente_nome}</p>
                      {proposta.cliente_email && <p className="text-xs text-zinc-500">{proposta.cliente_email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{cfg.label}</span>
                    </span>
                    <button onClick={() => toggleExpand(proposta.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-zinc-800">
                    {/* Actions bar */}
                    <div className="px-5 py-3 bg-zinc-800/30 flex flex-wrap items-center gap-2">
                      <button onClick={() => openItemForm(proposta.id)} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 transition-colors">
                        <PlusCircle className="w-3.5 h-3.5" />Adicionar item
                      </button>
                      <button onClick={() => printProposta(proposta)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg border border-zinc-700 transition-colors">
                        <Printer className="w-3.5 h-3.5" />Imprimir PDF
                      </button>
                      <div className="ml-auto flex items-center gap-2">
                        <select
                          value={proposta.status}
                          onChange={e => handleUpdateStatus(proposta.id, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={() => openEdit(proposta)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(proposta.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="p-5">
                      {proposta.descricao && (
                        <p className="text-sm text-zinc-400 mb-4 italic">{proposta.descricao}</p>
                      )}
                      {itens.length === 0 ? (
                        <div className="text-center py-8 text-zinc-600">
                          <p className="text-sm">Nenhum item ainda</p>
                          <button onClick={() => openItemForm(proposta.id)} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
                            + Adicionar primeiro item
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-zinc-800">
                                  <th className="text-left text-xs font-semibold text-zinc-500 pb-2">Descrição</th>
                                  <th className="text-left text-xs font-semibold text-zinc-500 pb-2 hidden sm:table-cell">Categoria</th>
                                  <th className="text-center text-xs font-semibold text-zinc-500 pb-2">Qtd</th>
                                  <th className="text-right text-xs font-semibold text-zinc-500 pb-2">Valor Unit.</th>
                                  <th className="text-right text-xs font-semibold text-zinc-500 pb-2">Total</th>
                                  <th className="w-8 pb-2" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {itens.map(item => (
                                  <tr key={item.id} className="group">
                                    <td className="py-2.5 text-zinc-200">{item.descricao}</td>
                                    <td className="py-2.5 text-zinc-500 hidden sm:table-cell">{item.categoria || '-'}</td>
                                    <td className="py-2.5 text-center text-zinc-400">{item.quantidade}</td>
                                    <td className="py-2.5 text-right text-zinc-300">{formatCurrency(item.valor_unitario)}</td>
                                    <td className="py-2.5 text-right font-semibold text-zinc-100">{formatCurrency(item.quantidade * item.valor_unitario)}</td>
                                    <td className="py-2.5">
                                      <div className="flex items-center gap-0.5 justify-end">
                                        <button onClick={() => openEditItem(item)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.id, proposta.id)} className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
                            {proposta.data_validade && (
                              <p className="text-xs text-zinc-500">Válido até: {proposta.data_validade}</p>
                            )}
                            <div className="ml-auto text-right">
                              <p className="text-xs text-zinc-500">Total da proposta</p>
                              <p className="text-xl font-bold text-indigo-400">{formatCurrency(total)}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Proposta Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingProposta ? 'Editar' : 'Nova'} Proposta</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nome do cliente *</label>
                  <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="João Silva" required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Email do cliente</label>
                  <input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} placeholder="joao@email.com"
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Título da proposta *</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Projeto de Design de Interiores" required
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição / Observações</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Detalhes do projeto, condições, forma de pagamento..."
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Validade</label>
                  <input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {PROPOSTA_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-2 ring-offset-[#18181b] ring-white scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Salvando...' : editingProposta ? 'Salvar' : 'Criar proposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">{editingItem ? 'Editar' : 'Adicionar'} Item</h2>
              <button onClick={() => setShowItemForm(false)} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição *</label>
                <input value={itemDescricao} onChange={e => setItemDescricao(e.target.value)} placeholder="Ex: Projeto arquitetônico" required autoFocus
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
                <input value={itemCategoria} onChange={e => setItemCategoria(e.target.value)} placeholder="Ex: Serviço, Material, Consultoria..."
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Quantidade</label>
                  <input type="number" step="0.5" min="0.5" value={itemQtd} onChange={e => setItemQtd(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor unitário (R$) *</label>
                  <input type="number" step="0.01" min="0" value={itemValor} onChange={e => setItemValor(e.target.value)} placeholder="0,00" required
                    className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              {itemValor && itemQtd && (
                <div className="bg-zinc-800/50 rounded-xl p-3 text-sm text-zinc-400">
                  Subtotal: <span className="font-semibold text-zinc-100">{formatCurrency((parseFloat(itemQtd) || 1) * parseFloat(itemValor))}</span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={savingItem} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                  {savingItem ? 'Salvando...' : editingItem ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
