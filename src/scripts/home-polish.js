function initHomePolish() {
  const scene = document.querySelector('[data-home-scene]');
  if (!scene) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1024px)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hero = scene.querySelector('[data-home-hero]');
  const groups = document.querySelectorAll(
    '.home-scene__sequence > section, .home-catalog, .home-questions',
  );
  const targets = [];
  groups.forEach((section) => {
    const items = section.querySelectorAll(
      'h2, .home-about__description, .home-technologies__item, .home-quality__item, .home-partner__description, .home-partner__item, .home-section-link, .home-catalog__item, .home-questions__link',
    );
    (items.length ? items : [section]).forEach((item) => targets.push(item));
  });
  if ('IntersectionObserver' in window && !motion.matches) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) {
            target.classList.add('is-visible');
            observer.unobserve(target);
          }
        });
      },
      { rootMargin: '0px 0px -120px 0px', threshold: 0 },
    );
    targets.forEach((target) => {
      target.setAttribute('data-home-reveal', '');
      observer.observe(target);
    });
    motion.addEventListener('change', () => {
      if (motion.matches) {
        observer.disconnect();
        targets.forEach((target) => target.classList.add('is-visible'));
      }
    });
  }
  const layers = [
    ...document.querySelectorAll(
      '.home-technologies__icon, .home-quality__title, .home-catalog__image',
    ),
  ];
  let raf = 0;
  const render = () => {
    raf = 0;
    layers.forEach((layer) => {
      if (motion.matches) {
        layer.style.removeProperty('translate');
        return;
      }
      const rect = layer.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > innerHeight + 300) return;
      const range = layer.matches('.home-catalog__image') ? (desktop.matches ? 180 : 80) : 48;
      const progress = Math.max(
        0,
        Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)),
      );
      layer.style.translate = `0 ${((progress - 0.5) * range).toFixed(2)}px`;
    });
  };
  const request = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  motion.addEventListener('change', request);
  render();
  hero?.addEventListener('pointermove', (event) => {
    if (!pointer.matches || motion.matches) return;
    const rect = hero.getBoundingClientRect();
    hero.dataset.homeFocus = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
  });
  hero?.addEventListener('pointerleave', () => hero.removeAttribute('data-home-focus'));
  const preview = document.querySelector('[data-partner-preview]');
  if (preview) {
    document.querySelectorAll('[data-partner-image]').forEach((item) => {
      item.addEventListener('pointermove', (event) => {
        if (!pointer.matches || motion.matches || !desktop.matches) return;
        preview.src = item.dataset.partnerImage;
        preview.hidden = false;
        preview.style.left = `${Math.max(0, Math.min(innerWidth - 320, event.clientX - 150))}px`;
        preview.style.top = `${Math.max(0, Math.min(innerHeight - 230, event.clientY - 100))}px`;
      });
      item.addEventListener('pointerleave', () => {
        preview.hidden = true;
      });
    });
  }
}
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', initHomePolish, { once: true });
else initHomePolish();
