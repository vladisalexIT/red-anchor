export function initNavigation(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const details = [...header.querySelectorAll<HTMLDetailsElement>('[data-header-details]')];
  const desktop = matchMedia('(min-width: 1024px)');
  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.className = 'navigation-overlay';
  overlay.tabIndex = -1;
  overlay.setAttribute('aria-label', 'Закрыть меню');
  overlay.hidden = true;
  document.body.append(overlay);
  const update = () => {
    const open = desktop.matches && details.some((item) => item.open);
    overlay.hidden = !open;
    document.body.classList.toggle('has-navigation-open', open);
  };
  overlay.addEventListener('click', () => {
    details.forEach((item) => {
      item.open = false;
    });
    update();
  });
  details.forEach((item) => item.addEventListener('toggle', update));
  desktop.addEventListener('change', update);
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      details
        .find((item) => item.open)
        ?.querySelector('summary')
        ?.focus();
    }
    if (event.key !== 'Tab' || !header.classList.contains('is-menu-open')) return;
    const controls = [
      ...header.querySelectorAll<HTMLElement>(
        '[data-menu-toggle], [data-menu] a, [data-menu] button, [data-menu] input, [data-menu] summary',
      ),
    ].filter((item) => item.getClientRects().length && !item.hasAttribute('disabled'));
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  update();
}
