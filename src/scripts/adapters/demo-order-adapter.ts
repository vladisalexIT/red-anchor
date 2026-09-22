export interface OrderItem {
  productId: string;
  quantity: number;
}

export type OrderChangeListener = (productIds: readonly string[]) => void;

export interface OrderAdapter {
  getItems(): readonly OrderItem[];
  getProductIds(): readonly string[];
  getCount(): number;
  getQuantity(productId: string): number;
  has(productId: string): boolean;
  add(productId: string): Promise<void>;
  remove(productId: string): Promise<void>;
  setQuantity(productId: string, quantity: number): Promise<void>;
  clear(): Promise<void>;
  subscribe(listener: OrderChangeListener): () => void;
}

interface StoredOrder {
  version: 1;
  items: OrderItem[];
}

const STORAGE_KEY = 'red-anchor-demo-order';

const normalizeQuantity = (value: unknown): number => {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.floor(quantity));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export class DemoOrderAdapter implements OrderAdapter {
  private items: Map<string, number>;

  private readonly listeners = new Set<OrderChangeListener>();

  constructor() {
    this.items = this.readStorage();

    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      this.items = this.readStorage();
      this.notify();
    });
  }

  public getItems(): readonly OrderItem[] {
    return Array.from(this.items, ([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  public getProductIds(): readonly string[] {
    return Array.from(this.items.keys());
  }

  public getCount(): number {
    return this.items.size;
  }

  public getQuantity(productId: string): number {
    return this.items.get(productId) ?? 0;
  }

  public has(productId: string): boolean {
    return this.items.has(productId);
  }

  public async add(productId: string): Promise<void> {
    if (!productId) {
      return;
    }

    if (!this.items.has(productId)) {
      this.items.set(productId, 1);
    }

    this.save();
    this.notify();
  }

  public async remove(productId: string): Promise<void> {
    this.items.delete(productId);
    this.save();
    this.notify();
  }

  public async setQuantity(productId: string, quantity: number): Promise<void> {
    if (!this.items.has(productId)) {
      return;
    }

    this.items.set(productId, normalizeQuantity(quantity));

    this.save();
    this.notify();
  }

  public async clear(): Promise<void> {
    this.items.clear();
    this.save();
    this.notify();
  }

  public subscribe(listener: OrderChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private readStorage(): Map<string, number> {
    const items = new Map<string, number>();

    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        return items;
      }

      const parsedValue: unknown = JSON.parse(storedValue);

      /*
       * Миграция предыдущего формата:
       * ["chain-1", "chain-2"]
       */
      if (Array.isArray(parsedValue)) {
        parsedValue.forEach((value) => {
          if (typeof value === 'string' && value.length > 0) {
            items.set(value, 1);
          }
        });

        return items;
      }

      if (!isRecord(parsedValue) || !Array.isArray(parsedValue.items)) {
        return items;
      }

      parsedValue.items.forEach((value) => {
        if (!isRecord(value)) {
          return;
        }

        const productId = value.productId;

        if (typeof productId !== 'string' || productId.length === 0) {
          return;
        }

        items.set(productId, normalizeQuantity(value.quantity));
      });

      return items;
    } catch {
      return items;
    }
  }

  private save(): void {
    const storedOrder: StoredOrder = {
      version: 1,
      items: [...this.getItems()],
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedOrder));
    } catch {
      /*
       * Если localStorage недоступен, заказ продолжит
       * работать до обновления текущей страницы.
       */
    }
  }

  private notify(): void {
    const productIds = this.getProductIds();

    this.listeners.forEach((listener) => {
      listener(productIds);
    });
  }
}

export const demoOrderAdapter = new DemoOrderAdapter();
