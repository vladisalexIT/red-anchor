const getDocumentWord = (count: number): string => {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'документов';
  }

  if (lastDigit === 1) {
    return 'документ';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'документа';
  }

  return 'документов';
};

const initDocumentList = (root: HTMLElement): void => {
  if (root.dataset.documentsInitialized === 'true') {
    return;
  }

  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-documents-item]'));
  const toggle = root.querySelector<HTMLButtonElement>('[data-documents-toggle]');

  if (!toggle || items.length === 0) {
    return;
  }

  const initialValue = Number.parseInt(root.dataset.documentsInitial ?? '', 10);
  const initialVisible = Number.isFinite(initialValue) && initialValue > 0 ? initialValue : 4;
  const extraCount = Math.max(items.length - initialVisible, 0);

  if (extraCount === 0) {
    return;
  }

  let isExpanded = false;

  const update = (): void => {
    items.forEach((item, index) => {
      item.hidden = !isExpanded && index >= initialVisible;
    });

    toggle.setAttribute('aria-expanded', String(isExpanded));
    toggle.textContent = isExpanded
      ? 'Скрыть документы'
      : `Показать ещё ${extraCount} ${getDocumentWord(extraCount)}`;
  };

  toggle.hidden = false;
  root.dataset.documentsInitialized = 'true';

  toggle.addEventListener('click', () => {
    isExpanded = !isExpanded;
    update();

    if (!isExpanded) {
      root.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });

  update();
};

export const initDocumentLists = (): void => {
  document.querySelectorAll<HTMLElement>('[data-documents]').forEach(initDocumentList);
};
