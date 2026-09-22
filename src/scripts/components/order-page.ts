import { demoOrderAdapter, type OrderAdapter } from '../adapters/demo-order-adapter';
import {
  demoOrderProductsAdapter,
  type OrderProduct,
  type OrderProductsAdapter,
} from '../adapters/demo-order-products-adapter';

const getPositionWord = (count: number): string => {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'позиций';
  }

  if (lastDigit === 1) {
    return 'позиция';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'позиции';
  }

  return 'позиций';
};

const initOrderPage = (
  root: HTMLElement,
  orderAdapter: OrderAdapter,
  productsAdapter: OrderProductsAdapter,
): void => {
  if (root.dataset.orderPageInitialized === 'true') {
    return;
  }

  const loading = root.querySelector<HTMLElement>('[data-order-page-loading]');
  const emptyState = root.querySelector<HTMLElement>('[data-order-page-empty]');
  const content = root.querySelector<HTMLElement>('[data-order-page-content]');
  const list = root.querySelector<HTMLUListElement>('[data-order-page-list]');
  const template = root.querySelector<HTMLTemplateElement>('[data-order-page-item-template]');
  const count = root.querySelector<HTMLElement>('[data-order-page-count]');
  const clearButton = root.querySelector<HTMLButtonElement>('[data-order-page-clear]');
  const status = root.querySelector<HTMLElement>('[data-order-page-status]');

  if (!emptyState || !content || !list || !template || !count || !clearButton) {
    return;
  }

  let renderVersion = 0;

  const setStatus = (message: string): void => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.hidden = message.length === 0;
  };

  const createItemElement = (product: OrderProduct, quantity: number): DocumentFragment => {
    const fragment = template.content.cloneNode(true) as DocumentFragment;

    const item = fragment.querySelector<HTMLElement>('[data-order-page-item]');
    const category = fragment.querySelector<HTMLElement>('[data-order-item-category]');
    const link = fragment.querySelector<HTMLAnchorElement>('[data-order-item-link]');
    const details = fragment.querySelector<HTMLElement>('[data-order-item-details]');
    const quantityLabel = fragment.querySelector<HTMLLabelElement>(
      '[data-order-item-quantity-label]',
    );
    const quantityControl = fragment.querySelector<HTMLInputElement>('[data-order-item-quantity]');
    const removeButton = fragment.querySelector<HTMLButtonElement>('[data-order-item-remove]');

    if (
      !item ||
      !category ||
      !link ||
      !details ||
      !quantityLabel ||
      !quantityControl ||
      !removeButton
    ) {
      return fragment;
    }

    const quantityId = `order-quantity-${product.id}`;

    item.dataset.productId = product.id;
    category.textContent = product.category;
    link.textContent = product.title;
    link.href = product.url;
    details.textContent = product.details;

    quantityLabel.htmlFor = quantityId;
    quantityControl.id = quantityId;
    quantityControl.value = String(quantity);
    quantityControl.setAttribute('aria-label', `Количество: ${product.title}`);

    quantityControl.addEventListener('change', async () => {
      const parsedQuantity = Number.parseInt(quantityControl.value, 10);

      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
        quantityControl.value = String(orderAdapter.getQuantity(product.id));
        quantityControl.reportValidity();

        return;
      }

      quantityControl.disabled = true;

      try {
        await orderAdapter.setQuantity(product.id, parsedQuantity);

        setStatus(`Количество для «${product.title}» обновлено.`);
      } finally {
        quantityControl.disabled = false;
      }
    });

    removeButton.setAttribute('aria-label', `Удалить «${product.title}» из заказа`);

    removeButton.addEventListener('click', async () => {
      removeButton.disabled = true;

      try {
        await orderAdapter.remove(product.id);

        setStatus(`«${product.title}» удалено из заказа.`);
      } finally {
        removeButton.disabled = false;
      }
    });

    return fragment;
  };

  const render = async (): Promise<void> => {
    const currentRenderVersion = ++renderVersion;
    const items = orderAdapter.getItems();
    const positionCount = items.length;

    count.textContent = String(positionCount);
    count.parentElement?.setAttribute(
      'aria-label',
      `${positionCount} ${getPositionWord(positionCount)}`,
    );

    if (positionCount === 0) {
      list.replaceChildren();
      emptyState.hidden = false;
      content.hidden = true;

      if (loading) {
        loading.hidden = true;
      }

      return;
    }

    const products = await productsAdapter.getByIds(items.map((item) => item.productId));

    if (currentRenderVersion !== renderVersion) {
      return;
    }

    const productsById = new Map<string, OrderProduct>();

    products.forEach((product) => {
      productsById.set(product.id, product);
    });

    const fragments = items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        return document.createDocumentFragment();
      }

      return createItemElement(product, item.quantity);
    });

    list.replaceChildren(...fragments);
    emptyState.hidden = true;
    content.hidden = false;

    if (loading) {
      loading.hidden = true;
    }
  };

  clearButton.addEventListener('click', async () => {
    clearButton.disabled = true;

    try {
      await orderAdapter.clear();
      setStatus('Заказ очищен.');
    } finally {
      clearButton.disabled = false;
    }
  });

  orderAdapter.subscribe(() => {
    void render();
  });

  root.dataset.orderPageInitialized = 'true';
  void render();
};

export const initOrderPages = (): void => {
  document.querySelectorAll<HTMLElement>('[data-order-page]').forEach((root) => {
    initOrderPage(root, demoOrderAdapter, demoOrderProductsAdapter);
  });
};
