-- ============================================
-- TABELA: predefined_games
-- ============================================
-- Armazena jogos pré-definidos para a funcionalidade "Ir até X Jogo"
-- ============================================

CREATE TABLE IF NOT EXISTS public.predefined_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url_patterns TEXT[] NOT NULL,
  selectors JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_predefined_games_created_by ON public.predefined_games(created_by);
CREATE INDEX IF NOT EXISTS idx_predefined_games_name ON public.predefined_games(name);

-- RLS (Row Level Security)
ALTER TABLE public.predefined_games ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver todos os jogos pré-definidos
CREATE POLICY "Todos podem ver jogos pré-definidos"
ON public.predefined_games FOR SELECT
USING (true);

-- Apenas criadores podem inserir jogos
CREATE POLICY "Apenas criadores podem inserir jogos"
ON public.predefined_games FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Apenas criadores podem atualizar jogos
CREATE POLICY "Apenas criadores podem atualizar jogos"
ON public.predefined_games FOR UPDATE
USING (auth.uid() = created_by);

-- Apenas criadores podem deletar jogos
CREATE POLICY "Apenas criadores podem deletar jogos"
ON public.predefined_games FOR DELETE
USING (auth.uid() = created_by);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_predefined_games_updated_at
BEFORE UPDATE ON public.predefined_games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- DADOS EXEMPLO (opcional)
INSERT INTO public.predefined_games (name, url_patterns, selectors, created_by)
VALUES 
  ('Aviator', ARRAY['https://*.*/aviator*', 'https://*.*/games/aviator*'], '{}', (SELECT id FROM auth.users WHERE email = 'admin@fastbot.com' LIMIT 1),
  ('Mines', ARRAY['https://*.*/mines*', 'https://*.*/games/mines*'], '{}', (SELECT id FROM auth.users WHERE email = 'admin@fastbot.com' LIMIT 1),
  ('Crash', ARRAY['https://*.*/crash*', 'https://*.*/games/crash*'], '{}', (SELECT id FROM auth.users WHERE email = 'admin@fastbot.com' LIMIT 1),
  ('Roleta', ARRAY['https://*.*/roleta*', 'https://*.*/roulette*'], '{}', (SELECT id FROM auth.users WHERE email = 'admin@fastbot.com' LIMIT 1),
  ('Blackjack', ARRAY['https://*.*/blackjack*', 'https://*.*/21*'], '{}', (SELECT id FROM auth.users WHERE email = 'admin@fastbot.com' LIMIT 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.predefined_games IS 'Armazena jogos pré-definidos para navegação automática';
COMMENT ON COLUMN public.predefined_games.id IS 'Identificador único do jogo';
COMMENT ON COLUMN public.predefined_games.name IS 'Nome do jogo (ex: Aviator, Mines, Crash)';
COMMENT ON COLUMN public.predefined_games.url_patterns IS 'Padrões de URL que identificam o jogo (usa wildcards)';
COMMENT ON COLUMN public.predefined_games.selectors IS 'Seletores CSS específicos do jogo (opcional)';
COMMENT ON COLUMN public.predefined_games.created_by IS 'ID do usuário que criou o jogo';
COMMENT ON COLUMN public.predefined_games.created_at IS 'Data/hora de criação';
COMMENT ON COLUMN public.predefined_games.updated_at IS 'Data/hora da última atualização';
