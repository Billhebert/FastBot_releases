const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const ActionExecutor = require('./action-executor');

puppeteer.use(StealthPlugin());

class BrowserGridManager {
  constructor() {
    this.browsers = [];
    this.browserInstances = [];
    this.extensionPath = 'C:\\Users\\Bill\\Downloads\\Cash_Hunters_4.4.5\\Mercado_Pago\\Extensoes\\Buster-Captcha';
    this.actionExecutor = null;
  }

  async init() {
    this.actionExecutor = new ActionExecutor();
    await this.actionExecutor.init();
  }

  calculateGridPositions(count) {
    const screenWidth = 1920;
    const screenHeight = 1080;
    const windowWidth = Math.floor(screenWidth / 5);
    const windowHeight = Math.floor(screenHeight / 2);

    const positions = [];
    for (let i = 0; i < count; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      positions.push({
        x: col * windowWidth,
        y: row * windowHeight,
        width: windowWidth,
        height: windowHeight
      });
    }
    return positions;
  }

  async openBrowserGrid(config) {
    const { links } = config;
    
    const allUrls = [];
    for (const link of links) {
      for (let i = 0; i < link.count; i++) {
        allUrls.push(link.url);
      }
    }

    const totalBrowsers = Math.min(allUrls.length, 10);
    const positions = this.calculateGridPositions(totalBrowsers);

    const browserConfigs = allUrls.slice(0, totalBrowsers).map((url, index) => ({
      url,
      position: positions[index]
    }));

    const browsers = [];
    
    try {
      for (let i = 0; i < browserConfigs.length; i++) {
        const { url, position } = browserConfigs[i];
        
        const browser = await puppeteer.launch({
          headless: false,
          args: [
            `--load-extension=${this.extensionPath}`,
            `--window-position=${position.x},${position.y}`,
            `--window-size=${position.width},${position.height}`,
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
          defaultViewport: {
            width: position.width,
            height: position.height
          }
        });

        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        if (url && url.startsWith('http')) {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        }

        this.browserInstances.push({
          id: i,
          browser,
          page,
          url,
          position
        });

        browsers.push({
          id: i,
          url,
          position
        });
      }

      this.browsers = browsers;
      
      return {
        success: true,
        browsers,
        count: browsers.length
      };
    } catch (error) {
      console.error('[BrowserGridManager] Erro ao abrir navegadores:', error);
      await this.closeAllBrowsers();
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBrowserHTML(browserId) {
    const instance = this.browserInstances.find(b => b.id === browserId);
    if (!instance) {
      throw new Error(`Browser ID ${browserId} não encontrado`);
    }

    try {
      const html = await instance.page.evaluate(() => {
        return document.documentElement.outerHTML;
      });
      return html;
    } catch (error) {
      console.error(`[BrowserGridManager] Erro ao capturar HTML do browser ${browserId}:`, error);
      throw error;
    }
  }

  async executeLLMAction(config) {
    const { action, params, browsers } = config;
    
    if (!this.actionExecutor) {
      throw new Error('ActionExecutor não inicializado');
    }

    const instances = browsers.map(bId => {
      const instance = this.browserInstances.find(b => b.id === bId);
      if (!instance) {
        console.warn(`[BrowserGridManager] Browser ${bId} não encontrado`);
        return null;
      }
      return instance.browser;
    }).filter(b => b !== null);

    if (instances.length === 0) {
      throw new Error('Nenhum navegador disponível');
    }

    try {
      const results = await this.actionExecutor.executeOnAllBrowsers(instances, action, params);
      
      return {
        success: true,
        results,
        count: instances.length
      };
    } catch (error) {
      console.error('[BrowserGridManager] Erro ao executar ação:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async closeBrowser(browserId) {
    const index = this.browserInstances.findIndex(b => b.id === browserId);
    if (index === -1) {
      throw new Error(`Browser ID ${browserId} não encontrado`);
    }

    try {
      const instance = this.browserInstances[index];
      await instance.browser.close();
      this.browserInstances.splice(index, 1);
      this.browsers = this.browsers.filter(b => b.id !== browserId);
      
      return { success: true };
    } catch (error) {
      console.error(`[BrowserGridManager] Erro ao fechar browser ${browserId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async closeAllBrowsers() {
    const promises = this.browserInstances.map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        console.error(`[BrowserGridManager] Erro ao fechar browser ${instance.id}:`, error);
      }
    });

    await Promise.all(promises);
    
    this.browserInstances = [];
    this.browsers = [];
    
    return { success: true };
  }

  async getGridStatus() {
    return {
      success: true,
      browsers: this.browsers,
      count: this.browsers.length,
      isOpen: this.browserInstances.length > 0
    };
  }

  async close() {
    if (this.actionExecutor) {
      this.actionExecutor.close();
    }
    await this.closeAllBrowsers();
  }
}

module.exports = BrowserGridManager;
