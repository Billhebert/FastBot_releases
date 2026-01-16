/**
 * Theme Manager
 * Sistema de temas claro/escuro com suporte a preferência do sistema
 */

class ThemeManager {
  constructor() {
    this.currentTheme = this.loadTheme();
    this.listeners = [];

    // Aplicar tema inicial
    this.applyTheme(this.currentTheme);

    // Observar mudanças na preferência do sistema
    this.watchSystemPreference();
  }

  /**
   * Carregar tema salvo ou usar padrão do sistema
   */
  loadTheme() {
    const saved = localStorage.getItem('fastbot_theme');
    if (saved && (saved === 'light' || saved === 'dark')) {
      return saved;
    }

    // Usar preferência do sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark'; // Padrão é escuro
  }

  /**
   * Salvar tema
   */
  saveTheme(theme) {
    localStorage.setItem('fastbot_theme', theme);
  }

  /**
   * Obter tema atual
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Alternar entre temas
   */
  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Definir tema específico
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn('Tema inválido:', theme);
      return;
    }

    this.currentTheme = theme;
    this.saveTheme(theme);
    this.applyTheme(theme);
    this.notifyListeners(theme);
  }

  /**
   * Aplicar tema ao DOM
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    // Atualizar meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0d0d0d' : '#f5f5f5');
    }
  }

  /**
   * Observar mudanças na preferência do sistema
   */
  watchSystemPreference() {
    if (!window.matchMedia) return;

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkModeQuery.addEventListener('change', (e) => {
      // Só aplicar se não houver preferência salva
      const saved = localStorage.getItem('fastbot_theme');
      if (!saved) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Adicionar listener para mudanças de tema
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notificar listeners
   */
  notifyListeners(theme) {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error('Erro no listener de tema:', error);
      }
    });
  }

  /**
   * Criar botão de alternância de tema
   */
  createToggleButton(containerId = null) {
    const button = document.createElement('button');
    button.className = 'theme-toggle-button';
    button.setAttribute('aria-label', 'Alternar tema');
    button.setAttribute('title', 'Alternar tema claro/escuro');

    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid #d4af37;
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      color: #d4af37;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      z-index: 1000;
    `;

    // Atualizar ícone
    const updateIcon = () => {
      button.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
    };

    updateIcon();

    // Hover effect
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1) rotate(15deg)';
      button.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) rotate(0deg)';
      button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    });

    // Toggle ao clicar
    button.addEventListener('click', () => {
      this.toggle();
      updateIcon();

      // Animação de feedback
      button.style.transform = 'scale(0.9) rotate(-15deg)';
      setTimeout(() => {
        button.style.transform = 'scale(1) rotate(0deg)';
      }, 200);
    });

    // Atualizar ícone quando tema mudar
    this.onChange(updateIcon);

    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(button);
      }
    } else {
      document.body.appendChild(button);
    }

    return button;
  }

  /**
   * Obter variáveis CSS do tema atual
   */
  getThemeColors() {
    const isDark = this.currentTheme === 'dark';

    return {
      // Background
      bgPrimary: isDark ? '#0d0d0d' : '#ffffff',
      bgSecondary: isDark ? '#1a1a1a' : '#f5f5f5',
      bgTertiary: isDark ? '#2a2a2a' : '#e0e0e0',

      // Text
      textPrimary: isDark ? '#ffffff' : '#1a1a1a',
      textSecondary: isDark ? '#cccccc' : '#4a4a4a',
      textTertiary: isDark ? '#888888' : '#757575',

      // Accent
      accent: '#d4af37',
      accentHover: '#c49a2a',

      // Status
      success: '#2ecc71',
      error: '#e74c3c',
      warning: '#f39c12',
      info: '#3498db',

      // Borders
      borderPrimary: isDark ? '#333333' : '#d0d0d0',
      borderSecondary: isDark ? '#444444' : '#c0c0c0',

      // Shadows
      shadowLight: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
      shadowMedium: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
      shadowHeavy: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.3)'
    };
  }

  /**
   * Injetar variáveis CSS
   */
  injectCSSVariables() {
    const colors = this.getThemeColors();
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--color-${cssVar}`, value);
    });
  }

  /**
   * Adicionar estilos de tema ao documento
   */
  injectThemeStyles() {
    const style = document.createElement('style');
    style.id = 'theme-styles';

    style.textContent = `
      /* Transição suave entre temas */
      body,
      .app-container,
      .app-sidebar,
      .main-content,
      .stat-card,
      .table-panel,
      .modal-content,
      .actions-bar {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }

      /* Tema Claro */
      body.theme-light {
        background: #f5f5f5;
        color: #1a1a1a;
      }

      body.theme-light .app-sidebar {
        background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%);
        border-right: 1px solid #d0d0d0;
      }

      body.theme-light .main-content {
        background: #ffffff;
      }

      body.theme-light .stat-card,
      body.theme-light .table-panel,
      body.theme-light .actions-bar {
        background: #ffffff;
        border: 1px solid #d0d0d0;
        color: #1a1a1a;
      }

      body.theme-light table thead {
        background: #f5f5f5;
      }

      body.theme-light table tbody tr {
        border-bottom: 1px solid #e0e0e0;
      }

      body.theme-light table tbody tr:hover {
        background: rgba(212, 175, 55, 0.1);
      }

      body.theme-light input,
      body.theme-light select,
      body.theme-light textarea {
        background: #ffffff;
        border: 1px solid #d0d0d0;
        color: #1a1a1a;
      }

      body.theme-light input:focus,
      body.theme-light select:focus,
      body.theme-light textarea:focus {
        border-color: #d4af37;
      }

      body.theme-light .modal {
        background: rgba(0, 0, 0, 0.5);
      }

      body.theme-light .modal-content {
        background: #ffffff;
        border: 1px solid #d0d0d0;
        color: #1a1a1a;
      }

      body.theme-light .empty-state {
        color: #757575;
      }

      body.theme-light .sidebar-btn {
        color: #4a4a4a;
      }

      body.theme-light .sidebar-btn:hover {
        background: rgba(212, 175, 55, 0.1);
      }

      body.theme-light .sidebar-btn.active {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
      }

      /* Tema Escuro (padrão já existe) */
      body.theme-dark {
        /* Manter estilos atuais */
      }

      /* Botão de tema no modo claro */
      body.theme-light .theme-toggle-button {
        background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
        border: 2px solid #d4af37;
        color: #d4af37;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }
    `;

    document.head.appendChild(style);
  }
}

// Criar instância global
const themeManager = new ThemeManager();
window.themeManager = themeManager;

// Injetar variáveis CSS
themeManager.injectCSSVariables();
themeManager.injectThemeStyles();

// Atualizar variáveis quando tema mudar
themeManager.onChange(() => {
  themeManager.injectCSSVariables();
});

// Criar botão de toggle (aguardar DOM)
document.addEventListener('DOMContentLoaded', () => {
  // Criar botão de alternância
  themeManager.createToggleButton();

  // Log
  console.log('[ThemeManager] Tema atual:', themeManager.getTheme());
});

console.log('[ThemeManager] Sistema de temas inicializado');
