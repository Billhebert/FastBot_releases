/**
 * Tutorial Interativo
 * Sistema de onboarding e tours guiados
 */

class TutorialManager {
  constructor() {
    this.currentStep = 0;
    this.currentTutorial = null;
    this.overlay = null;
    this.spotlight = null;
    this.tooltip = null;
    this.isActive = false;

    this.tutorials = {
      'first-steps': {
        name: 'Primeiros Passos',
        steps: [
          {
            title: 'Bem-vindo ao FastBot!',
            content: 'Vamos começar um tour rápido pelas principais funcionalidades.',
            target: null,
            position: 'center',
            showNext: true,
            showSkip: true
          },
          {
            title: 'Menu de Navegação',
            content: 'Aqui você encontra todas as páginas do sistema. Use o menu para navegar entre as funcionalidades.',
            target: '.app-sidebar',
            position: 'right',
            highlightClass: 'tutorial-highlight'
          },
          {
            title: 'Dashboard',
            content: 'O Dashboard mostra estatísticas e gráficos sobre suas execuções, contas e links de indicação.',
            target: 'button[onclick="navigate(\'dashboard\')"]',
            position: 'right'
          },
          {
            title: 'Macros',
            content: 'Aqui você cria e gerencia macros de automação. Macros são sequências gravadas de ações no navegador.',
            target: 'button[onclick="navigate(\'macros\')"]',
            position: 'right'
          },
          {
            title: 'Executar',
            content: 'Nesta página você executa seus macros, escolhendo quantas instâncias rodar em paralelo.',
            target: 'button[onclick="navigate(\'execute\')"]',
            position: 'right'
          },
          {
            title: 'Links de Indicação',
            content: 'Cadastre seus links de indicação aqui. Eles serão usados automaticamente nas execuções.',
            target: 'button[onclick="navigate(\'referral-links\')"]',
            position: 'right'
          },
          {
            title: 'Tutorial Completo!',
            content: 'Agora você conhece as principais funcionalidades. Explore o sistema e boa sorte!',
            target: null,
            position: 'center',
            showFinish: true
          }
        ]
      },
      'create-macro': {
        name: 'Como Criar um Macro',
        steps: [
          {
            title: 'Criar Novo Macro',
            content: 'Clique no botão "Novo Macro" para começar a gravar uma automação.',
            target: '#btn-new-macro',
            position: 'bottom'
          },
          {
            title: 'Preencher Informações',
            content: 'Dê um nome descritivo e selecione a casa (plataforma) que você vai automatizar.',
            target: '#macro-form',
            position: 'right'
          },
          {
            title: 'Iniciar Gravação',
            content: 'Clique em "Iniciar Gravação". Uma nova janela do navegador será aberta.',
            target: '#btn-start-recording',
            position: 'bottom'
          },
          {
            title: 'Realizar Ações',
            content: 'Faça todas as ações que você quer automatizar. O sistema gravará automaticamente.',
            target: null,
            position: 'center'
          },
          {
            title: 'Parar Gravação',
            content: 'Quando terminar, clique em "Parar Gravação". Seu macro será salvo automaticamente.',
            target: '#btn-stop-recording',
            position: 'bottom'
          }
        ]
      },
      'execute-macro': {
        name: 'Como Executar um Macro',
        steps: [
          {
            title: 'Selecionar Macro',
            content: 'Escolha o macro que você quer executar na lista.',
            target: '#macro-select',
            position: 'bottom'
          },
          {
            title: 'Configurar Instâncias',
            content: 'Defina quantas instâncias você quer rodar em paralelo (1-10).',
            target: '#instances-input',
            position: 'top'
          },
          {
            title: 'Escolher Recursos',
            content: 'Selecione proxies, chaves PIX e links de indicação que serão usados.',
            target: '#resources-panel',
            position: 'left'
          },
          {
            title: 'Iniciar Execução',
            content: 'Clique em "Executar" para iniciar. Você verá o progresso em tempo real.',
            target: '#btn-execute',
            position: 'top'
          }
        ]
      }
    };
  }

