const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { findChrome } = require('./chrome-finder.js');
const { getOrCreateProfile, getStealthArgs } = require('./stealth-config.js');
const { getAgentByInstance, getAgentFingerprintScript } = require('./agents.js');

puppeteer.use(StealthPlugin());

/**
 * 🔥 AQUECIMENTO DE PERFIL - 3 INTENSIDADES
 * VERSÃO ULTRA DEFENSIVA - NÃO PODE DAR ERRO
 */

const WARMUP_PROFILES = {
  light: {
    sites: [
      'https://www.google.com',
      'https://www.wikipedia.org',
      'https://www.youtube.com'
    ],
    minTimePerSite: 5000,
    maxTimePerSite: 8000,
    scrolls: 2,
    mouseMovements: 3
  },
  
  medium: {
    sites: [
      'https://www.google.com',
      'https://www.wikipedia.org',
      'https://www.youtube.com',
      'https://www.github.com',
      'https://www.reddit.com'
    ],
    minTimePerSite: 8000,
    maxTimePerSite: 12000,
    scrolls: 3,
    mouseMovements: 5
  },
  
  intense: {
    sites: [
      'https://www.google.com',
      'https://www.wikipedia.org',
      'https://www.youtube.com',
      'https://www.github.com',
      'https://www.reddit.com',
      'https://www.amazon.com',
      'https://www.twitter.com',
      'https://www.linkedin.com'
    ],
    minTimePerSite: 12000,
    maxTimePerSite: 18000,
    scrolls: 5,
    mouseMovements: 8
  }
};

// VERSÃO ULTRA DEFENSIVA - NÃO USA page.evaluate
async function simulateHumanMouse(page, movements = 5) {
  try {
    if (!page) {
      console.log('⚠️ Page inválida, pulando mouse');
      return;
    }
    
    // USAR DIMENSÕES FIXAS - NÃO DEPENDE DE page.evaluate
    const width = 1920;
    const height = 1080;
    
    for (let i = 0; i < movements; i++) {
      try {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        
        // Verificar se x e y são números válidos
        if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
          console.log('⚠️ Coordenadas inválidas, pulando');
          continue;
        }
        
        await page.mouse.move(x, y, { steps: 10 });
        await page.waitForTimeout(Math.random() * 500 + 200);
      } catch (err) {
        console.log('⚠️ Erro individual no movimento:', err.message);
        // Continuar com próximo movimento
      }
    }
  } catch (error) {
    console.log('⚠️ Erro geral ao mover mouse:', error.message);
    // Não é crítico - continuar
  }
}

async function simulateHumanScroll(page, scrollCount = 3) {
  try {
    if (!page) {
      console.log('⚠️ Page inválida, pulando scroll');
      return;
    }
    
    for (let i = 0; i < scrollCount; i++) {
      try {
        const scrollAmount = Math.floor(Math.random() * 400) + 200;
        
        await page.evaluate((amount) => {
          window.scrollBy({
            top: amount,
            behavior: 'smooth'
          });
        }, scrollAmount);
        
        await page.waitForTimeout(Math.random() * 1500 + 800);
      } catch (err) {
        console.log('⚠️ Erro individual no scroll:', err.message);
        // Continuar com próximo scroll
      }
    }
  } catch (error) {
    console.log('⚠️ Erro geral ao rolar:', error.message);
    // Não é crítico - continuar
  }
}

async function visitSiteIntense(page, url, config) {
  console.log(`   🌐 Visitando: ${url}`);
  
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Aguardar página carregar
    await page.waitForTimeout(2000);
    
    // Simular comportamento humano
    await simulateHumanMouse(page, config.mouseMovements);
    await simulateHumanScroll(page, config.scrolls);
    
    // Tempo no site
    const timeOnSite = Math.random() * 
      (config.maxTimePerSite - config.minTimePerSite) + 
      config.minTimePerSite;
    
    await page.waitForTimeout(timeOnSite);
    
    console.log(`   ✅ OK`);
    return true;
    
  } catch (error) {
    console.log(`   ⚠️ Erro: ${error.message}`);
    return false;
  }
}

