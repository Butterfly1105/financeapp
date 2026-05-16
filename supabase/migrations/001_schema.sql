-- =====================================================
-- FinanceApp - Schema Supabase
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- =====================================================
-- PROFILES
-- =====================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nome text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- CATEGORIAS
-- =====================================================
create table if not exists categorias (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  tipo text check (tipo in ('receita', 'despesa', 'ambos')) default 'ambos',
  cor text default '#6366f1',
  icone text default 'tag',
  created_at timestamptz default now()
);

alter table categorias enable row level security;

create policy "Users manage own categorias" on categorias
  for all using (auth.uid() = user_id);

-- Categorias padrão (inseridas por trigger ao criar usuário)
create or replace function public.create_default_categories()
returns trigger as $$
begin
  insert into public.categorias (user_id, nome, tipo, cor, icone) values
    (new.id, 'Salário', 'receita', '#22c55e', 'briefcase'),
    (new.id, 'Freelance', 'receita', '#10b981', 'dollar-sign'),
    (new.id, 'Investimentos', 'receita', '#3b82f6', 'trending-up'),
    (new.id, 'Outros (Receita)', 'receita', '#8b5cf6', 'plus-circle'),
    (new.id, 'Moradia', 'despesa', '#f43f5e', 'home'),
    (new.id, 'Alimentação', 'despesa', '#f59e0b', 'utensils'),
    (new.id, 'Transporte', 'despesa', '#06b6d4', 'car'),
    (new.id, 'Saúde', 'despesa', '#ec4899', 'heart'),
    (new.id, 'Educação', 'despesa', '#8b5cf6', 'book'),
    (new.id, 'Lazer', 'despesa', '#a855f7', 'gamepad'),
    (new.id, 'Vestuário', 'despesa', '#f97316', 'shopping-bag'),
    (new.id, 'Tecnologia', 'despesa', '#3b82f6', 'zap'),
    (new.id, 'Outros (Despesa)', 'despesa', '#71717a', 'more-horizontal');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_user_create_categories
  after insert on public.profiles
  for each row execute procedure public.create_default_categories();

-- =====================================================
-- TAGS
-- =====================================================
create table if not exists tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  cor text default '#6366f1',
  created_at timestamptz default now()
);

alter table tags enable row level security;

create policy "Users manage own tags" on tags
  for all using (auth.uid() = user_id);

-- =====================================================
-- PASTAS
-- =====================================================
create table if not exists pastas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  descricao text,
  cor text default '#6366f1',
  icone text default 'folder',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table pastas enable row level security;

create policy "Users manage own pastas" on pastas
  for all using (auth.uid() = user_id);

-- =====================================================
-- TRANSAÇÕES
-- =====================================================
create table if not exists transacoes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  pasta_id uuid references pastas on delete set null,
  categoria_id uuid references categorias on delete set null,
  tipo text check (tipo in ('receita', 'despesa')) not null,
  descricao text not null,
  valor numeric(15,2) not null check (valor > 0),
  data date not null default current_date,
  recorrente boolean default false,
  periodo_recorrencia text check (periodo_recorrencia in ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  data_inicio_recorrencia date,
  data_fim_recorrencia date,
  status text check (status in ('pendente', 'pago', 'cancelado')) default 'pago',
  status_overrides jsonb default '{}',
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table transacoes enable row level security;

create policy "Users manage own transacoes" on transacoes
  for all using (auth.uid() = user_id);

create index idx_transacoes_user_id on transacoes(user_id);
create index idx_transacoes_pasta_id on transacoes(pasta_id);
create index idx_transacoes_data on transacoes(data);

-- =====================================================
-- TRANSAÇÃO TAGS (many-to-many)
-- =====================================================
create table if not exists transacao_tags (
  transacao_id uuid references transacoes on delete cascade,
  tag_id uuid references tags on delete cascade,
  primary key (transacao_id, tag_id)
);

alter table transacao_tags enable row level security;

create policy "Users manage own transacao_tags" on transacao_tags
  for all using (
    exists (select 1 from transacoes t where t.id = transacao_id and t.user_id = auth.uid())
  );

-- =====================================================
-- INVESTIMENTOS
-- =====================================================
create table if not exists investimentos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  tipo text default 'Outro',
  valor_inicial numeric(15,2) not null check (valor_inicial >= 0),
  valor_atual numeric(15,2),
  taxa_juros numeric(10,4),
  data_inicio date not null default current_date,
  data_vencimento date,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table investimentos enable row level security;

create policy "Users manage own investimentos" on investimentos
  for all using (auth.uid() = user_id);

-- =====================================================
-- ORÇAMENTOS
-- =====================================================
create table if not exists orcamentos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  categoria_id uuid references categorias on delete set null,
  valor_limite numeric(15,2) not null check (valor_limite > 0),
  periodo text check (periodo in ('mensal', 'trimestral', 'anual')) default 'mensal',
  mes_referencia date,
  cor text default '#6366f1',
  created_at timestamptz default now()
);

alter table orcamentos enable row level security;

create policy "Users manage own orcamentos" on orcamentos
  for all using (auth.uid() = user_id);

-- =====================================================
-- OBJETIVOS
-- =====================================================
create table if not exists objetivos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  descricao text,
  valor_alvo numeric(15,2) not null check (valor_alvo > 0),
  valor_atual numeric(15,2) default 0 check (valor_atual >= 0),
  data_prazo date,
  cor text default '#6366f1',
  icone text default 'target',
  status text check (status in ('ativo', 'pausado', 'concluido')) default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table objetivos enable row level security;

create policy "Users manage own objetivos" on objetivos
  for all using (auth.uid() = user_id);

-- =====================================================
-- UPDATED_AT trigger
-- =====================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_pastas_updated_at before update on pastas
  for each row execute procedure update_updated_at();

create trigger update_transacoes_updated_at before update on transacoes
  for each row execute procedure update_updated_at();

create trigger update_investimentos_updated_at before update on investimentos
  for each row execute procedure update_updated_at();

create trigger update_objetivos_updated_at before update on objetivos
  for each row execute procedure update_updated_at();