  /**
   * Verificar se é primeira vez do usuário
   */
  isFirstTime() {
    return !localStorage.getItem('fastbot_tutorial_completed');
  }

  /**
   * Marcar tutorial como concluído
   */
  markCompleted(tutorialId) {
    const completed = JSON.parse(localStorage.getItem('fastbot_tutorials_completed') || '[]');
    if (!completed.includes(tutorialId)) {
      completed.push(tutorialId);
      localStorage.setItem('fastbot_tutorials_completed', JSON.stringify(completed));
    }

    if (tutorialId === 'first-steps') {
      localStorage.setItem('fastbot_tutorial_completed', 'true');
    }
  }

  /**
   * Verificar se tutorial foi concluído
   */
  isCompleted(tutorialId) {
    const completed = JSON.parse(localStorage.getItem('fastbot_tutorials_completed') || '[]');
    return completed.includes(tutorialId);
  }

  /**
   * Iniciar tutorial
   */
  start(tutorialId) {
    const tutorial = this.tutorials[tutorialId];
    if (!tutorial) {
      console.error(`Tutorial "${tutorialId}" não encontrado`);
      return;
    }

    this.currentTutorial = tutorialId;
    this.currentStep = 0;
    this.isActive = true;

    this.createOverlay();
    this.showStep(0);
  }

  /**
   * Criar overlay escuro
   */
  createOverlay() {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'tutorial-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      transition: opacity 0.3s;
    `;

    // Spotlight (área iluminada)
    this.spotlight = document.createElement('div');
    this.spotlight.className = 'tutorial-spotlight';
    this.spotlight.style.cssText = `
      position: fixed;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid #d4af37;
      border-radius: 8px;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      transition: all 0.3s ease;
    `;

    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tutorial-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border: 2px solid #d4af37;
      border-radius: 12px;
      padding: 25px;
      max-width: 400px;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      color: #fff;
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.spotlight);
    document.body.appendChild(this.tooltip);

    // Fechar ao clicar no overlay (opcional)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.skip();
      }
    });
  }

  /**
   * Mostrar step do tutorial
   */
  showStep(stepIndex) {
    const tutorial = this.tutorials[this.currentTutorial];
    if (!tutorial) return;

    const step = tutorial.steps[stepIndex];
    if (!step) return;

    this.currentStep = stepIndex;

    // Atualizar spotlight
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        this.spotlight.style.top = `${rect.top - 8}px`;
        this.spotlight.style.left = `${rect.left - 8}px`;
        this.spotlight.style.width = `${rect.width + 16}px`;
        this.spotlight.style.height = `${rect.height + 16}px`;
        this.spotlight.style.display = 'block';

        // Scroll para o elemento
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        this.spotlight.style.display = 'none';
      }
    } else {
      this.spotlight.style.display = 'none';
    }

    // Atualizar tooltip
    this.tooltip.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #d4af37; font-size: 18px; margin-bottom: 10px;">
          ${step.title}
        </h3>
        <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
          ${step.content}
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="color: #888; font-size: 12px;">
          Passo ${stepIndex + 1} de ${tutorial.steps.length}
        </div>

        <div style="display: flex; gap: 10px;">
          ${step.showSkip !== false ? `
            <button onclick="tutorialManager.skip()" style="
              background: #333;
              color: #fff;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.2s;
            ">
              Pular
            </button>
          ` : ''}

          ${step.showFinish ? `
            <button onclick="tutorialManager.finish()" style="
              background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
              color: #fff;
              border: none;
              padding: 8px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.2s;
            ">
              Finalizar
            </button>
          ` : step.showNext !== false ? `
            <button onclick="tutorialManager.next()" style="
              background: linear-gradient(135deg, #d4af37 0%, #c49a2a 100%);
              color: #1a1a1a;
              border: none;
              padding: 8px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.2s;
            ">
              Próximo →
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Posicionar tooltip
    this.positionTooltip(step);
  }

  /**
   * Posicionar tooltip
   */
  positionTooltip(step) {
    if (step.position === 'center' || !step.target) {
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();

    let top, left;

    switch (step.position) {
      case 'top':
        top = rect.top - tooltipRect.height - 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;

      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;

      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left - tooltipRect.width - 20;
        break;

      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + 20;
        break;

      default:
        top = rect.bottom + 20;
        left = rect.left;
    }

    // Garantir que não saia da tela
    top = Math.max(20, Math.min(top, window.innerHeight - tooltipRect.height - 20));
    left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.transform = 'none';
  }

  /**
   * Próximo step
   */
  next() {
    const tutorial = this.tutorials[this.currentTutorial];
    if (!tutorial) return;

    if (this.currentStep < tutorial.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    } else {
      this.finish();
    }
  }

  /**
   * Step anterior
   */
  previous() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * Pular tutorial
   */
  skip() {
    if (confirm('Deseja realmente pular o tutorial? Você pode ativá-lo novamente nas configurações.')) {
      this.cleanup();
    }
  }

  /**
   * Finalizar tutorial
   */
  finish() {
    this.markCompleted(this.currentTutorial);

    if (window.showNotification) {
      showNotification('✅ Tutorial concluído! Explore o sistema à vontade.', 'success');
    }

    this.cleanup();
  }

  /**
   * Limpar elementos do tutorial
   */
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.spotlight) {
      this.spotlight.remove();
      this.spotlight = null;
    }

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }

