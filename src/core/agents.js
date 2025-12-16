/**
 * SISTEMA DE AGENTES ROTATIVOS
 * Cada instÃ¢ncia usa um fingerprint Ãºnico para evitar detecÃ§Ã£o
 */

const AGENTS = [
  // ============================================
  // AGENTES DESKTOP (1-12)
  // ============================================
  
  // AGENTE 1 - Windows 10, Chrome 131
  {
    id: 1,
    name: "Agent_WIN10_Chrome131",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 1920, height: 1080 },
    timezone: "America/New_York",
    webglVendor: "Intel Inc.",
    webglRenderer: "Intel(R) UHD Graphics 630",
    languages: ["en-US", "en", "pt-BR", "pt"]
  },
  
  // AGENTE 2 - Windows 11, Chrome 130
  {
    id: 2,
    name: "Agent_WIN11_Chrome130",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 16,
    hardwareConcurrency: 12,
    screenResolution: { width: 2560, height: 1440 },
    timezone: "America/Los_Angeles",
    webglVendor: "NVIDIA Corporation",
    webglRenderer: "NVIDIA GeForce RTX 3060",
    languages: ["en-US", "en"]
  },
  
  // AGENTE 3 - Mac OS, Chrome 131
  {
    id: 3,
    name: "Agent_MacOS_Chrome131",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "MacIntel",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 1440, height: 900 },
    timezone: "America/Chicago",
    webglVendor: "Intel Inc.",
    webglRenderer: "Intel Iris OpenGL Engine",
    languages: ["en-US", "en", "es-US", "es"]
  },
  
  // AGENTE 4 - Windows 10, Chrome 129
  {
    id: 4,
    name: "Agent_WIN10_Chrome129",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 4,
    hardwareConcurrency: 4,
    screenResolution: { width: 1366, height: 768 },
    timezone: "America/Sao_Paulo",
    webglVendor: "Intel Inc.",
    webglRenderer: "Intel(R) HD Graphics 620",
    languages: ["pt-BR", "pt", "en-US", "en"]
  },
  
  // AGENTE 5 - Linux Ubuntu, Chrome 131
  {
    id: 5,
    name: "Agent_Linux_Chrome131",
    type: "desktop",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "Linux x86_64",
    vendor: "Google Inc.",
    deviceMemory: 16,
    hardwareConcurrency: 16,
    screenResolution: { width: 1920, height: 1080 },
    timezone: "Europe/London",
    webglVendor: "AMD",
    webglRenderer: "AMD Radeon RX 6800",
    languages: ["en-GB", "en"]
  },
  
  // AGENTE 6 - Windows 11, Edge 131
  {
    id: 6,
    name: "Agent_WIN11_Edge131",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 6,
    screenResolution: { width: 1600, height: 900 },
    timezone: "America/Denver",
    webglVendor: "Intel Inc.",
    webglRenderer: "Intel(R) Iris(R) Xe Graphics",
    languages: ["en-US", "en"]
  },
  
  // AGENTE 7 - Mac OS M1, Safari-based Chrome
  {
    id: 7,
    name: "Agent_MacM1_Chrome131",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "MacIntel",
    vendor: "Google Inc.",
    deviceMemory: 16,
    hardwareConcurrency: 8,
    screenResolution: { width: 2880, height: 1800 },
    timezone: "America/Phoenix",
    webglVendor: "Apple Inc.",
    webglRenderer: "Apple M1",
    languages: ["en-US", "en", "fr-FR", "fr"]
  },
  
  // AGENTE 8 - Windows 10, Chrome 128
  {
    id: 8,
    name: "Agent_WIN10_Chrome128",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 4,
    screenResolution: { width: 1680, height: 1050 },
    timezone: "America/Toronto",
    webglVendor: "NVIDIA Corporation",
    webglRenderer: "NVIDIA GeForce GTX 1650",
    languages: ["en-CA", "en", "fr-CA", "fr"]
  },
  
  // AGENTE 9 - Linux Mint, Chrome 130
  {
    id: 9,
    name: "Agent_Linux_Chrome130",
    type: "desktop",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    platform: "Linux x86_64",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 1920, height: 1200 },
    timezone: "Europe/Berlin",
    webglVendor: "Intel Inc.",
    webglRenderer: "Mesa Intel(R) UHD Graphics 630",
    languages: ["de-DE", "de", "en-US", "en"]
  },
  
  // AGENTE 10 - Windows 11, Chrome 131
  {
    id: 10,
    name: "Agent_WIN11_Chrome131_2",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 32,
    hardwareConcurrency: 16,
    screenResolution: { width: 3840, height: 2160 },
    timezone: "Asia/Tokyo",
    webglVendor: "NVIDIA Corporation",
    webglRenderer: "NVIDIA GeForce RTX 4090",
    languages: ["ja-JP", "ja", "en-US", "en"]
  },
  
  // AGENTE 11 - Mac OS, Chrome 130
  {
    id: 11,
    name: "Agent_MacOS_Chrome130",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    platform: "MacIntel",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 4,
    screenResolution: { width: 1920, height: 1080 },
    timezone: "Australia/Sydney",
    webglVendor: "Intel Inc.",
    webglRenderer: "Intel Iris Pro OpenGL Engine",
    languages: ["en-AU", "en"]
  },
  
  // AGENTE 12 - Windows 10, Chrome 131 (Brasil)
  {
    id: 12,
    name: "Agent_WIN10_Brazil",
    type: "desktop",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 1920, height: 1080 },
    timezone: "America/Sao_Paulo",
    webglVendor: "AMD",
    webglRenderer: "AMD Radeon RX 580",
    languages: ["pt-BR", "pt"]
  },

  // ============================================
  // AGENTES MOBILE (13-24)
  // ============================================
  
  // AGENTE 13 - iPhone 15 Pro Max
  {
    id: 13,
    name: "Mobile_iPhone15ProMax",
    type: "mobile",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    vendor: "Apple Computer, Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 6,
    screenResolution: { width: 430, height: 932 },
    timezone: "America/New_York",
    webglVendor: "Apple Inc.",
    webglRenderer: "Apple A17 Pro GPU",
    languages: ["en-US", "en"],
    deviceModel: "iPhone15,3"
  },
  
  // AGENTE 14 - Samsung Galaxy S24 Ultra
  {
    id: 14,
    name: "Mobile_GalaxyS24Ultra",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 12,
    hardwareConcurrency: 8,
    screenResolution: { width: 440, height: 956 },
    timezone: "America/Los_Angeles",
    webglVendor: "Qualcomm",
    webglRenderer: "Adreno (TM) 750",
    languages: ["en-US", "en"],
    deviceModel: "SM-S928B"
  },
  
  // AGENTE 15 - iPhone 14 Pro
  {
    id: 15,
    name: "Mobile_iPhone14Pro",
    type: "mobile",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    vendor: "Apple Computer, Inc.",
    deviceMemory: 6,
    hardwareConcurrency: 6,
    screenResolution: { width: 393, height: 852 },
    timezone: "America/Chicago",
    webglVendor: "Apple Inc.",
    webglRenderer: "Apple A16 Bionic GPU",
    languages: ["en-US", "en", "es-US", "es"],
    deviceModel: "iPhone15,2"
  },
  
  // AGENTE 16 - Xiaomi 14 Pro (Brasil)
  {
    id: 16,
    name: "Mobile_Xiaomi14Pro_BR",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 14; 23116PN5BC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 12,
    hardwareConcurrency: 8,
    screenResolution: { width: 412, height: 915 },
    timezone: "America/Sao_Paulo",
    webglVendor: "Qualcomm",
    webglRenderer: "Adreno (TM) 740",
    languages: ["pt-BR", "pt", "en-US", "en"],
    deviceModel: "23116PN5BC"
  },
  
  // AGENTE 17 - Google Pixel 8 Pro
  {
    id: 17,
    name: "Mobile_Pixel8Pro",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 12,
    hardwareConcurrency: 9,
    screenResolution: { width: 412, height: 892 },
    timezone: "Europe/London",
    webglVendor: "ARM",
    webglRenderer: "Mali-G715",
    languages: ["en-GB", "en"],
    deviceModel: "Pixel 8 Pro"
  },
  
  // AGENTE 18 - iPhone 13
  {
    id: 18,
    name: "Mobile_iPhone13",
    type: "mobile",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.7 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    vendor: "Apple Computer, Inc.",
    deviceMemory: 4,
    hardwareConcurrency: 6,
    screenResolution: { width: 390, height: 844 },
    timezone: "America/Denver",
    webglVendor: "Apple Inc.",
    webglRenderer: "Apple A15 Bionic GPU",
    languages: ["en-US", "en"],
    deviceModel: "iPhone14,5"
  },
  
  // AGENTE 19 - OnePlus 12
  {
    id: 19,
    name: "Mobile_OnePlus12",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 14; CPH2573) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 16,
    hardwareConcurrency: 8,
    screenResolution: { width: 450, height: 1008 },
    timezone: "America/Phoenix",
    webglVendor: "Qualcomm",
    webglRenderer: "Adreno (TM) 750",
    languages: ["en-US", "en"],
    deviceModel: "CPH2573"
  },
  
  // AGENTE 20 - Samsung Galaxy A54 (CanadÃ¡)
  {
    id: 20,
    name: "Mobile_GalaxyA54_CA",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 412, height: 914 },
    timezone: "America/Toronto",
    webglVendor: "ARM",
    webglRenderer: "Mali-G68",
    languages: ["en-CA", "en", "fr-CA", "fr"],
    deviceModel: "SM-A546B"
  },
  
  // AGENTE 21 - Motorola Edge 40 Pro (Alemanha)
  {
    id: 21,
    name: "Mobile_MotoEdge40_DE",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 13; motorola edge 40 pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 12,
    hardwareConcurrency: 8,
    screenResolution: { width: 412, height: 892 },
    timezone: "Europe/Berlin",
    webglVendor: "Qualcomm",
    webglRenderer: "Adreno (TM) 730",
    languages: ["de-DE", "de", "en-US", "en"],
    deviceModel: "XT2301-4"
  },
  
  // AGENTE 22 - iPhone 12 (JapÃ£o)
  {
    id: 22,
    name: "Mobile_iPhone12_JP",
    type: "mobile",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    vendor: "Apple Computer, Inc.",
    deviceMemory: 4,
    hardwareConcurrency: 6,
    screenResolution: { width: 390, height: 844 },
    timezone: "Asia/Tokyo",
    webglVendor: "Apple Inc.",
    webglRenderer: "Apple A14 Bionic GPU",
    languages: ["ja-JP", "ja", "en-US", "en"],
    deviceModel: "iPhone13,2"
  },
  
  // AGENTE 23 - Samsung Galaxy S23 (AustrÃ¡lia)
  {
    id: 23,
    name: "Mobile_GalaxyS23_AU",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 412, height: 892 },
    timezone: "Australia/Sydney",
    webglVendor: "Qualcomm",
    webglRenderer: "Adreno (TM) 740",
    languages: ["en-AU", "en"],
    deviceModel: "SM-S911B"
  },
  
  // AGENTE 24 - Redmi Note 13 Pro (Brasil)
  {
    id: 24,
    name: "Mobile_RedmiNote13Pro_BR",
    type: "mobile",
    userAgent: "Mozilla/5.0 (Linux; Android 13; 23090RA98C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    deviceMemory: 8,
    hardwareConcurrency: 8,
    screenResolution: { width: 412, height: 915 },
    timezone: "America/Sao_Paulo",
    webglVendor: "ARM",
    webglRenderer: "Mali-G615",
    languages: ["pt-BR", "pt"],
    deviceModel: "23090RA98C"
  }
];

