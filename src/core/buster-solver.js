const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * BUSTER - ExtensÃ£o GRATUITA que resolve CAPTCHAs
 * Funciona com reCAPTCHA v2 e hCaptcha
 * Download: https://github.com/dessant/buster
 */

const BUSTER_EXTENSION_PATH = path.join(os.homedir(), '.chrome-macro-profiles', 'extensions', 'buster');

/**
 * Baixa e instala extensÃ£o Buster automaticamente
 */
async function downloadBusterExtension() {
  const axios = require('axios');
  const AdmZip = require('adm-zip');
  
  console.log('ðŸ“¥ Baixando Buster (extensÃ£o gratuita de CAPTCHA)...');
  
  const BUSTER_URL = 'https://github.com/dessant/buster/releases/download/v2.0.1/buster-2.0.1-chromium.zip';
  
  try {
    // Criar diretÃ³rio se nÃ£o existir
    if (!fs.existsSync(BUSTER_EXTENSION_PATH)) {
      fs.mkdirSync(BUSTER_EXTENSION_PATH, { recursive: true });
    }
    
    // Verificar se jÃ¡ baixou
    if (fs.existsSync(path.join(BUSTER_EXTENSION_PATH, 'manifest.json'))) {
      console.log('âœ… Buster jÃ¡ instalado!');
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
    
    console.log('âœ… Buster instalado com sucesso!');
    return BUSTER_EXTENSION_PATH;
    
  } catch (error) {
    console.error('âŒ Erro ao baixar Buster:', error.message);
    console.log('ðŸ’¡ Baixe manualmente: https://github.com/dessant/buster/releases');
    return null;
  }
}

/**
 * Aguarda Buster resolver CAPTCHA automaticamente
 */
async function waitForBusterSolve(page) {
  console.log('ðŸ¤– Aguardando Buster resolver CAPTCHA...');
  
  const startTime = Date.now();
  const timeout = 120000; // 2 minutos
  
  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(2000);
    
    // Verificar se CAPTCHA sumiu
    const hasCaptcha = await page.evaluate(() => {
      return document.querySelector('iframe[src*="recaptcha"]') !== null;
    });
    
    if (!hasCaptcha) {
      console.log('âœ… CAPTCHA resolvido pelo Buster!');
      return true;
    }
    
    // Verificar se mudou de pÃ¡gina
    const url = page.url();
    if (!url.includes('google.com/sorry') && !url.includes('recaptcha')) {
      console.log('âœ… NavegaÃ§Ã£o bem-sucedida!');
      return true;
    }
  }
  
  console.log('âš ï¸  Timeout: Buster nÃ£o conseguiu resolver em 2 minutos');
  return false;
}

/**
 * ConfiguraÃ§Ã£o de launch do Puppeteer com Buster
 */
async function getLaunchOptionsWithBuster(baseOptions) {
  const extensionPath = await downloadBusterExtension();
  
  if (extensionPath) {
    // Adicionar extensÃ£o aos args
    if (!baseOptions.args) baseOptions.args = [];
    
    baseOptions.args.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    );
    
    console.log('âœ… Buster habilitado!');
  }
  
  return baseOptions;
}

module.exports = {
  downloadBusterExtension,
  waitForBusterSolve,
  getLaunchOptionsWithBuster
};