async function warmUpProfile(instanceIndex = 0, device = 'desktop', intensity = 'medium') {
  console.log('========================================');
  console.log('🔥 AQUECIMENTO DE PERFIL [VERSÃO DEFENSIVA]');
  console.log(`📱 Dispositivo: ${device}`);
  console.log(`🎯 Intensidade: ${intensity}`);
  console.log(`👤 Perfil: ${instanceIndex}`);
  console.log('========================================\n');
  
  const config = WARMUP_PROFILES[intensity] || WARMUP_PROFILES.medium;
  console.log(`🌐 Sites: ${config.sites.length}\n`);
  
  let browser = null;
  let sitesVisited = 0;
  const startTime = Date.now();
  
  try {
    const chromePath = findChrome();
    
    // VERIFICAÇÃO DEFENSIVA do agent
    let currentAgent;
    try {
      currentAgent = getAgentByInstance(instanceIndex, device);
    } catch (err) {
      console.log('⚠️ Erro ao buscar agent, usando padrão');
      currentAgent = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        screenResolution: { width: 1920, height: 1080 },
        languages: ['pt-BR', 'pt', 'en-US', 'en']
      };
    }
    
    // GARANTIR que screenResolution existe
    if (!currentAgent.screenResolution || typeof currentAgent.screenResolution !== 'object') {
      console.log('⚠️ screenResolution inválido, usando padrão');
      currentAgent.screenResolution = { width: 1920, height: 1080 };
    }
    
    // GARANTIR que width e height existem
    if (!currentAgent.screenResolution.width || !currentAgent.screenResolution.height) {
      console.log('⚠️ width/height inválidos, usando padrão');
      currentAgent.screenResolution.width = 1920;
      currentAgent.screenResolution.height = 1080;
    }
    
    // GARANTIR que languages existe
    if (!currentAgent.languages || !Array.isArray(currentAgent.languages)) {
      console.log('⚠️ languages inválido, usando padrão');
      currentAgent.languages = ['pt-BR', 'pt'];
    }
    
    const profilePath = getOrCreateProfile(instanceIndex + 1);
    
    const launchOptions = {
      headless: false,
      executablePath: chromePath,
      userDataDir: profilePath,
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: {
        width: currentAgent.screenResolution.width,
        height: currentAgent.screenResolution.height
      },
      args: [
        ...getStealthArgs(device, null),
        `--user-agent=${currentAgent.userAgent}`,
        '--disable-blink-features=AutomationControlled'
      ]
    };
    
    console.log('🚀 Abrindo navegador...\n');
    browser = await puppeteer.launch(launchOptions);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    // Aplicar fingerprint apenas se a função existir
    try {
      if (typeof getAgentFingerprintScript === 'function') {
        await page.evaluateOnNewDocument(getAgentFingerprintScript(currentAgent));
      }
    } catch (err) {
      console.log('⚠️ Erro ao aplicar fingerprint:', err.message);
    }
    
    // Aplicar headers
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': currentAgent.languages.join(','),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      });
    } catch (err) {
      console.log('⚠️ Erro ao definir headers:', err.message);
    }
    
    // Visitar sites
    for (let i = 0; i < config.sites.length; i++) {
      const site = config.sites[i];
      console.log(`📍 Site ${i + 1}/${config.sites.length}`);
      
      const visited = await visitSiteIntense(page, site, config);
      if (visited) sitesVisited++;
      
      if (i < config.sites.length - 1) {
        await page.waitForTimeout(Math.random() * 2000 + 1000);
      }
    }
    
    const totalTime = Math.ceil((Date.now() - startTime) / 1000);
    
    console.log('\n✅ PERFIL AQUECIDO!');
    console.log(`📊 Sites: ${sitesVisited}/${config.sites.length}`);
    console.log(`⏱️  Tempo: ${totalTime}s\n`);
    
    await browser.close();
    
    return {
      success: true,
      sitesVisited,
      totalTime,
      intensity
    };
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    
    return {
      success: false,
      error: error.message,
      sitesVisited
    };
  }
}

module.exports = { warmUpProfile, WARMUP_PROFILES };