import '../styles/main.scss';

import { initFileUploads } from './components/file-upload';
import { initFilters } from './components/filter';
import { initMobileMenu } from './components/mobile-menu';
import { initOrder } from './components/order';

function initApp(): void {
  initMobileMenu();
  initFileUploads();
  initFilters();
  initOrder();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
