const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { findChrome } = require('./chrome-finder');
const { getOrCreateProfile, getStealthArgs, getStealthScript } = require('./stealth-config');
const { syncPartitionFromRecording, syncRecordingFromPartition, clearProfileData } = require('./cookie-sync');
const { createShellSession, getMobilePartition, getPartitionPath } = require('./mobile-shell-session');

puppeteer.use(StealthPlugin());

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
};

let browser = null;
let page = null;
let recording = false;
let actions = [];
let shellSession = null;

async function startRecording(device = 'desktop', options = {}) {
  const { freshSession = false, startUrl = null } = options || {};
  const normalizedStartUrl = normalizeStartUrl(startUrl);
  if (recording) {
    return { success: false, message: 'Ja esta gravando' };
  }

  console.log('========================================');
  console.log('>>> INICIANDO GRAVACAO');
  console.log('>>> Device:', device);
  console.log('>>> Sessao limpa:', freshSession);
  if (normalizedStartUrl) {
    console.log('>>> Start URL:', normalizedStartUrl);
  }
  console.log('========================================');

  try {
    await bootstrapRecorder(device, { freshSession });
    await setupPageForRecording(device);
    await prepareEventCapture(device);

    console.log('\n>>> Navegando para pagina inicial...');
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    if (normalizedStartUrl) {
      await page.goto(normalizedStartUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });
      await page.waitForTimeout(1500);
      await safeInjectScript(page);
    } else {
      await page.goto('https://www.google.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await page.waitForTimeout(1500);
      await safeInjectScript(page);
    }

    console.log('>>> Gravacao iniciada!');
    recording = true;
    return { success: true };
  } catch (error) {
    console.error('!!! Erro ao iniciar gravacao:', error);
    await cleanupRecording();
    return { success: false, message: error.message };
  }
}

async function bootstrapRecorder(device, options = {}) {
  const { freshSession = false } = options || {};
  if (device === 'mobile') {
    const partition = getMobilePartition(0);
    const partitionPath = getPartitionPath(partition);

    if (freshSession) {
      clearProfileData(partitionPath);
    } else {
      syncPartitionFromRecording(partitionPath);
    }

    shellSession = await createShellSession({
      device: 'mobile',
      initialUrl: 'about:blank',
      partition
    });
    browser = shellSession.browser;
    page = shellSession.page;
    return;
  }

  const chromePath = findChrome();
  const viewport = VIEWPORTS.desktop;
  const profilePath = getOrCreateProfile(0);
  if (freshSession) {
    clearProfileData(profilePath);
  }
  const position = { x: 0, y: 0, width: viewport.width, height: viewport.height };

  console.log('\n>>> Abrindo Chrome (desktop)...');
  console.log('>>> Perfil:', profilePath);

  browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      ...getStealthArgs(device, position),
      `--user-agent=${DESKTOP_USER_AGENT}`
    ],
    defaultViewport: null
  });

  await new Promise(resolve => setTimeout(resolve, 1500));

  const pages = await browser.pages();
  page = pages[0] || (await browser.newPage());
}

async function setupPageForRecording(device) {
  await page.evaluateOnNewDocument(getStealthScript());
  await page.setUserAgent(device === 'mobile' ? MOBILE_USER_AGENT : DESKTOP_USER_AGENT);

  const viewport = device === 'mobile' ? VIEWPORTS.mobile : VIEWPORTS.desktop;
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    hasTouch: viewport.hasTouch,
    isLandscape: false,
    isMobile: viewport.isMobile
  });
}

async function prepareEventCapture(device) {
  actions = [];

  await page.exposeFunction('__recordAction', action => {
    if (recording) {
      actions.push(action);
      const detail = action.selector || action.url || `(${action.x},${action.y})` || action.scrollY || '';
      console.log(`[${actions.length}] ${action.type.toUpperCase()}: ${detail}`);
    }
  });

  let isFirstNavigation = true;
  page.on('framenavigated', async frame => {
    if (frame !== page.mainFrame()) return;

    const url = frame.url();

    if (isFirstNavigation) {
      isFirstNavigation = false;
    } else if (url && url !== 'about:blank' && !url.startsWith('chrome://') && !url.startsWith('devtools://')) {
      actions.push({ type: 'navigate', url });
      console.log(`[${actions.length}] NAVIGATE: ${url}`);
    }

    try {
      await page.waitForTimeout(1000);
      await safeInjectScript(page);
    } catch (error) {
      // noop
    }
  });
}

