const hero = document.querySelector('[data-home-hero]');

if (hero) {
  const stage = hero.querySelector('.home-hero__stage');
  const canvas = hero.querySelector('.home-hero__chain-canvas');
  const desktopMediaQuery = window.matchMedia('(min-width: 1024px)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (stage && canvas) {
    const context = canvas.getContext('2d', {
      alpha: true,
    });

    if (context) {
      const frameCount = 385;
      const frameCache = new Map();

      let currentFrame = 1;
      let requestedFrame = 1;
      let animationFrameId = 0;
      let animationStarted = false;

      const getFrameUrl = (frameNumber) => `/images/home/hero/chain/${frameNumber}.webp`;

      const loadFrame = (frameNumber) => {
        const cachedFrame = frameCache.get(frameNumber);

        if (cachedFrame) {
          cachedFrame.lastUsed = performance.now();

          return cachedFrame.promise;
        }

        const image = new Image();

        image.decoding = 'async';

        const promise = new Promise((resolve, reject) => {
          image.onload = () => {
            resolve(image);
          };

          image.onerror = () => {
            reject(new Error(`Не удалось загрузить кадр цепи ${frameNumber}`));
          };
        });

        frameCache.set(frameNumber, {
          image,
          promise,
          lastUsed: performance.now(),
        });

        image.src = getFrameUrl(frameNumber);

        return promise;
      };

      const trimFrameCache = (centerFrame) => {
        if (frameCache.size <= 48) {
          return;
        }

        const framesByDistance = [...frameCache.entries()].sort(
          ([firstFrame], [secondFrame]) =>
            Math.abs(firstFrame - centerFrame) - Math.abs(secondFrame - centerFrame),
        );

        framesByDistance.slice(32).forEach(([frameNumber, frameData]) => {
          if (!frameData.image.complete) {
            return;
          }

          frameData.image.removeAttribute('src');
          frameCache.delete(frameNumber);
        });
      };

      const preloadNearbyFrames = (centerFrame) => {
        for (let offset = 1; offset <= 12; offset += 1) {
          const forwardFrame = centerFrame + offset;
          const backwardFrame = centerFrame - offset;

          if (forwardFrame <= frameCount) {
            loadFrame(forwardFrame).catch(() => null);
          }

          if (backwardFrame >= 1) {
            loadFrame(backwardFrame).catch(() => null);
          }
        }
      };

      const drawFrame = (frameNumber) => {
        requestedFrame = frameNumber;

        loadFrame(frameNumber)
          .then((image) => {
            if (requestedFrame !== frameNumber) {
              return;
            }

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            currentFrame = frameNumber;

            stage.classList.add('home-hero__stage--canvas-ready');

            preloadNearbyFrames(frameNumber);
            trimFrameCache(frameNumber);
          })
          .catch(() => null);
      };

      const calculateFrame = () => {
        const heroRectangle = hero.getBoundingClientRect();
        const animationDistance = Math.max(1, hero.offsetHeight - stage.offsetHeight);

        const progress = Math.min(1, Math.max(0, -heroRectangle.top / animationDistance));

        return Math.min(frameCount, Math.max(1, Math.round(progress * (frameCount - 1)) + 1));
      };

      const updateAnimation = () => {
        animationFrameId = 0;

        if (!desktopMediaQuery.matches || reducedMotionQuery.matches) {
          return;
        }

        const nextFrame = calculateFrame();

        if (nextFrame !== currentFrame) {
          drawFrame(nextFrame);
        }
      };

      const requestAnimationUpdate = () => {
        if (animationFrameId) {
          return;
        }

        animationFrameId = window.requestAnimationFrame(updateAnimation);
      };

      const startAnimation = () => {
        if (animationStarted || !desktopMediaQuery.matches || reducedMotionQuery.matches) {
          return;
        }

        animationStarted = true;

        drawFrame(calculateFrame());

        window.addEventListener('scroll', requestAnimationUpdate, {
          passive: true,
        });

        window.addEventListener('resize', requestAnimationUpdate);
      };

      startAnimation();

      desktopMediaQuery.addEventListener('change', startAnimation);
    }
  }
}
