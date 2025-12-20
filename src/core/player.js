const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { findChrome } = require('./chrome-finder.js');
const { getOrCreateProfile, getStealthArgs } = require('./stealth-config.js');
const { syncCookiesFromRecording, syncPartitionFromRecording, clearProfileData } = require('./cookie-sync.js');
const { getAgentByInstance, getAgentFingerprintScript } = require('./agents.js');
const { warmUpProfile } = require('./profile-warmer.js');
const { createShellSession, getMobilePartition, getPartitionPath } = require('./mobile-shell-session');

puppeteer.use(StealthPlugin());

const DEVICE_PROFILES = {
  desktop: {
    windowSize: '1400,900',
    userAgent: null,
    viewport: {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },
    headers: {}
  },
  mobile: {
    windowSize: '420,900',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    headers: {
      'Sec-CH-UA-Mobile': '?1',
      'Sec-CH-UA-Platform': '"iOS"'
    }
  }
};

const ENABLE_MOBILE_SHELL = false;

const AUTO_AD_GUARD = {
  selectors: [
    '[data-testid*=\"ad\"]',
    '[data-testid*=\"banner\"]',
    '[id*=\"ad\"]',
    '[class*=\"ad\"]',
    '[class*=\"ads\"]',
    '[class*=\"promo\"]',
    '.adsbygoogle',
    '.interstitial',
    '.popup',
    '.modal',
    '[role=\"dialog\"]',
    '[aria-label*=\"anuncio\"]',
    '[aria-label*=\"publicidade\"]',
    '#global-live-stream-poster',
    '[id*=\"global-live-stream\"]',
    '[class*=\"live-stream-poster\"]',
    '[class*=\"live-stream\"]',
    '[data-component*=\"ad\"]',
    '[class*=\"_close-btn\"]',
    'i[class*=\"close-btn\"]'
  ],
  keywords: [
    'anuncio',
    'anúncio',
    'publicidade',
    'ads',
    'advertisement',
    'sponsored',
    'sponsor',
    'oferta',
    'bonus',
    'promo',
    'voce ganhou',
    'recompensa',
    'mercado',
    'live stream',
    'global-live',
    'popup',
    'overlay'
  ],
  closeSelectors: [
    'button[aria-label*=\"fechar\"]',
    'button[aria-label*=\"close\"]',
    '[role=\"button\"][aria-label*=\"fechar\"]',
    '.close-button',
    '.close-btn',
    '[class*=\"close\"]',
    '.modal-close',
    '.dialog-close',
    'button.close',
    '[data-icon=\"close\"]',
    '[data-testid*=\"close\"]'
  ],
  directCloseSelectors: [
    '[class*=\"_close-btn\"]',
    '[class*=\"close-btn\"]',
    'i[class*=\"close\"]',
    'svg[class*=\"close\"]',
    '[data-close=\"true\"]'
  ],
  closeKeywords: [
    'fechar',
    'close',
    'pular',
    'skip',
    'sair',
    'x',
    'remover'
  ]
};

const FALLBACK_POPUP_SELECTORS = [
  '.modal',
  '.dialog',
  '.popup',
  '.overlay',
  '[class*="close"]',
  '[id*="close"]',
  '[data-testid*="close"]',
  '[aria-label*="fechar"]',
  '[aria-label*="close"]'
];

const sanitizeSelectorValue = (value) => {
  if (typeof value !== 'string') return '';
  let trimmed = value.trim();
  while (trimmed.length > 1 && (trimmed.startsWith('"') || trimmed.startsWith("'"))) {
    trimmed = trimmed.slice(1);
  }
  while (trimmed.length > 1 && (trimmed.endsWith('"') || trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
};

// ============================================
// CONFIGURAES ANTI-CAPTCHA
// ============================================

const CAPTCHA_CONFIG = {
  // Aquecer perfil antes de executar?
  warmUpBeforeExecution: false, // Mude para true para ativar
  
  // Usar CapSolver? (servio com trial grtis $5)
  // Cadastre em: https://www.capsolver.com/
  useCapSolver: false,
  capSolverApiKey: null, // Coloque sua API key aqui
  
  // Delays mais longos (parecer mais humano)
  humanDelays: true,
  delayMultiplier: 1.5, // 1.5x mais lento
  
  // Resolver CAPTCHA manualmente?
  manualCaptchaSolve: true, // Pausa e aguarda voc resolver
  manualTimeout: 300000 // 5 minutos para resolver manualmente
};

// ============================================
// DETECO DE CAPTCHA
// ============================================

async function detectCaptcha(page) {
  const url = page.url();
  
  // Google CAPTCHA
  if (url.includes('google.com/sorry') || url.includes('/recaptcha/')) {
    return { hasCaptcha: true, type: 'google', url };
  }
  
  // Verificar elementos
  const captchaElements = await page.evaluate(() => {
    const selectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="captcha"]',
      '#captcha-form',
      '.g-recaptcha',
      '.h-captcha'
    ];
    
    for (const selector of selectors) {
      if (document.querySelector(selector)) {
        return selector;
      }
    }
    
    return null;
  });
  
  if (captchaElements) {
    return { hasCaptcha: true, type: 'element', element: captchaElements };
  }
  
  return { hasCaptcha: false };
}

