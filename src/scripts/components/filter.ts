import {
  DemoCatalogAdapter,
  type CatalogFilters,
} from '../adapters/demo-catalog-adapter';

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function readFilters(form: HTMLFormElement): CatalogFilters {
  const formData = new FormData(form);

  return {
    caliberFrom: parseNumber(formData.get('caliberFrom')),
    caliberTo: parseNumber(formData.get('caliberTo')),
    category: String(formData.get('category') ?? ''),
  };
}

function setControlValue(
  form: HTMLFormElement,
  name: string,
  value: string,
): void {
  const control = form.elements.namedItem(name);

  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement
  ) {
    control.value = value;
  }
}

function restoreFiltersFromUrl(form: HTMLFormElement): void {
  const searchParams = new URLSearchParams(window.location.search);

  setControlValue(
    form,
    'caliberFrom',
    searchParams.get('caliberFrom') ?? '',
  );

  setControlValue(
    form,
    'caliberTo',
    searchParams.get('caliberTo') ?? '',
  );

  setControlValue(
    form,
    'category',
    searchParams.get('category') ?? '',
  );
}

function setSearchParameter(
  searchParams: URLSearchParams,
  name: string,
  value: string | number | null,
): void {
  if (value === null || value === '') {
    searchParams.delete(name);
    return;
  }

  searchParams.set(name, String(value));
}

function updateUrl(filters: CatalogFilters): void {
  const url = new URL(window.location.href);

  setSearchParameter(
    url.searchParams,
    'caliberFrom',
    filters.caliberFrom,
  );

  setSearchParameter(
    url.searchParams,
    'caliberTo',
    filters.caliberTo,
  );

  setSearchParameter(
    url.searchParams,
    'category',
    filters.category,
  );

  url.searchParams.delete('page');

  window.history.replaceState(
    {},
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function validateRange(
  form: HTMLFormElement,
  filters: CatalogFilters,
): boolean {
  const caliberToInput =
    form.elements.namedItem('caliberTo');

  if (!(caliberToInput instanceof HTMLInputElement)) {
    return true;
  }

  caliberToInput.setCustomValidity('');

  if (
    filters.caliberFrom !== null &&
    filters.caliberTo !== null &&
    filters.caliberFrom > filters.caliberTo
  ) {
    caliberToInput.setCustomValidity(
      'Значение «До» не может быть меньше значения «От».',
    );

    caliberToInput.reportValidity();

    return false;
  }

  return true;
}

function updateCatalogState(
  root: HTMLElement,
  visibleCount: number,
): void {
  const resultCount = root.querySelector<HTMLElement>(
    '[data-catalog-result-count]',
  );

  const emptyState = root.querySelector<HTMLElement>(
    '[data-catalog-empty]',
  );

  const pagination = root.querySelector<HTMLElement>(
    '[data-catalog-pagination]',
  );

  if (resultCount) {
    resultCount.textContent =
      `Найдено товаров: ${visibleCount}`;
  }

  if (emptyState) {
    emptyState.hidden = visibleCount !== 0;
  }

  if (pagination) {
    pagination.hidden = visibleCount === 0;
  }
}

function applyFilters(
  form: HTMLFormElement,
  root: HTMLElement,
  adapter: DemoCatalogAdapter,
  shouldUpdateUrl: boolean,
): void {
  const filters = readFilters(form);

  if (!validateRange(form, filters)) {
    return;
  }

  const visibleCount = adapter.apply(filters);

  updateCatalogState(root, visibleCount);

  if (shouldUpdateUrl) {
    updateUrl(filters);
  }
}

export function initFilters(): void {
  const forms =
    document.querySelectorAll<HTMLFormElement>('[data-filter]');

  forms.forEach((form) => {
    const root = form.closest<HTMLElement>('.catalog-page');

    if (!root) {
      return;
    }

    const adapter = new DemoCatalogAdapter(root);

    restoreFiltersFromUrl(form);
    applyFilters(form, root, adapter, false);

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      applyFilters(form, root, adapter, true);
    });

    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        applyFilters(form, root, adapter, true);
      }, 0);
    });

    window.addEventListener('popstate', () => {
      restoreFiltersFromUrl(form);
      applyFilters(form, root, adapter, false);
    });
  });
}