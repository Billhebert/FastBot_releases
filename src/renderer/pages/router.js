// Sistema de Navegação

const ROUTER_PERMISSIONS =
  window.APP_PERMISSIONS || {
    dev: ["macros", "pix", "proxies", "passwords", "execute", "warmup", "registrations"],
    creator: ["macros", "pix"],
    consumer: ["proxies", "passwords", "pix", "execute"],
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
