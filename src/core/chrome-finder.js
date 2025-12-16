const fs = require('fs');

function findChrome() {
  const possiblePaths = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ]
  };

  const platform = process.platform;
  const paths = possiblePaths[platform] || [];

  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }

  throw new Error('Chrome não encontrado');
}

module.exports = { findChrome };