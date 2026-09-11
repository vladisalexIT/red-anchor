export function initMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');

  if (!header || !toggle || !menu) {
    return;
  }

  const desktopMedia = window.matchMedia('(min-width: 1024px)');

  const setOpen = (isOpen: boolean): void => {
    header.classList.toggle('is-menu-open', isOpen);
    document.body.classList.toggle('is-scroll-locked', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  };

  const closeMenu = (): void => {
    setOpen(false);
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';

    setOpen(!isOpen);
  });

  menu.addEventListener('click', (event) => {
    const target = event.target;

    if (target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      toggle.focus();
    }
  });

  desktopMedia.addEventListener('change', (event) => {
    if (event.matches) {
      closeMenu();
    }
  });
}
