import { demoOrderAdapter, type OrderAdapter } from '../adapters/demo-order-adapter';
import {
  demoOrderProductsAdapter,
  type OrderProduct,
  type OrderProductsAdapter,
} from '../adapters/demo-order-products-adapter';

const createHiddenInput = (name: string, value: string): HTMLInputElement => {
  const input = document.createElement('input');

  input.type = 'hidden';
  input.name = name;
  input.value = value;

  return input;
};

const initRequestOrderSummary = (
  form: HTMLFormElement,
  orderAdapter: OrderAdapter,
  productsAdapter: OrderProductsAdapter,
): void => {
  const summary = form.querySelector<HTMLElement>('[data-request-order-summary]');
  const list = form.querySelector<HTMLUListElement>('[data-request-order-items]');
  const fields = form.querySelector<HTMLElement>('[data-request-order-fields]');
  const description = form.querySelector<HTMLTextAreaElement>('[data-request-product-description]');
  const descriptionRequired = form.querySelector<HTMLElement>(
    '[data-request-description-required]',
  );

  if (!summary || !list || !fields) {
    return;
  }

  let renderVersion = 0;

  const render = async (): Promise<void> => {
    const currentRenderVersion = ++renderVersion;
    const items = orderAdapter.getItems();

    if (items.length === 0) {
      summary.hidden = true;
      list.replaceChildren();
      fields.replaceChildren();

      if (description) {
        description.required = true;
      }

      if (descriptionRequired) {
        descriptionRequired.hidden = false;
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

    const listItems = items.map((item) => {
      const product = productsById.get(item.productId);
      const listItem = document.createElement('li');
      const title = document.createElement('span');
      const quantity = document.createElement('span');

      listItem.className = 'request-form__selected-item';
      title.className = 'request-form__selected-name';
      quantity.className = 'request-form__selected-quantity';

      title.textContent = product?.title ?? 'Выбранная продукция';
      quantity.textContent = `Количество: ${item.quantity}`;

      listItem.append(title, quantity);

      return listItem;
    });

    const hiddenFields = items.flatMap((item, index) => [
      createHiddenInput(`orderItems[${index}][productId]`, item.productId),
      createHiddenInput(`orderItems[${index}][quantity]`, String(item.quantity)),
    ]);

    list.replaceChildren(...listItems);
    fields.replaceChildren(...hiddenFields);
    summary.hidden = false;

    if (description) {
      description.required = false;
    }

    if (descriptionRequired) {
      descriptionRequired.hidden = true;
    }
  };

  orderAdapter.subscribe(() => {
    void render();
  });

  form.addEventListener('request:submitted', () => {
    if (orderAdapter.getCount() > 0) {
      void orderAdapter.clear();
    }
  });

  void render();
};

export const initRequestOrderSummaries = (): void => {
  document.querySelectorAll<HTMLFormElement>('[data-nonstandard-request]').forEach((form) => {
    initRequestOrderSummary(form, demoOrderAdapter, demoOrderProductsAdapter);
  });
};
