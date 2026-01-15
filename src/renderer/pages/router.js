// Sistema de Navegacao

const ROUTER_PERMISSIONS =
  window.APP_PERMISSIONS || {
    dev: ["macros", "pix", "proxies", "passwords", "execute", "settings", "pix-generator", "contas", "dolphin", "telas", "referral-links", "dashboard", "admin", "scheduler"],
    creator: ["macros", "pix", "settings", "pix-generator", "dashboard"],
    consumer: ["proxies", "passwords", "pix", "execute", "contas", "settings", "pix-generator", "dolphin", "telas", "referral-links", "dashboard", "scheduler"],
  };

const APP_VERSION = window.APP_VERSION || window.fastbotVersion || '1.0.5';
window.APP_VERSION = APP_VERSION;

(function ensureElectronBridge() {
  if (window.electronAPI) {
    if (!window.fastbotVersion) {
      window.fastbotVersion = APP_VERSION;
    }
    return;
  }

  try {
    if (typeof require !== 'function') {
      return;
    }

    const { ipcRenderer } = require('electron');
    if (!ipcRenderer) {
      return;
    }

    window.electronAPI = {
      startRecording: (options) => ipcRenderer.invoke('start-recording', options),
      stopRecording: () => ipcRenderer.invoke('stop-recording'),
      executeMacro: (config) => ipcRenderer.invoke('execute-macro', config),
      warmupProfile: (config) => ipcRenderer.invoke('warmup-profile', config),
      onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
      onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
      windowControls: {
        minimize: () => ipcRenderer.invoke('window-control', 'minimize'),
        maximize: () => ipcRenderer.invoke('window-control', 'maximize'),
        close: () => ipcRenderer.invoke('window-control', 'close'),
      },
      mobileShell: {
        create: (options) => ipcRenderer.invoke('mobile-shell:create', options),
        load: ({ id, url }) => ipcRenderer.invoke('mobile-shell:load', { id, url }),
        show: (id) => ipcRenderer.invoke('mobile-shell:show', id),
        focus: (id) => ipcRenderer.invoke('mobile-shell:focus', id),
        close: (id) => ipcRenderer.invoke('mobile-shell:close', id),
      },
    };

    if (!window.fastbotVersion) {
      try {
        const path = require('path');
        const pkg = require(path.resolve(__dirname, '../../../package.json'));
        window.fastbotVersion = pkg.version || APP_VERSION;
      } catch (versionError) {
        window.fastbotVersion = APP_VERSION;
      }
    }

    console.info('[Fastbot] electronAPI fallback habilitado via Node Integration.');
  } catch (bridgeError) {
    console.warn('[Fastbot] Nao foi possivel inicializar o fallback electronAPI:', bridgeError);
  }
})();

function navigate(page) {
  if (page === 'auth') {
    window.location.href = 'auth.html';
    return;
  }

  if (!hasPermission(page)) {
    alert('Voce nao tem permissao');
    return;
  }

  window.location.href = page + '.html';
}

function ensureLayoutFrame() {
  if (!document.body.classList.contains('app-layout')) {
    document.body.classList.add('app-layout');
  }
}

