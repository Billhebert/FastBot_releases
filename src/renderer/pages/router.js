// Sistema de Navegação

const ROUTER_PERMISSIONS =
  window.APP_PERMISSIONS || {
    dev: ["macros", "pix", "proxies", "passwords", "execute", "warmup", "registrations"],
    creator: ["macros", "pix"],
    consumer: ["proxies", "passwords", "pix", "execute", "registrations"],
  };

function navigate(page) {
  if (page === 'auth') {
    window.location.href = 'auth.html';
    return;
  }

  if (!hasPermission(page)) {
    alert('Você não tem permissão');
    return;
  }

  window.location.href = page + '.html';
}

function createMenu() {
  const user = getCurrentUser();
  if (!user) return '';

  const userPermissions = ROUTER_PERMISSIONS[user.role] || [];
  const menuItems = [];

  if (userPermissions.includes('macros')) {
    menuItems.push('<button onclick="navigate(\'macros\')">Macros</button>');
  }
  if (userPermissions.includes('pix')) {
    menuItems.push('<button onclick="navigate(\'pix\')">PIX</button>');
  }
  if (userPermissions.includes('proxies')) {
    menuItems.push('<button onclick="navigate(\'proxies\')">Proxies</button>');
  }
  if (userPermissions.includes('passwords')) {
    menuItems.push('<button onclick="navigate(\'passwords\')">Senhas</button>');
  }
  if (userPermissions.includes('execute')) {
    menuItems.push('<button onclick="navigate(\'execute\')">Executar</button>');
  }
  if (userPermissions.includes('warmup')) {
    menuItems.push('<button onclick="navigate(\'warmup\')">🔥 Aquecer</button>');
  }
  if (userPermissions.includes('registrations')) {
    menuItems.push('<button onclick="navigate(\'registrations\')">Cadastros</button>');
  }

  menuItems.push('<button onclick="logout()">Sair</button>');

  return `
    <nav class="menu">
      <div class="user-info">${user.email} (${user.role})</div>
      ${menuItems.join('')}
    </nav>
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
