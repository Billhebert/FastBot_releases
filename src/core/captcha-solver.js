async function waitForManualCaptcha(page) {
  
  // Aguardar atÃ© URL mudar (sair da pÃ¡gina do captcha)
  const currentUrl = page.url();
  
  while (true) {
    await page.waitForTimeout(1000);
    
    const newUrl = page.url();
    
    // Captcha resolvido se URL mudou
    if (!newUrl.includes('/sorry/') && newUrl !== currentUrl) {
      console.log(' CAPTCHA resolvido! Continuando...\n');
      await page.waitForTimeout(2000);
      break;
    }
    
    // Verificar se elemento de captcha sumiu
    const hasCaptcha = await page.evaluate(() => {
      return document.querySelector('iframe[src*="recaptcha"]') !== null ||
             document.querySelector('#captcha-form') !== null;
    });
    
    if (!hasCaptcha && !newUrl.includes('/sorry/')) {
      console.log(' CAPTCHA resolvido! Continuando...\n');
      await page.waitForTimeout(2000);
      break;
    }
  }
}

async function checkForCaptcha(page) {
  const url = page.url();
  
  if (url.includes('/sorry/') || url.includes('captcha')) {
    await waitForManualCaptcha(page);
    return true;
  }
  
  const hasCaptcha = await page.evaluate(() => {
    return document.querySelector('iframe[src*="recaptcha"]') !== null ||
           document.querySelector('#captcha-form') !== null;
  });
  
  if (hasCaptcha) {
    await waitForManualCaptcha(page);
    return true;
  }
  
  return false;
}

module.exports = { checkForCaptcha, waitForManualCaptcha };