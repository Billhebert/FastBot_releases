const SMS24hClient = require('./sms24h-client');
const MercadoPagoClient = require('./mercadopago-client');

/**
 * Gerador automatico de chaves PIX usando SMS24h + Mercado Pago
 */

class PixGenerator {
  constructor(sms24hApiKey, mercadoPagoAccessToken) {
    this.smsClient = new SMS24hClient(sms24hApiKey);
    this.mpClient = new MercadoPagoClient(mercadoPagoAccessToken);
  }

  /**
   * Gera uma chave PIX aleatoria completa (com numero temporario)
   * @param {Object} userData - Dados do usuario (email, cpf, firstName, lastName)
   * @param {string} keyType - Tipo de chave PIX ('random', 'phone', 'email', 'cpf')
   * @returns {Promise<{success: boolean, pixKey: string, phone: string}>}
   */
  async generatePixKey(userData = {}, keyType = 'random') {
    console.log('\n========================================');
    console.log('>>> GERADOR AUTOMATICO DE PIX');
    console.log(`>>> Tipo de chave: ${keyType}`);
    console.log('========================================\n');

    try {
      // 1. Solicitar numero temporario SMS24h
      console.log('PASSO 1/6: Solicitando numero temporario...');
      const numberRequest = await this.smsClient.requestNumber('mercadopago', 'BR');

      if (!numberRequest.success) {
        throw new Error(`Falha ao solicitar numero: ${numberRequest.error}`);
      }

      const { number: tempPhone, id: numberId } = numberRequest;
      console.log(`✓ Numero temporario: ${tempPhone}`);
      console.log(`✓ ID do numero: ${numberId}\n`);

      // 2. Criar conta Mercado Pago com numero temporario
      console.log('PASSO 2/6: Criando conta Mercado Pago...');

      const accountData = {
        email: userData.email || `user${Date.now()}@temp.com`,
        phone: tempPhone.replace(/\D/g, ''), // Remove formatacao
        cpf: userData.cpf || this.generateRandomCPF(),
        firstName: userData.firstName || 'Usuario',
        lastName: userData.lastName || 'Fastbot'
      };

      console.log(`Email: ${accountData.email}`);
      console.log(`CPF: ${accountData.cpf}`);
      console.log(`Nome: ${accountData.firstName} ${accountData.lastName}`);

      const accountResult = await this.mpClient.createAccount(accountData);

      if (!accountResult.success) {
        console.warn(`⚠ Falha ao criar conta MP: ${accountResult.error}`);
        console.log('Continuando com conta existente...\n');
      } else {
        console.log(`✓ Conta criada! User ID: ${accountResult.userId}\n`);
      }

      // 3. Criar chave PIX conforme tipo solicitado
      console.log(`PASSO 3/6: Criando chave PIX (${keyType})...`);

      let pixResult;

      switch (keyType.toLowerCase()) {
        case 'random':
          pixResult = await this.mpClient.createRandomPixKey();
          break;

        case 'phone':
          pixResult = await this.mpClient.createPhonePixKey(tempPhone);
          break;

        case 'email':
          pixResult = await this.mpClient.createEmailPixKey(accountData.email);
          break;

        case 'cpf':
          pixResult = await this.mpClient.createCpfPixKey(accountData.cpf);
          break;

        default:
          throw new Error(`Tipo de chave invalido: ${keyType}`);
      }

      if (!pixResult.success) {
        throw new Error(`Falha ao criar chave PIX: ${pixResult.error}`);
      }

      console.log(`✓ Chave PIX criada: ${pixResult.pixKey}`);
      console.log(`✓ Status: ${pixResult.status}\n`);

      // 4. Se a chave requer confirmacao por SMS (telefone)
      if (keyType === 'phone' && pixResult.status !== 'CONFIRMED') {
        console.log('PASSO 4/6: Aguardando codigo de confirmacao por SMS...');

        const smsResult = await this.smsClient.waitForCode(numberId, 300000, 5000);

        if (!smsResult.success) {
          console.warn(`⚠ Nao foi possivel receber codigo: ${smsResult.error}`);
          console.log('Chave PIX criada mas nao confirmada\n');
        } else {
          console.log(`✓ Codigo recebido: ${smsResult.code}\n`);

          // 5. Confirmar chave PIX com codigo
          console.log('PASSO 5/6: Confirmando chave PIX...');

          const confirmResult = await this.mpClient.confirmPixKey(pixResult.keyId, smsResult.code);

          if (confirmResult.success) {
            console.log(`✓ Chave PIX confirmada com sucesso!\n`);
          } else {
            console.warn(`⚠ Falha ao confirmar chave: ${confirmResult.error}\n`);
          }
        }
      } else {
        console.log('PASSO 4/6: Confirmacao nao necessaria (pulado)');
        console.log('PASSO 5/6: Confirmacao nao necessaria (pulado)\n');
      }

      // 6. Cancelar numero temporario (economizar creditos)
      console.log('PASSO 6/6: Cancelando numero temporario...');
      await this.smsClient.cancelNumber(numberId);
      console.log(`✓ Numero cancelado\n`);

      // Resultado final
      console.log('========================================');
      console.log('>>> CHAVE PIX GERADA COM SUCESSO!');
      console.log(`>>> Chave: ${pixResult.pixKey}`);
      console.log(`>>> Tipo: ${pixResult.keyType}`);
      console.log(`>>> Telefone usado: ${tempPhone}`);
      console.log('========================================\n');

      return {
        success: true,
        pixKey: pixResult.pixKey,
        keyType: pixResult.keyType,
        phone: tempPhone,
        email: accountData.email,
        cpf: accountData.cpf,
        userId: accountResult.userId || null
      };

    } catch (error) {
      console.error('\n========================================');
      console.error('>>> ERRO AO GERAR CHAVE PIX');
      console.error(`>>> ${error.message}`);
      console.error('========================================\n');

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gera CPF aleatorio valido
   * @returns {string} CPF formatado
   */
  generateRandomCPF() {
    const randomDigits = () => Math.floor(Math.random() * 10);

    let cpf = Array.from({ length: 9 }, randomDigits);

    // Calcular primeiro digito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += cpf[i] * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 >= 10) digit1 = 0;
    cpf.push(digit1);

    // Calcular segundo digito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += cpf[i] * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 >= 10) digit2 = 0;
    cpf.push(digit2);

    // Formatar CPF: 123.456.789-01
    return `${cpf.slice(0, 3).join('')}.${cpf.slice(3, 6).join('')}.${cpf.slice(6, 9).join('')}-${cpf.slice(9, 11).join('')}`;
  }

  /**
   * Gera multiplas chaves PIX em lote
   * @param {number} quantity - Quantidade de chaves a gerar
   * @param {string} keyType - Tipo de chave
   * @returns {Promise<Array>}
   */
  async generateBulkPixKeys(quantity = 1, keyType = 'random') {
    console.log(`\n>>> Gerando ${quantity} chaves PIX em lote...\n`);

    const results = [];

    for (let i = 1; i <= quantity; i++) {
      console.log(`\n========== CHAVE ${i}/${quantity} ==========\n`);

      const result = await this.generatePixKey({}, keyType);
      results.push(result);

      if (result.success) {
        console.log(`✓ Chave ${i}/${quantity} gerada com sucesso!`);
      } else {
        console.error(`✗ Falha ao gerar chave ${i}/${quantity}: ${result.error}`);
      }

      // Aguardar 2s entre cada geracao
      if (i < quantity) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n========================================`);
    console.log(`>>> LOTE CONCLUIDO: ${successCount}/${quantity} chaves geradas`);
    console.log(`========================================\n`);

    return results;
  }

  /**
   * Verifica saldo disponivel no SMS24h
   * @returns {Promise<{success: boolean, balance: number}>}
   */
  async checkSmsBalance() {
    return await this.smsClient.getBalance();
  }

  /**
   * Lista servicos disponiveis no SMS24h
   * @returns {Promise<{success: boolean, services: Array}>}
   */
  async listSmsServices() {
    return await this.smsClient.listServices('BR');
  }
}

module.exports = PixGenerator;
