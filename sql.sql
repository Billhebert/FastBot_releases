-- =========================================================
-- Fast Bot - schema base (rodar no Supabase SQL editor)
-- =========================================================

-- 0) EXTENSOES NECESSARIAS ---------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) DROPAR TABELAS (ordem inversa das dependencias) -------
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

-- 3) INDICES UTEIS ----------------------------------------
CREATE INDEX idx_proxies_user          ON proxies(user_id);
CREATE INDEX idx_passwords_user        ON passwords(user_id);
CREATE INDEX idx_pix_keys_user         ON pix_keys(user_id);
CREATE INDEX idx_macro_exec_user       ON macro_executions(user_id);
CREATE INDEX idx_macro_exec_macro      ON macro_executions(macro_id);
CREATE INDEX idx_registrations_user    ON registrations(user_id);
CREATE INDEX idx_registrations_created ON registrations(created_at DESC);

-- 4) USUARIO DEV OPCIONAL ---------------------------------
INSERT INTO users (email, password_hash, role, access_expires_at)
VALUES (
  'dev@admin.com',
  encode('123456'::bytea, 'base64'),  -- compativel com o login atual (btoa)
  'dev',
  '2025-12-31 23:59:59+00'
);

-- Ajuste as policies se estiver usando Row Level Security (por padrao cada tabela nova vem com RLS desligado; quando ligar, crie policies filtrando por user_id = auth.uid() ou similar).
