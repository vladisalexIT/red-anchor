const initProductGallery = (gallery: HTMLElement): void => {
  const mainImage = gallery.querySelector<HTMLImageElement>('[data-product-gallery-image]');
  const thumbnails = gallery.querySelectorAll<HTMLButtonElement>(
    '[data-product-gallery-thumbnail]',
  );

  if (!mainImage || !thumbnails.length) {
    return;
  }

  const selectImage = (thumbnail: HTMLButtonElement): void => {
    const imageSource = thumbnail.dataset.imageSrc;
    const imageAlt = thumbnail.dataset.imageAlt ?? '';

    if (!imageSource) {
      return;
    }

    mainImage.src = imageSource;
    mainImage.alt = imageAlt;

    thumbnails.forEach((item) => {
      const isActive = item === thumbnail;

      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
  };

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', () => {
      selectImage(thumbnail);
    });
  });
};

export const initProductDetails = (): void => {
  document.querySelectorAll<HTMLElement>('[data-product-gallery]').forEach(initProductGallery);

  document.querySelectorAll<HTMLButtonElement>('[data-product-print]').forEach((button) => {
    button.addEventListener('click', () => {
      window.print();
    });
  });
};
