/** Independent of home-hero.js: only changes transforms inside the catalog. */
export function initHomeCatalog(): void {
  const catalog = document.querySelector<HTMLElement>('.home-catalog');
  if (!catalog || catalog.dataset.parallaxInitialized === 'true') return;
  catalog.dataset.parallaxInitialized = 'true';

  const pictures = Array.from(catalog.querySelectorAll<HTMLElement>('[data-home-catalog-picture]'));
  const desktop = window.matchMedia('(min-width: 1024px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;

  const render = (): void => {
    raf = 0;
    const enabled = desktop.matches && !reducedMotion.matches;
    const viewport = window.innerHeight;

    pictures.forEach((picture) => {
      if (!enabled) {
        picture.style.removeProperty('--home-catalog-parallax');
        return;
      }

      const visual = picture.parentElement;
      if (!visual) return;
      const rect = visual.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
      const travel = Math.min(180, rect.height * 0.45);
      picture.style.setProperty('--home-catalog-parallax', `${(-travel * progress).toFixed(2)}px`);
    });
  };

  const schedule = (): void => {
    if (!raf) raf = window.requestAnimationFrame(render);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  desktop.addEventListener('change', schedule);
  reducedMotion.addEventListener('change', schedule);
  catalog
    .querySelectorAll('img')
    .forEach((image) => image.addEventListener('load', schedule, { once: true }));
  render();
}
