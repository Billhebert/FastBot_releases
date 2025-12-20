const { BrowserWindow, ipcMain } = require('electron');

const REMOTE_DEBUGGING_PORT = Number(process.env.MOBILE_SHELL_DEBUG_PORT || 43133);

const shells = new Map();
let nextShellId = 1;

const SHELL_DIMENSIONS = {
  width: 430,
  height: 900
};

function createMobileShellWindow(options = {}) {
  const id = nextShellId++;
  const partition = options.partition || `persist:mobile-shell-${id}`;

  const window = new BrowserWindow({
    width: SHELL_DIMENSIONS.width,
    height: SHELL_DIMENSIONS.height,
    resizable: false,
    frame: false,
    show: false,
    backgroundColor: '#05090f',
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition,
      javascript: true
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.on('closed', () => {
    shells.delete(id);
  });

  window.loadURL('about:blank');

  shells.set(id, {
    id,
    window,
    view: window,
    targetId: null,
    partition
  });

  return id;
}

function getShell(id) {
  return shells.get(id);
}

function closeShell(id) {
  const shell = getShell(id);
  if (!shell) return;
  shell.window.close();
  shells.delete(id);
}

async function resolveShellTargetId(shell) {
  if (!shell) return null;
  if (shell.targetId) return shell.targetId;

  const { debugger: devtools } = shell.view.webContents;
  try {
    if (!devtools.isAttached()) {
      devtools.attach('1.3');
    }
    const result = await devtools.sendCommand('Target.getTargetInfo');
    shell.targetId = result?.targetInfo?.targetId;
    return shell.targetId;
  } catch (error) {
    console.error('Erro ao obter targetId do shell:', error.message);
    return null;
  } finally {
    if (devtools.isAttached()) {
      try {
        devtools.detach();
      } catch (err) {
        // ignore
      }
    }
  }
}

async function getShellTargetId(id) {
  const shell = getShell(id);
  return resolveShellTargetId(shell);
}

function registerMobileShellHandlers() {
  ipcMain.handle('mobile-shell:create', async (event, options = {}) => {
    return createMobileShellWindow(options);
  });

  ipcMain.handle('mobile-shell:load', async (event, { id, url }) => {
    const shell = getShell(id);
    if (!shell) return false;
    if (url) {
      await shell.view.webContents.loadURL(url);
    }
    return true;
  });

  ipcMain.handle('mobile-shell:show', async (event, id) => {
    const shell = getShell(id);
    if (!shell) return false;
    shell.window.show();
    return true;
  });

  ipcMain.handle('mobile-shell:focus', async (event, id) => {
    const shell = getShell(id);
    if (!shell) return false;
    shell.window.focus();
    return true;
  });

  ipcMain.handle('mobile-shell:close', async (event, id) => {
    const shell = getShell(id);
    if (!shell) return false;
    closeShell(id);
    return true;
  });
}

module.exports = {
  REMOTE_DEBUGGING_PORT,
  registerMobileShellHandlers,
  createMobileShellWindow,
  getShell,
  getShellTargetId,
  closeShell
};
