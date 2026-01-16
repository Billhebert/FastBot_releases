-- =========================================================
-- FastBot - SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS
-- Execute este script no Supabase SQL Editor
-- =========================================================

-- IMPORTANTE: Este script adiciona APENAS as novas tabelas
-- As tabelas antigas (users, macros, etc) já devem existir

-- =========================================================
-- NOVAS TABELAS - FUNCIONALIDADES AVANÇADAS
-- =========================================================

-- 1) Tabela de verificação de rollover
CREATE TABLE IF NOT EXISTS rollover_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id       UUID REFERENCES macros(id) ON DELETE SET NULL,
  instance_index INTEGER,
  rollover_value DECIMAL(10,2),
  min_value      DECIMAL(10,2),
  max_value      DECIMAL(10,2),
  is_valid       BOOLEAN,
  checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Tabela de saques automáticos
CREATE TABLE IF NOT EXISTS withdrawals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id       UUID REFERENCES macros(id) ON DELETE SET NULL,
  instance_index INTEGER,
  amount         DECIMAL(10,2) NOT NULL,
  pix_key        TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  verified       BOOLEAN DEFAULT FALSE,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Tabela de tentativas de reabertura de conta
CREATE TABLE IF NOT EXISTS account_reopen_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id       UUID REFERENCES macros(id) ON DELETE SET NULL,
  instance_index INTEGER,
  account_email  TEXT,
  reason         TEXT,
  attempts       INTEGER DEFAULT 0,
  success        BOOLEAN DEFAULT FALSE,
  last_attempt_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Tabela de bônus coletados
CREATE TABLE IF NOT EXISTS bonus_collected (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id       UUID REFERENCES macros(id) ON DELETE SET NULL,
  instance_index INTEGER,
  bonus_count    INTEGER DEFAULT 1,
  bonus_type     TEXT,
  site_url       TEXT,
  collected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Tabela de números temporários SMS24h
CREATE TABLE IF NOT EXISTS temp_phone_numbers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number_id      TEXT NOT NULL,
  phone_number   TEXT NOT NULL,
  service        TEXT DEFAULT 'mercadopago',
  country        TEXT DEFAULT 'BR',
  status         TEXT DEFAULT 'active' CHECK (status IN ('active','used','cancelled','expired')),
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Tabela de chaves PIX geradas automaticamente
CREATE TABLE IF NOT EXISTS generated_pix_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pix_key        TEXT NOT NULL,
  key_type       TEXT NOT NULL CHECK (key_type IN ('random','phone','email','cpf','cnpj')),
  phone_number   TEXT,
  email          TEXT,
  cpf            TEXT,
  mp_user_id     TEXT,
  confirmed      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7) Tabela de perfis Dolphin Anty
CREATE TABLE IF NOT EXISTS dolphin_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dolphin_id     TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  tags           TEXT[],
  notes          TEXT,
  proxy_id       UUID REFERENCES proxies(id) ON DELETE SET NULL,
  last_used_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8) Tabela de links de indicação
CREATE TABLE IF NOT EXISTS referral_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform       VARCHAR(100) NOT NULL,
  url            TEXT NOT NULL,
  description    TEXT,
  priority       INTEGER DEFAULT 3,
  is_active      BOOLEAN DEFAULT TRUE,
  usage_count    INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================================

-- Índices para rollover_checks
CREATE INDEX IF NOT EXISTS idx_rollover_user ON rollover_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_rollover_macro ON rollover_checks(macro_id);
CREATE INDEX IF NOT EXISTS idx_rollover_checked ON rollover_checks(checked_at DESC);

-- Índices para withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_macro ON withdrawals(macro_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals(created_at DESC);

-- Índices para account_reopen_attempts
CREATE INDEX IF NOT EXISTS idx_reopen_user ON account_reopen_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_reopen_macro ON account_reopen_attempts(macro_id);
CREATE INDEX IF NOT EXISTS idx_reopen_created ON account_reopen_attempts(created_at DESC);

-- Índices para bonus_collected
CREATE INDEX IF NOT EXISTS idx_bonus_user ON bonus_collected(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_macro ON bonus_collected(macro_id);
CREATE INDEX IF NOT EXISTS idx_bonus_collected ON bonus_collected(collected_at DESC);

-- Índices para temp_phone_numbers
CREATE INDEX IF NOT EXISTS idx_temp_phones_user ON temp_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_phones_status ON temp_phone_numbers(status);
CREATE INDEX IF NOT EXISTS idx_temp_phones_created ON temp_phone_numbers(created_at DESC);

-- Índices para generated_pix_keys
CREATE INDEX IF NOT EXISTS idx_pix_keys_user ON generated_pix_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_keys_type ON generated_pix_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_pix_keys_created ON generated_pix_keys(created_at DESC);

-- Índices para dolphin_profiles
CREATE INDEX IF NOT EXISTS idx_dolphin_user ON dolphin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dolphin_id ON dolphin_profiles(dolphin_id);
CREATE INDEX IF NOT EXISTS idx_dolphin_last_used ON dolphin_profiles(last_used_at DESC);

-- Índices para referral_links
CREATE INDEX IF NOT EXISTS idx_referral_user ON referral_links(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_active ON referral_links(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_priority ON referral_links(priority DESC);
CREATE INDEX IF NOT EXISTS idx_referral_usage ON referral_links(usage_count DESC);

-- 9) Tabela de agendamentos
CREATE TABLE IF NOT EXISTS scheduled_executions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(200) NOT NULL,
  macro_id       UUID REFERENCES macros(id) ON DELETE CASCADE,
  frequency      VARCHAR(20) NOT NULL,
  scheduled_time TIME NOT NULL,
  weekday        INTEGER,
  day_of_month   INTEGER,
  instances_count INTEGER DEFAULT 1,
  referral_link_id UUID REFERENCES referral_links(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_execution TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para scheduled_executions
CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_active ON scheduled_executions(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_executions(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_frequency ON scheduled_executions(frequency);

-- =========================================================
-- VERIFICAÇÃO
-- =========================================================

-- Conte quantas tabelas foram criadas
SELECT
  'rollover_checks' as tabela,
  COUNT(*) as registros
FROM rollover_checks
UNION ALL
SELECT
  'withdrawals' as tabela,
  COUNT(*) as registros
FROM withdrawals
UNION ALL
SELECT
  'account_reopen_attempts' as tabela,
  COUNT(*) as registros
FROM account_reopen_attempts
UNION ALL
SELECT
  'bonus_collected' as tabela,
  COUNT(*) as registros
FROM bonus_collected
UNION ALL
SELECT
  'temp_phone_numbers' as tabela,
  COUNT(*) as registros
FROM temp_phone_numbers
UNION ALL
SELECT
  'generated_pix_keys' as tabela,
  COUNT(*) as registros
FROM generated_pix_keys
UNION ALL
SELECT
  'dolphin_profiles' as tabela,
  COUNT(*) as registros
FROM dolphin_profiles
UNION ALL
SELECT
  'referral_links' as tabela,
  COUNT(*) as registros
FROM referral_links
UNION ALL
SELECT
  'scheduled_executions' as tabela,
  COUNT(*) as registros
FROM scheduled_executions;

-- =========================================================
-- SUCESSO!
-- Se você viu 9 tabelas com 0 registros acima, está tudo OK!
-- =========================================================
