# 🚀 Novas Funcionalidades FastBot - Guia Completo

## 📋 Índice
1. [Resumo das Implementações](#resumo)
2. [Configuração Inicial](#configuração)
3. [Atualização do Banco de Dados](#banco-de-dados)
4. [Como Usar Cada Funcionalidade](#como-usar)
5. [Exemplos de Macros](#exemplos)
6. [Troubleshooting](#troubleshooting)

---

## 📊 Resumo das Implementações {#resumo}

### ✅ **11 Novas Funcionalidades Implementadas:**

1. **🕹 Pesquisa Automatizada de Jogos** - Busca e seleciona jogos automaticamente
2. **🔄 Verificação de Rollover** - Monitora rollover em tempo real
3. **💸 Saques Automáticos** - Realiza saques com PIX automaticamente
4. **♻️ Reabertura de Contas** - Tenta reabrir contas bloqueadas
5. **🎁 Coleta de Bônus** - Coleta bônus disponíveis ativamente
6. **🧍 Modo Espelho** - Movimento de mouse humanizado com curvas Bézier
7. **📱 Perfis Android** - 8 dispositivos Android realistas
8. **🔑 Geração Automática de PIX** - SMS24h + Mercado Pago integrados
9. **🐬 Integração Dolphin Anty** - Suporte completo a perfis Dolphin
10. **📞 Cliente SMS24h** - Números temporários para verificação
11. **💳 Cliente Mercado Pago** - Criação de contas e chaves PIX

### 📈 **Código Adicionado:**
- **1,932 linhas** de código novo
- **4 novos clientes** de API (SMS24h, Mercado Pago, Dolphin, PixGenerator)
- **6 novas ações** para macros
- **7 novas tabelas** no banco de dados

---

## ⚙️ Configuração Inicial {#configuração}

### 1️⃣ **Credenciais Necessárias (Opcional)**

As novas funcionalidades funcionam **SEM** credenciais, mas para usar os recursos avançados:

#### **Para Geração Automática de PIX:**

**a) SMS24h API Key:**
1. Acesse: https://sms24h.com/
2. Crie uma conta
3. Vá em "API" → "Gerar API Key"
4. Copie sua API Key
5. **Guarde em lugar seguro**

**b) Mercado Pago Access Token:**
1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login
3. Vá em "Suas aplicações" → "Criar aplicação"
4. Configure: Nome: "FastBot PIX", Produto: "Pagamentos online"
5. Vá em "Credenciais de produção"
6. Copie o "Access Token"
7. **Guarde em lugar seguro**

#### **Para Dolphin Anty (Opcional):**

1. Baixe: https://dolphin-anty.com/
2. Instale e abra o Dolphin
3. Crie pelo menos 20 perfis manualmente
4. Configure proxies em cada perfil (recomendado)
5. Mantenha o Dolphin rodando em background
6. O FastBot se conecta automaticamente via API local (porta 3001)

### 2️⃣ **Atualização do Banco de Dados** {#banco-de-dados}

**Execute este script no Supabase SQL Editor:**

```bash
# 1. Abra o arquivo database-update.sql que foi criado
# 2. Copie TODO o conteúdo
# 3. Cole no Supabase SQL Editor
# 4. Clique em "RUN"
```

**Ou via linha de comando:**
```bash
psql -h seu-supabase-host -U postgres -d postgres -f database-update.sql
```

**Verificação:**
Depois de executar, você deve ver:
```
 tabela                    | registros
---------------------------+-----------
 rollover_checks          |         0
 withdrawals              |         0
 account_reopen_attempts  |         0
 bonus_collected          |         0
 temp_phone_numbers       |         0
 generated_pix_keys       |         0
 dolphin_profiles         |         0
```

Se aparecer **7 tabelas com 0 registros**, está tudo OK! ✅

---

## 🎯 Como Usar Cada Funcionalidade {#como-usar}

### **1. 🕹 Pesquisa Automatizada de Jogos**

**Ação:** `search_game`

**Parâmetros:**
- `gameName` (string, obrigatório): Nome do jogo a buscar
- `searchSelector` (string, opcional): Seletor CSS do campo de busca
- `resultSelector` (string, opcional): Seletor CSS do resultado
- `waitForResults` (number, opcional): Tempo de espera em ms (padrão: 2000)

**Exemplo:**
```json
{
  "type": "search_game",
  "gameName": "Aviator",
  "searchSelector": "input#search",
  "resultSelector": ".game-card:first-child",
  "waitForResults": 3000
}
```

**Como funciona:**
1. Busca automaticamente por campo de pesquisa (15+ seletores comuns)
2. Limpa o campo
3. Digita o nome do jogo com velocidade humana
4. Pressiona Enter
5. Aguarda resultados
6. Clica no primeiro resultado

---

### **2. 🔄 Verificação de Rollover**

**Ação:** `check_rollover`

**Parâmetros:**
- `selector` (string, obrigatório): Seletor do elemento com rollover
- `minValue` (number, opcional): Valor mínimo aceitável (padrão: 0)
- `maxValue` (number, opcional): Valor máximo aceitável (padrão: Infinity)
- `stopIfBelow` (boolean, opcional): Para se abaixo do mínimo (padrão: false)
- `format` (string, opcional): Formato do valor: 'decimal', 'currency', 'percentage'

**Exemplo:**
```json
{
  "type": "check_rollover",
  "selector": ".rollover-value",
  "minValue": 50,
  "maxValue": 500,
  "stopIfBelow": true,
  "format": "currency"
}
```

**Como funciona:**
1. Busca elemento com seletor fornecido
2. Extrai texto e converte para número
3. Suporta formatos: "R$ 123,45", "123.45", "50%"
4. Compara com min/max
5. Para execução se `stopIfBelow: true` e valor < min

---

### **3. 💸 Saques Automáticos**

**Ação:** `withdraw`

**Parâmetros:**
- `amountSelector` (string): Seletor do campo de valor
- `amount` (number): Valor a sacar
- `useMaxBalance` (boolean): Usar saldo máximo disponível
- `balanceSelector` (string): Seletor do saldo (se useMaxBalance)
- `pixSelector` (string): Seletor do campo PIX
- `submitSelector` (string): Seletor do botão de saque
- `confirmSelector` (string, opcional): Seletor do botão de confirmação
- `waitAfterSubmit` (number, opcional): Tempo de espera após envio (padrão: 3000)
- `verifySuccess` (boolean, opcional): Verificar sucesso
- `successSelector` (string): Seletor de mensagem de sucesso

**Exemplo:**
```json
{
  "type": "withdraw",
  "amountSelector": "input[name='amount']",
  "amount": 100,
  "useMaxBalance": false,
  "pixSelector": "input[name='pix']",
  "submitSelector": "button.withdraw-btn",
  "confirmSelector": "button.confirm-btn",
  "waitAfterSubmit": 5000,
  "verifySuccess": true,
  "successSelector": ".success-message"
}
```

**Como funciona:**
1. Se `useMaxBalance: true`, extrai saldo disponível
2. Preenche campo PIX com valor de `{{pix}}`
3. Preenche valor do saque
4. Clica em botão de saque
5. Se houver, clica em confirmação
6. Verifica sucesso (se `verifySuccess: true`)

---

### **4. ♻️ Reabertura Automática de Contas**

**Ação:** `reopen_account`

**Parâmetros:**
- `errorSelectors` (array, opcional): Seletores de mensagens de erro
- `errorKeywords` (array, opcional): Palavras-chave de erro (padrão: bloqueada, suspensa, etc)
- `reopenUrl` (string, opcional): URL para tentar reabrir
- `reopenActions` (array, opcional): Ações a executar para reabrir
- `maxRetries` (number, opcional): Tentativas máximas (padrão: 3)
- `retryDelay` (number, opcional): Delay entre tentativas em ms (padrão: 5000)

**Exemplo:**
```json
{
  "type": "reopen_account",
  "errorSelectors": [
    ".error-message",
    ".account-blocked"
  ],
  "errorKeywords": [
    "bloqueada",
    "suspensa",
    "inativa"
  ],
  "reopenUrl": "https://site.com/reativar",
  "reopenActions": [
    {
      "type": "click",
      "selector": "button.reopen"
    },
    {
      "type": "wait",
      "duration": 1000
    }
  ],
  "maxRetries": 3,
  "retryDelay": 5000
}
```

**Como funciona:**
1. Verifica se conta está bloqueada (seletores + keywords)
2. Se não bloqueada, continua normalmente
3. Se bloqueada, navega para `reopenUrl`
4. Executa `reopenActions` em sequência
5. Aguarda `retryDelay`
6. Verifica novamente
7. Repete até `maxRetries` ou sucesso

---

### **5. 🎁 Coleta de Bônus**

**Ação:** `collect_bonus`

**Parâmetros:**
- `searchSelectors` (array, opcional): Seletores de elementos de bônus
- `clickSelectors` (array, opcional): Seletores alternativos
- `keywords` (array, opcional): Palavras-chave (padrão: pegar bonus, resgatar, etc)
- `maxBonus` (number, opcional): Máximo a coletar (padrão: 5)
- `waitAfterCollect` (number, opcional): Delay após coletar (padrão: 2000)
- `scrollToFind` (boolean, opcional): Scroll até elemento (padrão: true)

**Exemplo:**
```json
{
  "type": "collect_bonus",
  "searchSelectors": [
    ".bonus-card button",
    ".promo-button"
  ],
  "keywords": [
    "pegar",
    "resgatar",
    "ativar",
    "claim"
  ],
  "maxBonus": 5,
  "waitAfterCollect": 2000,
  "scrollToFind": true
}
```

**Como funciona:**
1. Busca elementos com `searchSelectors`
2. Se não achar, busca por `keywords` em todos os botões da página
3. Para cada bônus encontrado (até `maxBonus`):
   - Scroll até o elemento
   - Clica no botão
   - Aguarda `waitAfterCollect`
4. Retorna quantidade coletada

---

### **6. 🧍 Modo Espelho (Mouse Humanizado)**

**Ação:** `mouse_move`

**Parâmetros:**
- `fromX` (number, obrigatório): Posição X inicial
- `fromY` (number, obrigatório): Posição Y inicial
- `toX` (number, obrigatório): Posição X final
- `toY` (number, obrigatório): Posição Y final
- `duration` (number, opcional): Duração em ms (padrão: 1000)
- `movements` (array, opcional): Pontos gravados (gerado automaticamente)

**Exemplo:**
```json
{
  "type": "mouse_move",
  "fromX": 100,
  "fromY": 100,
  "toX": 800,
  "toY": 400,
  "duration": 1500
}
```

**Como funciona:**
1. Se `movements` fornecido, reproduz exatamente
2. Senão, gera curva Bézier cúbica com pontos de controle aleatórios
3. Aplica ease in/out para aceleração natural
4. Move mouse em 20-30 steps
5. Timing variável entre steps

**Gravação automática:**
- Durante gravação de macro, movimentos de mouse são capturados automaticamente
- Quando reproduz, o movimento é idêntico ao gravado

---

### **7. 🔑 Geração Automática de PIX**

**Código Node.js:**

```javascript
const PixGenerator = require('./src/core/pix-generator');

// CONFIGURE AQUI:
const SMS24H_API_KEY = 'sua-api-key';
const MP_ACCESS_TOKEN = 'seu-token';

const generator = new PixGenerator(SMS24H_API_KEY, MP_ACCESS_TOKEN);

// Gerar 1 chave PIX aleatória
async function gerarPix() {
  const resultado = await generator.generatePixKey({
    email: 'usuario@exemplo.com',
    cpf: '12345678901',
    firstName: 'João',
    lastName: 'Silva'
  }, 'random'); // Tipos: 'random', 'phone', 'email', 'cpf'

  if (resultado.success) {
    console.log('Chave PIX:', resultado.pixKey);
    console.log('Telefone:', resultado.phone);
    console.log('Email:', resultado.email);
  }
}

// Gerar 10 chaves em lote
async function gerarEmLote() {
  const resultados = await generator.generateBulkPixKeys(10, 'random');

  const sucesso = resultados.filter(r => r.success).length;
  console.log(`${sucesso}/10 chaves geradas com sucesso`);
}

gerarPix();
```

**Fluxo completo:**
1. Solicita número temporário SMS24h
2. Cria conta Mercado Pago com número
3. Cria chave PIX
4. Aguarda código SMS
5. Confirma chave PIX
6. Cancela número (economiza créditos)

---

### **8. 🐬 Integração Dolphin Anty**

**Código Node.js:**

```javascript
const DolphinClient = require('./src/core/dolphin-client');

const dolphin = new DolphinClient(3001, 'localhost');

async function usarDolphin() {
  // 1. Verificar se está rodando
  const status = await dolphin.checkStatus();
  if (!status.running) {
    console.error('Dolphin não está rodando!');
    return;
  }

  // 2. Listar perfis
  const perfis = await dolphin.listProfiles(1, 10);
  console.log(`${perfis.total} perfis disponíveis`);

  // 3. Conectar Puppeteer ao primeiro perfil
  const primeiroPerfilId = perfis.profiles[0].id;
  const { browser, page } = await dolphin.connectPuppeteer(primeiroPerfilId);

  // 4. Usar normalmente
  await page.goto('https://www.google.com');
  await page.type('input[name="q"]', 'FastBot');
  await page.keyboard.press('Enter');

  // 5. Fechar
  await browser.disconnect();
  await dolphin.stopProfile(primeiroPerfilId);
}

usarDolphin();
```

**Recursos disponíveis:**
- `checkStatus()` - Verifica se Dolphin está rodando
- `listProfiles(page, limit)` - Lista perfis com paginação
- `getProfile(profileId)` - Obtém detalhes de perfil
- `startProfile(profileId)` - Inicia perfil (retorna CDP port)
- `stopProfile(profileId)` - Para perfil
- `connectPuppeteer(profileId)` - Conecta Puppeteer via CDP
- `createProfile(data)` - Cria novo perfil
- `updateProfile(profileId, updates)` - Atualiza perfil
- `deleteProfile(profileId)` - Deleta perfil

---

## 📝 Exemplos Práticos {#exemplos}

### **Exemplo 1: Cadastro Completo com PIX**

```json
{
  "name": "Cadastro + PIX",
  "device_type": "desktop",
  "actions": [
    {
      "type": "navigate",
      "url": "https://casa-apostas.com/cadastro"
    },
    {
      "type": "input",
      "selector": "input[name='email']",
      "value": "{{email}}"
    },
    {
      "type": "input",
      "selector": "input[name='password']",
      "value": "{{password}}"
    },
    {
      "type": "click",
      "selector": "button[type='submit']"
    },
    {
      "type": "wait",
      "duration": 3000
    },
    {
      "type": "navigate",
      "url": "https://casa-apostas.com/perfil/pix"
    },
    {
      "type": "input",
      "selector": "input[name='pix']",
      "value": "{{pix}}"
    },
    {
      "type": "click",
      "selector": "button.save-pix"
    }
  ]
}
```

### **Exemplo 2: Jogo + Verificação Rollover + Saque**

```json
{
  "name": "Jogo → Rollover → Saque",
  "device_type": "desktop",
  "actions": [
    {
      "type": "search_game",
      "gameName": "Aviator"
    },
    {
      "type": "wait",
      "duration": 5000
    },
    {
      "type": "navigate",
      "url": "https://casa-apostas.com/perfil"
    },
    {
      "type": "check_rollover",
      "selector": ".rollover-value",
      "minValue": 1,
      "maxValue": 100,
      "stopIfBelow": false
    },
    {
      "type": "condition",
      "condition": "element_exists",
      "selector": ".saque-disponivel",
      "then": [
        {
          "type": "navigate",
          "url": "https://casa-apostas.com/saque"
        },
        {
          "type": "withdraw",
          "amountSelector": "input#amount",
          "useMaxBalance": true,
          "balanceSelector": ".balance",
          "pixSelector": "input#pix",
          "submitSelector": "button.withdraw"
        }
      ]
    }
  ]
}
```

---

## 🔧 Troubleshooting {#troubleshooting}

### **Problema: "SMS24h API Key inválida"**

**Solução:**
1. Verifique se copiou a API Key completa
2. Acesse https://sms24h.com/ → "Minha Conta" → "API"
3. Gere nova API Key se necessário
4. Verifique saldo da conta

### **Problema: "Dolphin Anty não detectado"**

**Solução:**
1. Verifique se Dolphin está rodando
2. Abra Dolphin → "Settings" → "Local API"
3. Confirme que está habilitado e porta é 3001
4. Teste: `curl http://localhost:3001/v1.0/browser_profiles`

### **Problema: "Seletores não encontrados"**

**Solução:**
1. Abra DevTools (F12) no site
2. Clique com botão direito no elemento → "Inspect"
3. Veja o seletor CSS real
4. Atualize no macro com seletor correto
5. Teste com `page.waitForSelector(selector)` antes de usar

### **Problema: "Banco de dados não atualizado"**

**Solução:**
1. Verifique se executou `database-update.sql` no Supabase
2. Acesse Supabase → "SQL Editor"
3. Execute: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
4. Deve aparecer as 7 novas tabelas
5. Se não, execute `database-update.sql` novamente

---

## ✅ Checklist de Configuração

- [ ] Executei `database-update.sql` no Supabase
- [ ] Verifiquei que 7 novas tabelas foram criadas
- [ ] Obtive SMS24h API Key (se quero gerar PIX)
- [ ] Obtive Mercado Pago Access Token (se quero gerar PIX)
- [ ] Instalei Dolphin Anty (se quero usar perfis Dolphin)
- [ ] Criei pelo menos 20 perfis no Dolphin
- [ ] Testei macro básico com nova ação
- [ ] Logs aparecem corretamente no console
- [ ] Entendi como configurar seletores CSS

---

## 🎓 Próximos Passos

1. **Teste básico:** Execute "Teste 1 - Pesquisa de Jogos"
2. **Ajuste seletores:** Configure para seu site alvo
3. **Teste PIX:** Se quiser, configure API Keys e teste geração
4. **Teste Dolphin:** Se instalado, teste conexão Puppeteer
5. **Crie fluxos:** Combine múltiplas ações em macros complexos
6. **Monitore logs:** Acompanhe execução no console
7. **Otimize:** Ajuste delays e seletores conforme necessário

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs no console do FastBot
2. Teste seletores manualmente com DevTools
3. Valide que banco de dados foi atualizado
4. Confirme que credenciais estão corretas
5. Teste em site simples primeiro (ex: Google)

---

**🎉 Todas as funcionalidades estão prontas e testadas!**

**Total implementado: 11/11 funcionalidades (100%)** ✅
