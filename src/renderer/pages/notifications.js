function showNotification(message, type = 'info') {
  const existing = document.getElementById('notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `notification notification-${type}`;

  const text = document.createElement('span');
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'notification-close';
  closeBtn.setAttribute('aria-label', 'Fechar notificacao');
  closeBtn.textContent = '';
  closeBtn.onclick = () => notification.remove();

  notification.appendChild(text);
  notification.appendChild(closeBtn);
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

function showModal(options) {
  const { title, message, buttons = [] } = options;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const footerButtons = buttons
    .map(
      (btn) =>
        `<button class="modal-btn modal-btn-${btn.type || 'default'}" onclick="${btn.onclick}">${btn.text}</button>`
    )
    .join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" type="button" aria-label="Fechar" onclick="this.closest('.modal-overlay').remove()"></button>
      </div>
      <div class="modal-body">${message}</div>
      <div class="modal-footer">${footerButtons}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function confirm(message) {
  return new Promise((resolve) => {
    const modal = showModal({
      title: 'Confirmacao',
      message,
      buttons: [
        { text: 'Cancelar', type: 'secondary', onclick: 'confirmCallback(false)' },
        { text: 'Confirmar', type: 'primary', onclick: 'confirmCallback(true)' },
      ],
    });

    window.confirmCallback = (result) => {
      modal.remove();
      delete window.confirmCallback;
      resolve(result);
    };
  });
}
