const closeDetails = (detailsElements: readonly HTMLDetailsElement[]): void => {
  detailsElements.forEach((details) => {
    details.open = false;
  });
};

export function initMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');

  const toggle = header?.querySelector<HTMLButtonElement>('[data-menu-toggle]');

  const menu = header?.querySelector<HTMLElement>('[data-menu]');

  if (!header || !toggle || !menu) {
    return;
  }

  const detailsElements = Array.from(
    header.querySelectorAll<HTMLDetailsElement>('[data-header-details]'),
  );

  const desktopMedia = window.matchMedia('(min-width: 1024px)');

  const setOpen = (open: boolean, restoreFocus = false): void => {
    menu.hidden = !open;

    toggle.setAttribute('aria-expanded', String(open));

    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');

    header.classList.toggle('is-menu-open', open);

    document.body.classList.toggle('is-scroll-locked', open);

    if (!open) {
      closeDetails(Array.from(menu.querySelectorAll<HTMLDetailsElement>('details[open]')));
    }

    if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    const shouldOpen = toggle.getAttribute('aria-expanded') !== 'true';

    setOpen(shouldOpen);

    if (shouldOpen) {
      window.requestAnimationFrame(() => {
        menu.querySelector<HTMLElement>('input, a, button, summary')?.focus();
      });
    }
  });

  menu.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('a') || target.closest('[data-callback-open]')) {
      setOpen(false);
    }
  });

  detailsElements.forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) {
        return;
      }

      detailsElements.forEach((otherDetails) => {
        if (otherDetails !== details) {
          otherDetails.open = false;
        }
      });
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    detailsElements.forEach((details) => {
      if (details.open && !details.contains(target)) {
        details.open = false;
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    closeDetails(detailsElements);

    if (toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
    }
  });

  desktopMedia.addEventListener('change', () => {
    setOpen(false);
    closeDetails(detailsElements);
  });

  setOpen(false);
}