function createMenu(userOverride) {
  const safeGetUser = () => {
    try {
      return typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    } catch (error) {
      console.warn('createMenu: getCurrentUser falhou', error);
      return null;
    }
  };

  const user = userOverride || safeGetUser();
  ensureLayoutFrame();

  if (!user) {
    return `
      <aside class="app-sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">FB</div>
          <div>
            <strong>FASTBOT</strong>
            <p style="font-size:12px; letter-spacing:0.15em;">Auto Farm</p>
          </div>
        </div>

        <div class="sidebar-license">
          <p><strong>Versao ${APP_VERSION}</strong></p>
          <p>Conecte-se para acessar o menu completo.</p>
        </div>

        <div class="nav-stack">
          <button class="sidebar-btn active" onclick="navigate('auth')">
            <span class="nav-dot" aria-hidden="true"></span>
            <span>Ir para Login</span>
          </button>
        </div>

        <div class="sidebar-footer">
          <p>Sem usuario ativo. Clique em "Ir para Login".</p>
        </div>
      </aside>
    `;
  }

  const currentPage =
    (window.location.pathname.split('/').pop() || '').replace('.html', '');

  const navStructure = [
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'macros', label: user.role === 'dev' ? 'Criar macros' : 'Inicio' },
    { page: 'execute', label: 'Executar' },
    { page: 'scheduler', label: 'Agendamento' },
    { page: 'contas', label: 'Contas' },
    { page: 'passwords', label: 'Senhas' },
    { page: 'pix', label: 'Chaves PIX' },
    { page: 'pix-generator', label: 'Gerar PIX' },
    { page: 'proxies', label: 'Proxies' },
    { page: 'referral-links', label: 'Links de Indicacao' },
    { page: 'dolphin', label: 'Dolphin Anty' },
    { page: 'telas', label: 'Layout de Telas' },
    { page: 'settings', label: 'Configuracoes' },
    ...(user.role === 'dev' ? [{ page: 'admin', label: 'Administracao' }] : [])
  ];

  const userPermissions = ROUTER_PERMISSIONS[user.role] || [];

  const navButtons = navStructure
    .filter(({ page }) => userPermissions.includes(page))
    .map(
      ({ page, label }) => `
        <button class="sidebar-btn ${currentPage === page ? 'active' : ''}" onclick="navigate('${page}')">
          <span class="nav-dot" aria-hidden="true"></span>
          <span>${label}</span>
        </button>
      `
    )
    .join('');

  const roleLabel = (user.role || 'user').toUpperCase();
  const shortId = user.id ? `${user.id}`.slice(0, 6) : '000000';

  return `
    <aside class="app-sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">FB</div>
        <div>
          <strong>FASTBOT</strong>
          <p style="font-size:12px; letter-spacing:0.15em;">Auto Farm</p>
        </div>
      </div>

      <div class="sidebar-user">
        <p class="label">Usuario</p>
        <p class="value">${user.email}</p>
        <p class="label" style="margin-top:10px;">Perfil</p>
        <p class="value">${roleLabel}</p>
      </div>

      <div class="sidebar-license">
        <p><strong>Versao ${APP_VERSION}</strong></p>
        <p>Licenca vinculada ao ID ${shortId}...</p>
      </div>

      <div class="nav-stack">
        ${navButtons}
      </div>

      <div class="sidebar-footer">
        <p>Contato / Suporte</p>
        <button type="button" style="margin-top:8px;" onclick="logout()">
          Sair
        </button>
      </div>
    </aside>
  `;
}


(function initTitlebar() {
  const setup = () => {
    if (document.querySelector('.titlebar')) return;
    const bar = document.createElement('div');
    bar.className = 'titlebar';
    bar.innerHTML = `
      <div class="title">Fastbot</div>
      <div class="window-actions">
        <button class="win-btn minimize" title="Minimizar" aria-label="Minimizar">
          <svg width="10" height="2" viewBox="0 0 10 2" aria-hidden="true"><rect width="10" height="2" rx="1" /></svg>
        </button>
        <button class="win-btn maximize" title="Maximizar" aria-label="Maximizar">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke-width="2" /></svg>
        </button>
        <button class="win-btn close" title="Fechar" aria-label="Fechar">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <line x1="1" y1="1" x2="9" y2="9" stroke-width="2"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke-width="2"/>
          </svg>
        </button>
      </div>
    `;

    document.body.prepend(bar);

    if (!document.querySelector('.titlebar-spacer')) {
      const spacer = document.createElement('div');
      spacer.className = 'titlebar-spacer';
      document.body.insertBefore(spacer, bar.nextSibling);
    }

    const controls = window.electronAPI?.windowControls;
    if (!controls) return;

    bar.querySelector('.minimize')?.addEventListener('click', () => controls.minimize());
    bar.querySelector('.maximize')?.addEventListener('click', () => controls.maximize());
    bar.querySelector('.close')?.addEventListener('click', () => controls.close());

    bar.addEventListener('dblclick', () => controls.maximize());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

(function bootstrapSidebar() {
  const mount = () => {
    const container = document.getElementById('menu-container');
    if (!container) return;
    container.innerHTML = createMenu();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
