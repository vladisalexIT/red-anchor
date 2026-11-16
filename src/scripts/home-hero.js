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

  const ANCHOR_DISTANCE = 720;
  const LEFT_SHADOW_DISTANCE = 680;
  const RIGHT_COVER_DISTANCE = 720;

  const FRAME_HOLD_DISTANCE = 120;
  const FRAMES_START_DISTANCE = ANCHOR_DISTANCE + FRAME_HOLD_DISTANCE;

  const VISUAL_ANCHOR_DISTANCE = 900;

  const VISUAL_LEFT_SHADOW_DISTANCE = 1100;
  const VISUAL_RIGHT_COVER_DISTANCE = 2050;

  const PRELOAD_AHEAD = 32;
  const PRELOAD_BEHIND = 8;
  const KEEP_RADIUS = 48;
  const MAX_PARALLEL_LOADS = 6;
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
  let frameScrollStep = 1;
  let maximumShift = 0;
  let firstPhaseDistance = 1;
  let firstPhaseScale = 1;
  let animationDistance = 1;
  let renderedScroll = 0;
  let requestedFrame = FIRST_SCROLL_FRAME;
  let displayedFrame = 0;
  let frameDirection = 1;
  let loadWarningShown = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getFrameUrl = (frameNumber) => `/images/home/hero/chain/${frameNumber}.webp`;

  const getTargetScroll = () => clamp(window.scrollY - sceneTop, 0, animationDistance);

  function getFrameForScroll(scrollDistance) {
    if (scrollDistance <= firstPhaseDistance) {
      return FIRST_SCROLL_FRAME;
    }

    const mainPhaseDistance = scrollDistance - firstPhaseDistance;
    const frameOffset = Math.floor(mainPhaseDistance / frameScrollStep);

    return clamp(FIRST_SCROLL_FRAME + frameOffset, FIRST_SCROLL_FRAME, FRAME_COUNT);
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
    const requestedRecord = records.get(requestedFrame);

    if (requestedRecord?.status === 'ready') {
      drawFrame(requestedFrame);
      return;
    }

    if (displayedFrame === 0) {
      const initialRecord = records.get(FIRST_SCROLL_FRAME);

      if (initialRecord?.status === 'ready') {
        drawFrame(FIRST_SCROLL_FRAME);
      }

      return;
    }

    const direction = Math.sign(requestedFrame - displayedFrame);

    if (direction === 0) {
      return;
    }

    let bestFrame = null;

    records.forEach((record, frameNumber) => {
      if (record.status !== 'ready') {
        return;
      }

      const isBetween =
        direction > 0
          ? frameNumber > displayedFrame && frameNumber < requestedFrame
          : frameNumber < displayedFrame && frameNumber > requestedFrame;

      if (!isBetween) {
        return;
      }

      if (
        bestFrame === null ||
        (direction > 0 ? frameNumber > bestFrame : frameNumber < bestFrame)
      ) {
        bestFrame = frameNumber;
      }
    });

    if (bestFrame !== null) {
      drawFrame(bestFrame);
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
    const backwardRadius = frameDirection >= 0 ? PRELOAD_BEHIND : PRELOAD_AHEAD;

    const forwardRadius = frameDirection >= 0 ? PRELOAD_AHEAD : PRELOAD_BEHIND;

    const firstFrame = Math.max(FIRST_SCROLL_FRAME, requestedFrame - backwardRadius);

    const lastFrame = Math.min(FRAME_COUNT, requestedFrame + forwardRadius);

    ensureRecord(FIRST_SCROLL_FRAME);
    ensureRecord(requestedFrame);

    for (let frameNumber = firstFrame; frameNumber <= lastFrame; frameNumber += 1) {
      ensureRecord(frameNumber);
    }

    trimCache();
    pumpQueue();
  }

  function updateFirstPhase() {
    const visualScroll = renderedScroll;

    const anchorProgress = clamp(
      visualScroll / VISUAL_ANCHOR_DISTANCE,
      0,
      1,
    );

    const shadowProgress = clamp(
      visualScroll / VISUAL_LEFT_SHADOW_DISTANCE,
      0,
      1,
    );

    // У официального слоя left: 50%, а ширина растёт до 100%
    // относительно окна.
    //
    // У нас видимый диапазон ширины ограничен 0–50%.
    // Поэтому сначала рассчитываем аналог официальной ширины,
    // затем ограничиваем её правой половиной.
    const coverTimelineProgress = clamp(
      visualScroll / VISUAL_RIGHT_COVER_DISTANCE,
      0,
      1,
    );

    const coverProgress = clamp(
      coverTimelineProgress * 2,
      0,
      1,
    );

    const shift = maximumShift * anchorProgress;
    const rightCoverWidth = 50 * coverProgress;

    scene.style.setProperty(
      '--home-chain-shift',
      `${shift.toFixed(2)}px`,
    );

    scene.style.setProperty(
      '--home-left-shadow-opacity',
      shadowProgress.toFixed(4),
    );

    scene.style.setProperty(
      '--home-right-cover-width',
      `${rightCoverWidth.toFixed(3)}%`,
    );

    scene.style.setProperty(
      '--home-right-cover-progress',
      coverProgress.toFixed(6),
    );
  }

  function tick() {
    animationId = 0;

    if (!enabled) {
      return;
    }

    renderedScroll = getTargetScroll();

    const debugFrame = Number(scene.getAttribute('data-home-debug-frame'));

    const hasDebugFrame =
      scene.hasAttribute('data-home-debug-frame') &&
      Number.isInteger(debugFrame) &&
      debugFrame >= FIRST_SCROLL_FRAME &&
      debugFrame <= FRAME_COUNT;

    const nextFrame = hasDebugFrame ? debugFrame : getFrameForScroll(renderedScroll);
    const frameDelta = nextFrame - requestedFrame;
    const frameChanged = frameDelta !== 0;

    if (frameChanged) {
      frameDirection = Math.sign(frameDelta);
    }

    requestedFrame = nextFrame;
    scene.dataset.chainRequestedFrame = String(requestedFrame);

    if (frameChanged || records.size === 0) {
      prepareFrameWindow();
    }

    updateFirstPhase();
    drawBestAvailableFrame();

    scene.dataset.chainFrameLag = String(requestedFrame - displayedFrame);

    scene.dataset.chainCacheSize = String(records.size);

    scene.dataset.chainLoading = String(loadingCount);
  }

  function measure() {
    scene.style.minHeight = '';

    const sceneRect = scene.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    sceneTop = sceneRect.top + window.scrollY;

    const anchorShiftRatio = window.innerWidth > 1920 ? 0.35 : 0.34;

    maximumShift = media.clientWidth * anchorShiftRatio;

    const sceneHeight = sceneRect.height;
    const stageHeight = stageRect.height;
    const sceneBottom = sceneTop + sceneHeight;

    const catalog = document.querySelector('.home-catalog');

    const catalogTop = catalog ? catalog.getBoundingClientRect().top + window.scrollY : sceneBottom;

    const boundaryTop = Math.min(sceneBottom, catalogTop);

    const animationEndScroll = Math.max(sceneTop, boundaryTop - stageHeight);

    animationDistance = Math.max(1, animationEndScroll - sceneTop);

    const visualPhaseDistance = Math.max(
      ANCHOR_DISTANCE,
      LEFT_SHADOW_DISTANCE,
      RIGHT_COVER_DISTANCE,
    );

    const frameTransitions = FRAME_COUNT - FIRST_SCROLL_FRAME;

    const firstPhaseBudget = Math.max(visualPhaseDistance, FRAMES_START_DISTANCE);

    firstPhaseScale = Math.min(1, animationDistance / (firstPhaseBudget + frameTransitions));

    firstPhaseDistance = FRAMES_START_DISTANCE * firstPhaseScale;

    const mainPhaseDistance = Math.max(Number.EPSILON, animationDistance - firstPhaseDistance);

    frameScrollStep = mainPhaseDistance / frameTransitions;

    scene.style.setProperty('--home-header-height', `${Math.max(0, sceneTop)}px`);

    scene.dataset.chainTimeline = JSON.stringify({
      sceneTop,
      sceneHeight,
      stageHeight,
      sceneBottom,
      catalogTop,
      animationDistance,
      animationEndScroll,
      firstPhaseScale,
      anchorEnd: ANCHOR_DISTANCE * firstPhaseScale,
      shadowEnd: LEFT_SHADOW_DISTANCE * firstPhaseScale,
      coverEnd: RIGHT_COVER_DISTANCE * firstPhaseScale,
      framesStart: firstPhaseDistance,
      framesEnd: animationDistance,
      frameScrollStep,
      firstFrame: FIRST_SCROLL_FRAME,
      lastFrame: FRAME_COUNT,
      endRule: 'boundary-top-at-stage-bottom',
    });
  }

  function refresh() {
    if (!enabled) {
      return;
    }

    measure();
    requestTick();
  }

  function updateMode() {
    enabled = desktopQuery.matches && !reducedMotionQuery.matches;

    if (animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = 0;
    }

    if (!enabled) {
      canvas.hidden = true;
      displayedFrame = 0;

      fallbackImages.forEach((image, index) => {
        image.hidden = false;
        image.classList.toggle(ACTIVE_CLASS, index === 0);
      });

      scene.style.minHeight = '';
      scene.style.setProperty('--home-left-shadow-opacity', '0');
      scene.style.setProperty('--home-shadow-edge', '0px');
      scene.style.setProperty('--home-right-cover-width', '0%');
      scene.style.setProperty('--home-right-cover-progress', '0');
      scene.style.setProperty('--home-chain-shift', '0px');

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
