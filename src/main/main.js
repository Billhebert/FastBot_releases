const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Arquivos estão na raiz do projeto, precisa subir 2 pastas
      preload: path.join(__dirname, '../renderer/pages/preload.js')
    },
    icon: path.join(__dirname, '../../icons/logo.ico') // Ícone da aplicação
  });

  // Arquivo auth.html está na raiz do projeto
  mainWindow.loadFile(path.join(__dirname, '../renderer/pages/auth.html'));
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
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

ipcMain.handle('start-recording', async (event, device = 'desktop') => {
  console.log('========================================');
  console.log('🎬 main.js: START RECORDING');
  console.log('📱 Device:', device);
  console.log('========================================');
  
  try {
    // recorder.js está na mesma pasta que main.js
    const { startRecording } = require('../core/recorder.js');
    const result = await startRecording(device);
    console.log('✅ Resultado:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  console.log('========================================');
  console.log('⏹️ main.js: STOP RECORDING');
  console.log('========================================');
  
  try {
    // recorder.js está na mesma pasta que main.js
    const { stopRecording } = require('../core/recorder.js');
    const actions = await stopRecording();
    console.log('✅ Ações retornadas:', actions.length);
    console.log('📋 Ações:', JSON.stringify(actions, null, 2));
    return actions;
  } catch (error) {
    console.error('❌ Erro:', error);
    return [];
  }
});

ipcMain.handle('execute-macro', async (event, config) => {
  console.log('▶️ main.js: EXECUTE MACRO');
  console.log('📋 Config:', config);
  
  try {
    // player.js está na mesma pasta que main.js
    const { executeMacro } = require('../core/player.js');
    return await executeMacro(config);
  } catch (error) {
    console.error('❌ Erro:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('warmup-profile', async (event, config) => {
  console.log('🔥 main.js: WARMUP PROFILE');
  console.log('📋 Config:', config);
  
  const { instanceIndex, device, intensity } = config;
  
  try {
    // profile-warmer.js está na mesma pasta que main.js
    const { warmUpProfile } = require('../core/profile-warmer.js');
    const result = await warmUpProfile(instanceIndex, device, intensity);
    return result;
  } catch (error) {
    console.error('❌ Erro warmup:', error);
    return {
      success: false,
      error: error.message
    };
  }
});