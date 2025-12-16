const os = require('os');
const path = require('path');
const fs = require('fs');

// Diretório de perfis separados mas PERSISTENTES
const PROFILES_DIR = path.join(os.homedir(), '.chrome-macro-profiles');

// Garantir que diretório existe
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  console.log('📁 Diretório de perfis criado:', PROFILES_DIR);
}

function getOrCreateProfile(instanceIndex) {
  const profilePath = path.join(PROFILES_DIR, `profile-${instanceIndex}`);
  
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
    console.log(`📁 Criando novo perfil persistente: profile-${instanceIndex}`);
  } else {
    console.log(`📁 Usando perfil persistente existente: profile-${instanceIndex}`);
  }
  
  return profilePath;
}

function getStealthArgs(device, position) {
  // CORREÇÃO: Verificar se position é null ou undefined
  const baseArgs = [];
  
  // Só adicionar window-position e window-size se position existir
  if (position && typeof position === 'object' && position.x !== undefined) {
    baseArgs.push(`--window-position=${position.x},${position.y}`);
    baseArgs.push(`--window-size=${position.width},${position.height}`);
  }
  
  // Args comuns (sempre incluir)
  baseArgs.push(
    '--disable-blink-features=AutomationControlled',
    '--no-first-run',
    '--no-service-autorun',
    '--password-store=basic',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--no-default-browser-check',
    '--disable-sync',
    '--metrics-recording-only'
  );

  return baseArgs;
}

function getStealthScript() {
  return `
    // ============================================
    // STEALTH ANTI-DETECÇÃO
    // ============================================
    
    // Remover webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
    
    // Chrome runtime
    window.chrome = {
      runtime: {}
    };
    
    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );
    
    // Plugin array
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // Languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en']
    });
  `;
}

module.exports = {
  getOrCreateProfile,
  getStealthArgs,
  getStealthScript,
  PROFILES_DIR
};