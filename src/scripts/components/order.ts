import {
  demoOrderAdapter,
  type OrderAdapter,
} from '../adapters/demo-order-adapter';

const DEFAULT_LABEL = 'Добавить в заказ';
const ADDED_LABEL = 'Добавлено в заказ';

function updateButton(
  button: HTMLButtonElement,
  adapter: OrderAdapter,
): void {
  const productId = button.dataset.productId ?? '';
  const isAdded = adapter.has(productId);

  const label = button.querySelector<HTMLElement>(
    '[data-order-button-text]',
  );

  button.classList.toggle('is-added', isAdded);
  button.setAttribute(
    'aria-pressed',
    isAdded ? 'true' : 'false',
  );

  if (label) {
    label.textContent = isAdded
      ? ADDED_LABEL
      : DEFAULT_LABEL;
  }
}

function updateCounters(
  root: ParentNode,
  adapter: OrderAdapter,
): void {
  const count = adapter.getCount();

  const counters =
    root.querySelectorAll<HTMLElement>('[data-order-count]');

  counters.forEach((counter) => {
    counter.textContent = String(count);
  });
}

export function initOrder(
  adapter: OrderAdapter = demoOrderAdapter,
): void {
  const buttons =
    document.querySelectorAll<HTMLButtonElement>(
      '[data-add-to-order]',
    );

  const updateInterface = (): void => {
    buttons.forEach((button) => {
      updateButton(button, adapter);
    });

    updateCounters(document, adapter);
  };

  buttons.forEach((button) => {
    if (button.dataset.orderInitialized === 'true') {
      return;
    }

    button.dataset.orderInitialized = 'true';

    button.addEventListener('click', async () => {
      const productId = button.dataset.productId ?? '';

      if (!productId) {
        return;
      }

      button.disabled = true;
      button.classList.add('is-pending');

      try {
        if (adapter.has(productId)) {
          await adapter.remove(productId);
        } else {
          await adapter.add(productId);
        }
      } finally {
        button.disabled = false;
        button.classList.remove('is-pending');
        updateInterface();
      }
    });
  });

  adapter.subscribe(() => {
    updateInterface();
  });

  updateInterface();
}