import { initNavigation } from './components/navigation';
import { initQuestionDialog } from './components/question-dialog';
import { initFormValidation } from './components/form-validation';

import { initPageLayout } from './components/page-layout';
import { initFileUploads } from './components/file-upload';
import { initFilters } from './components/filter';
import { initMobileMenu } from './components/mobile-menu';
import { initOrder } from './components/order';
import { initNonstandardRequestForms } from './components/nonstandard-request-form';
import { initProductDetails } from './components/product-detail';
import { initDocumentLists } from './components/document-list';
import { initOrderPages } from './components/order-page';
import { initRequestOrderSummaries } from './components/request-order-summary';
import { initCallbackDialogs } from './components/callback-dialog';
import { initHomeCatalog } from './components/home-catalog';

function initApp(): void {
  initPageLayout();
  initMobileMenu();
  initFileUploads();
  initFilters();
  initOrder();
  initOrderPages();
  initRequestOrderSummaries();
  initNonstandardRequestForms();
  initProductDetails();
  initDocumentLists();
  initCallbackDialogs();
  initHomeCatalog();
  initNavigation();
  initQuestionDialog();
  initFormValidation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
