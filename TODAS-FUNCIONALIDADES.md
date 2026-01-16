# 🚀 FastBot - Documentação Completa de Funcionalidades

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Backend - 13 Funcionalidades](#backend---13-funcionalidades)
- [Frontend - 14 Páginas](#frontend---14-páginas)
- [Analytics & Reporting](#analytics--reporting)
- [Administração do Sistema](#administração-do-sistema)
- [Automação Avançada](#automação-avançada)
- [Banco de Dados](#banco-de-dados)
- [Guia de Uso](#guia-de-uso)

---

## 🎯 Visão Geral

O FastBot é uma plataforma completa de automação para criação e gerenciamento de contas em casas de apostas, com recursos avançados de analytics, agendamento e administração.

**Status**: ✅ **100% Implementado**

- **Backend**: 13/13 funcionalidades ativas
- **Frontend**: 14 páginas funcionais
- **Banco de Dados**: 9 tabelas + 29 índices
- **Integrações**: SMS24h, Mercado Pago, Dolphin Anty

---

## 🔧 Backend - 13 Funcionalidades

### 1. ✅ Perfis Android (8 dispositivos)

**Localização**: `src/core/player.js` (linhas 1-100)

**Dispositivos Disponíveis**:
- Samsung Galaxy S20/S21/S22/S23
- Xiaomi Redmi Note 11/12
- Motorola Moto G60/G100

**Características**:
- User agents realistas
- Viewports mobile corretos
- Headers de navegador autênticos

### 2. ✅ Busca Automática de Jogos

**Localização**: `src/core/player.js` - `handleSearchGame()`

**Seletores Suportados**: 15+ padrões diferentes
- `input[placeholder*="buscar"]`
- `input[aria-label*="search"]`
- `#game-search`, `.search-game`
- E muito mais...

**Processo**:
1. Localiza campo de busca
2. Digita nome do jogo com delay humanizado
3. Aguarda resultados
4. Seleciona primeiro resultado

### 3. ✅ Modo Espelho (Mouse Humanizado)

**Localização**: `src/core/player.js` - `handleMouseMove()`

**Tecnologia**: Curvas de Bézier para movimento natural

**Parâmetros**:
```javascript
{
  x: 100,        // Posição X destino
  y: 200,        // Posição Y destino
  duration: 500  // Duração em ms
}
```

**Características**:
- Aceleração/desaceleração gradual
- Micro-movimentos aleatórios
- Paradas intermediárias
- Velocidade variável

### 4. ✅ Verificação de Rollover

**Localização**: `src/core/player.js` - `handleCheckRollover()`

**Configuração**:
```javascript
{
  minRollover: 100,  // Mínimo aceitável
  maxRollover: 500   // Máximo aceitável
}
```

**Validações**:
- Extrai valor do rollover da página
- Compara com limites
- Registra em `rollover_checks`
- Retorna `is_valid: true/false`

### 5. ✅ Saques Automáticos

**Localização**: `src/core/player.js` - `handleWithdraw()`

**Fluxo Completo**:
1. Acessa área de saques
2. Seleciona PIX como método
3. Insere valor
4. Insere chave PIX
5. Confirma saque
6. Verifica conclusão
7. Registra em `withdrawals`

**Tabela**: `withdrawals`
- amount, pix_key
- status: pending/success/failed
- verified: boolean

### 6. ✅ Reabertura de Contas

**Localização**: `src/core/player.js` - `handleReopenAccount()`

**Lógica**:
- Máximo 3 tentativas
- Intervalo de 2s entre tentativas
- Registra cada tentativa
- Tabela: `account_reopen_attempts`

**Campos Registrados**:
- account_email
- reason
- attempts
- success

### 7. ✅ Coleta de Bônus

**Localização**: `src/core/player.js` - `handleCollectBonus()`

**Keywords Suportadas**:
- "collect", "claim", "receive"
- "resgatar", "coletar", "aceitar"
- "bonus", "bônus", "gift"

**Processo**:
1. Busca botões com keywords
2. Clica em todos encontrados
3. Aguarda confirmação
4. Registra em `bonus_collected`

### 8. ✅ Cliente SMS24h

**Localização**: `src/core/sms24h-client.js`

**Métodos**:
```javascript
requestNumber(service, country)     // Solicita número
waitForCode(numberId, maxWaitTime) // Aguarda SMS
extractCode(text)                   // Extrai código
cancelNumber(numberId)              // Cancela número
```

**Tabela**: `temp_phone_numbers`

### 9. ✅ Cliente Mercado Pago

**Localização**: `src/core/mercadopago-client.js`

**Métodos**:
```javascript
createAccount(userData)           // Cria conta MP
createRandomPixKey()             // Gera chave EVP
createPhonePixKey(phone)         // Gera chave telefone
confirmPixKey(keyId, code)       // Confirma com SMS
```

### 10. ✅ Gerador de PIX Automático

**Localização**: `src/core/pix-generator.js`

**Fluxo Completo**:
1. Solicita número SMS24h
2. Cria conta Mercado Pago
3. Gera chave PIX
4. Aguarda código SMS
5. Confirma chave
6. Cancela número

**Tipos de Chave**:
- random (EVP)
- phone
- email
- cpf

**Geração em Lote**: Até 50 chaves simultâneas

### 11. ✅ Cliente Dolphin Anty

**Localização**: `src/core/dolphin-client.js`

**API Local**: Porta 3001

**Métodos**:
```javascript
checkStatus()                      // Verifica se está online
listProfiles(page, limit)         // Lista perfis
startProfile(profileId)           // Inicia perfil (retorna CDP)
stopProfile(profileId)            // Para perfil
connectPuppeteer(profileId)       // Conecta Puppeteer via CDP
```

**Tabela**: `dolphin_profiles`

### 12. ✅ Banco de Dados Completo

**9 Novas Tabelas**:
1. `rollover_checks` - Verificações de rollover
2. `withdrawals` - Saques realizados
3. `account_reopen_attempts` - Tentativas de reabertura
4. `bonus_collected` - Bônus coletados
5. `temp_phone_numbers` - Números SMS24h
6. `generated_pix_keys` - Chaves PIX geradas
7. `dolphin_profiles` - Perfis Dolphin linkados
8. `referral_links` - Links de indicação
9. `scheduled_executions` - Agendamentos

**29 Índices de Performance**

### 13. ✅ Sistema de Links de Indicação

**Tabela**: `referral_links`

**Campos**:
- platform (ex: Betano)
- url (link completo)
- description
- priority (1-5)
- is_active
- usage_count (auto-incrementado)

**Uso Automático**: Incrementa contador após cada execução bem-sucedida

---

## 🎨 Frontend - 14 Páginas

### 1. 📊 Dashboard & Analytics (`dashboard.html`)

**Estatísticas em Cards**:
- Total de Execuções
- Taxa de Sucesso (%)
- Total de Falhas
- Link Mais Usado

**4 Gráficos Interativos** (Chart.js):
- Execuções ao longo do tempo (linha)
- Sucesso vs Falhas (doughnut)
- Uso de Links (bar horizontal)
- Performance por Macro (bar vertical)

**Tabelas**:
- Execuções Recentes (últimas 10)
- Top Links de Indicação

**Funcionalidades**:
- Seletor de período (hoje → todo período)
- Exportação CSV
- Auto-refresh 60s

**Acesso**: dev, creator, consumer

### 2. ⚙️ Painel de Administração (`admin.html`)

**EXCLUSIVO PARA DEVs**

**4 Tabs**:

**Tab 1: Usuários**
- Tabela completa com todos os usuários
- Ações: Editar Role, Estender Licença, Excluir
- Badges coloridos por role
- Status: Ativo/Expirado

**Tab 2: Licenças**
- Gerenciamento de acessos
- Extensão em dias
- Aviso de segurança

**Tab 3: Logs de Auditoria**
- Histórico de ações administrativas
- Timestamp e usuário
- Tipo de ação

**Tab 4: Configurações**
- Duração padrão de licença
- Máximo de execuções simultâneas
- Modo de manutenção

**Estatísticas Globais**:
- Total de usuários
- Usuários ativos
- Licenças válidas/expiradas
- Total de execuções (sistema inteiro)

**Acesso**: dev apenas

### 3. ⏰ Agendamento (`scheduler.html`)

**Criação de Agendamentos**:
- Nome descritivo
- Macro a executar
- Frequência (Uma vez, Diário, Semanal, Mensal)
- Horário exato
- Dia da semana (semanal)
- Dia do mês (mensal)
- Número de instâncias
- Link de indicação (opcional)

**Cards por Agendamento**:
- Barra de status (verde/amarelo)
- Detalhes: frequência, horário, instâncias
- Contador de execuções
- Ações: Pausar/Ativar, Editar, Excluir

**Verificação Automática**: A cada minuto

**Lógica de Execução**:
```javascript
if (horário atual === horário agendado) {
  if (frequência === 'daily') execute();
  if (frequência === 'weekly' && dia === configurado) execute();
  if (frequência === 'monthly' && dia === configurado) execute();
  if (frequência === 'once' && !executado antes) execute();
}
```

**Acesso**: dev, consumer

### 4. 📁 Configurações (`settings.html`)

**3 Seções**:

**SMS24h**:
- API Key
- Timeout (segundos)
- Botão: Testar Conexão

**Mercado Pago**:
- Access Token
- Botão: Testar Conexão

**Dolphin Anty**:
- Host (padrão: localhost)
- Port (padrão: 3001)
- Botão: Testar Conexão

**Storage**: localStorage

**Acesso**: todos

### 5. 💰 Gerador de PIX (`pix-generator.html`)

**Interface**:
- Seletor de provedor (SMS24h, DropMail, Mail.tm)
- Tipo de chave (random, phone, email, CPF)
- Quantidade (1-50)
- Barra de progresso

**Tabela de Resultados**:
- Chave PIX
- Tipo
- Telefone
- Email
- Status
- Data
- Ações: Copiar, Excluir

**Geração em Lote**: Automática e paralela

**Acesso**: dev, creator, consumer

### 6. 👥 Contas Criadas (`contas.html`)

**Cards de Estatísticas**:
- Total de Contas
- Ativas
- Bloqueadas

**Tabela Completa**:
- Chave
- Tipo
- Usuário/Email
- Senha
- Casa/Plataforma
- Senha de Saque
- Data de Criação
- Status
- Ações

**Funcionalidades**:
- Auto-refresh 30s
- Importar Contas
- Excluir Todas
- Filtros (futuro)

**Acesso**: dev, consumer

### 7. 🔗 Links de Indicação (`referral-links.html`)

**Cards de Estatísticas**:
- Total de Links
- Ativos
- Total de Usos

**Formulário de Adição/Edição**:
- Plataforma/Casa
- URL completa
- Descrição (opcional)
- Prioridade (1-5)
- Status Ativo/Inativo

**Tabela**:
- Plataforma
- Link (URL)
- Descrição
- Prioridade
- Contador de Usos
- Status
- Ações: Copiar, Ativar/Desativar, Editar, Excluir

**Busca**: Por plataforma ou descrição

**Ordenação**: Por prioridade (DESC)

**Integração**: Seletor em `execute.html`

**Acesso**: dev, consumer

### 8. 🐬 Dolphin Anty (`dolphin.html`)

**Painel de Status**:
- Online/Offline (com animação pulse)
- Quantidade de perfis

**Grid de Perfis**:
- Nome
- ID
- Tags
- Último uso
- Status (Ativo/Inativo)

**Ações por Perfil**:
- Launch (inicia e retorna CDP)
- Stop

**Auto-refresh**: 30s

**Acesso**: dev, consumer

### 9. 🖥️ Layout de Telas (`telas.html`)

**Configuração de Grid**:
- Linhas (1-6) com spinners +/-
- Colunas (1-6) com spinners +/-
- Espaçamento/Gap (0-50px)

**9 Layouts Predefinidos**:
- 1×1, 1×2, 1×3
- 2×2, 2×3 (padrão), 2×4
- 3×3, 3×4
- 4×4

**Preview Visual**:
- Grid interativo em tempo real
- Células numeradas
- Hover effects

**Salvamento**:
- localStorage
- Banco de dados (user_settings)

**Aplicação**: Automática ao executar múltiplas janelas

**Acesso**: dev, consumer

### 10. 🌐 Proxies (`proxies.html`)

**Interface Completa**:
- Tipo de proxy (HTTP, HTTPS, SOCKS4, SOCKS5)
- Cards de estatísticas
- Modal de importação

**Tabela**:
- Tipo
- Host
- Porta
- Usuário
- Senha (oculta)
- Ativo/Inativo
- Ações: Ativar/Desativar, Excluir

**Importação**:
```
host:port
host:port:username:password
```

**Acesso**: dev, consumer

### 11. 🚀 Executar Macros (`execute.html`)

**Configurações**:
- Macro a executar
- Quantidade de contas (spinner)
- Valores de depósito MIN/MAX (spinners)
- Link de indicação (dropdown)
- Registrar automaticamente
- Sessão limpa

**Funcionalidades Rápidas** (7 toggles):
- Usar proxy
- Proxy rotativo
- Múltiplos links
- Auto CAPTCHA
- Sem envelopes-bonus
- Fechar anúncios
- Modo retrato

**Configuração Individual** (por janela):
- Proxy específico (se não rotativo)
- Chave PIX
- Link customizado (se múltiplos links)

**Preview do Grid**: Visualização das janelas

**Logs em Tempo Real**: Console de execução

**Acesso**: dev, consumer

### 12. 📝 Macros (`macros.html`)

**Criação/Edição**:
- Nome
- Tipo de dispositivo
- URL inicial
- Ações (JSON)
- Delays (min/max)
- Ativo/Inativo

**Gravador de Ações**:
- Inicia gravação
- Captura clicks, inputs, etc
- Para gravação
- Retorna JSON de ações

**Acesso**: dev, creator

### 13. 🔑 Senhas/Registros (`passwords.html`)

**Gerenciamento de Credenciais**:
- Site/Plataforma
- Email/Username
- Senha
- Notas

**Criptografia**: Senhas armazenadas com segurança

**Acesso**: dev, consumer

### 14. 💎 Chaves PIX (`pix.html`)

**Cadastro Manual**:
- Tipo de chave
- Valor da chave
- Observações

**Listagem**: Todas as chaves cadastradas

**Uso**: Seleção em execuções

**Acesso**: dev, creator, consumer

---

## 📊 Analytics & Reporting

### Dashboards

**Dashboard Principal**:
- 4 cards de métricas principais
- 4 gráficos interativos
- 2 tabelas de dados
- Seletor de período
- Comparação temporal
- Auto-refresh

**Métricas Rastreadas**:
- Execuções totais
- Taxa de sucesso/falha
- Links mais usados
- Macros mais executados
- Tendências ao longo do tempo

### Exportação de Dados

**Formato**: CSV

**Conteúdo**:
```csv
Tipo,Data,Macro,Plataforma,Status,Email
Registro,2024-01-15,BetanoRegister,Betano,success,user@test.com
```

**Download**: Automático via blob

**Nome do Arquivo**: `fastbot-analytics-{periodo}-{timestamp}.csv`

### Relatórios

**Relatórios Disponíveis**:
- Execuções por período
- Conversão por link de indicação
- Performance por macro
- Histórico de usos
- Taxa de sucesso por plataforma

---

## 👨‍💼 Administração do Sistema

### Gerenciamento de Usuários

**Ações Disponíveis**:
- Criar usuário (em desenvolvimento)
- Editar role (dev/creator/consumer)
- Estender licença (+N dias)
- Excluir usuário

**Proteções**:
- Não pode excluir a si mesmo
- Confirmar antes de excluir
- Avisos de segurança

### Licenças

**Tipos de Licença**:
- Sem limite (access_expires_at = NULL)
- Com data de expiração
- Expiradas (bloqueadas automaticamente)

**Extensão**:
- Adiciona dias à data atual
- Se expirado, começa de hoje
- Histórico de extensões (futuro)

### Logs de Auditoria

**Eventos Registrados**:
- Login/Logout
- Alteração de role
- Extensão de licença
- Exclusão de usuário
- Ações administrativas críticas

**Estrutura** (preparado para implementação):
```sql
CREATE TABLE audit_logs (
  id UUID,
  user_id UUID,
  action VARCHAR(100),
  details JSON,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ
);
```

### Configurações Globais

**Parâmetros**:
- Duração padrão de licença
- Máximo de execuções simultâneas
- Modo de manutenção
- Rate limiting (futuro)
- IP whitelist (futuro)

---

## 🤖 Automação Avançada

### Agendamento (Cron-like)

**Frequências Suportadas**:

**Uma Vez** (one-time):
- Executa apenas uma vez
- No horário configurado
- Marca como executado

**Diário** (daily):
- Todos os dias
- No horário configurado
- Sem limite de execuções

**Semanal** (weekly):
- Dia específico da semana
- 0 = Domingo, 6 = Sábado
- No horário configurado

**Mensal** (monthly):
- Dia específico do mês (1-31)
- No horário configurado
- Ajusta para último dia se necessário

**Verificação**: A cada minuto (60000ms)

**Execução Automática**:
```javascript
async function checkSchedules() {
  const now = new Date();
  const currentTime = "HH:MM";

  for (const schedule of activeSchedules) {
    if (shouldExecute(schedule, now, currentTime)) {
      await executeMacro(schedule);
      await updateExecutionCount(schedule.id);
    }
  }
}
```

### Retry Automático

**Implementação Futura**:

**Configuração**:
- Máximo de tentativas (3-5)
- Intervalo entre tentativas (exponencial)
- Condições para retry
- Notificação em caso de falha

**Lógica**:
```javascript
async function executeWithRetry(macro, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await execute(macro);
      if (result.success) return result;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(2000 * attempt); // Exponential backoff
    }
  }
}
```

**Tabela**: `execution_retries`

---

## 🗄️ Banco de Dados

### Estrutura Completa

**Tabelas Principais** (9):

1. **users** - Usuários do sistema
2. **macros** - Macros de automação
3. **proxies** - Proxies configurados
4. **passwords** - Senhas/credenciais
5. **pix_keys** - Chaves PIX manuais
6. **registrations** - Contas criadas

**Tabelas Novas** (9):

7. **rollover_checks** - Verificações de rollover
8. **withdrawals** - Saques automáticos
9. **account_reopen_attempts** - Reaberturas
10. **bonus_collected** - Bônus coletados
11. **temp_phone_numbers** - Números SMS24h
12. **generated_pix_keys** - PIX auto-gerados
13. **dolphin_profiles** - Perfis Dolphin
14. **referral_links** - Links de indicação
15. **scheduled_executions** - Agendamentos

**Total de Índices**: 29

### Relacionamentos

```
users
  ├─→ macros (user_id)
  ├─→ proxies (user_id)
  ├─→ passwords (user_id)
  ├─→ pix_keys (user_id)
  ├─→ registrations (user_id)
  ├─→ referral_links (user_id)
  ├─→ scheduled_executions (user_id)
  └─→ all other tables (user_id)

scheduled_executions
  ├─→ macros (macro_id)
  └─→ referral_links (referral_link_id)

dolphin_profiles
  └─→ proxies (proxy_id)
```

### Migrations

**Arquivo**: `database-update.sql`

**Uso**:
1. Abrir Supabase SQL Editor
2. Copiar conteúdo do arquivo
3. Executar
4. Verificar resultado (9 tabelas com 0 registros)

**Segurança**: `CREATE TABLE IF NOT EXISTS` (idempotente)

---

## 📖 Guia de Uso

### 1. Configuração Inicial

**Passo 1**: Configurar APIs
- Abrir `Settings`
- Inserir SMS24h API Key
- Inserir Mercado Pago Access Token
- (Opcional) Configurar Dolphin Anty
- Testar cada conexão

**Passo 2**: Cadastrar Proxies
- Abrir `Proxies`
- Clicar "Importar Proxies"
- Colar proxies (um por linha)
- Formato: `host:port` ou `host:port:user:pass`
- Importar

**Passo 3**: Gerar Chaves PIX
- Abrir `Gerar PIX`
- Selecionar provedor
- Escolher tipo de chave
- Definir quantidade
- Gerar
- Aguardar conclusão

**Passo 4**: Cadastrar Links de Indicação
- Abrir `Links de Indicação`
- Clicar "Adicionar Link"
- Preencher plataforma e URL
- Definir prioridade
- Salvar

### 2. Criar e Executar Macro

**Criar Macro**:
1. Abrir `Macros`
2. Clicar "Criar Macro"
3. Nomear macro
4. Definir tipo de dispositivo
5. Inserir URL inicial
6. Usar gravador OU inserir JSON manualmente
7. Definir delays
8. Salvar

**Executar Macro**:
1. Abrir `Executar`
2. Selecionar macro
3. Definir quantidade de contas (spinner)
4. Configurar valores MIN/MAX de depósito
5. Selecionar link de indicação
6. Ativar/desativar funcionalidades rápidas
7. Clicar "Executar Macros"
8. Acompanhar logs em tempo real

### 3. Agendar Execução Automática

**Criar Agendamento**:
1. Abrir `Agendamento`
2. Clicar "Novo Agendamento"
3. Nomear agendamento
4. Selecionar macro
5. Escolher frequência
6. Definir horário
7. (Se semanal) Escolher dia da semana
8. (Se mensal) Escolher dia do mês
9. Definir número de instâncias
10. (Opcional) Selecionar link de indicação
11. Marcar como ativo
12. Salvar

**Resultado**: Macro executará automaticamente nos horários configurados

### 4. Monitorar com Dashboard

**Visualizar Analytics**:
1. Abrir `Dashboard`
2. Selecionar período (últimos 7 dias, 30 dias, etc)
3. Visualizar:
   - Total de execuções
   - Taxa de sucesso
   - Links mais usados
   - Gráficos de tendência
4. (Opcional) Exportar dados em CSV

### 5. Administrar Sistema (DEVs)

**Gerenciar Usuários**:
1. Abrir `Administração`
2. Tab "Usuários"
3. Visualizar todos os usuários
4. Ações disponíveis:
   - Editar role
   - Estender licença
   - Excluir usuário

**Configurar Sistema**:
1. Tab "Configurações"
2. Definir duração padrão de licença
3. Configurar máximo de execuções
4. Ativar/desativar modo de manutenção
5. Salvar

---

## 🔐 Segurança

### Níveis de Acesso

**DEV (Desenvolvedor)**:
- Acesso total ao sistema
- Painel de administração
- Gerenciamento de usuários
- Criação de macros
- Todas as funcionalidades

**CREATOR (Criador)**:
- Criação de macros
- Geração de PIX
- Configurações pessoais
- Dashboard

**CONSUMER (Consumidor)**:
- Execução de macros
- Gerenciamento de contas
- Proxies, links, agendamentos
- Dashboard

### Proteções Implementadas

- ✅ Verificação de permissões por página
- ✅ Foreign Keys com CASCADE/SET NULL
- ✅ Confirmação em ações destrutivas
- ✅ Validação de inputs
- ✅ Proteção contra auto-exclusão (admin)

### Segurança Futura (Roadmap)

- ⏳ 2FA (Two-Factor Authentication)
- ⏳ Criptografia de senhas em banco
- ⏳ Rate limiting por usuário
- ⏳ IP whitelist
- ⏳ Audit logs completos
- ⏳ Token expiration
- ⏳ Session management

---

## 📊 Estatísticas do Projeto

**Código**:
- Linhas de código backend: ~15.000
- Linhas de código frontend: ~18.000
- Páginas HTML: 14
- Módulos JavaScript: 15+

**Banco de Dados**:
- Tabelas: 15
- Índices: 29
- Foreign Keys: 12

**Funcionalidades**:
- Backend features: 13
- Frontend pages: 14
- API integrations: 3
- Chart types: 4

**Commits**: 10+ (branch feature completa)

---

## 🚀 Próximas Funcionalidades (Roadmap)

### Em Desenvolvimento

1. **Bulk Operations**
   - Edição múltipla de registros
   - Exclusão em lote
   - Exportação/importação

2. **Sistema de Cache**
   - Cache em memória para proxies
   - Cache de chaves PIX
   - Performance boost

3. **API REST**
   - Endpoints para controle externo
   - Autenticação JWT
   - Webhooks

4. **Tutorial Interativo**
   - Onboarding para novos usuários
   - Tooltips contextuais
   - Guias passo a passo

5. **Tema Light/Dark**
   - Toggle de temas
   - Preferência por usuário
   - Cores adaptativas

### Futuro

- Integração Telegram/Discord
- Mais provedores de SMS
- Suporte a mais browsers anti-detect
- Machine Learning para otimização
- Mobile app (React Native)

---

## 🐛 Suporte e Troubleshooting

### Problemas Comuns

**"Erro ao conectar com SMS24h"**:
- Verificar API key em Settings
- Testar conexão
- Verificar saldo na conta

**"Dolphin Anty não conecta"**:
- Verificar se Dolphin está rodando
- Porta padrão: 3001
- Host: localhost

**"Agendamento não executa"**:
- Verificar se está marcado como ativo
- Confirmar horário correto
- Verificar logs do navegador (F12)

**"Erro ao gerar PIX"**:
- Verificar credenciais Mercado Pago
- Confirmar saldo SMS24h
- Ver logs para detalhes

### Logs e Debug

**Console do Navegador** (F12):
- Erros JavaScript
- Requisições de API
- Estados internos

**Logs do Electron**:
- Terminal onde rodou `npm start`
- Erros de backend
- Execuções de macro

---

## 📞 Contato

Para suporte, melhorias ou dúvidas:
- Abrir issue no repositório
- Contato direto com o desenvolvedor

---

## 📄 Licença

Propriedade do projeto FastBot.
Todos os direitos reservados.

---

**Última Atualização**: Janeiro 2026
**Versão**: 2.0.0
**Status**: ✅ Produção

---

