export type CatalogFilters = {
  caliberFrom: number | null;
  caliberTo: number | null;
  category: string;
};

export interface CatalogAdapter {
  apply(filters: CatalogFilters): number;
  getTotal(): number;
}

export class DemoCatalogAdapter implements CatalogAdapter {
  private readonly cards: HTMLElement[];

  constructor(root: ParentNode) {
    this.cards = Array.from(
      root.querySelectorAll<HTMLElement>('[data-product-card]'),
    );
  }

  public apply(filters: CatalogFilters): number {
    let visibleCount = 0;

    this.cards.forEach((card) => {
      const category = card.dataset.productCategory ?? '';
      const caliberValue = card.dataset.productCaliber ?? '';
      const parsedCaliber = Number(caliberValue);

      const caliber =
        caliberValue && Number.isFinite(parsedCaliber)
          ? parsedCaliber
          : null;

      const matchesCategory =
        !filters.category || category === filters.category;

      const matchesCaliberFrom =
        filters.caliberFrom === null ||
        (caliber !== null && caliber >= filters.caliberFrom);

      const matchesCaliberTo =
        filters.caliberTo === null ||
        (caliber !== null && caliber <= filters.caliberTo);

      const isVisible =
        matchesCategory &&
        matchesCaliberFrom &&
        matchesCaliberTo;

      card.hidden = !isVisible;

      if (isVisible) {
        visibleCount += 1;
      }
    });

    return visibleCount;
  }

  public getTotal(): number {
    return this.cards.length;
  }
}