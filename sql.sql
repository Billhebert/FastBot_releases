-- =========================================================
-- Fast Bot - schema base (rodar no Supabase SQL editor)
-- =========================================================

-- 0) EXTENSOES NECESSARIAS ---------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) DROPAR TABELAS (ordem inversa das dependencias) -------
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS macro_executions CASCADE;
DROP TABLE IF EXISTS pix_keys CASCADE;
DROP TABLE IF EXISTS passwords CASCADE;
DROP TABLE IF EXISTS proxies CASCADE;
DROP TABLE IF EXISTS macros CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2) TABELAS PRINCIPAIS -----------------------------------

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,                          -- hoje o front usa btoa()
  role             TEXT NOT NULL DEFAULT 'consumer'
                    CHECK (role IN ('dev','creator','consumer')),
  access_expires_at TIMESTAMPTZ NOT NULL
                    DEFAULT (NOW() + INTERVAL '7 days'),   -- 7 dias padrao
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE macros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop'
               CHECK (device_type IN ('desktop','mobile')),
  actions     TEXT NOT NULL,                               -- JSON salvo como string
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  delay_min   INTEGER NOT NULL DEFAULT 500,
  delay_max   INTEGER NOT NULL DEFAULT 2000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proxies (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host      TEXT NOT NULL,
  port      INTEGER NOT NULL CHECK (port BETWEEN 1 AND 65535),
  username  TEXT,
  password  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE passwords (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label     TEXT NOT NULL,
  password  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pix_keys (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  key_type  TEXT NOT NULL CHECK (key_type IN ('cpf','cnpj','email','phone','random')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE macro_executions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id    UUID NOT NULL REFERENCES macros(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE registrations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id       UUID REFERENCES macros(id) ON DELETE SET NULL,
  macro_name     TEXT NOT NULL,
  device_type    TEXT,
  instance_index INTEGER,
  site_label     TEXT,
  notes          TEXT,
  email          TEXT,
  password_id    UUID,
  password_label TEXT,
  password_value TEXT,
  pix_id         UUID,
  pix_key        TEXT,
  pix_type       TEXT,
  proxy_id       UUID,
  proxy_host     TEXT,
  proxy_port     INTEGER,
  proxy_username TEXT,
  proxy_password TEXT,
  status         TEXT DEFAULT 'success',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ
);

-- 3) INDICES UTEIS ----------------------------------------
CREATE INDEX idx_proxies_user          ON proxies(user_id);
CREATE INDEX idx_passwords_user        ON passwords(user_id);
CREATE INDEX idx_pix_keys_user         ON pix_keys(user_id);
CREATE INDEX idx_macro_exec_user       ON macro_executions(user_id);
CREATE INDEX idx_macro_exec_macro      ON macro_executions(macro_id);
CREATE INDEX idx_registrations_user    ON registrations(user_id);
CREATE INDEX idx_registrations_created ON registrations(created_at DESC);
CREATE INDEX idx_sessions_user         ON user_sessions(user_id);
CREATE INDEX idx_sessions_active       ON user_sessions(session_token) WHERE revoked_at IS NULL;

-- 4) USUARIO DEV OPCIONAL ---------------------------------
INSERT INTO users (email, password_hash, role, access_expires_at)
VALUES (
  'dev@admin.com',
  encode('123456'::bytea, 'base64'),  -- compativel com o login atual (btoa)
  'dev',
  '2025-12-31 23:59:59+00'
);

-- 5) NOVAS TABELAS - FUNCIONALIDADES AVANCADAS ---------------

-- Tabela de verificacao de rollover
CREATE TABLE rollover_checks (
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

-- Tabela de saques automaticos
CREATE TABLE withdrawals (
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

-- Tabela de tentativas de reabertura de conta
CREATE TABLE account_reopen_attempts (
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

-- Tabela de bonus coletados
CREATE TABLE bonus_collected (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_id       UUID REFERENCES macros(id) ON DELETE SET NULL,
  instance_index INTEGER,
  bonus_count    INTEGER DEFAULT 1,
  bonus_type     TEXT,
  site_url       TEXT,
  collected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de numeros temporarios SMS24h
CREATE TABLE temp_phone_numbers (
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

-- Tabela de chaves PIX geradas automaticamente
CREATE TABLE generated_pix_keys (
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

-- Tabela de perfis Dolphin Anty
CREATE TABLE dolphin_profiles (
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

-- 6) INDICES UTEIS PARA NOVAS TABELAS ---------------------
CREATE INDEX idx_rollover_user       ON rollover_checks(user_id);
CREATE INDEX idx_rollover_macro      ON rollover_checks(macro_id);
CREATE INDEX idx_rollover_checked    ON rollover_checks(checked_at DESC);

CREATE INDEX idx_withdrawals_user    ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_macro   ON withdrawals(macro_id);
CREATE INDEX idx_withdrawals_status  ON withdrawals(status);
CREATE INDEX idx_withdrawals_created ON withdrawals(created_at DESC);

CREATE INDEX idx_reopen_user         ON account_reopen_attempts(user_id);
CREATE INDEX idx_reopen_macro        ON account_reopen_attempts(macro_id);
CREATE INDEX idx_reopen_created      ON account_reopen_attempts(created_at DESC);

CREATE INDEX idx_bonus_user          ON bonus_collected(user_id);
CREATE INDEX idx_bonus_macro         ON bonus_collected(macro_id);
CREATE INDEX idx_bonus_collected     ON bonus_collected(collected_at DESC);

CREATE INDEX idx_temp_phones_user    ON temp_phone_numbers(user_id);
CREATE INDEX idx_temp_phones_status  ON temp_phone_numbers(status);
CREATE INDEX idx_temp_phones_created ON temp_phone_numbers(created_at DESC);

CREATE INDEX idx_pix_keys_user       ON generated_pix_keys(user_id);
CREATE INDEX idx_pix_keys_type       ON generated_pix_keys(key_type);
CREATE INDEX idx_pix_keys_created    ON generated_pix_keys(created_at DESC);

CREATE INDEX idx_dolphin_user        ON dolphin_profiles(user_id);
CREATE INDEX idx_dolphin_id          ON dolphin_profiles(dolphin_id);
CREATE INDEX idx_dolphin_last_used   ON dolphin_profiles(last_used_at DESC);

-- ==============================================
-- TABELA: referral_links
-- Gerencia links de indicação para casas de apostas
-- ==============================================
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_referral_user       ON referral_links(user_id);
CREATE INDEX idx_referral_active     ON referral_links(is_active);
CREATE INDEX idx_referral_priority   ON referral_links(priority DESC);
CREATE INDEX idx_referral_usage      ON referral_links(usage_count DESC);

-- ==============================================
-- TABELA: scheduled_executions
-- Agendamentos automáticos de execuções
-- ==============================================
CREATE TABLE IF NOT EXISTS scheduled_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  macro_id UUID,
  frequency VARCHAR(20) NOT NULL,
  scheduled_time TIME NOT NULL,
  weekday INTEGER,
  day_of_month INTEGER,
  instances_count INTEGER DEFAULT 1,
  referral_link_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_execution TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (macro_id) REFERENCES macros(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_link_id) REFERENCES referral_links(id) ON DELETE SET NULL
);

CREATE INDEX idx_scheduled_user      ON scheduled_executions(user_id);
CREATE INDEX idx_scheduled_active    ON scheduled_executions(is_active);
CREATE INDEX idx_scheduled_time      ON scheduled_executions(scheduled_time);
CREATE INDEX idx_scheduled_frequency ON scheduled_executions(frequency);

-- Ajuste as policies se estiver usando Row Level Security (por padrao cada tabela nova vem com RLS desligado; quando ligar, crie policies filtrando por user_id = auth.uid() ou similar).
