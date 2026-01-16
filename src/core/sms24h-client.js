const axios = require('axios');

/**
 * Cliente para API SMS24h
 * Documentacao: https://sms24h.com/api
 */

class SMS24hClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.sms24h.com/v2';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Solicita um numero temporario
   * @param {string} service - Servico (ex: 'mercadopago', 'whatsapp', 'telegram')
   * @param {string} country - Codigo do pais (ex: 'BR', 'US')
   * @returns {Promise<{success: boolean, number: string, id: string}>}
   */
  async requestNumber(service = 'mercadopago', country = 'BR') {
    try {
      console.log(`SMS24h: Solicitando numero para ${service} (${country})...`);

      const response = await this.client.post('/number/request', {
        service,
        country
      });

      if (response.data && response.data.success) {
        console.log(`SMS24h: Numero recebido: ${response.data.number}`);
        return {
          success: true,
          number: response.data.number,
          id: response.data.id,
          expiresAt: response.data.expires_at
        };
      }

      throw new Error(response.data?.message || 'Erro ao solicitar numero');

    } catch (error) {
      console.error(`SMS24h: Erro ao solicitar numero: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Aguarda receber codigo SMS
   * @param {string} numberId - ID do numero solicitado
   * @param {number} maxWaitTime - Tempo maximo de espera em ms (padrao: 5 min)
   * @param {number} pollInterval - Intervalo entre verificacoes em ms (padrao: 5s)
   * @returns {Promise<{success: boolean, code: string}>}
   */
  async waitForCode(numberId, maxWaitTime = 300000, pollInterval = 5000) {
    console.log(`SMS24h: Aguardando codigo para numero ID: ${numberId}`);

    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < maxWaitTime) {
      attempts++;

      try {
        const response = await this.client.get(`/number/${numberId}/messages`);

        if (response.data && response.data.messages && response.data.messages.length > 0) {
          const latestMessage = response.data.messages[0];
          const code = this.extractCode(latestMessage.text);

          if (code) {
            console.log(`SMS24h: Codigo recebido: ${code}`);
            return {
              success: true,
              code,
              message: latestMessage.text
            };
          }
        }

        console.log(`SMS24h: Tentativa ${attempts} - Nenhum codigo ainda (aguardando ${pollInterval}ms)...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.warn(`SMS24h: Erro ao verificar mensagens: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    console.error(`SMS24h: Timeout ao aguardar codigo (${maxWaitTime}ms)`);
    return {
      success: false,
      error: 'Timeout waiting for SMS code'
    };
  }

  /**
   * Extrai codigo numerico de uma mensagem SMS
   * @param {string} text - Texto da mensagem
   * @returns {string|null} - Codigo extraido ou null
   */
  extractCode(text) {
    // Tentar extrair codigo numerico de 4-6 digitos
    const patterns = [
      /\b(\d{6})\b/,  // 6 digitos
      /\b(\d{5})\b/,  // 5 digitos
      /\b(\d{4})\b/,  // 4 digitos
      /codigo[:\s]+(\d+)/i,  // "codigo: 123456"
      /verification code[:\s]+(\d+)/i,  // "verification code: 123456"
      /seu codigo[:\s]+(\d+)/i  // "seu codigo: 123456"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Cancela um numero temporario
   * @param {string} numberId - ID do numero
   * @returns {Promise<{success: boolean}>}
   */
  async cancelNumber(numberId) {
    try {
      console.log(`SMS24h: Cancelando numero ID: ${numberId}`);

      await this.client.delete(`/number/${numberId}`);

      console.log(`SMS24h: Numero cancelado com sucesso`);
      return { success: true };

    } catch (error) {
      console.error(`SMS24h: Erro ao cancelar numero: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtem saldo da conta
   * @returns {Promise<{success: boolean, balance: number}>}
   */
  async getBalance() {
    try {
      const response = await this.client.get('/account/balance');

      if (response.data && response.data.balance !== undefined) {
        console.log(`SMS24h: Saldo atual: R$ ${response.data.balance}`);
        return {
          success: true,
          balance: response.data.balance,
          currency: response.data.currency || 'BRL'
        };
      }

      throw new Error('Erro ao obter saldo');

    } catch (error) {
      console.error(`SMS24h: Erro ao obter saldo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista servicos disponiveis
   * @param {string} country - Codigo do pais (ex: 'BR')
   * @returns {Promise<{success: boolean, services: Array}>}
   */
  async listServices(country = 'BR') {
    try {
      const response = await this.client.get('/services', {
        params: { country }
      });

      if (response.data && response.data.services) {
        console.log(`SMS24h: ${response.data.services.length} servicos disponiveis`);
        return {
          success: true,
          services: response.data.services
        };
      }

      throw new Error('Erro ao listar servicos');

    } catch (error) {
      console.error(`SMS24h: Erro ao listar servicos: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SMS24hClient;
