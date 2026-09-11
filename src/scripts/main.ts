import '../styles/main.scss';

import { initMobileMenu } from './components/mobile-menu';

function initApp(): void {
  initMobileMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
