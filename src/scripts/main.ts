import '../styles/main.scss';

import { initFileUploads } from './components/file-upload';
import { initFilters } from './components/filter';
import { initMobileMenu } from './components/mobile-menu';
import { initOrder } from './components/order';
import { initNonstandardRequestForms } from './components/nonstandard-request-form';
import { initProductDetails } from './components/product-detail';
import { initDocumentLists } from './components/document-list';
import { initOrderPages } from './components/order-page';
import { initRequestOrderSummaries } from './components/request-order-summary';

function initApp(): void {
  initMobileMenu();
  initFileUploads();
  initFilters();
  initOrder();
  initOrderPages();
  initRequestOrderSummaries();
  initNonstandardRequestForms();
  initProductDetails();
  initDocumentLists();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
