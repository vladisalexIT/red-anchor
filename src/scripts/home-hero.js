function initHomeHero() {
  const scene = document.querySelector('[data-home-scene]');
  const hero = scene?.querySelector('[data-home-hero]');
  const stage = scene?.querySelector('.home-scene__stage');
  const canvas = scene?.querySelector('.home-hero__chain-canvas');

  if (!scene || !hero || !stage || !canvas) {
    return;
  }

  const context = canvas.getContext('2d', {
    alpha: true,
  });

  if (!context) {
    return;
  }

  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const FRAME_COUNT = 385;
  const MAX_LOADED_FRAMES = 12;
  const MAX_PARALLEL_LOADS = 3;
  const SMOOTHING_MS = 150;

  // Производство полностью открывается за одну высоту Hero.
  // Этот параметр будем уточнять по визуальной проверке.
  const REVEAL_HERO_HEIGHTS = 1;

  const frameCache = new Map();
  const failedFrames = new Set();

  let queue = [];
  let loadingCount = 0;

  let enabled = false;
  let animationId = 0;
  let previousTime = 0;

  let sceneTop = 0;
  let sceneHeight = 0;
  let viewportHeight = 1;
  let animationDistance = 1;
  let revealDistance = 1;

  let progress = 0;
  let requestedFrame = 1;
  let drawnFrame = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getFrameUrl = (frame) => `/images/home/hero/chain/${frame}.webp`;

  const isSceneVisible = () => {
    const scrollTop = window.scrollY;

    return scrollTop + viewportHeight > sceneTop && scrollTop < sceneTop + sceneHeight;
  };

  const getTargetProgress = () => clamp((window.scrollY - sceneTop) / animationDistance, 0, 1);

  const paintFrame = (frame, image) => {
    if (!enabled || !isSceneVisible() || frame !== requestedFrame || frame === drawnFrame) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    drawnFrame = frame;
    scene.classList.add('is-chain-ready');
  };

  const trimCache = () => {
    const loadedFrames = [...frameCache.entries()]
      .filter(([, record]) => record.status === 'ready')
      .sort(
        ([first], [second]) => Math.abs(first - requestedFrame) - Math.abs(second - requestedFrame),
      );

    loadedFrames.slice(MAX_LOADED_FRAMES).forEach(([frame]) => {
      frameCache.delete(frame);
    });
  };

  const pumpQueue = () => {
    if (!enabled) {
      return;
    }

    while (loadingCount < MAX_PARALLEL_LOADS && queue.length > 0) {
      const frame = queue.shift();
      const record = frameCache.get(frame);

      if (!record || record.status !== 'queued') {
        continue;
      }

      record.status = 'loading';
      loadingCount += 1;

      const image = record.image;

      const finish = (success) => {
        image.onload = null;
        image.onerror = null;

        loadingCount -= 1;

        if (success) {
          record.status = 'ready';

          if (enabled) {
            paintFrame(frame, image);
          } else {
            frameCache.delete(frame);
          }
        } else {
          failedFrames.add(frame);
          frameCache.delete(frame);
        }

        trimCache();
        pumpQueue();
      };

      image.onload = () => {
        finish(image.naturalWidth > 0);
      };

      image.onerror = () => {
        finish(false);
      };

      image.src = getFrameUrl(frame);
    }
  };

  const requestFrame = (frame, direction) => {
    requestedFrame = frame;

    const desiredFrames = [
      frame,
      frame + direction,
      frame - direction,
      frame + direction * 2,
    ].filter(
      (number, index, numbers) =>
        number >= 1 && number <= FRAME_COUNT && numbers.indexOf(number) === index,
    );

    const desiredSet = new Set(desiredFrames);

    // Не накапливаем очередь кадров, которые уже не нужны.
    queue = queue.filter((number) => {
      if (desiredSet.has(number)) {
        return true;
      }

      const record = frameCache.get(number);

      if (record?.status === 'queued') {
        frameCache.delete(number);
      }

      return false;
    });

    desiredFrames.forEach((number) => {
      if (frameCache.has(number) || failedFrames.has(number)) {
        return;
      }

      const image = new Image();
      image.decoding = 'async';

      frameCache.set(number, {
        image,
        status: 'queued',
      });

      queue.push(number);
    });

    queue.sort((first, second) => desiredFrames.indexOf(first) - desiredFrames.indexOf(second));

    const currentRecord = frameCache.get(frame);

    if (currentRecord?.status === 'ready') {
      paintFrame(frame, currentRecord.image);
    }

    trimCache();
    pumpQueue();
  };

  const updateReveal = () => {
    const scrollDistance = progress * animationDistance;

    const revealProgress = clamp(scrollDistance / revealDistance, 0, 1);

    const revealPercent = 50 + revealProgress * 50;

    scene.style.setProperty('--home-production-reveal', `${revealPercent.toFixed(3)}%`);
  };

  const tick = (time) => {
    animationId = 0;

    if (!enabled) {
      return;
    }

    const target = getTargetProgress();

    if (!isSceneVisible()) {
      progress = target;
      previousTime = 0;
      return;
    }

    const delta = previousTime ? Math.min(48, time - previousTime) : 16;

    previousTime = time;

    const direction = target >= progress ? 1 : -1;
    const smoothing = 1 - Math.exp(-delta / SMOOTHING_MS);

    progress += (target - progress) * smoothing;

    if (Math.abs(target - progress) < 0.00001) {
      progress = target;
    }

    updateReveal();

    const frame = clamp(Math.round(progress * (FRAME_COUNT - 1)) + 1, 1, FRAME_COUNT);

    requestFrame(frame, direction);

    if (progress !== target) {
      animationId = window.requestAnimationFrame(tick);
    } else {
      previousTime = 0;
    }
  };

  const requestTick = () => {
    if (!enabled || animationId) {
      return;
    }

    animationId = window.requestAnimationFrame(tick);
  };

  const measure = () => {
    const rectangle = scene.getBoundingClientRect();

    sceneTop = rectangle.top + window.scrollY;

    // На главной перед сценой находится шапка.
    // Убираем зависимость от жёстко заданных 136 px.
    scene.style.setProperty('--home-header-height', `${Math.max(0, sceneTop)}px`);

    viewportHeight = Math.max(1, window.innerHeight);
    sceneHeight = scene.offsetHeight;

    animationDistance = Math.max(1, sceneHeight - stage.offsetHeight);

    revealDistance = Math.max(1, hero.offsetHeight * REVEAL_HERO_HEIGHTS);
  };

  const refresh = () => {
    measure();
    requestTick();
  };

  const updateMode = () => {
    enabled = desktopQuery.matches && !reducedMotionQuery.matches;

    if (animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = 0;
    }

    previousTime = 0;

    if (!enabled) {
      scene.classList.remove('is-chain-ready');

      scene.style.setProperty('--home-production-reveal', '50%');

      drawnFrame = 0;
      queue = [];

      // Освобождаем загруженные кадры при переходе
      // на мобильный режим или reduced motion.
      frameCache.forEach((record, frame) => {
        if (record.status !== 'loading') {
          frameCache.delete(frame);
        }
      });

      return;
    }

    measure();

    // Корректное состояние при восстановлении позиции
    // прокрутки браузером.
    progress = getTargetProgress();

    requestTick();
  };

  window.addEventListener('scroll', requestTick, {
    passive: true,
  });

  window.addEventListener('resize', refresh);

  window.addEventListener('load', refresh, {
    once: true,
  });

  desktopQuery.addEventListener('change', updateMode);
  reducedMotionQuery.addEventListener('change', updateMode);

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(refresh);

    resizeObserver.observe(scene);
    resizeObserver.observe(hero);
  }

  if (document.fonts) {
    document.fonts.ready.then(refresh);
  }

  updateMode();
}

initHomeHero();
