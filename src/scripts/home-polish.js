const initHomePolish = () => {
  const hero = document.querySelector('[data-home-hero]');
  const scene = document.querySelector('[data-home-scene]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!scene) {
    return;
  }

  const targets = [
    ...scene.querySelectorAll('.home-scene__sequence > section'),
    ...document.querySelectorAll('.home-catalog, .home-questions'),
  ];

  targets.forEach((target) => target.setAttribute('data-home-reveal', ''));

  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -200px 0px', threshold: 0.01 },
    );

    targets.forEach((target) => observer.observe(target));
  }

  if (!hero || !finePointer || reducedMotion) {
    return;
  }

  const resetFocus = () => hero.removeAttribute('data-home-focus');

  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    const side = event.clientX - bounds.left < bounds.width / 2 ? 'left' : 'right';
    hero.dataset.homeFocus = side;
  });

  hero.addEventListener('pointerleave', resetFocus);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePolish, { once: true });
} else {
  initHomePolish();
}