// ============================================
// RESOLVER CAPTCHA MANUALMENTE
// ============================================

async function waitForManualCaptchaSolve(page) {
  console.log('\n  CAPTCHA DETECTADO!');
  console.log(' Resolva o CAPTCHA na janela do Chrome');
  console.log(' Aguardando at 5 minutos...');
  console.log(' O sistema detecta automaticamente quando for resolvido');
  console.log('');
  const startTime = Date.now();
  const timeout = CAPTCHA_CONFIG.manualTimeout;
  let attempts = 0;
  
  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
    
    // Verificar se CAPTCHA sumiu
    const check = await detectCaptcha(page);
    
    if (!check.hasCaptcha) {
      console.log('');
      console.log(' CAPTCHA RESOLVIDO! Continuando...');
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    }
    
    // Mostrar progresso a cada 10 segundos
    if (attempts % 5 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((timeout - (Date.now() - startTime)) / 1000);
      console.log(` ${elapsed}s decorridos | ${remaining}s restantes...`);
    }
  }
  
  console.log('');
  console.log(' TIMEOUT: 5 minutos sem resolver');
  console.log('');
  
  return false;
}

// ============================================
// RESOLVER COM CAPSOLVER (OPCIONAL)
// ============================================

async function solveWithCapSolver(page) {
  if (!CAPTCHA_CONFIG.useCapSolver || !CAPTCHA_CONFIG.capSolverApiKey) {
    return false;
  }
  
  console.log('\n Tentando resolver com CapSolver...');
  
  try {
    const axios = require('axios');
    
    // Extrair sitekey
    const siteKey = await page.evaluate(() => {
      const element = document.querySelector('[data-sitekey]');
      return element ? element.getAttribute('data-sitekey') : null;
    });
    
    if (!siteKey) {
      console.log('  No foi possvel encontrar sitekey');
      return false;
    }
    
    const pageUrl = page.url();
    
    console.log(`   Site: ${pageUrl}`);
    console.log(`   SiteKey: ${siteKey}`);
    console.log('   Enviando para CapSolver...');
    
    // Criar tarefa
    const createTask = await axios.post('https://api.capsolver.com/createTask', {
      clientKey: CAPTCHA_CONFIG.capSolverApiKey,
      task: {
        type: 'ReCaptchaV2TaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey
      }
    });
    
    if (createTask.data.errorId !== 0) {
      console.log(` Erro: ${createTask.data.errorDescription}`);
      return false;
    }
    
    const taskId = createTask.data.taskId;
    console.log(`   Task ID: ${taskId}`);
    console.log('    Aguardando soluo (15-60s)...');
    
    // Aguardar soluo
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const getResult = await axios.post('https://api.capsolver.com/getTaskResult', {
        clientKey: CAPTCHA_CONFIG.capSolverApiKey,
        taskId: taskId
      });
      
      if (getResult.data.status === 'ready') {
        const token = getResult.data.solution.gRecaptchaResponse;
        
        console.log('    Token recebido!');
        
        // Injetar token
        await page.evaluate((token) => {
          const el = document.getElementById('g-recaptcha-response');
          if (el) el.innerHTML = token;
        }, token);
        
        console.log('    Token injetado!');
        console.log('');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
      
      if (getResult.data.status === 'failed') {
        console.log(`    Falhou: ${getResult.data.errorDescription}`);
        return false;
      }
      
      // Mostrar progresso
      if (attempts % 5 === 0) {
        process.stdout.write('.');
      }
    }
    
    console.log('\n    Timeout');
    return false;
    
  } catch (error) {
    console.log(`    Erro: ${error.message}`);
    return false;
  }
}

// ============================================
// EXECUTAR MACRO COM PROTEO ANTI-CAPTCHA
// ============================================


