const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const {
  createMobileShellWindow,
  getShell,
  getShellTargetId,
  closeShell,
  REMOTE_DEBUGGING_PORT
} = require('../main/mobile-shell');

const MOBILE_PARTITION_PREFIX = 'persist:fastbot-mobile-profile';

const SHELL_CONNECT_TIMEOUT = 8000;
const PARTITIONS_DIR_NAME = 'Partitions';

function getMobilePartition(instanceIndex = 0) {
  return `${MOBILE_PARTITION_PREFIX}-${instanceIndex}`;
}

function getPartitionPath(partition) {
  const partitionName = partition.startsWith('persist:')
    ? partition.replace('persist:', '')
    : partition;
  const userDataPath = app.getPath('userData');
  const partitionsDir = path.join(userDataPath, PARTITIONS_DIR_NAME);
  if (!fs.existsSync(partitionsDir)) {
    fs.mkdirSync(partitionsDir, { recursive: true });
  }
  const partitionPath = path.join(partitionsDir, partitionName);
  if (!fs.existsSync(partitionPath)) {
    fs.mkdirSync(partitionPath, { recursive: true });
  }
  return partitionPath;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTargetPage(browser, targetId, timeout = SHELL_CONNECT_TIMEOUT) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const targets = browser.targets().filter(t => t.type() === 'page');
    const target = targets.find(t => t._targetId === targetId);
    if (target) {
      const page = await target.page();
      return page;
    }
    await wait(200);
  }

  throw new Error('Nao foi possivel vincular o BrowserView ao Puppeteer');
}

async function createShellSession(options = {}) {
  const {
    initialUrl = 'about:blank',
    device = 'mobile',
    partition = getMobilePartition(0),
    proxy = null
  } = options;
  const partitionPath = getPartitionPath(partition);
  const shellId = createMobileShellWindow({ partition });
  const shell = getShell(shellId);

  if (!shell) {
    throw new Error('Nao foi possivel criar shell mobile');
  }

  if (proxy) {
    try {
      await shell.view.webContents.session.setProxy({
        proxyRules: `${proxy.host}:${proxy.port}`,
        proxyBypassRules: proxy?.bypass || ''
      });
    } catch (error) {
      console.error('Erro ao configurar proxy do shell:', error.message);
    }
  }

  if (initialUrl) {
    await shell.view.webContents.loadURL(initialUrl);
  }

  let targetId = null;
  for (let attempt = 0; attempt < 5 && !targetId; attempt++) {
    targetId = await getShellTargetId(shellId);
    if (!targetId) {
      await wait(150);
    }
  }
  if (!targetId) {
    closeShell(shellId);
    throw new Error('Nao foi possivel identificar o alvo DevTools do shell');
  }

  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${REMOTE_DEBUGGING_PORT}`
  });

  const page = await waitForTargetPage(browser, targetId);

  await page.setViewport(
    device === 'mobile'
      ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { width: 1280, height: 720, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
  );

  return {
    shellId,
    partition,
    partitionPath,
    browser,
    page,
    dispose: async () => {
      try {
        browser.disconnect();
      } catch (err) {
        // ignore disconnect errors
      }
      if (proxy) {
        try {
          const currentShell = getShell(shellId);
          await currentShell?.view?.webContents?.session?.setProxy({ mode: 'direct' });
        } catch (err) {
          // ignore proxy cleanup errors
        }
      }
      closeShell(shellId);
    }
  };
}

module.exports = {
  createShellSession,
  getMobilePartition,
  getPartitionPath
};
