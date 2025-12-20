const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * BUSTER - Extensao GRATUITA que resolve CAPTCHAs
 * Funciona com reCAPTCHA v2 e hCaptcha
 * Download: https://github.com/dessant/buster
 */

const BUSTER_EXTENSION_PATH = path.join(os.homedir(), '.chrome-macro-profiles', 'extensions', 'buster');

/**
 * Baixa e instala extensao Buster automaticamente
 */
async function downloadBusterExtension() {
  const axios = require('axios');
  const AdmZip = require('adm-zip');
  
  console.log(' Baixando Buster (extensao gratuita de CAPTCHA)...');
  
  const BUSTER_URL = 'https://github.com/dessant/buster/releases/download/v2.0.1/buster-2.0.1-chromium.zip';
  
  try {
    // Criar diretorio se nao existir
    if (!fs.existsSync(BUSTER_EXTENSION_PATH)) {
      fs.mkdirSync(BUSTER_EXTENSION_PATH, { recursive: true });
    }
    
    // Verificar se ja baixou
    if (fs.existsSync(path.join(BUSTER_EXTENSION_PATH, 'manifest.json'))) {
      console.log(' Buster ja instalado!');
      return BUSTER_EXTENSION_PATH;
    }
    
    // Baixar
    const response = await axios.get(BUSTER_URL, { responseType: 'arraybuffer' });
    const zipPath = path.join(BUSTER_EXTENSION_PATH, 'buster.zip');
    
    fs.writeFileSync(zipPath, response.data);
    
    // Extrair
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(BUSTER_EXTENSION_PATH, true);
    
    // Remover zip
    fs.unlinkSync(zipPath);
    
    console.log(' Buster instalado com sucesso!');
    return BUSTER_EXTENSION_PATH;
    
  } catch (error) {
    console.error(' Erro ao baixar Buster:', error.message);
    console.log(' Baixe manualmente: https://github.com/dessant/buster/releases');
    return null;
  }
}

/**
 * Aguarda Buster resolver CAPTCHA automaticamente
 */
async function waitForBusterSolve(page) {
  console.log(' Aguardando Buster resolver CAPTCHA...');
  
  const startTime = Date.now();
  const timeout = 120000; // 2 minutos
  
  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(2000);
    
    // Verificar se CAPTCHA sumiu
    const hasCaptcha = await page.evaluate(() => {
      return document.querySelector('iframe[src*="recaptcha"]') !== null;
    });
    
    if (!hasCaptcha) {
      console.log(' CAPTCHA resolvido pelo Buster!');
      return true;
    }
    
    // Verificar se mudou de pagina
    const url = page.url();
    if (!url.includes('google.com/sorry') && !url.includes('recaptcha')) {
      console.log(' Navegacao bem-sucedida!');
      return true;
    }
  }
  
  console.log('  Timeout: Buster nao conseguiu resolver em 2 minutos');
  return false;
}

/**
 * Configuracao de launch do Puppeteer com Buster
 */
async function getLaunchOptionsWithBuster(baseOptions) {
  const extensionPath = await downloadBusterExtension();
  
  if (extensionPath) {
    // Adicionar extensao aos args
    if (!baseOptions.args) baseOptions.args = [];
    
    baseOptions.args.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    );
    
    console.log(' Buster habilitado!');
  }
  
  return baseOptions;
}

module.exports = {
  downloadBusterExtension,
  waitForBusterSolve,
  getLaunchOptionsWithBuster
};