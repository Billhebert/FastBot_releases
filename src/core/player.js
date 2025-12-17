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

// ============================================
// CONFIGURAÇÕES ANTI-CAPTCHA
// ============================================

const CAPTCHA_CONFIG = {
  // Aquecer perfil antes de executar?
  warmUpBeforeExecution: false, // Mude para true para ativar
  
  // Usar CapSolver? (serviço com trial grátis $5)
  // Cadastre em: https://www.capsolver.com/
  useCapSolver: false,
  capSolverApiKey: null, // Coloque sua API key aqui
  
  // Delays mais longos (parecer mais humano)
  humanDelays: true,
  delayMultiplier: 1.5, // 1.5x mais lento
  
  // Resolver CAPTCHA manualmente?
  manualCaptchaSolve: true, // Pausa e aguarda você resolver
  manualTimeout: 300000 // 5 minutos para resolver manualmente
};

// ============================================
// DETECÇÃO DE CAPTCHA
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
  console.log('\n⚠️  CAPTCHA DETECTADO!');
  console.log('🧩 Resolva o CAPTCHA na janela do Chrome');
  console.log('⏳ Aguardando até 5 minutos...');
  console.log('✅ O sistema detecta automaticamente quando for resolvido');
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
      console.log('✅ CAPTCHA RESOLVIDO! Continuando...');
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    }
    
    // Mostrar progresso a cada 10 segundos
    if (attempts % 5 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((timeout - (Date.now() - startTime)) / 1000);
      console.log(`⏳ ${elapsed}s decorridos | ${remaining}s restantes...`);
    }
  }
  
  console.log('');
  console.log('⏰ TIMEOUT: 5 minutos sem resolver');
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
  
  console.log('\n🧠 Tentando resolver com CapSolver...');
  
  try {
    const axios = require('axios');
    
    // Extrair sitekey
    const siteKey = await page.evaluate(() => {
      const element = document.querySelector('[data-sitekey]');
      return element ? element.getAttribute('data-sitekey') : null;
    });
    
    if (!siteKey) {
      console.log('⚠️  Não foi possível encontrar sitekey');
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
      console.log(`❌ Erro: ${createTask.data.errorDescription}`);
      return false;
    }
    
    const taskId = createTask.data.taskId;
    console.log(`   Task ID: ${taskId}`);
    console.log('   ⏳ Aguardando solução (15-60s)...');
    
    // Aguardar solução
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
        
        console.log('   ✅ Token recebido!');
        
        // Injetar token
        await page.evaluate((token) => {
          const el = document.getElementById('g-recaptcha-response');
          if (el) el.innerHTML = token;
        }, token);
        
        console.log('   ✅ Token injetado!');
        console.log('');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
      
      if (getResult.data.status === 'failed') {
        console.log(`   ❌ Falhou: ${getResult.data.errorDescription}`);
        return false;
      }
      
      // Mostrar progresso
      if (attempts % 5 === 0) {
        process.stdout.write('.');
      }
    }
    
    console.log('\n   ⏰ Timeout');
    return false;
    
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

// ============================================
// EXECUTAR MACRO COM PROTEÇÃO ANTI-CAPTCHA
// ============================================


async function executeMacro(config) {
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
    instanceIndex,
    delayMin,
    delayMax,
    freshSession = false
  } = config;

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

  const useEmbeddedShell = device === 'mobile';

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
    }, { password, pixKey, email, username, phoneNumber });

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

// ... [Resto das funções executeAction, handleClick, etc - copiar do player-agents.js]

async function executeAction(page, action, agent) {
  switch (action.type) {
    case 'type': return await executeType(page, action);
    case 'click': return await handleClick(page, action);
    case 'input': return await handleInput(page, action);
    case 'navigate': return await handleNavigate(page, action, agent);
    case 'scroll': return await handleScroll(page, action);
    case 'keypress': return await handleKeypress(page, action);
    case 'select': return await handleSelect(page, action);
    case 'wait': return await handleWait(page, action);
    case 'loop': return await handleLoop(page, action, agent);
    case 'condition': return await handleCondition(page, action, agent);

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
    
    console.log(`   Variaveis disponiveis: {`);
    console.log(`     email: '${macroVars.email || ''}',`);
    console.log(`     username: '${macroVars.username || ''}',`);
    console.log(`     phone: '${macroVars.phoneNumber || ''}',`);
    console.log(`     password: '***',`);
    console.log(`     pixKey: '${(macroVars.pixKey || '').substring(0, 11)}...'`);
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

  }
}

async function handleClick(page, action) {
  if (action.selector) {
    await page.waitForSelector(action.selector, { timeout: 5000, visible: true });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, action.selector);
    await page.waitForTimeout(300 + Math.random() * 200);
    await page.click(action.selector);
  } else {
    await page.mouse.click(action.x, action.y);
  }
}

async function handleInput(page, action) {
  const macroVars = await getMacroVars(page);
  let value = action.value || '';
  value = value.replace(/\{\{email\}\}/g, macroVars.email || '');
  value = value.replace(/\{\{password\}\}/g, macroVars.password || '');
  value = value.replace(/\{\{pix\}\}/g, macroVars.pixKey || '');
  value = value.replace(/\{\{username\}\}/g, macroVars.username || '');
  value = value.replace(/\{\{phone\}\}/g, macroVars.phoneNumber || '');
  
  await page.waitForSelector(action.selector, { timeout: 5000, visible: true });
  await page.focus(action.selector);
  await page.waitForTimeout(200);
  await page.click(action.selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  
  for (const char of value) {
    await page.keyboard.type(char);
    await page.waitForTimeout(50 + Math.random() * 100);
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
  
  if (action.condition === 'element_exists') {
    conditionMet = !!(await page.$(action.selector));
  } else if (action.condition === 'element_not_exists') {
    conditionMet = !(await page.$(action.selector));
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
