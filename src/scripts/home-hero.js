function initHomeHero() {
  const scene = document.querySelector('[data-home-scene]');
  const hero = scene?.querySelector('[data-home-hero]');
  const stage = scene?.querySelector('.home-scene__stage');
  const content = scene?.querySelector('.home-scene__content');
  const sequence = scene?.querySelector('[data-home-sequence]');
  const media = scene?.querySelector('.home-hero__media');
  const fallbackImages = [...(scene?.querySelectorAll('img.home-hero__chain') ?? [])];

  if (!scene || !hero || !stage || !content || !sequence || !media || fallbackImages.length === 0) {
    return;
  }

  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const FRAME_COUNT = 385;

  const FIRST_SCROLL_FRAME = 20;

  // Значения из официального main-page.js.
  const FRAME_OFFSET_MULTIPLIER = 1.1;
  const FRAME_TRIGGER_SHIFT = 200;
  const LEFT_SHADOW_DISTANCE = 1100;
  const RIGHT_COVER_DISTANCE = 2050;

  const PRELOAD_RADIUS = 12;
  const KEEP_RADIUS = 20;
  const MAX_PARALLEL_LOADS = 4;
  const SMOOTHING_TIME = 140;
  const ACTIVE_CLASS = 'home-hero__chain--active';

  const records = new Map();

  const canvas = document.createElement('canvas');

  canvas.className = `home-hero__chain ${ACTIVE_CLASS}`;
  canvas.width = 1280;
  canvas.height = 1280;
  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');

  media.append(canvas);

  const context = canvas.getContext('2d');

  if (!context) {
    canvas.remove();
    return;
  }

  let enabled = false;
  let animationId = 0;
  let loadingCount = 0;
  let sceneTop = 0;
  let sequenceTop = 0;
  let frameScrollStep = 1;
  let animationDistance = 1;
  let renderedScroll = 0;
  let requestedFrame = FIRST_SCROLL_FRAME;
  let displayedFrame = 0;
  let lastTimestamp = 0;
  let loadWarningShown = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getFrameUrl = (frameNumber) => `/images/home/hero/chain/${frameNumber}.webp`;

  const getTargetScroll = () => clamp(window.scrollY - sceneTop, 0, animationDistance);

  function getFrameForScroll(scrollDistance) {
    const documentScroll = sceneTop + scrollDistance;

    const passedThresholds = Math.floor(
      (documentScroll - sequenceTop + FRAME_TRIGGER_SHIFT) / frameScrollStep,
    );

    return clamp(passedThresholds + 19, FIRST_SCROLL_FRAME, FRAME_COUNT);
  }

  function requestTick() {
    if (!enabled || animationId) {
      return;
    }

    animationId = window.requestAnimationFrame(tick);
  }

  function drawFrame(frameNumber) {
    const record = records.get(frameNumber);

    if (!enabled || record?.status !== 'ready' || displayedFrame === frameNumber) {
      return;
    }

    const image = record.image;

    // Размер холста определяется настоящим изображением.
    // Геометрию на странице по-прежнему задаёт существующий CSS.
    if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    displayedFrame = frameNumber;

    canvas.hidden = false;

    fallbackImages.forEach((fallbackImage) => {
      fallbackImage.hidden = true;
    });

    scene.dataset.chainDisplayedFrame = String(frameNumber);
  }

  function drawBestAvailableFrame() {
    if (records.get(requestedFrame)?.status === 'ready') {
      drawFrame(requestedFrame);
      return;
    }

    let nearestFrame = 0;
    let nearestDistance = Infinity;

    records.forEach((record, frameNumber) => {
      if (record.status !== 'ready') {
        return;
      }

      const distance = Math.abs(frameNumber - requestedFrame);

      if (distance < nearestDistance) {
        nearestFrame = frameNumber;
        nearestDistance = distance;
      }
    });

    if (nearestFrame) {
      drawFrame(nearestFrame);
    }
  }

  function trimCache() {
    records.forEach((record, frameNumber) => {
      const shouldKeep =
        frameNumber === FIRST_SCROLL_FRAME ||
        frameNumber === displayedFrame ||
        Math.abs(frameNumber - requestedFrame) <= KEEP_RADIUS;

      if (shouldKeep || record.status === 'loading') {
        return;
      }

      records.delete(frameNumber);
    });
  }

  function ensureRecord(frameNumber) {
    if (records.has(frameNumber)) {
      return;
    }

    const image = new Image();

    image.decoding = 'async';

    records.set(frameNumber, {
      image,
      status: 'queued',
    });
  }

  function startLoading(frameNumber) {
    const record = records.get(frameNumber);

    if (!record || record.status !== 'queued') {
      return;
    }

    record.status = 'loading';
    loadingCount += 1;

    const finish = (success) => {
      record.image.onload = null;
      record.image.onerror = null;
      record.status = success ? 'ready' : 'failed';

      loadingCount -= 1;

      if (!success && !loadWarningShown) {
        loadWarningShown = true;

        console.warn(
          'Не удалось подготовить один из кадров цепи. Проверьте запросы /images/home/hero/chain/.',
        );
      }

      trimCache();
      requestTick();
      pumpQueue();
    };

    record.image.onload = async () => {
      try {
        if (typeof record.image.decode === 'function') {
          await record.image.decode();
        }

        finish(record.image.naturalWidth > 0);
      } catch {
        finish(false);
      }
    };

    record.image.onerror = () => {
      finish(false);
    };

    record.image.src = getFrameUrl(frameNumber);
  }

  function pumpQueue() {
    if (!enabled) {
      return;
    }

    const queuedFrames = [...records]
      .filter(([, record]) => record.status === 'queued')
      .map(([frameNumber]) => frameNumber)
      .sort(
        (firstFrame, secondFrame) =>
          Math.abs(firstFrame - requestedFrame) - Math.abs(secondFrame - requestedFrame),
      );

    while (loadingCount < MAX_PARALLEL_LOADS && queuedFrames.length > 0) {
      startLoading(queuedFrames.shift());
    }
  }

  function prepareFrameWindow() {
    const firstFrame = Math.max(1, requestedFrame - PRELOAD_RADIUS);
    const lastFrame = Math.min(FRAME_COUNT, requestedFrame + PRELOAD_RADIUS);

    ensureRecord(FIRST_SCROLL_FRAME);
    ensureRecord(requestedFrame);

    for (let frameNumber = firstFrame; frameNumber <= lastFrame; frameNumber += 1) {
      ensureRecord(frameNumber);
    }

    trimCache();
    pumpQueue();
  }

  function updateReveal() {
    const shadowOpacity = clamp(renderedScroll / LEFT_SHADOW_DISTANCE, 0, 1);

    const coverWidth = clamp(renderedScroll / RIGHT_COVER_DISTANCE, 0, 1) * 100;

    scene.style.setProperty('--home-left-shadow-opacity', shadowOpacity.toFixed(4));

    scene.style.setProperty('--home-right-cover-width', `${coverWidth.toFixed(3)}%`);
  }

  function tick(timestamp) {
    animationId = 0;

    if (!enabled) {
      return;
    }

    const targetScroll = getTargetScroll();
    const elapsed = lastTimestamp ? clamp(timestamp - lastTimestamp, 1, 50) : 16.67;

    lastTimestamp = timestamp;

    const smoothing = 1 - Math.exp(-elapsed / SMOOTHING_TIME);

    renderedScroll += (targetScroll - renderedScroll) * smoothing;

    if (Math.abs(targetScroll - renderedScroll) < 0.25) {
      renderedScroll = targetScroll;
    }

    const nextFrame = getFrameForScroll(renderedScroll);

    const frameChanged = nextFrame !== requestedFrame;

    requestedFrame = nextFrame;
    scene.dataset.chainRequestedFrame = String(requestedFrame);

    if (frameChanged || records.size === 0) {
      prepareFrameWindow();
    }

    updateReveal();
    drawBestAvailableFrame();

    if (renderedScroll !== targetScroll) {
      requestTick();
    } else {
      lastTimestamp = 0;
    }
  }

  function measure() {
    // Больше не создаём дополнительную пустую высоту сцены.
    scene.style.minHeight = '';

    sceneTop = scene.getBoundingClientRect().top + window.scrollY;
    sequenceTop = sequence.getBoundingClientRect().top + window.scrollY;

    const stageHeight = stage.getBoundingClientRect().height;
    const sequenceHeight = sequence.getBoundingClientRect().height;

    const sequenceDistance = Math.max(1, sequenceHeight - stageHeight);

    frameScrollStep = (sequenceDistance / FRAME_COUNT) * FRAME_OFFSET_MULTIPLIER;

    const lastFrameThreshold =
      sequenceTop - FRAME_TRIGGER_SHIFT + (FRAME_COUNT - 19) * frameScrollStep;

    animationDistance = Math.max(RIGHT_COVER_DISTANCE, lastFrameThreshold - sceneTop);

    scene.style.setProperty('--home-header-height', `${Math.max(0, sceneTop)}px`);
  }

  function refresh() {
    measure();
    requestTick();
  }

  function updateMode() {
    enabled = desktopQuery.matches && !reducedMotionQuery.matches;

    if (animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = 0;
    }

    lastTimestamp = 0;

    if (!enabled) {
      canvas.hidden = true;
      displayedFrame = 0;

      fallbackImages.forEach((image, index) => {
        image.hidden = false;
        image.classList.toggle(ACTIVE_CLASS, index === 0);
      });

      scene.style.minHeight = '';
      scene.style.setProperty('--home-left-shadow-opacity', '0');
      scene.style.setProperty('--home-right-cover-width', '0%');

      // Незавершённые загрузки завершатся своими обработчиками.
      records.forEach((record, frameNumber) => {
        if (record.status !== 'loading') {
          records.delete(frameNumber);
        }
      });

      return;
    }

    measure();

    renderedScroll = getTargetScroll();

    requestedFrame = getFrameForScroll(renderedScroll);

    prepareFrameWindow();
    requestTick();
  }

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

    resizeObserver.observe(content);
    resizeObserver.observe(hero);
  }

  if (document.fonts) {
    document.fonts.ready.then(refresh);
  }

  updateMode();
}

initHomeHero();
