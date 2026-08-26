(() => {
  'use strict';

  function addBotDocsButton() {
    if (document.querySelector('[data-bot-docs-button]')) return;

    const link = document.createElement('a');
    link.href = '/bot-docs';
    link.className = 'sidebar-link';
    link.setAttribute('data-bot-docs-button', 'true');
    link.innerHTML = '<i class="fas fa-robot"></i><span>Bot Docs</span>';
    link.title = 'Guía para crear comandos de WhatsApp';

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const close = sidebar.querySelector('.sidebar-close');
      if (close) close.parentElement?.insertAdjacentElement('afterend', link);
      else sidebar.appendChild(link);
      return;
    }

    const cta = document.querySelector('.cta-container');
    if (cta) {
      const ctaLink = document.createElement('a');
      ctaLink.href = '/bot-docs';
      ctaLink.className = 'btn-main';
      ctaLink.style.marginTop = '10px';
      ctaLink.setAttribute('data-bot-docs-button', 'true');
      ctaLink.innerHTML = '<i class="fas fa-robot"></i><span>Ver Bot Docs</span>';
      cta.appendChild(ctaLink);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addBotDocsButton, { once: true });
  } else {
    addBotDocsButton();
  }
})();