async function safeInjectScript(pageInstance) {
  try {
    const alreadyInjected = await pageInstance.evaluate(() => window.__recordingInjected === true);
    if (alreadyInjected) return;

    await pageInstance.evaluate(() => {
      window.__recordingInjected = true;

      document.addEventListener('click', event => {
        const selector = getSelector(event.target);
        window.__recordAction({
          type: 'click',
          selector,
          x: event.clientX,
          y: event.clientY
        });
      }, true);

      let inputTimeout;
      document.addEventListener('input', event => {
        if (event.target.matches('input, textarea')) {
          clearTimeout(inputTimeout);
          inputTimeout = setTimeout(() => {
            const selector = getSelector(event.target);
            window.__recordAction({
              type: 'input',
              selector,
              value: event.target.value
            });
          }, 500);
        }
      }, true);

      let scrollTimeout;
      let lastScrollY = window.scrollY;
      document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (Math.abs(window.scrollY - lastScrollY) > 50) {
            lastScrollY = window.scrollY;
            window.__recordAction({
              type: 'scroll',
              scrollY: window.scrollY,
              scrollX: window.scrollX
            });
          }
        }, 300);
      }, true);

      // MODO ESPELHO - Gravacao de movimento de mouse
      let mouseMoveTimeout;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let mouseMovements = [];
      let isRecordingMovement = false;

      document.addEventListener('mousemove', event => {
        const currentX = event.clientX;
        const currentY = event.clientY;

        // So gravar se houve movimento significativo (>5px)
        if (Math.abs(currentX - lastMouseX) > 5 || Math.abs(currentY - lastMouseY) > 5) {
          lastMouseX = currentX;
          lastMouseY = currentY;

          // Acumular movimentos
          mouseMovements.push({
            x: currentX,
            y: currentY,
            timestamp: Date.now()
          });

          // Limpar timeout anterior
          clearTimeout(mouseMoveTimeout);

          // Aguardar 500ms de inatividade para gravar a sequencia completa
          mouseMoveTimeout = setTimeout(() => {
            if (mouseMovements.length > 0) {
              window.__recordAction({
                type: 'mouse_move',
                movements: [...mouseMovements],
                fromX: mouseMovements[0].x,
                fromY: mouseMovements[0].y,
                toX: mouseMovements[mouseMovements.length - 1].x,
                toY: mouseMovements[mouseMovements.length - 1].y,
                duration: mouseMovements[mouseMovements.length - 1].timestamp - mouseMovements[0].timestamp
              });
              mouseMovements = [];
            }
          }, 500);
        }
      }, true);

      function getSelector(element) {
        if (!element) return '';

        if (element.id) return `#${element.id}`;
        if (element.name) return `[name="${element.name}"]`;

        if (element.className && typeof element.className === 'string') {
          const classes = element.className
            .split(' ')
            .filter(c => c && !c.match(/^(hover|active|focus)/));
          if (classes.length > 0) return `.${classes[0]}`;
        }

        if (element.type && element.tagName === 'INPUT') {
          return `input[type="${element.type}"]`;
        }

        const tag = element.tagName ? element.tagName.toLowerCase() : 'div';
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(e => e.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element);
            return `${tag}:nth-of-type(${index + 1})`;
          }
        }
        return tag;
      }
    });

    console.log('>>> Script de gravacao injetado');
  } catch (error) {
    if (!error.message.includes('destroyed')) {
      console.error('Erro ao injetar script de gravacao:', error.message);
    }
  }
}

async function stopRecording() {
  console.log('========================================');
  console.log('>>> PARANDO GRAVACAO');
  console.log('========================================');

  recording = false;
  await cleanupRecording();

  console.log(`>>> Gravacao finalizada com ${actions.length} acoes`);
  return actions;
}

async function cleanupRecording() {
  if (shellSession) {
    const partitionPath = shellSession.partitionPath;
    await shellSession.dispose();
    if (partitionPath) {
      syncRecordingFromPartition(partitionPath);
    }
    shellSession = null;
    browser = null;
    page = null;
    return;
  }

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

function normalizeStartUrl(url) {
  if (!url) return null;
  let value = url.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return value;
}

module.exports = { startRecording, stopRecording };
