const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} Б`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} КБ`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');

  if (parts.length < 2) {
    return '';
  }

  return `.${parts.at(-1)}`;
}

function isFileAccepted(file: File, accept: string): boolean {
  if (!accept) {
    return true;
  }

  const acceptedValues = accept
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const extension = getFileExtension(file.name);
  const fileType = file.type.toLowerCase();

  return acceptedValues.some((value) => {
    if (value.startsWith('.')) {
      return value === extension;
    }

    if (value.endsWith('/*')) {
      return fileType.startsWith(value.slice(0, -1));
    }

    return value === fileType;
  });
}

function setInputFile(input: HTMLInputElement, file: File): void {
  try {
    const dataTransfer = new DataTransfer();

    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
  } catch {
    /*
     * Некоторые браузеры запрещают программно менять input.files.
     * В таком случае файл всё равно остаётся отображённым в компоненте.
     */
  }
}

function renderFile(root: HTMLElement, input: HTMLInputElement, file: File): void {
  const list = root.querySelector<HTMLElement>('[data-file-list]');

  if (!list) {
    return;
  }

  list.innerHTML = '';

  const fileElement = document.createElement('div');
  fileElement.className = 'file-upload__file';

  const nameElement = document.createElement('span');
  nameElement.className = 'file-upload__file-name';
  nameElement.textContent = file.name;
  nameElement.title = file.name;

  const sizeElement = document.createElement('span');
  sizeElement.className = 'file-upload__file-size';
  sizeElement.textContent = formatFileSize(file.size);

  const removeButton = document.createElement('button');
  removeButton.className = 'file-upload__remove';
  removeButton.type = 'button';
  removeButton.textContent = 'Удалить';

  removeButton.addEventListener('click', () => {
    input.value = '';
    list.innerHTML = '';
    root.classList.remove('has-file');
  });

  fileElement.append(nameElement, sizeElement, removeButton);
  list.append(fileElement);

  root.classList.add('has-file');
}

function showError(root: HTMLElement, message: string): void {
  const errorElement = root.querySelector<HTMLElement>('[data-file-error]');

  if (errorElement) {
    errorElement.textContent = message;
  }

  root.classList.toggle('is-invalid', Boolean(message));
}

function handleFile(root: HTMLElement, input: HTMLInputElement, file: File | undefined): void {
  const maxSize = Number(root.dataset.maxSize) || DEFAULT_MAX_SIZE;
  const accept = input.getAttribute('accept') ?? '';

  root.classList.remove('has-file');
  showError(root, '');

  if (!file) {
    return;
  }

  if (!isFileAccepted(file, accept)) {
    input.value = '';
    showError(root, 'Формат файла не поддерживается.');
    return;
  }

  if (file.size > maxSize) {
    input.value = '';
    showError(root, `Файл слишком большой. Максимальный размер: ${formatFileSize(maxSize)}.`);
    return;
  }

  setInputFile(input, file);
  renderFile(root, input, file);
}

export function initFileUploads(): void {
  const roots = document.querySelectorAll<HTMLElement>('[data-file-upload]');

  roots.forEach((root) => {
    const input = root.querySelector<HTMLInputElement>('.file-upload__input');

    const dropzone = root.querySelector<HTMLElement>('.file-upload__dropzone');

    if (!input || !dropzone) {
      return;
    }

    input.addEventListener('change', () => {
      handleFile(root, input, input.files?.[0]);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        root.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        root.classList.remove('is-dragover');
      });
    });

    dropzone.addEventListener('drop', (event) => {
      const dragEvent = event as DragEvent;
      const file = dragEvent.dataTransfer?.files?.[0];

      handleFile(root, input, file);
    });
  });
}
