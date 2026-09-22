export interface OrderProduct {
  id: string;
  title: string;
  category: string;
  url: string;
  details: string;
}

export interface OrderProductsAdapter {
  getByIds(productIds: readonly string[]): Promise<readonly OrderProduct[]>;
}

const DEMO_PRODUCTS: readonly OrderProduct[] = [
  {
    id: 'chain-1',
    title: 'Цепь якорная калибра 11 мм',
    category: 'Якорные цепи',
    url: '/catalog/product/',
    details: 'Калибр: 11 мм',
  },
  {
    id: 'chain-2',
    title: 'Цепь якорная калибра 16 мм',
    category: 'Якорные цепи',
    url: '/catalog/product/',
    details: 'Калибр: 16 мм',
  },
  {
    id: 'chain-3',
    title: 'Цепь якорная калибра 20 мм',
    category: 'Цепи общего назначения',
    url: '/catalog/product/',
    details: 'Калибр: 20 мм',
  },
  {
    id: 'component-1',
    title: 'Скоба соединительная',
    category: 'Якорные цепи и комплектующие',
    url: '/catalog/product/',
    details: 'Комплектующее изделие',
  },
  {
    id: 'component-2',
    title: 'Звено соединительное',
    category: 'Для горно-шахтного оборудования',
    url: '/catalog/product/',
    details: 'Комплектующее изделие',
  },
  {
    id: 'accessory-1',
    title: 'Комплект грузоподъёмной цепи',
    category: 'Грузоподъёмные цепи',
    url: '/catalog/product/',
    details: 'Комплект',
  },
  {
    id: 'anchor-shackle-11-category-1',
    title: 'Якорная смычка с распорками, калибр 11 мм, категория 1',
    category: 'Якорные цепи и комплектующие',
    url: '/catalog/product/',
    details: 'Калибр: 11 мм · Категория: 1',
  },
];

const productMap = new Map<string, OrderProduct>();

DEMO_PRODUCTS.forEach((product) => {
  productMap.set(product.id, product);
});

const createFallbackProduct = (productId: string): OrderProduct => ({
  id: productId,
  title: 'Выбранная продукция',
  category: 'Продукция завода',
  url: '/catalog/',
  details: `Идентификатор: ${productId}`,
});

export class DemoOrderProductsAdapter implements OrderProductsAdapter {
  public getByIds(productIds: readonly string[]): Promise<readonly OrderProduct[]> {
    const products = productIds.map((productId) => {
      return productMap.get(productId) ?? createFallbackProduct(productId);
    });

    return Promise.resolve(products);
  }
}

export const demoOrderProductsAdapter = new DemoOrderProductsAdapter();
