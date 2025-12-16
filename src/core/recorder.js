const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { findChrome } = require("./chrome-finder.js");
const { getOrCreateProfile, getStealthArgs, getStealthScript } = require('./stealth-config.js');

puppeteer.use(StealthPlugin());

let browser = null;
let page = null;
let recording = false;
let actions = [];

async function startRecording(device = "desktop") {
  if (recording) {
    return { success: false, message: "JÒ¡ estÒ¡ gravando" };
  }

  console.log("========================================");
  console.log("🎬 INICIANDO GRAVAÒ⬡Ò�O");
  console.log("🔥S± Device:", device);
  console.log("========================================");

  const chromePath = findChrome();
  const viewport = device === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1920, height: 1080 };

  const userAgent = device === "mobile"
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1"
    : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  // PERFIL PERSISTENTE SEPARADO (nÒ£o usa o Chrome do sistema)
  const profilePath = getOrCreateProfile(0);
  const position = { x: 0, y: 0, width: viewport.width, height: viewport.height };

  console.log('\nðŸš�� Abrindo Chrome...');
  console.log('🔥S�a Perfil:', profilePath);

  browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: profilePath,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      ...getStealthArgs(device, position),
      `--user-agent=${userAgent}`
    ],
    defaultViewport: null
  });

  await new Promise(resolve => setTimeout(resolve, 1500));

  const pages = await browser.pages();
  page = pages[0] || await browser.newPage();

  await page.evaluateOnNewDocument(getStealthScript());

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    hasTouch: device === 'mobile',
    isLandscape: false,
    isMobile: device === 'mobile'
  });

  recording = true;
  actions = [];

  await page.exposeFunction("__recordAction", (action) => {
    if (recording) {
      actions.push(action);
      const detail = action.selector || action.url || `(${action.x},${action.y})` || action.scrollY || "";
      console.log(`🔥S [${actions.length}] ${action.type.toUpperCase()}: ${detail}`);
    }
  });

  let isFirstNavigation = true;
  page.on("framenavigated", async (frame) => {
    if (frame !== page.mainFrame()) return;
    
    const url = frame.url();
    
    if (isFirstNavigation) {
      isFirstNavigation = false;
    } else {
      if (url && url !== "about:blank" && !url.startsWith("chrome://") && !url.startsWith("devtools://")) {
        actions.push({ type: "navigate", url: url });
        console.log(`🔥 [${actions.length}] NAVIGATE: ${url}`);
      }
    }

    try {
      await page.waitForTimeout(1000);
      await safeInjectScript(page);
    } catch (error) {
      // Silenciar
    }
  });

  console.log('\n🔥 Navegando para pÒ¡gina inicial...');
  await page.goto("about:blank", { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  await page.goto("https://www.google.com", { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await page.waitForTimeout(1500);
  await safeInjectScript(page);

  console.log("✓⬦ GravaÒ§Ò£o iniciada!");
  console.log("Cookies salvos nesse perfil: " + profilePath);
  return { success: true };
}

async function safeInjectScript(page) {
  try {
    const isInjected = await page.evaluate(() => window.__recordingInjected === true);
    if (isInjected) return;

    await page.evaluate(() => {
      window.__recordingInjected = true;

      document.addEventListener("click", (e) => {
        const selector = getSelector(e.target);
        window.__recordAction({
          type: "click",
          selector: selector,
          x: e.clientX,
          y: e.clientY,
        });
      }, true);

      let inputTimeout;
      document.addEventListener("input", (e) => {
        if (e.target.matches("input, textarea")) {
          clearTimeout(inputTimeout);
          inputTimeout = setTimeout(() => {
            const selector = getSelector(e.target);
            window.__recordAction({
              type: "input",
              selector: selector,
              value: e.target.value,
            });
          }, 500);
        }
      }, true);

      let scrollTimeout;
      let lastScrollY = window.scrollY;
      document.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (Math.abs(window.scrollY - lastScrollY) > 50) {
            lastScrollY = window.scrollY;
            window.__recordAction({
              type: "scroll",
              scrollY: window.scrollY,
              scrollX: window.scrollX,
            });
          }
        }, 300);
      }, true);

      function getSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.name) return `[name="${element.name}"]`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(" ").filter(c => c && !c.match(/^(hover|active|focus)/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        if (element.type && element.tagName === 'INPUT') {
          return `input[type="${element.type}"]`;
        }
        const tag = element.tagName.toLowerCase();
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

    console.log('✓⬦ Script de gravaÒ§Ò£o injetado');
  } catch (error) {
    if (!error.message.includes('destroyed')) {
      console.error('âš ï¸  Erro:', error.message);
    }
  }
}

async function stopRecording() {
  console.log("========================================");
  console.log("â¹ï¸  PARANDO GRAVAÒ⬡Ò�O");
  console.log("========================================");

  recording = false;

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }

  console.log(`✓⬦ GravaÒ§Ò£o finalizada com ${actions.length} aÒ§Òµes`);
  return actions;
}

module.exports = { startRecording, stopRecording };