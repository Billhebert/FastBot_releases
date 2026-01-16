const axios = require('axios');
const puppeteer = require('puppeteer-core');

/**
 * Cliente para Dolphin Anty API Local
 * Documentacao: https://dolphin-anty-api.com
 */

class DolphinClient {
  constructor(apiPort = 3001, apiHost = 'localhost') {
    this.baseURL = `http://${apiHost}:${apiPort}`;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
    });
  }

  /**
   * Verifica se Dolphin Anty esta rodando
   * @returns {Promise<{success: boolean, running: boolean}>}
   */
  async checkStatus() {
    try {
      const response = await this.client.get('/v1.0/browser_profiles');

      if (response.status === 200) {
        console.log('Dolphin Anty: ✓ Rodando');
        return { success: true, running: true };
      }

      return { success: false, running: false };

    } catch (error) {
      console.error(`Dolphin Anty: ✗ Nao detectado (${error.message})`);
      return { success: false, running: false, error: error.message };
    }
  }

  /**
   * Lista todos os perfis disponiveis
   * @param {number} page - Pagina (paginacao)
   * @param {number} limit - Limite por pagina
   * @returns {Promise<{success: boolean, profiles: Array}>}
   */
  async listProfiles(page = 1, limit = 50) {
    try {
      console.log(`Dolphin Anty: Listando perfis (pagina ${page})...`);

      const response = await this.client.get('/v1.0/browser_profiles', {
        params: { page, limit }
      });

      if (response.data && response.data.data) {
        const profiles = response.data.data;
        console.log(`Dolphin Anty: ${profiles.length} perfis encontrados`);

        return {
          success: true,
          profiles,
          total: response.data.total || profiles.length,
          page: response.data.page || page
        };
      }

      throw new Error('Erro ao listar perfis');

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao listar perfis: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtem detalhes de um perfil especifico
   * @param {string} profileId - ID do perfil
   * @returns {Promise<{success: boolean, profile: Object}>}
   */
  async getProfile(profileId) {
    try {
      console.log(`Dolphin Anty: Obtendo perfil ${profileId}...`);

      const response = await this.client.get(`/v1.0/browser_profiles/${profileId}`);

      if (response.data) {
        console.log(`Dolphin Anty: Perfil "${response.data.name}" carregado`);
        return {
          success: true,
          profile: response.data
        };
      }

      throw new Error('Erro ao obter perfil');

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao obter perfil: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Inicia um perfil e retorna porta CDP para Puppeteer
   * @param {string} profileId - ID do perfil
   * @param {Object} options - Opcoes de inicializacao
   * @returns {Promise<{success: boolean, port: number, wsEndpoint: string}>}
   */
  async startProfile(profileId, options = {}) {
    try {
      console.log(`Dolphin Anty: Iniciando perfil ${profileId}...`);

      const response = await this.client.get(`/v1.0/browser_profiles/${profileId}/start`, {
        params: {
          automation: 1, // Ativar modo automacao
          ...options
        }
      });

      if (response.data && response.data.automation) {
        const port = response.data.automation.port;
        const wsEndpoint = response.data.automation.wsEndpoint;

        console.log(`Dolphin Anty: ✓ Perfil iniciado!`);
        console.log(`  CDP Port: ${port}`);
        console.log(`  WS Endpoint: ${wsEndpoint}`);

        return {
          success: true,
          port,
          wsEndpoint,
          pid: response.data.pid
        };
      }

      throw new Error('Erro ao iniciar perfil');

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao iniciar perfil: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Para um perfil em execucao
   * @param {string} profileId - ID do perfil
   * @returns {Promise<{success: boolean}>}
   */
  async stopProfile(profileId) {
    try {
      console.log(`Dolphin Anty: Parando perfil ${profileId}...`);

      await this.client.get(`/v1.0/browser_profiles/${profileId}/stop`);

      console.log(`Dolphin Anty: ✓ Perfil parado`);
      return { success: true };

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao parar perfil: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Conecta Puppeteer a um perfil Dolphin em execucao
   * @param {string} profileId - ID do perfil
   * @returns {Promise<{success: boolean, browser: Object, page: Object}>}
   */
  async connectPuppeteer(profileId) {
    try {
      console.log(`Dolphin Anty: Conectando Puppeteer ao perfil ${profileId}...`);

      // 1. Iniciar perfil
      const startResult = await this.startProfile(profileId);

      if (!startResult.success) {
        throw new Error(startResult.error);
      }

      // 2. Conectar Puppeteer via CDP
      const browser = await puppeteer.connect({
        browserWSEndpoint: startResult.wsEndpoint,
        defaultViewport: null
      });

      console.log(`Dolphin Anty: ✓ Puppeteer conectado`);

      // 3. Obter pagina ativa
      const pages = await browser.pages();
      const page = pages[0] || await browser.newPage();

      return {
        success: true,
        browser,
        page,
        profileId,
        wsEndpoint: startResult.wsEndpoint,
        port: startResult.port
      };

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao conectar Puppeteer: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria um novo perfil
   * @param {Object} profileData - Dados do perfil
   * @returns {Promise<{success: boolean, profileId: string}>}
   */
  async createProfile(profileData) {
    try {
      const { name, tags = [], notes = '', proxy = null } = profileData;

      console.log(`Dolphin Anty: Criando perfil "${name}"...`);

      const data = {
        name,
        tags,
        notes
      };

      // Adicionar proxy se fornecido
      if (proxy) {
        data.proxy = {
          type: proxy.type || 'http',
          host: proxy.host,
          port: proxy.port,
          login: proxy.username || '',
          password: proxy.password || ''
        };
      }

      const response = await this.client.post('/v1.0/browser_profiles', data);

      if (response.data && response.data.id) {
        console.log(`Dolphin Anty: ✓ Perfil criado! ID: ${response.data.id}`);
        return {
          success: true,
          profileId: response.data.id,
          profile: response.data
        };
      }

      throw new Error('Erro ao criar perfil');

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao criar perfil: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza um perfil existente
   * @param {string} profileId - ID do perfil
   * @param {Object} updates - Dados a atualizar
   * @returns {Promise<{success: boolean}>}
   */
  async updateProfile(profileId, updates) {
    try {
      console.log(`Dolphin Anty: Atualizando perfil ${profileId}...`);

      await this.client.patch(`/v1.0/browser_profiles/${profileId}`, updates);

      console.log(`Dolphin Anty: ✓ Perfil atualizado`);
      return { success: true };

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao atualizar perfil: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deleta um perfil
   * @param {string} profileId - ID do perfil
   * @returns {Promise<{success: boolean}>}
   */
  async deleteProfile(profileId) {
    try {
      console.log(`Dolphin Anty: Deletando perfil ${profileId}...`);

      await this.client.delete(`/v1.0/browser_profiles/${profileId}`);

      console.log(`Dolphin Anty: ✓ Perfil deletado`);
      return { success: true };

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao deletar perfil: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtem perfis disponiveis para execucao paralela
   * @param {number} count - Quantidade de perfis necessarios
   * @returns {Promise<{success: boolean, profiles: Array}>}
   */
  async getAvailableProfiles(count = 1) {
    try {
      console.log(`Dolphin Anty: Buscando ${count} perfis disponiveis...`);

      const result = await this.listProfiles(1, 100);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.profiles.length < count) {
        console.warn(`Dolphin Anty: ⚠ Apenas ${result.profiles.length} perfis disponiveis (${count} solicitados)`);
      }

      const availableProfiles = result.profiles.slice(0, count);

      console.log(`Dolphin Anty: ✓ ${availableProfiles.length} perfis selecionados`);

      return {
        success: true,
        profiles: availableProfiles
      };

    } catch (error) {
      console.error(`Dolphin Anty: Erro ao obter perfis disponiveis: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DolphinClient;
