export type OrderChangeListener = (productIds: readonly string[]) => void;

export interface OrderAdapter {
  getProductIds(): readonly string[];
  getCount(): number;
  has(productId: string): boolean;
  add(productId: string): Promise<void>;
  remove(productId: string): Promise<void>;
  subscribe(listener: OrderChangeListener): () => void;
}

const STORAGE_KEY = 'red-anchor-demo-order';

export class DemoOrderAdapter implements OrderAdapter {
  private productIds: Set<string>;

  private readonly listeners = new Set<OrderChangeListener>();

  constructor() {
    this.productIds = this.readStorage();

    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      this.productIds = this.readStorage();
      this.notify();
    });
  }

  public getProductIds(): readonly string[] {
    return Array.from(this.productIds);
  }

  public getCount(): number {
    return this.productIds.size;
  }

  public has(productId: string): boolean {
    return this.productIds.has(productId);
  }

  public async add(productId: string): Promise<void> {
    if (!productId) {
      return;
    }

    this.productIds.add(productId);
    this.save();
    this.notify();
  }

  public async remove(productId: string): Promise<void> {
    this.productIds.delete(productId);
    this.save();
    this.notify();
  }

  public subscribe(listener: OrderChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private readStorage(): Set<string> {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        return new Set();
      }

      const parsedValue: unknown = JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        return new Set();
      }

      const productIds = parsedValue.filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      );

      return new Set(productIds);
    } catch {
      return new Set();
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.getProductIds()));
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