/**
 * Pega agente por Ã­ndice de instÃ¢ncia e tipo de device
 */
function getAgentByInstance(instanceIndex, deviceType = 'desktop') {
  // Filtrar agentes por tipo
  const agentsByType = AGENTS.filter(a => a.type === deviceType);
  
  if (agentsByType.length === 0) {
    console.warn(`âš ï¸  Nenhum agente encontrado para tipo: ${deviceType}`);
    return AGENTS[instanceIndex % AGENTS.length];
  }
  
  const agentIndex = instanceIndex % agentsByType.length;
  const agent = agentsByType[agentIndex];
  
  console.log(`AGENTE ${agent.id}: ${agent.name}`);
  console.log(`Type: ${agent.type.toUpperCase()}`);
  console.log(`Platform: ${agent.platform}`);
  console.log(`GPU: ${agent.webglRenderer}`);
  console.log(`Screen: ${agent.screenResolution.width}x${agent.screenResolution.height}`);
  console.log(`Timezone: ${agent.timezone}`);
  if (agent.deviceModel) {
    console.log(`Model: ${agent.deviceModel}`);
  }
  
  return agent;
}

/**
 * Gera script de fingerprint Ãºnico para cada agente
 */
function getAgentFingerprintScript(agent) {
  return `
    // ============================================
    // FINGERPRINT ÃšNICO - ${agent.name}
    // ============================================
    
    // User Agent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => "${agent.userAgent}"
    });
    
    // Platform
    Object.defineProperty(navigator, 'platform', {
      get: () => "${agent.platform}"
    });
    
    // Vendor
    Object.defineProperty(navigator, 'vendor', {
      get: () => "${agent.vendor}"
    });
    
    // Device Memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => ${agent.deviceMemory}
    });
    
    // Hardware Concurrency (CPU cores)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => ${agent.hardwareConcurrency}
    });
    
    // Languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ${JSON.stringify(agent.languages)}
    });
    
    Object.defineProperty(navigator, 'language', {
      get: () => "${agent.languages[0]}"
    });
    
    // Screen Resolution
    Object.defineProperty(screen, 'width', {
      get: () => ${agent.screenResolution.width}
    });
    
    Object.defineProperty(screen, 'height', {
      get: () => ${agent.screenResolution.height}
    });
    
    Object.defineProperty(screen, 'availWidth', {
      get: () => ${agent.screenResolution.width}
    });
    
    Object.defineProperty(screen, 'availHeight', {
      get: () => ${agent.screenResolution.height - 40}
    });
    
    // WebGL Fingerprint
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return "${agent.webglVendor}";
      if (parameter === 37446) return "${agent.webglRenderer}";
      return getParameter.call(this, parameter);
    };
    
    // Timezone
    Date.prototype.getTimezoneOffset = function() {
      const offsets = {
        'America/Sao_Paulo': 180,
        'America/New_York': 300,
        'America/Los_Angeles': 480,
        'America/Chicago': 360,
        'America/Denver': 420,
        'America/Phoenix': 420,
        'America/Toronto': 300,
        'Europe/London': 0,
        'Europe/Berlin': -60,
        'Asia/Tokyo': -540,
        'Australia/Sydney': -660
      };
      return offsets["${agent.timezone}"] || 0;
    };
    
    // WebDriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    delete navigator.__proto__.webdriver;
    
    // Chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {}
    };
    
    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' 
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );
    
    // Battery
    Object.defineProperty(navigator, 'getBattery', {
      get: () => async () => ({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 0.8 + Math.random() * 0.2,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true
      })
    });
    
    // Canvas Fingerprint - Adiciona ruÃ­do Ãºnico
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      if (type === 'image/png' && this.width > 0 && this.height > 0) {
        const context = this.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          const noise = ${agent.id}; // RuÃ­do Ãºnico por agente
          
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = imageData.data[i] + (noise % 3) - 1;
            imageData.data[i + 1] = imageData.data[i + 1] + ((noise * 2) % 3) - 1;
            imageData.data[i + 2] = imageData.data[i + 2] + ((noise * 3) % 3) - 1;
          }
          
          context.putImageData(imageData, 0, 0);
        }
      }
      return originalToDataURL.apply(this, arguments);
    };
    
    console.log('ðŸ¤– Agente ${agent.name} ativado!');
  `;
}

module.exports = {
  AGENTS,
  getAgentByInstance,
  getAgentFingerprintScript
};