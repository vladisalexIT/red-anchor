export function initMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const toggle = header?.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = header?.querySelector<HTMLElement>('[data-menu]');

  if (!header || !toggle || !menu) {
    return;
  }

  const desktopMedia = window.matchMedia('(min-width: 1024px)');

  const setOpen = (open: boolean): void => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    header.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('is-scroll-locked', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    if (toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }

    header.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((details) => {
      details.open = false;
    });
  });

  desktopMedia.addEventListener('change', () => {
    setOpen(false);
  });

  setOpen(false);
}