    this.isActive = false;
    this.currentTutorial = null;
    this.currentStep = 0;
  }

  /**
   * Mostrar lista de tutoriais disponíveis
   */
  showTutorialList() {
    const modal = document.createElement('div');
    modal.className = 'tutorial-list-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #d4af37;
      border-radius: 12px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
    `;

    const tutorialsList = Object.entries(this.tutorials).map(([id, tutorial]) => {
      const completed = this.isCompleted(id);
      return `
        <div style="
          background: ${completed ? 'rgba(46, 204, 113, 0.1)' : 'rgba(30, 30, 30, 0.8)'};
          border: 1px solid ${completed ? '#2ecc71' : '#444'};
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
          cursor: pointer;
          transition: all 0.2s;
        " onclick="tutorialManager.start('${id}'); document.querySelector('.tutorial-list-modal').remove();"
        onmouseenter="this.style.borderColor='#d4af37'"
        onmouseleave="this.style.borderColor='${completed ? '#2ecc71' : '#444'}'">
          <h3 style="color: #d4af37; margin-bottom: 8px;">
            ${completed ? '✓ ' : ''}${tutorial.name}
          </h3>
          <p style="color: #888; font-size: 13px;">
            ${tutorial.steps.length} passos
            ${completed ? '• Concluído' : ''}
          </p>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <h2 style="color: #d4af37; margin-bottom: 20px;">
        📚 Tutoriais Disponíveis
      </h2>

      ${tutorialsList}

      <button onclick="document.querySelector('.tutorial-list-modal').remove()" style="
        background: #333;
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
        margin-top: 10px;
      ">
        Fechar
      </button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Fechar ao clicar no fundo
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// Criar instância global
const tutorialManager = new TutorialManager();
window.tutorialManager = tutorialManager;

// Auto-iniciar tutorial de primeiros passos se for primeira vez
document.addEventListener('DOMContentLoaded', () => {
  // Aguardar 2 segundos para garantir que a página carregou
  setTimeout(() => {
    if (tutorialManager.isFirstTime() && window.location.pathname.includes('macros.html')) {
      tutorialManager.start('first-steps');
    }
  }, 2000);
});

console.log('[Tutorial] Sistema de tutorial inicializado');
