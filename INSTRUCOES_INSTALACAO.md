# Instruções de Instalação e Configuração

## O que foi implementado:

✅ Página de macros removida
✅ Nova página de Executar com grid de 10 navegadores
✅ Integração com OpenCode SDK para análise de HTML via LLM
✅ Sistema de automação generalista com 4 ações principais
✅ Extensão Buster Captcha integrada
✅ Página de Proxies corrigida com sidebar padrão
✅ Backend Electron atualizado com novos handlers IPC
✅ Tabela de jogos pré-definidos criada

---

## Pré-requisitos de Instalação

### 1. Instalar Dependências

O SDK do OpenCode já foi instalado. Verifique o `package.json`:

```json
{
  "dependencies": {
    "@opencode-ai/sdk": "^1.0.0",
    ...
  }
}
```

### 2. Configurar Servidor OpenCode

Você precisa ter um servidor OpenCode rodando localmente em `http://localhost:4096`.

**Instalação do OpenCode:**

```bash
npm install -g @opencode-ai/cli
opencode init
opencode start
```

Ou acesse: https://opencode.ai/docs/ para instruções detalhadas.

### 3. Configurar Extensão Buster

O caminho da extensão está configurado em `src/core/browser-grid-manager.js`:

```javascript
this.extensionPath = 'C:\\Users\\Bill\\Downloads\\Cash_Hunters_4.4.5\\Mercado_Pago\\Extensoes\\Buster-Captcha';
```

**Se quiser mudar o caminho:**

1. Copie a pasta `Buster-Captcha` do Cash_Hunters para outro local
2. Atualize o caminho em `src/core/browser-grid-manager.js` linha 12

### 4. Criar Tabela no Supabase

Execute o SQL abaixo no editor SQL do Supabase:

```bash
psql -h seu-host -U seu-usuario -d seu-banco -f database/create_predefined_games.sql
```

Ou copie o conteúdo de `database/create_predefined_games.sql` e cole no SQL Editor do Supabase.

---

## Como Usar o Sistema

### 1. Abrir o FastBot

```bash
npm start
```

### 2. Navegar para "Executar"

No menu lateral, clique em "Executar".

### 3. Configurar Links e Navegadores

1. Clique em "+ Adicionar Link"
2. Digite a URL (ex: `https://site-de-jogos.com`)
3. Use o spinner + / - para definir a quantidade de navegadores
4. O total não pode exceder 10 navegadores

**Exemplo de configuração:**
- Link 1: `https://site1.com` - 3 navegadores (posições 1,2,3)
- Link 2: `https://site2.com` - 2 navegadores (posições 4,5)
- Link 3: `https://site3.com` - 1 navegador (posição 10)

Total: 6/10 navegadores

### 4. Abrir Navegadores

Clique em "Abrir Navegadores". Isso abrirá os navegadores em um grid 2×5 (5 colunas × 2 linhas).

### 5. Executar Ações (após todos carregarem)

Após todos navegadores carregarem, um painel de ações aparecerá:

#### Ação: Criar Conta
- Analisa o HTML da página automaticamente
- Encontra campos de registro (email, senha, etc.)
- Preenche com dados gerados automaticamente
- Clica no botão de registrar

#### Ação: Criar Depósito
- Encontra campo de valor de depósito
- Preenche com valor aleatório (definido na configuração)
- Clica no botão de confirmar

#### Ação: Ir até Jogo
- **Campo de texto:** Digite o nome do jogo (ex: "Aviator")
- **Lista pré-definida:** Selecione um jogo da lista
- O LLM encontrará o link/botão que leva ao jogo e clicará

#### Ação: Fechar Popup
- Analisa a página para identificar popups, modals e overlays
- Encontra botões de fechar (X, Close, etc.)
- Fecha todos automaticamente

---

## Arquivos Criados/Modificados

### Novos Arquivos:

```
src/
├── core/
│   ├── opencode-client.js        # Cliente do OpenCode SDK
│   ├── html-analyzer.js          # Análise de HTML via LLM
│   ├── action-executor.js        # Executor de ações nos navegadores
│   └── browser-grid-manager.js   # Gerenciador de grid 2×5
└── renderer/pages/
    └── execute.html              # Página redesenhada (novo layout)

extensions/
└── README.md                    # Documentação de extensões

database/
└── create_predefined_games.sql   # SQL para criar tabela de jogos
```

### Arquivos Modificados:

```
package.json                     # Adicionado @opencode-ai/sdk
src/renderer/pages/
├── macros.html                  # REMOVIDO
├── editor-macro.html           # REMOVIDO
├── router.js                   # Removido "macros" do menu
└── proxies.html                # Adicionado sidebar padrão + botão voltar
src/main/
├── main.js                     # Adicionados handlers IPC do grid
└── renderer/pages/preload.js    # Expostos novos métodos browserGrid
```

---

## Troubleshooting

### Erro: "OpenCode client não está conectado"

**Solução:**
1. Verifique se o servidor OpenCode está rodando em `localhost:4096`
2. Acesse `http://localhost:4096` no navegador para confirmar
3. Reinicie o FastBot após iniciar o OpenCode

### Erro: "Extensão não encontrada"

**Solução:**
1. Verifique o caminho em `src/core/browser-grid-manager.js` linha 12
2. Copie a extensão Buster do Cash_Hunters para o caminho correto
3. Reinicie o FastBot

### Erro: "Nenhum navegador disponível"

**Solução:**
1. Primeiro, clique em "Abrir Navegadores"
2. Aguarde até todos navegadores carregarem
3. Só então tente executar ações

### Tabela não criada no Supabase

**Solução:**
1. Abra o SQL Editor no painel do Supabase
2. Cole o conteúdo de `database/create_predefined_games.sql`
3. Execute o SQL
4. Verifique a tabela em "Table Editor"

---

## Configuração Avançada

### Alterar Posição dos Navegadores

Edite `src/core/browser-grid-manager.js` na função `calculateGridPositions()`:

```javascript
const screenWidth = 1920;
const screenHeight = 1080;
const windowWidth = Math.floor(screenWidth / 5);  // 5 colunas
const windowHeight = Math.floor(screenHeight / 2); // 2 linhas
```

### Adicionar Mais Ações

Para adicionar uma nova ação:

1. Em `src/core/opencode-client.js`, adicione um método de análise:

```javascript
async minhaNovaAcaoAnalysis(html) {
  const prompt = "Seu prompt aqui...";
  return await this.analyzeHTML(html, prompt);
}
```

2. Em `src/core/html-analyzer.js`, adicione:

```javascript
async analyzeForMinhaNovaAcao(page) {
  const html = await this.captureHTML(page);
  return await this.openCode.minhaNovaAcaoAnalysis(html);
}
```

3. Em `src/core/action-executor.js`, adicione:

```javascript
async executeMinhaNovaAcao(page, params, result) {
  const analysis = await this.analyzer.analyzeForMinhaNovaAcao(page);
  // Execute a ação aqui
}
```

4. Em `execute.html`, adicione o botão na UI e chame `executeAction('minhaNovaAcao')`

---

## Próximos Passos

1. Testar o sistema com sites reais
2. Ajustar prompts do LLM para melhor precisão
3. Adicionar mais jogos pré-definidos no Supabase
4. Criar extensões customizadas para sites específicos
5. Monitorar logs e ajustar timeouts/erros

---

## Suporte

Se encontrar problemas:

1. Verifique os logs do console (F12 no navegador)
2. Verifique os logs do terminal do FastBot
3. Consulte a documentação do OpenCode: https://opencode.ai/docs/sdk/
4. Consulte a documentação do Buster: https://github.com/dessant/buster
