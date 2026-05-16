-- Adiciona suporte a status por mês em transações recorrentes fixas
-- Execute no SQL Editor do Supabase para bancos existentes
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS status_overrides JSONB DEFAULT '{}';
