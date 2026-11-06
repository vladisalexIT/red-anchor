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
  const FIRST_PHASE_LAST_FRAME = 20;

  // Значения из официального main-page.js.
  // Отдельные дистанции фаз.
  //
  // Левая тень полностью нарастает за 1100 px —
  // это соответствует официальной странице.
  const LEFT_SHADOW_DISTANCE = 1100;

  // Чёрное покрытие справа проходит от центра до правого края
  // за 2050 px — это официальная длительность этой фазы.
  const RIGHT_COVER_DISTANCE = 2050;

  // Официальная страница перемещает контейнер якоря
  // на участке прокрутки длительностью 600 px.
  const ANCHOR_DISTANCE = 1400;

  // После завершения визуального затемнения оставляем небольшой
  // участок прокрутки с неподвижным кадром 20.
  const MAIN_START_GAP = 450;

  const FRAME_OFFSET_MULTIPLIER = 1.1;

  const PRELOAD_RADIUS = 12;
  const KEEP_RADIUS = 20;
  const MAX_PARALLEL_LOADS = 4;
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
  let firstPhaseDistance = 1;
  let animationDistance = 1;
  let renderedScroll = 0;
  let requestedFrame = FIRST_SCROLL_FRAME;
  let displayedFrame = 0;
  let loadWarningShown = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const smoothStep = (value) => value * value * (3 - 2 * value);

  const getFrameUrl = (frameNumber) => `/images/home/hero/chain/${frameNumber}.webp`;

  const getTargetScroll = () => clamp(window.scrollY - sceneTop, 0, animationDistance);

  function getFrameForScroll(scrollDistance) {
    if (scrollDistance <= firstPhaseDistance) {
      return FIRST_SCROLL_FRAME;
    }

    const mainPhaseDistance = scrollDistance - firstPhaseDistance;
    const mainPhaseFrame = Math.floor(mainPhaseDistance / frameScrollStep);

    return clamp(FIRST_PHASE_LAST_FRAME + mainPhaseFrame, FIRST_SCROLL_FRAME, FRAME_COUNT);
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
    const requestedRecord = records.get(requestedFrame);

    if (requestedRecord?.status === 'ready') {
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
    ensureRecord(FIRST_PHASE_LAST_FRAME);
    ensureRecord(requestedFrame);

    for (let frameNumber = firstFrame; frameNumber <= lastFrame; frameNumber += 1) {
      ensureRecord(frameNumber);
    }

    trimCache();
    pumpQueue();
  }

  function updateFirstPhase() {
    const shadowProgress = clamp(renderedScroll / LEFT_SHADOW_DISTANCE, 0, 1);

    const coverProgress = clamp(renderedScroll / RIGHT_COVER_DISTANCE, 0, 1);

    const anchorProgress = clamp(renderedScroll / ANCHOR_DISTANCE, 0, 1);

    const mediaWidth = media.clientWidth;
    const mediaHeight = media.clientHeight;

    if (mediaWidth <= 0 || mediaHeight <= 0) {
      return;
    }

    // В официальной версии смещается полноэкранный контейнер
    // #preloadImagesContainer, поэтому процент берётся
    // от ширины медиа-контейнера, а не от его высоты.
    //
    // До ширины 1920 px используется 28%.
    // На более широких экранах официальная версия использует 35%.
    const anchorShiftRatio = window.innerWidth > 1920 ? 0.42 : 0.34;
    const maximumShift = mediaWidth * anchorShiftRatio;

    // Официальное движение якоря происходит на участке 600 px.
    const easedAnchorProgress = smoothStep(anchorProgress);
    const shift = maximumShift * easedAnchorProgress;

    // Левая половина затемняется независимо от правого покрытия.
    const shadowOpacity = shadowProgress;

    // Правое покрытие начинается от центра и расширяется вправо
    // на протяжении 2050 px.
    const easedCoverProgress = smoothStep(coverProgress);
    const rightCoverWidth = 60 * easedCoverProgress;

    scene.style.setProperty('--home-chain-shift', `${shift.toFixed(2)}px`);

    scene.style.setProperty('--home-left-shadow-opacity', shadowOpacity.toFixed(4));

    scene.style.setProperty('--home-right-cover-width', `${rightCoverWidth.toFixed(3)}%`);
  }

  function tick() {
    animationId = 0;

    if (!enabled) {
      return;
    }

    const targetScroll = getTargetScroll();

    // Анимация привязана непосредственно к положению скролла.
    // Это устраняет заметное отставание и накопление задержки
    // при быстрых движениях вверх и вниз.
    renderedScroll = targetScroll;

    const nextFrame = getFrameForScroll(renderedScroll);

    const frameChanged = nextFrame !== requestedFrame;

    requestedFrame = nextFrame;
    scene.dataset.chainRequestedFrame = String(requestedFrame);

    if (frameChanged || records.size === 0) {
      prepareFrameWindow();
    }

    updateFirstPhase();
    drawBestAvailableFrame();
  }

  function measure() {
    scene.style.minHeight = '';

    sceneTop = scene.getBoundingClientRect().top + window.scrollY;

    const stageHeight = stage.getBoundingClientRect().height;
    const sequenceHeight = sequence.getBoundingClientRect().height;

    const sequenceDistance = Math.max(1, sequenceHeight - stageHeight);

    frameScrollStep = (sequenceDistance / FRAME_COUNT) * FRAME_OFFSET_MULTIPLIER;

    // Все визуальные действия первой фазы имеют разные длительности.
    // Кадровая последовательность начинается только после:
    //
    // 1. движения якоря;
    // 2. нарастания левой тени;
    // 3. расширения чёрного покрытия до правого края;
    // 4. дополнительного участка с неподвижным кадром 20.
    const visualPhaseDistance = Math.max(
      ANCHOR_DISTANCE,
      LEFT_SHADOW_DISTANCE,
      RIGHT_COVER_DISTANCE,
    );

    firstPhaseDistance = visualPhaseDistance + MAIN_START_GAP;

    const mainPhaseDistance = Math.max(1, (FRAME_COUNT - FIRST_PHASE_LAST_FRAME) * frameScrollStep);

    animationDistance = Math.max(1, firstPhaseDistance + mainPhaseDistance);

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
      scene.style.setProperty('--home-chain-shift', '0px');

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