async function executeMacro(config = {}) {
  const {
    actions,
    device,
    position,
    proxy,
    password,
    pixKey,
    email,
    username,
    phoneNumber,
    link,
    instanceIndex,
    delayMin,
    delayMax,
    freshSession = false,
    options = {}
  } = config;
  const autoCloseAds = options.autoCloseAds !== false;

  console.log('\n========================================');
  console.log(`>> EXECUTANDO INSTANCIA ${instanceIndex + 1}`);
  console.log('========================================');
  console.log('>> Modo: ANTI-CAPTCHA HIBRIDO');
  console.log('>> Acoes:', actions.length);
  console.log('>> Device:', device);
  console.log('>> Sessao limpa:', freshSession);

  if (CAPTCHA_CONFIG.warmUpBeforeExecution) {
    console.log('>> Aquecimento: ATIVADO');
  }
  if (CAPTCHA_CONFIG.useCapSolver) {
    console.log('>> CapSolver: ATIVADO');
  }
  if (CAPTCHA_CONFIG.manualCaptchaSolve) {
    console.log('>> Resolucao manual: ATIVADA');
  }
  if (CAPTCHA_CONFIG.humanDelays) {
    console.log(`>> Delays: ${CAPTCHA_CONFIG.delayMultiplier}x mais humanos`);
  }

  const useEmbeddedShell = ENABLE_MOBILE_SHELL && device === 'mobile';

  let browser = null;
  let shellSession = null;
  let page = null;
  let currentAgent = null;

  try {
    if (CAPTCHA_CONFIG.warmUpBeforeExecution) {
      console.log('\n>> Aquecendo perfil antes da execucao...');
      await warmUpProfile(instanceIndex, device);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    currentAgent = getAgentByInstance(instanceIndex, device);
    const deviceProfile = DEVICE_PROFILES[device] || DEVICE_PROFILES.desktop;

    if (useEmbeddedShell) {
      const partition = getMobilePartition(instanceIndex + 1);
      const partitionPath = getPartitionPath(partition);

      if (freshSession) {
        clearProfileData(partitionPath);
      } else {
        syncPartitionFromRecording(partitionPath);
      }

      console.log('\n>> Abrindo shell mobile embutido...');
      shellSession = await createShellSession({
        device: 'mobile',
        initialUrl: 'about:blank',
        partition,
        proxy
      });
      browser = shellSession.browser;
      page = shellSession.page;
    } else {
      const chromePath = findChrome();
      const profilePath = getOrCreateProfile(instanceIndex + 1);

      if (freshSession) {
        clearProfileData(profilePath);
      } else {
        console.log('\n>> Sincronizando cookies...');
        syncCookiesFromRecording(instanceIndex + 1);
      }

      const launchOptions = {
        headless: false,
        executablePath: chromePath,
        userDataDir: profilePath,
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null,
        args: [
          ...getStealthArgs(device, position),
          `--user-agent=${deviceProfile.userAgent || currentAgent.userAgent}`,
          `--window-size=${deviceProfile.windowSize}`
        ]
      };

      if (device === 'mobile') {
        launchOptions.args.push('--app=data:text/html,<title>Fastbot</title>');
        launchOptions.args.push('--force-device-scale-factor=1');
        launchOptions.args.push('--hide-crash-restore-bubble');
        launchOptions.args.push('--disable-infobars');
        launchOptions.args.push('--bwsi');
      }

      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
        console.log('>> Proxy aplicado:', `${proxy.host}:${proxy.port}`);
      }

      console.log('\n>> Abrindo Chrome...');
      browser = await puppeteer.launch(launchOptions);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const pages = await browser.pages();
      page = pages[0] || await browser.newPage();
    }

    await page.evaluateOnNewDocument(getAgentFingerprintScript(currentAgent));
    if (autoCloseAds) {
      await enableAutoCloseAds(page);
    }

    if (proxy?.username) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password
      });
    }

    if (deviceProfile.userAgent) {
      await page.setUserAgent(deviceProfile.userAgent);
    }

    const viewport = device === 'mobile'
      ? deviceProfile.viewport
      : {
          width: currentAgent.screenResolution.width,
          height: currentAgent.screenResolution.height,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false
        };

    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      hasTouch: viewport.hasTouch,
      isMobile: viewport.isMobile
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': currentAgent.languages.join(','),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(deviceProfile.headers || {})
    });

    await page.evaluateOnNewDocument((vars) => {
      window.__macro_vars = vars;
    }, { password, pixKey, email, username, phoneNumber, link });

    console.log('\n========================================');
    console.log('>> INICIANDO EXECUCAO');
    console.log('========================================\n');

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`>> ACAO ${i + 1}/${actions.length}: ${action.type.toUpperCase()}`);

      try {
        await executeAction(page, action, currentAgent);
        console.log('>> OK');

        const captchaCheck = await detectCaptcha(page);
        if (captchaCheck.hasCaptcha) {
          console.log(`>> CAPTCHA detectado (${captchaCheck.type})`);
          let solved = false;

          if (CAPTCHA_CONFIG.useCapSolver) {
            solved = await solveWithCapSolver(page);
          }
          if (!solved && CAPTCHA_CONFIG.manualCaptchaSolve) {
            solved = await waitForManualCaptchaSolve(page);
          }
          if (!solved) {
            throw new Error('CAPTCHA nao resolvido');
          }
        }
      } catch (error) {
        console.error('>> ERRO na acao:', error.message);
      }

      if (i < actions.length - 1) {
        let min = delayMin || 500;
        let max = delayMax || 2000;

        if (CAPTCHA_CONFIG.humanDelays) {
          min = Math.floor(min * CAPTCHA_CONFIG.delayMultiplier);
          max = Math.floor(max * CAPTCHA_CONFIG.delayMultiplier);
        }

        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        console.log(`>> Delay de ${delay}ms\n`);
        await page.waitForTimeout(delay);
      }
    }

    console.log('\n========================================');
    console.log(`>> INSTANCIA ${instanceIndex + 1} CONCLUIDA`);
    console.log('========================================\n');

    await page.waitForTimeout(3000);
    if (shellSession) {
      await shellSession.dispose();
    } else if (browser) {
      await browser.close();
    }

    return { success: true };
  } catch (error) {
    console.error('\n>> ERRO CRITICO:', error.message);

    if (shellSession) {
      try {
        await shellSession.dispose();
      } catch (err) {
        // ignore cleanup errors
      }
    } else if (browser) {
      try {
        await browser.close();
      } catch (err) {
        // ignore cleanup errors
      }
    }

    return { success: false, error: error.message };
  }
}

