# Extensões Chrome

## Buster Captcha Solver

A extensão Buster Captcha Solver já está disponível no projeto Cash_Hunters em:
`C:\Users\Bill\Downloads\Cash_Hunters_4.4.5\Mercado_Pago\Extensoes\Buster-Captcha`

### Instalação Automática

Para usar a extensão Buster com Puppeteer, adicione o caminho da extensão ao iniciar o navegador:

```javascript
const puppeteer = require('puppeteer-extra');

const browser = await puppeteer.launch({
  headless: false,
  args: [
    `--load-extension=C:\\Users\\Bill\\Downloads\\Cash_Hunters_4.4.5\\Mercado_Pago\\Extensoes\\Buster-Captcha`
  ]
});
```

### Funcionalidades

- Resolve reCAPTCHA v2 e Enterprise
- Usa método de áudio para resolver captchas
- Funciona automaticamente em sites com reCAPTCHA
- Sem custo - solução gratuita

### Integração com FastBot

A extensão será carregada automaticamente ao abrir navegadores via IPC handler `openBrowserGrid`.

## Extensões Customizadas

Crie extensões customizadas aqui para ações específicas do FastBot.

### Estrutura de Extensão

```
custom-extension/
├── manifest.json
├── content.js
├── background.js
└── icons/
```

### Exemplo: Remover Popups

Esta extensão pode remover automaticamente popups e banners de sites.

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "FastBot Popup Remover",
  "version": "1.0.0",
  "permissions": ["activeTab", "scripting"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

**content.js:**
```javascript
(function() {
  'use strict';
  
  const removePopups = () => {
    const popups = document.querySelectorAll('.modal, .popup, .overlay, .banner');
    popups.forEach(popup => popup.remove());
  };
  
  const observer = new MutationObserver(removePopups);
  observer.observe(document.body, { childList: true, subtree: true });
  
  removePopups();
})();
```

### Carregar Extensão Customizada

```javascript
const browser = await puppeteer.launch({
  args: [
    `--load-extension=C:\\Andre\\FastBot\\extensions\\custom-extension`
  ]
});
```
