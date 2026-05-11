export type TransactionType = 'receita' | 'despesa'
export type RecurrencePeriod = 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
export type TransactionStatus = 'pendente' | 'pago' | 'cancelado'
export type GoalStatus = 'ativo' | 'pausado' | 'concluido'
export type BudgetPeriod = 'mensal' | 'trimestral' | 'anual'
export type CategoryType = 'receita' | 'despesa' | 'ambos'
export type InvestmentType = 'CDB' | 'LCI' | 'LCA' | 'Tesouro Direto' | 'Ações' | 'FII' | 'Criptomoedas' | 'Poupança' | 'Outro'

export interface Profile {
  id: string
  email: string
  nome: string | null
  avatar_url: string | null
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  nome: string
  tipo: CategoryType
  cor: string
  icone: string
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  nome: string
  cor: string
  created_at: string
}

export interface Pasta {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  cor: string
  icone: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  pasta_id: string | null
  categoria_id: string | null
  tipo: TransactionType
  descricao: string
  valor: number
  data: string
  recorrente: boolean
  periodo_recorrencia: RecurrencePeriod | null
  data_inicio_recorrencia: string | null
  data_fim_recorrencia: string | null
  status: TransactionStatus
  notas: string | null
  created_at: string
  updated_at: string
  categoria?: Category
  tags?: Tag[]
}

export interface Investment {
  id: string
  user_id: string
  nome: string
  tipo: InvestmentType | string
  valor_inicial: number
  valor_atual: number | null
  taxa_juros: number | null
  data_inicio: string
  data_vencimento: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  nome: string
  categoria_id: string | null
  valor_limite: number
  periodo: BudgetPeriod
  mes_referencia: string | null
  cor: string
  created_at: string
  categoria?: Category
}

export interface Goal {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  valor_alvo: number
  valor_atual: number
  data_prazo: string | null
  cor: string
  icone: string
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface PastaWithStats extends Pasta {
  total_receitas: number
  total_despesas: number
  saldo: number
  transaction_count: number
}

export interface MonthlyStats {
  mes: string
  receitas: number
  despesas: number
}

export interface CategoryStats {
  categoria: string
  valor: number
  cor: string
  percentual: number
}

export interface DashboardStats {
  saldo_total: number
  receitas_mes: number
  despesas_mes: number
  total_investimentos: number
  variacao_receitas: number
  variacao_despesas: number
}