// ... [Resto das funes executeAction, handleClick, etc - copiar do player-agents.js]

async function executeAction(page, action, agent) {
  switch (action.type) {
    case 'type':
      return await executeType(page, action);
    case 'click':
      return await handleClick(page, action);
    case 'input':
      return await handleInput(page, action);
    case 'navigate':
      return await handleNavigate(page, action, agent);
    case 'scroll':
      return await handleScroll(page, action);
    case 'keypress':
      return await handleKeypress(page, action);
    case 'select':
      return await handleSelect(page, action);
    case 'wait':
      return await handleWait(page, action);
    case 'loop':
      return await handleLoop(page, action, agent);
    case 'condition':
      return await handleCondition(page, action, agent);
    case 'close_popups':
      return await handleClosePopups(page, action);
    default:
      console.warn(`>> Tipo de acao desconhecido: ${action.type}`);
      return { success: false, error: `Tipo de acao desconhecido: ${action.type}` };
  }
}

// ============================================
// FUNCAO TYPE - Digitar sem seletor
// ============================================

async function executeType(page, action) {
  const { x, y, value, delay = 300, click = true, clear = true, typeSpeed = null } = action;
  
  console.log(`   TYPE: "${(value || '').substring(0, 30)}..." (click=${click}, clear=${clear})`);
  
  try {
    const macroVars = await getMacroVars(page);
    let processedValue = value || '';
    processedValue = processedValue.replace(/\{\{email\}\}/g, macroVars.email || '');
    processedValue = processedValue.replace(/\{\{password\}\}/g, macroVars.password || '');
    processedValue = processedValue.replace(/\{\{pix\}\}/g, macroVars.pixKey || '');
    processedValue = processedValue.replace(/\{\{username\}\}/g, macroVars.username || '');
    processedValue = processedValue.replace(/\{\{phone\}\}/g, macroVars.phoneNumber || '');
    processedValue = processedValue.replace(/\{\{link\}\}/g, macroVars.link || '');
    
    console.log(`   Variaveis disponiveis: {`);
    console.log(`     email: '${macroVars.email || ''}',`);
    console.log(`     username: '${macroVars.username || ''}',`);
    console.log(`     phone: '${macroVars.phoneNumber || ''}',`);
    console.log(`     password: '***',`);
    console.log(`     pixKey: '${(macroVars.pixKey || '').substring(0, 11)}...'`);
    console.log(`     link: '${macroVars.link || ''}'`);
    console.log(`   }`);
    
    // 1. CLICAR (se click=true)
    if (click) {
      await page.mouse.click(x, y);
      console.log(`   Clicou em (${x}, ${y})`);
      await page.waitForTimeout(delay);
    } else {
      console.log(`   Pulando clique - campo ja focado`);
    }
    
    // 2. LIMPAR CAMPO (se clear=true)
    if (clear) {
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      console.log(`   Campo limpo`);
    }
    
    // 3. DIGITAR
    for (const char of processedValue) {
      await page.keyboard.type(char);
      
      if (typeSpeed !== null) {
        await page.waitForTimeout(typeSpeed);
      } else {
        await page.waitForTimeout(50 + Math.random() * 100);
      }
    }
    
    console.log(`   Digitou ${processedValue.length} caracteres`);
    console.log(`   Variaveis substituidas no valor`);
    return { success: true };
    
  } catch (error) {
    console.error(`   ERRO ao executar TYPE: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function enableAutoCloseAds(page) {
  await page.evaluateOnNewDocument((guardConfig) => {
    if (window.__fastbotAutoAds) return;
    window.__fastbotAutoAds = true;

    const KEYWORDS = (guardConfig.keywords || []).map((word) =>
      (word || '').toLowerCase().trim()
    ).filter(Boolean);
    const CLOSE_TEXT = (guardConfig.closeKeywords || []).map((word) =>
      (word || '').toLowerCase().trim()
    ).filter(Boolean);
    const SELECTORS = (guardConfig.selectors || []).filter(Boolean);
    const CLOSE_SELECTORS = (guardConfig.closeSelectors || []).filter(Boolean);
    const DIRECT_SELECTORS = (guardConfig.directCloseSelectors || []).filter(Boolean);
    const SELECTOR_QUERY = SELECTORS.length ? SELECTORS.join(',') : null;
    const DIRECT_QUERY = DIRECT_SELECTORS.length ? DIRECT_SELECTORS.join(',') : null;

    const processed = new WeakSet();
    const log = (...args) => {
      try {
        console.debug('[Fastbot][Ads]', ...args);
      } catch (err) {
        // ignore logging issues
      }
    };

    const normalize = (value) => (value || '').toLowerCase();

    const hasKeyword = (text) => {
      if (!text) return false;
      const norm = normalize(text);
      return KEYWORDS.some((word) => norm.includes(word));
    };

    const looksLikeAd = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.dataset?.fastbotAds === 'ok') return false;
      const attrBundle = [
        element.id,
        element.className,
        element.getAttribute('aria-label') || '',
        element.getAttribute('role') || '',
        element.getAttribute('data-testid') || '',
        element.getAttribute('data-name') || '',
        element.getAttribute('title') || ''
      ]
        .join(' ')
        .toLowerCase();

      if (hasKeyword(attrBundle)) return true;

      const textSample = (element.innerText || '').slice(0, 280);
      if (hasKeyword(textSample)) return true;

      return false;
    };

    const parseFloatSafe = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };

    const extractPoints = (d) => {
      if (!d) return [];
      const tokens = d.match(/-?\d*\.?\d+/g);
      if (!tokens || tokens.length < 2) return [];
      const numbers = tokens.map(parseFloatSafe).filter((n) => Number.isFinite(n));
      const points = [];
      for (let i = 0; i < numbers.length - 1; i += 2) {
        points.push({ x: numbers[i], y: numbers[i + 1] });
      }
      return points;
    };

    const touchesCorners = (svg, points) => {
      if (!points.length) return false;
      const viewBox = svg.viewBox?.baseVal;
      let minX = 0;
      let minY = 0;
      let maxX = null;
      let maxY = null;

      if (viewBox && viewBox.width && viewBox.height) {
        minX = viewBox.x;
        minY = viewBox.y;
        maxX = viewBox.x + viewBox.width;
        maxY = viewBox.y + viewBox.height;
      } else {
        const width = parseFloatSafe(svg.getAttribute('width')) || 0;
        const height = parseFloatSafe(svg.getAttribute('height')) || width;
        maxX = width;
        maxY = height;
      }

      if (maxX === null || maxY === null) return false;
      const tolerance = Math.max((maxX - minX), (maxY - minY)) * 0.15 || 4;

      const nearCorners = points.filter((point) => {
        const nearX =
          Math.abs(point.x - minX) <= tolerance || Math.abs(point.x - maxX) <= tolerance;
        const nearY =
          Math.abs(point.y - minY) <= tolerance || Math.abs(point.y - maxY) <= tolerance;
        return nearX && nearY;
      });
      return nearCorners.length >= 2;
    };

    const isSvgCloseIcon = (svg) => {
      if (!(svg instanceof SVGElement)) return false;
      const classText =
        (typeof svg.className === 'object'
          ? svg.className.baseVal
          : svg.className || ''
        ).toLowerCase();
      if (classText.includes('close') || classText.includes('fechar')) {
        return true;
      }

      const use = svg.querySelector('use');
      if (use) {
        const href =
          (
            use.getAttribute('xlink:href') ||
            use.getAttribute('href') ||
            ''
          ).toLowerCase();
        if (href.includes('close') || href.includes('ui-close') || href.includes('fechar')) {
          return true;
        }
      }

      const label = normalize(
        svg.getAttribute('aria-label') ||
          svg.getAttribute('title') ||
          svg.closest('[aria-label]')?.getAttribute('aria-label')
      );
      if (label && CLOSE_TEXT.some((word) => label.includes(word))) {
        return true;
      }

      const lines = Array.from(svg.querySelectorAll('line'));
      const diagonalLines = lines.filter((line) => {
        const x1 = line.getAttribute('x1');
        const x2 = line.getAttribute('x2');
        const y1 = line.getAttribute('y1');
        const y2 = line.getAttribute('y2');
        return x1 !== x2 && y1 !== y2;
      });
      if (diagonalLines.length >= 2) {
        return true;
      }

      const paths = Array.from(svg.querySelectorAll('path'));
      if (
        paths.some((path) => {
          const d = (path.getAttribute('d') || '').toLowerCase();
          if (!d) return false;
          if (d.includes('24.2905') && d.includes('2.67041') && d.includes('23.2505')) {
            return true;
          }
          return (
            (d.includes('45') && d.includes('-45')) ||
            (d.includes('l') && d.includes('m') && d.includes('-'))
          );
        })
      ) {
        return true;
      }

      const points = paths.flatMap((path) => extractPoints(path.getAttribute('d')));
      if (touchesCorners(svg, points)) {
        return true;
      }

      return false;
    };

    const findCloseButton = (root) => {
      for (const selector of CLOSE_SELECTORS) {
        const btn = root.querySelector(selector);
        if (btn) return btn;
      }
      if (DIRECT_QUERY) {
        const direct = root.querySelector(DIRECT_QUERY);
        if (direct) return direct;
      }

      const candidates = Array.from(
        root.querySelectorAll('button, [role=\"button\"], .close, .close-btn, .icon-close')
      );

      return candidates.find((btn) => {
        const label = normalize(
          btn.innerText ||
            btn.textContent ||
            btn.getAttribute('aria-label') ||
            btn.getAttribute('title')
        );
        return CLOSE_TEXT.some((word) => label.includes(word));
      });

      if (candidates) {
        return candidates;
      }

      const svgButtons = Array.from(root.querySelectorAll('svg'));
      for (const svg of svgButtons) {
        if (!isSvgCloseIcon(svg)) continue;
        const btn =
          svg.closest('button, [role=\"button\"], .close, .close-btn, [class*=\"close\"], [aria-label]') ||
          svg.parentElement;
        if (btn) {
          return btn;
        }
      }

      return null;
    };

    const clickButton = (btn, reason) => {
      try {
        btn.click();
        btn.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true })
        );
        log('Botao de fechamento acionado', reason);
        return true;
      } catch (err) {
        log('Falha ao clicar no botao de fechar', err?.message || err);
        return false;
      }
    };

    const tryClose = (element, reason = 'detected') => {
      if (!(element instanceof HTMLElement)) return false;
      if (processed.has(element)) return false;

      if (DIRECT_QUERY && element.matches && element.matches(DIRECT_QUERY)) {
        processed.add(element);
        if (clickButton(element, `${reason}-direct`)) {
          element.dataset.fastbotAds = 'ok';
          return true;
        }
      }

      processed.add(element);

      const closeButton = findCloseButton(element);
      if (closeButton) {
        if (clickButton(closeButton, reason)) {
          element.dataset.fastbotAds = 'ok';
          processed.add(closeButton);
          return true;
        }
      }

      element.style.setProperty('display', 'none', 'important');
      element.style.setProperty('visibility', 'hidden', 'important');
      element.style.setProperty('opacity', '0', 'important');
      element.dataset.fastbotAds = 'ok';
      log('Elemento ocultado (sem botao visivel)', reason);
      return true;
    };

    const inspectElement = (element) => {
      if (!(element instanceof HTMLElement)) return;
      if (DIRECT_QUERY && element.matches && element.matches(DIRECT_QUERY)) {
        tryClose(element, 'match-direto');
      }
      if (looksLikeAd(element)) {
        tryClose(element, 'elemento raiz');
      }
      if (SELECTOR_QUERY) {
        element
          .querySelectorAll(SELECTOR_QUERY)
          .forEach((el) => tryClose(el, 'seletor'));
      }
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            inspectElement(node);
          }
        });
      });
    });

    const start = () => {
      if (!document.body) return;
      inspectElement(document.body);
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
      log('Monitor de anuncios iniciado');
    };

    window.__fastbotAutoAdsManual = () => {
      try {
        inspectElement(document.body);
        if (DIRECT_QUERY) {
          document
            .querySelectorAll(DIRECT_QUERY)
            .forEach((el) => tryClose(el, 'manual-direct'));
        }
        if (SELECTOR_QUERY) {
          document
            .querySelectorAll(SELECTOR_QUERY)
            .forEach((el) => tryClose(el, 'manual-selector'));
        }
      } catch (err) {
        log('Erro no fechamento manual', err?.message || err);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
}, AUTO_AD_GUARD);
}

async function handleClosePopups(page, action = {}) {
  const customSelectors = Array.isArray(action.customSelectors)
    ? action.customSelectors
    : [];
  const singleSelector = sanitizeSelectorValue(action.selector || '');

  const allSelectors = [...customSelectors];
  if (singleSelector) {
    allSelectors.unshift(singleSelector);
  }

  const clickTargets = [];

  for (const selector of allSelectors) {
    const trimmed = sanitizeSelectorValue(selector);
    if (!trimmed) continue;
    try {
      const elements = await page.$$(trimmed);
      clickTargets.push(...elements);
    } catch (error) {
      console.warn(`[Fastbot] Erro ao capturar seletor custom ${trimmed}:`, error.message);
    }
  }

  for (const handle of clickTargets) {
    try {
      await handle.click({ delay: 50 });
    } catch (error) {
      console.warn('[Fastbot] Falha ao clicar seletor custom:', error.message);
    } finally {
      await handle.dispose();
    }
    await page.waitForTimeout(120);
  }

  try {
    await page.evaluate(
      (selectors) => {
        if (typeof window.__fastbotAutoAdsManual === 'function') {
          window.__fastbotAutoAdsManual();
          return;
        }
        selectors.forEach((selector) => {
          document
            .querySelectorAll(selector)
            .forEach((el) => {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
            });
        });
      },
      FALLBACK_POPUP_SELECTORS
    );
  } catch (error) {
    console.warn('[Fastbot] Erro ao fechar popups manualmente:', error.message);
  }
}

async function findElementByHint(page, hint, options = {}) {
  const targetText = (hint || '').trim().toLowerCase();
  if (!targetText) {
    return null;
  }

  const timeout = options.timeout || 5000;
  const pollInterval = options.pollInterval || 300;
  const preferInputs = !!options.preferInputs;
  const requestedIndex = Math.max(1, parseInt(options.matchIndex, 10) || 1);
  const matchIndex = requestedIndex - 1;
  const start = Date.now();

  while (Date.now() - start <= timeout) {
    const handle = await page.evaluateHandle(
      (needle, opts) => {
        const target = needle;
        const preferInputsSearch = !!opts.preferInputs;
        const requestedMatch =
          typeof opts.matchIndex === 'number' && opts.matchIndex >= 0
            ? Math.floor(opts.matchIndex)
            : 0;
        let seenMatches = 0;

        const isVisible = (el) => {
          const style = window.getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') {
            return false;
          }
          const rect = el.getBoundingClientRect();
          return rect.width >= 1 && rect.height >= 1;
        };

        const matchesContent = (el) => {
          const sources = [
            el.innerText,
            el.textContent,
            el.getAttribute('aria-label'),
            el.getAttribute('placeholder'),
            el.getAttribute('name'),
            el.getAttribute('id'),
            el.getAttribute('title'),
            el.value
          ];
          return sources
            .filter(Boolean)
            .some((value) => value.trim().toLowerCase().includes(target));
        };

        const registerMatch = (candidate) => {
          if (!candidate) {
            return null;
          }
          if (seenMatches === requestedMatch) {
            return candidate;
          }
          seenMatches += 1;
          return null;
        };

        const considerElement = (el) => {
          if (!(el instanceof HTMLElement)) return null;
          if (!isVisible(el)) return null;

          if (matchesContent(el)) {
            if (preferInputsSearch && el.tagName === 'LABEL' && el.control) {
              return registerMatch(el.control);
            }
            return registerMatch(el);
          }

          if (
            preferInputsSearch &&
            el.tagName === 'LABEL' &&
            el.control &&
            matchesContent(el.control)
          ) {
            return registerMatch(el.control);
          }

          return null;
        };

        const inspectList = (elements) => {
          for (const el of elements) {
            const match = considerElement(el);
            if (match) {
              return match;
            }
          }
          return null;
        };

        if (preferInputsSearch) {
          const inputElements = Array.from(
            document.querySelectorAll('input, textarea, select, [contenteditable=\"true\"]')
          );
          const matchedInput = inspectList(inputElements);
          if (matchedInput) {
            return matchedInput;
          }
        }

        const clickableSelectors = [
          'button',
          '[role=\"button\"]',
          'a',
          'input[type=\"button\"]',
          'input[type=\"submit\"]',
          'label',
          'div',
          'span'
        ];

        for (const selector of clickableSelectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          const match = inspectList(elements);
          if (match) {
            return match;
          }
        }

        return null;
      },
      targetText,
      { preferInputs }
    );

    const element = handle.asElement();
    if (element) {
      return element;
    }

    await handle.dispose();
    if (Date.now() - start >= timeout) {
      break;
    }
    await page.waitForTimeout(pollInterval);
  }

  return null;
}

async function handleClick(page, action) {
  const selectorValue = sanitizeSelectorValue(action.selector || '');
  const hasSelector = selectorValue.length > 0;

  if (hasSelector) {
    await page.waitForSelector(selectorValue, {
      timeout: 5000,
      visible: true
    });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, selectorValue);
    await page.waitForTimeout(300 + Math.random() * 200);
    await page.click(selectorValue);
    return;
  }

  const matchIndex = Math.max(1, parseInt(action.matchIndex, 10) || 1);

  if (action.textMatch) {
    const element = await findElementByHint(page, action.textMatch, {
      preferInputs: false,
      matchIndex,
    });
    if (!element) {
      throw new Error(`Elemento com texto "${action.textMatch}" nao encontrado`);
    }
    try {
      await element.focus().catch(() => {});
      await element.click();
    } finally {
      await element.dispose();
    }
    return;
  }

  if (typeof action.x === 'number' && typeof action.y === 'number') {
    await page.mouse.click(action.x, action.y);
    return;
  }

  throw new Error('Acao de click invalida: defina seletor, texto ou coordenadas');
}

async function handleInput(page, action) {
  const macroVars = await getMacroVars(page);
  let value = action.value || '';
  value = value.replace(/\{\{email\}\}/g, macroVars.email || '');
  value = value.replace(/\{\{password\}\}/g, macroVars.password || '');
  value = value.replace(/\{\{pix\}\}/g, macroVars.pixKey || '');
  value = value.replace(/\{\{username\}\}/g, macroVars.username || '');
  value = value.replace(/\{\{phone\}\}/g, macroVars.phoneNumber || '');
  value = value.replace(/\{\{link\}\}/g, macroVars.link || '');
  
  let targetHandle = null;
  try {
    const selectorValue = sanitizeSelectorValue(action.selector || '');
    const hasSelector = selectorValue.length > 0;

    if (hasSelector) {
      await page.waitForSelector(selectorValue, {
        timeout: 5000,
        visible: true
      });
      targetHandle = await page.$(selectorValue);
      if (!targetHandle) {
        throw new Error(`Input nao encontrado para seletor ${selectorValue}`);
      }
      await page.focus(selectorValue);
    } else if (action.textMatch) {
      const matchIndex = Math.max(1, parseInt(action.matchIndex, 10) || 1);
      targetHandle = await findElementByHint(page, action.textMatch, {
        preferInputs: true,
        matchIndex,
      });
      if (!targetHandle) {
        throw new Error(`Campo com texto "${action.textMatch}" nao encontrado`);
      }
      await targetHandle.focus().catch(() => {});
    } else {
      throw new Error('Input sem seletor ou texto de referencia');
    }

    await page.waitForTimeout(200);
    await targetHandle.click({ clickCount: 3 }).catch(() => {});
    await page.keyboard.press('Backspace');

    for (const char of value) {
      await page.keyboard.type(char);
      await page.waitForTimeout(50 + Math.random() * 100);
    }
  } finally {
    if (targetHandle) {
      await targetHandle.dispose();
    }
  }
}

async function handleNavigate(page, action, agent) {
  await page.goto(action.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.evaluateOnNewDocument(getAgentFingerprintScript(agent));
}

async function handleScroll(page, action) {
  const targetY = action.scrollY || 0;
  const currentY = await page.evaluate(() => window.scrollY);
  const steps = 20;
  const stepY = (targetY - currentY) / steps;
  
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollBy(0, y), stepY);
    await page.waitForTimeout(20 + Math.random() * 30);
  }
}

async function handleKeypress(page, action) {
  await page.waitForTimeout(100);
  await page.keyboard.press(action.key);
}

async function handleSelect(page, action) {
  await page.waitForSelector(action.selector, { timeout: 5000 });
  await page.waitForTimeout(200);
  await page.select(action.selector, action.value);
}

async function handleWait(page, action) {
  await page.waitForTimeout(action.duration || 1000);
}

async function handleLoop(page, action, agent) {
  for (let i = 0; i < (action.times || 1); i++) {
    for (const subAction of (action.actions || [])) {
      await executeAction(page, subAction, agent);
      await page.waitForTimeout(300);
    }
  }
}

async function handleCondition(page, action, agent) {
  let conditionMet = false;
  const selectorValue = sanitizeSelectorValue(action.selector || '');
  
  if (action.condition === 'element_exists') {
    conditionMet = !!(await page.$(selectorValue));
  } else if (action.condition === 'element_not_exists') {
    conditionMet = !(await page.$(selectorValue));
  }
  
  const actionsToExecute = conditionMet ? (action.then || []) : (action.else || []);
  for (const subAction of actionsToExecute) {
    await executeAction(page, subAction, agent);
    await page.waitForTimeout(300);
  }
}

async function getMacroVars(page) {
  return page.evaluate(() => window.__macro_vars || {});
}

module.exports = { executeMacro };
