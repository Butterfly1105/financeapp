-- =====================================================
-- Propostas de Orçamento para Clientes
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

create table if not exists propostas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  cliente_nome text not null,
  cliente_email text,
  titulo text not null,
  descricao text,
  status text check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')) default 'rascunho',
  data_validade date,
  cor text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table propostas enable row level security;

create policy "Users manage own propostas" on propostas
  for all using (auth.uid() = user_id);

create table if not exists proposta_itens (
  id uuid default gen_random_uuid() primary key,
  proposta_id uuid references propostas on delete cascade not null,
  descricao text not null,
  categoria text,
  quantidade numeric(10,2) default 1,
  valor_unitario numeric(15,2) not null check (valor_unitario >= 0),
  created_at timestamptz default now()
);

alter table proposta_itens enable row level security;

create policy "Users manage own proposta_itens" on proposta_itens
  for all using (
    exists (select 1 from propostas p where p.id = proposta_id and p.user_id = auth.uid())
  );

create trigger update_propostas_updated_at before update on propostas
  for each row execute procedure update_updated_at();
