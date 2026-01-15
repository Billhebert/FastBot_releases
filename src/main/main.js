const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { registerMobileShellHandlers, REMOTE_DEBUGGING_PORT } = require('./mobile-shell');

app.commandLine.appendSwitch('remote-debugging-port', String(REMOTE_DEBUGGING_PORT));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Arquivos estao na raiz do projeto, precisa subir 2 pastas
      preload: path.join(__dirname, '../renderer/pages/preload.js')
    },
    icon: path.join(__dirname, '../../icons/logo.ico') // Icone da aplicacao
  });

  mainWindow.setMenu(null);

  // Arquivo auth.html esta na raiz do projeto
  mainWindow.loadFile(path.join(__dirname, '../renderer/pages/auth.html'));
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.fastbot.app');
  Menu.setApplicationMenu(null);
  registerMobileShellHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
  autoUpdater.quitAndInstall();
});

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('start-recording', async (event, options = {}) => {
  console.log('========================================');
  console.log(' main.js: START RECORDING');
  const payload = typeof options === 'string' ? { device: options } : (options || {});
  const device = payload.device || 'desktop';
  const freshSession = !!payload.freshSession;
  const startUrl = typeof payload.startUrl === 'string' ? payload.startUrl : null;
  console.log(' Device:', device);
  console.log(' Sessao limpa:', freshSession);
  if (startUrl) {
    console.log(' Start URL:', startUrl);
  }
  console.log('========================================');
  
  try {
    // recorder.js esta na mesma pasta que main.js
    const { startRecording } = require('../core/recorder.js');
    const result = await startRecording(device, { freshSession, startUrl });
    console.log(' Resultado:', result);
    return result;
  } catch (error) {
    console.error(' Erro:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  console.log('========================================');
  console.log(' main.js: STOP RECORDING');
  console.log('========================================');
  
  try {
    // recorder.js esta na mesma pasta que main.js
    const { stopRecording } = require('../core/recorder.js');
    const actions = await stopRecording();
    console.log(' Acoes retornadas:', actions.length);
    console.log(' Acoes:', JSON.stringify(actions, null, 2));
    return actions;
  } catch (error) {
    console.error(' Erro:', error);
    return [];
  }
});

ipcMain.handle('execute-macro', async (event, config) => {
  console.log(' main.js: EXECUTE MACRO');
  console.log(' Config:', config);
  
  try {
    // player.js esta na mesma pasta que main.js
    const { executeMacro } = require('../core/player.js');
    return await executeMacro(config);
  } catch (error) {
    console.error(' Erro:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('warmup-profile', async (event, config) => {
  console.log(' main.js: WARMUP PROFILE');
  console.log(' Config:', config);
  
  const { instanceIndex, device, intensity } = config;
  
  try {
    // profile-warmer.js esta na mesma pasta que main.js
    const { warmUpProfile } = require('../core/profile-warmer.js');
    const result = await warmUpProfile(instanceIndex, device, intensity);
    return result;
  } catch (error) {
    console.error(' Erro warmup:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
ipcMain.handle('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  switch (action) {
    case 'minimize':
      win.minimize();
      break;
    case 'maximize':
      win.isMaximized() ? win.restore() : win.maximize();
      break;
    case 'close':
      win.close();
      break;
    default:
      break;
  }
});

// ============================================
// PIX GENERATION HANDLERS
// ============================================

ipcMain.handle('generate-pix', async (event, config) => {
  console.log('========================================');
  console.log(' main.js: GENERATE PIX');
  console.log(' Config:', config);
  console.log('========================================');

  try {
    const PixGenerator = require('../core/pix-generator.js');

    const { sms24hApiKey, mpAccessToken, keyType, quantity, provider } = config;

    if (!sms24hApiKey || !mpAccessToken) {
      throw new Error('API keys nao configuradas. Configure em Settings.');
    }

    const generator = new PixGenerator(sms24hApiKey, mpAccessToken);

    if (quantity > 1) {
      // Geracao em lote
      const results = await generator.generateBulkPixKeys(quantity, keyType);
      return {
        success: true,
        results,
        message: `${results.length} chaves PIX geradas com sucesso`
      };
    } else {
      // Geracao unica
      const result = await generator.generatePixKey({}, keyType);
      return result;
    }
  } catch (error) {
    console.error(' Erro ao gerar PIX:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// ============================================
// DOLPHIN ANTY HANDLERS
// ============================================

ipcMain.handle('dolphin-check-status', async (event) => {
  console.log(' main.js: DOLPHIN CHECK STATUS');

  try {
    const DolphinClient = require('../core/dolphin-client.js');
    const dolphin = new DolphinClient(3001, 'localhost');

    const result = await dolphin.checkStatus();

    if (result.running) {
      // Verificar quantidade de perfis
      const profilesResult = await dolphin.listProfiles(1, 10);
      return {
        success: true,
        running: true,
        profilesCount: profilesResult.total || 0
      };
    }

    return { success: true, running: false };
  } catch (error) {
    console.error(' Erro ao verificar Dolphin:', error);
    return {
      success: false,
      running: false,
      error: error.message
    };
  }
});

ipcMain.handle('dolphin-list-profiles', async (event, config) => {
  console.log(' main.js: DOLPHIN LIST PROFILES');
  console.log(' Config:', config);

  try {
    const DolphinClient = require('../core/dolphin-client.js');
    const dolphin = new DolphinClient(3001, 'localhost');

    const { page = 1, limit = 100 } = config || {};

    const result = await dolphin.listProfiles(page, limit);

    if (result.success) {
      return {
        success: true,
        profiles: result.profiles,
        total: result.total
      };
    }

    throw new Error(result.error);
  } catch (error) {
    console.error(' Erro ao listar perfis:', error);
    return {
      success: false,
      error: error.message,
      profiles: []
    };
  }
});

ipcMain.handle('dolphin-start-profile', async (event, config) => {
  console.log(' main.js: DOLPHIN START PROFILE');
  console.log(' Config:', config);

  try {
    const DolphinClient = require('../core/dolphin-client.js');
    const dolphin = new DolphinClient(3001, 'localhost');

    const { profileId } = config;

    if (!profileId) {
      throw new Error('Profile ID nao fornecido');
    }

    const result = await dolphin.startProfile(profileId);

    if (result.success) {
      return {
        success: true,
        port: result.port,
        wsEndpoint: result.wsEndpoint,
        pid: result.pid
      };
    }

    throw new Error(result.error);
  } catch (error) {
    console.error(' Erro ao iniciar perfil:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('dolphin-stop-profile', async (event, config) => {
  console.log(' main.js: DOLPHIN STOP PROFILE');
  console.log(' Config:', config);

  try {
    const DolphinClient = require('../core/dolphin-client.js');
    const dolphin = new DolphinClient(3001, 'localhost');

    const { profileId } = config;

    if (!profileId) {
      throw new Error('Profile ID nao fornecido');
    }

    const result = await dolphin.stopProfile(profileId);

    if (result.success) {
      return {
        success: true,
        message: 'Perfil parado com sucesso'
      };
    }

    throw new Error(result.error);
  } catch (error) {
    console.error(' Erro ao parar perfil:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
