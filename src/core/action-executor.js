const HTMLAnalyzer = require('./html-analyzer');

class ActionExecutor {
  constructor() {
    this.analyzer = new HTMLAnalyzer();
    this.results = {};
  }

  async init() {
    return await this.analyzer.init();
  }

  async executeOnAllBrowsers(browsers, action, params = {}) {
    this.results = {};
    const promises = browsers.map((browser, index) => 
      this.executeOnBrowser(browser, action, params, index)
    );
    
    await Promise.all(promises);
    return this.results;
  }

  async executeOnBrowser(browser, action, params, browserIndex) {
    const result = {
      browserIndex,
      action,
      status: 'pending',
      error: null,
      details: null
    };

    try {
      const page = await browser.pages()[0];
      
      switch (action) {
        case 'createAccount':
          await this.executeCreateAccount(page, params, result);
          break;
        case 'createDeposit':
          await this.executeCreateDeposit(page, params, result);
          break;
        case 'goToGame':
          await this.executeGoToGame(page, params, result);
          break;
        case 'closePopup':
          await this.executeClosePopup(page, result);
          break;
        default:
          throw new Error(`Ação desconhecida: ${action}`);
      }
      
      result.status = 'success';
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      console.error(`[ActionExecutor] Erro no navegador ${browserIndex}:`, error);
    }
    
    this.results[browserIndex] = result;
    return result;
  }

  async executeCreateAccount(page, params, result) {
    const { email, password, username, phone } = params;
    
    const analysis = await this.analyzer.analyzeForCreateAccount(page);
    
    if (!analysis || !analysis.selectors) {
      throw new Error('Não foi possível analisar o formulário de criação de conta');
    }
    
    const selectors = analysis.selectors;
    
    if (selectors.campo1 && email) {
      await page.waitForSelector(selectors.campo1, { timeout: 5000 });
      await page.click(selectors.campo1);
      await page.type(selectors.campo1, email, { delay: 50 });
    }
    
    if (selectors.campo2 && password) {
      await page.waitForSelector(selectors.campo2, { timeout: 5000 });
      await page.click(selectors.campo2);
      await page.type(selectors.campo2, password, { delay: 50 });
    }
    
    if (selectors.username && username) {
      await page.waitForSelector(selectors.username, { timeout: 5000 });
      await page.click(selectors.username);
      await page.type(selectors.username, username, { delay: 50 });
    }
    
    if (selectors.phone && phone) {
      await page.waitForSelector(selectors.phone, { timeout: 5000 });
      await page.click(selectors.phone);
      await page.type(selectors.phone, phone, { delay: 50 });
    }
    
    if (selectors.botao) {
      await page.waitForSelector(selectors.botao, { timeout: 5000 });
      await page.click(selectors.botao);
    }
    
    result.details = {
      selectors,
      fieldsFilled: Object.keys(selectors).length
    };
  }

  async executeCreateDeposit(page, params, result) {
    const { amount, paymentMethod } = params;
    
    const analysis = await this.analyzer.analyzeForCreateDeposit(page);
    
    if (!analysis || !analysis.selectors) {
      throw new Error('Não foi possível analisar o formulário de depósito');
    }
    
    const selectors = analysis.selectors;
    
    if (selectors.campo1 && amount) {
      await page.waitForSelector(selectors.campo1, { timeout: 5000 });
      await page.click(selectors.campo1);
      await page.type(selectors.campo1, amount.toString(), { delay: 50 });
    }
    
    if (selectors.paymentMethod && paymentMethod) {
      await page.waitForSelector(selectors.paymentMethod, { timeout: 5000 });
      await page.select(selectors.paymentMethod, paymentMethod);
    }
    
    if (selectors.botao) {
      await page.waitForSelector(selectors.botao, { timeout: 5000 });
      await page.click(selectors.botao);
    }
    
    result.details = {
      selectors,
      amount,
      paymentMethod
    };
  }

  async executeGoToGame(page, params, result) {
    const { gameName } = params;
    
    const analysis = await this.analyzer.analyzeForFindGame(page, gameName);
    
    if (!analysis || !analysis.selectors) {
      throw new Error(`Não foi possível encontrar o jogo "${gameName}"`);
    }
    
    const selector = Object.values(analysis.selectors)[0];
    
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector);
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    
    result.details = {
      selector,
      gameName
    };
  }

  async executeClosePopup(page, result) {
    const analysis = await this.analyzer.analyzeForClosePopup(page);
    
    if (!analysis || !analysis.selectors) {
      throw new Error('Não foi possível identificar popups');
    }
    
    const selectors = Object.values(analysis.selectors);
    let closedCount = 0;
    
    for (const selector of selectors) {
      try {
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.click();
            return true;
          }
          return false;
        }, selector);
        closedCount++;
      } catch (error) {
        console.warn(`[ActionExecutor] Falha ao fechar popup com seletor ${selector}:`, error.message);
      }
    }
    
    await page.waitForTimeout(500);
    
    result.details = {
      selectors,
      closedCount
    };
  }

  getResults() {
    return this.results;
  }

  getResult(browserIndex) {
    return this.results[browserIndex];
  }

  close() {
    this.analyzer.close();
  }
}

module.exports = ActionExecutor;
