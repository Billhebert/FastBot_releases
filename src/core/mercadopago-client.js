const axios = require('axios');

/**
 * Cliente para API Mercado Pago
 * Documentacao: https://www.mercadopago.com.br/developers/pt/docs
 */

class MercadoPagoClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.mercadopago.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Cria uma nova conta Mercado Pago
   * @param {Object} userData - Dados do usuario
   * @returns {Promise<{success: boolean, userId: string}>}
   */
  async createAccount(userData) {
    try {
      const { email, phone, cpf, firstName, lastName } = userData;

      console.log(`MercadoPago: Criando conta para ${email}...`);

      const response = await this.client.post('/v1/users', {
        email,
        site_id: 'MLB', // Brasil
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cpf
        },
        phone: {
          area_code: phone.substring(0, 2),
          number: phone.substring(2)
        }
      });

      if (response.data && response.data.id) {
        console.log(`MercadoPago: Conta criada! User ID: ${response.data.id}`);
        return {
          success: true,
          userId: response.data.id,
          email: response.data.email
        };
      }

      throw new Error('Erro ao criar conta');

    } catch (error) {
      console.error(`MercadoPago: Erro ao criar conta: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria chave PIX aleatoria
   * @returns {Promise<{success: boolean, pixKey: string}>}
   */
  async createRandomPixKey() {
    try {
      console.log(`MercadoPago: Gerando chave PIX aleatoria...`);

      const response = await this.client.post('/v1/pix_keys', {
        type: 'EVP' // Chave aleatoria (Endereco Virtual de Pagamento)
      });

      if (response.data && response.data.key) {
        console.log(`MercadoPago: Chave PIX criada: ${response.data.key}`);
        return {
          success: true,
          pixKey: response.data.key,
          keyType: 'random',
          keyId: response.data.id,
          status: response.data.status
        };
      }

      throw new Error('Erro ao criar chave PIX');

    } catch (error) {
      console.error(`MercadoPago: Erro ao criar chave PIX: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria chave PIX com telefone
   * @param {string} phone - Numero de telefone
   * @returns {Promise<{success: boolean, pixKey: string}>}
   */
  async createPhonePixKey(phone) {
    try {
      console.log(`MercadoPago: Criando chave PIX com telefone ${phone}...`);

      const response = await this.client.post('/v1/pix_keys', {
        type: 'PHONE',
        key: phone.replace(/\D/g, '') // Remove caracteres nao numericos
      });

      if (response.data && response.data.key) {
        console.log(`MercadoPago: Chave PIX criada: ${response.data.key}`);
        return {
          success: true,
          pixKey: response.data.key,
          keyType: 'phone',
          keyId: response.data.id,
          status: response.data.status
        };
      }

      throw new Error('Erro ao criar chave PIX');

    } catch (error) {
      console.error(`MercadoPago: Erro ao criar chave PIX: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria chave PIX com email
   * @param {string} email - Endereco de email
   * @returns {Promise<{success: boolean, pixKey: string}>}
   */
  async createEmailPixKey(email) {
    try {
      console.log(`MercadoPago: Criando chave PIX com email ${email}...`);

      const response = await this.client.post('/v1/pix_keys', {
        type: 'EMAIL',
        key: email
      });

      if (response.data && response.data.key) {
        console.log(`MercadoPago: Chave PIX criada: ${response.data.key}`);
        return {
          success: true,
          pixKey: response.data.key,
          keyType: 'email',
          keyId: response.data.id,
          status: response.data.status
        };
      }

      throw new Error('Erro ao criar chave PIX');

    } catch (error) {
      console.error(`MercadoPago: Erro ao criar chave PIX: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria chave PIX com CPF
   * @param {string} cpf - Numero do CPF
   * @returns {Promise<{success: boolean, pixKey: string}>}
   */
  async createCpfPixKey(cpf) {
    try {
      console.log(`MercadoPago: Criando chave PIX com CPF ${cpf}...`);

      const response = await this.client.post('/v1/pix_keys', {
        type: 'CPF',
        key: cpf.replace(/\D/g, '') // Remove pontos e tracos
      });

      if (response.data && response.data.key) {
        console.log(`MercadoPago: Chave PIX criada: ${response.data.key}`);
        return {
          success: true,
          pixKey: response.data.key,
          keyType: 'cpf',
          keyId: response.data.id,
          status: response.data.status
        };
      }

      throw new Error('Erro ao criar chave PIX');

    } catch (error) {
      console.error(`MercadoPago: Erro ao criar chave PIX: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Confirma chave PIX com codigo recebido por SMS
   * @param {string} keyId - ID da chave PIX
   * @param {string} code - Codigo de verificacao
   * @returns {Promise<{success: boolean}>}
   */
  async confirmPixKey(keyId, code) {
    try {
      console.log(`MercadoPago: Confirmando chave PIX com codigo ${code}...`);

      const response = await this.client.post(`/v1/pix_keys/${keyId}/confirm`, {
        verification_code: code
      });

      if (response.data && response.data.status === 'CONFIRMED') {
        console.log(`MercadoPago: Chave PIX confirmada com sucesso!`);
        return { success: true };
      }

      throw new Error('Erro ao confirmar chave PIX');

    } catch (error) {
      console.error(`MercadoPago: Erro ao confirmar chave PIX: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista chaves PIX da conta
   * @returns {Promise<{success: boolean, keys: Array}>}
   */
  async listPixKeys() {
    try {
      const response = await this.client.get('/v1/pix_keys');

      if (response.data && response.data.results) {
        console.log(`MercadoPago: ${response.data.results.length} chaves PIX encontradas`);
        return {
          success: true,
          keys: response.data.results
        };
      }

      throw new Error('Erro ao listar chaves PIX');

    } catch (error) {
      console.error(`MercadoPago: Erro ao listar chaves PIX: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtem informacoes da conta
   * @returns {Promise<{success: boolean, account: Object}>}
   */
  async getAccount() {
    try {
      const response = await this.client.get('/v1/users/me');

      if (response.data) {
        console.log(`MercadoPago: Conta: ${response.data.email}`);
        return {
          success: true,
          account: response.data
        };
      }

      throw new Error('Erro ao obter conta');

    } catch (error) {
      console.error(`MercadoPago: Erro ao obter conta: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MercadoPagoClient;
