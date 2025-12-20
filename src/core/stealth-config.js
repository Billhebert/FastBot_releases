const os = require('os');
const path = require('path');
const fs = require('fs');

// Diretrio de perfis separados mas PERSISTENTES
const PROFILES_DIR = path.join(os.homedir(), '.chrome-macro-profiles');

// Garantir que diretrio existe
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  console.log(' Diretrio de perfis criado:', PROFILES_DIR);
}

function getOrCreateProfile(instanceIndex) {
  const profilePath = path.join(PROFILES_DIR, `profile-${instanceIndex}`);
  
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
    console.log(` Criando novo perfil persistente: profile-${instanceIndex}`);
  } else {
    console.log(` Usando perfil persistente existente: profile-${instanceIndex}`);
  }
  
  return profilePath;
}

function getStealthArgs(device, position) {
  // CORREO: Verificar se position  null ou undefined
  const baseArgs = [];
  
  // S adicionar window-position e window-size se position existir
  if (position && typeof position === 'object' && position.x !== undefined) {
    baseArgs.push(`--window-position=${position.x},${position.y}`);
    baseArgs.push(`--window-size=${position.width},${position.height}`);
  }
  
  // Args comuns (sempre incluir)
  baseArgs.push(

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
    '--metrics-recording-only',
    '--disable-infobars',
    '--test-type'
  );

  return baseArgs;
}

function getStealthScript() {
  return `
    // ============================================
    // STEALTH ANTI-DETECO
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
