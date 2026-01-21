const OpenCodeClient = require('./opencode-client');

class HTMLAnalyzer {
  constructor() {
    this.openCode = new OpenCodeClient();
    this.isConnected = false;
  }

  async init() {
    this.isConnected = await this.openCode.connect();
    return this.isConnected;
  }

  async captureHTML(page) {
    try {
      const html = await page.evaluate(() => {
        return document.documentElement.outerHTML;
      });
      return html;
    } catch (error) {
      console.error('[HTMLAnalyzer] Erro ao capturar HTML:', error);
      throw error;
    }
  }

  async analyzeForCreateAccount(page) {
    const html = await this.captureHTML(page);
    return await this.openCode.createAccountAnalysis(html);
  }

  async analyzeForCreateDeposit(page) {
    const html = await this.captureHTML(page);
    return await this.openCode.createDepositAnalysis(html);
  }

  async analyzeForFindGame(page, gameName) {
    const html = await this.captureHTML(page);
    return await this.openCode.findGameAnalysis(html, gameName);
  }

  async analyzeForClosePopup(page) {
    const html = await this.captureHTML(page);
    return await this.openCode.closePopupAnalysis(html);
  }

  async validateSelectors(page, selectors) {
    const results = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const exists = await page.evaluate((sel) => {
          return document.querySelector(sel) !== null;
        }, selector);
        results[key] = { valid: exists, selector };
      } catch (error) {
        results[key] = { valid: false, selector, error: error.message };
      }
    }
    
    return results;
  }

  async findAlternativeSelectors(page, elementDescription) {
    const html = await this.captureHTML(page);
    
    const prompt = `Encontre elementos que correspondam a: "${elementDescription}"
Retorne uma lista de até 5 seletores CSS alternativos que podem selecionar este elemento.`;
    
    return await this.openCode.analyzeHTML(html, prompt);
  }

  close() {
    this.openCode.close();
  }
}

module.exports = HTMLAnalyzer;
