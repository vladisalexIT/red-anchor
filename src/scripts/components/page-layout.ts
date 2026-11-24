export function initPageLayout(): void {
  const root = document.documentElement;
  const site = document.querySelector<HTMLElement>('.site');
  const header = document.querySelector<HTMLElement>('[data-header]');
  const headerTop = header?.querySelector<HTMLElement>('.site-header__top');
  const home = site?.querySelector<HTMLElement>('.home-page');
  const footer = site?.querySelector<HTMLElement>('.site-footer');

  if (!site || !header) {
    return;
  }

  const desktopMedia = window.matchMedia('(min-width: 1024px)');
  const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

  let animationId = 0;
  let footerRevealAllowed = true;

  const setPixelProperty = (name: string, value: number): void => {
    const nextValue = `${value.toFixed(2)}px`;

    if (root.style.getPropertyValue(name) !== nextValue) {
      root.style.setProperty(name, nextValue);
    }
  };

  const update = (): void => {
    animationId = 0;

    const headerHeight = header.getBoundingClientRect().height;

    const topHeight =
      desktopMedia.matches && headerTop ? headerTop.getBoundingClientRect().height : 0;

    const pinnedHeight = Math.max(0, headerHeight - topHeight);

    setPixelProperty('--site-header-height', headerHeight);
    setPixelProperty('--site-header-top-height', topHeight);
    setPixelProperty('--site-header-pinned-height', pinnedHeight);

    const footerHeight = footer?.getBoundingClientRect().height ?? 0;

    const availableHeight = Math.max(0, window.innerHeight - pinnedHeight);

    const canRevealFooter = Boolean(
      home &&
      footer &&
      footerRevealAllowed &&
      desktopMedia.matches &&
      !reducedMotionMedia.matches &&
      footerHeight > 0 &&
      footerHeight <= availableHeight,
    );

    site.classList.toggle('site--home-footer-reveal', canRevealFooter);
  };

  const requestUpdate = (): void => {
    if (animationId) {
      return;
    }

    animationId = window.requestAnimationFrame(update);
  };

  window.addEventListener('resize', requestUpdate);

  window.addEventListener('load', requestUpdate, {
    once: true,
  });

  desktopMedia.addEventListener('change', requestUpdate);
  reducedMotionMedia.addEventListener('change', requestUpdate);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(requestUpdate);

    observer.observe(header);

    if (headerTop) {
      observer.observe(headerTop);
    }

    if (home && footer) {
      observer.observe(footer);
    }
  }

  if (home && footer) {
    footer.addEventListener('focusin', () => {
      if (!site.classList.contains('site--home-footer-reveal')) {
        return;
      }

      footerRevealAllowed = false;
      update();

      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;

        if (activeElement instanceof HTMLElement && footer.contains(activeElement)) {
          activeElement.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
          });
        }
      });
    });
  }

  if (document.fonts) {
    void document.fonts.ready.then(requestUpdate);
  }

  update();
}
