const { createOpencodeClient } = require('@opencode-ai/sdk');

class OpenCodeClient {
  constructor(baseUrl = 'http://localhost:4096') {
    this.baseUrl = baseUrl;
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createOpencodeClient({ baseUrl: this.baseUrl });
      
      const health = await this.client.global.health();
      
      if (health.data && health.data.healthy) {
        this.isConnected = true;
        console.log(`[OpenCode] Conectado ao servidor versão ${health.data.version}`);
        return true;
      }
      
      console.error('[OpenCode] Servidor não está saudável');
      return false;
    } catch (error) {
      console.error('[OpenCode] Erro ao conectar:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async analyzeHTML(html, prompt) {
    if (!this.isConnected) {
      throw new Error('OpenCode client não está conectado');
    }

    try {
      const fullPrompt = `Analise o seguinte HTML e responda APENAS com JSON válido:

${prompt}

HTML:
${html}

Retorne no formato:
{
  "action": "nome_da_acao",
  "selectors": {
    "campo1": "selector_css_1",
    "campo2": "selector_css_2",
    "botao": "selector_do_botao"
  },
  "values": {
    "valor_campo1": "valor1"
  }
}`;

      const result = await this.client.session.create({
        body: {
          title: 'HTML Analysis'
        }
      });

      const sessionId = result.data.id;

      const analysisResult = await this.client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: 'text', text: fullPrompt }],
          noReply: false
        }
      });

      const responseText = this.extractTextFromResponse(analysisResult);
      return this.parseJSONResponse(responseText);
    } catch (error) {
      console.error('[OpenCode] Erro ao analisar HTML:', error);
      throw error;
    }
  }

  extractTextFromResponse(response) {
    if (response.data && response.data.parts) {
      return response.data.parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('\n');
    }
    return '';
  }

  parseJSONResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Nenhum JSON válido encontrado na resposta');
    } catch (error) {
      console.error('[OpenCode] Erro ao parsear JSON:', error);
      return null;
    }
  }

  async createAccountAnalysis(html) {
    const prompt = `Encontre todos os campos necessários para criar uma conta:
- Campo de email
- Campo de senha (ou senha + confirmação)
- Campo de nome de usuário (se existir)
- Campo de telefone (se existir)
- Botão de registrar/criar conta
- Outros campos obrigatórios do formulário

Retorne os seletores CSS e os tipos de cada campo.`;

    return await this.analyzeHTML(html, prompt);
  }

  async createDepositAnalysis(html) {
    const prompt = `Encontre os elementos para criar um depósito:
- Campo de valor do depósito
- Campo para escolher método de pagamento (PIX, cartão, etc)
- Botão de confirmar/realizar depósito

Retorne os seletores CSS de cada elemento.`;

    return await this.analyzeHTML(html, prompt);
  }

  async findGameAnalysis(html, gameName) {
    const prompt = `Encontre o elemento que leva ao jogo "${gameName}". 
Pode ser um link, botão, ou outro elemento clicável.
Retorne o seletor CSS do elemento.`;

    return await this.analyzeHTML(html, prompt);
  }

  async closePopupAnalysis(html) {
    const prompt = `Identifique todos os popups, modals, overlays ou notificações fecháveis na página.
Encontre os botões de fechar, ícones de X, ou outros elementos que fecham esses elementos.
Retorne os seletores CSS de todos os elementos de fechamento encontrados.`;

    return await this.analyzeHTML(html, prompt);
  }

  async close() {
    this.isConnected = false;
    this.client = null;
  }
}

module.exports = OpenCodeClient;
