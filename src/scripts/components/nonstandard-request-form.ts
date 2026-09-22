import { submitNonstandardRequest } from '../adapters/nonstandard-request-adapter';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_NAME = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/i;

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const initRequestForm = (form: HTMLFormElement): void => {
  const deliveryControls = form.querySelectorAll<HTMLInputElement>('input[name="deliveryType"]');
  const deliveryPanels = form.querySelectorAll<HTMLElement>('[data-delivery-panel]');
  const dateControl = form.querySelector<HTMLInputElement>('[data-request-date]');
  const fileControl = form.querySelector<HTMLInputElement>('[data-request-files]');
  const fileList = form.querySelector<HTMLElement>('[data-request-file-list]');
  const fileError = form.querySelector<HTMLElement>('[data-request-file-error]');
  const fileClear = form.querySelector<HTMLButtonElement>('[data-request-files-clear]');
  const submitButton = form.querySelector<HTMLButtonElement>('[data-request-submit]');
  const status = form.querySelector<HTMLElement>('[data-request-status]');

  const updateDeliveryPanels = (): void => {
    const selectedDelivery =
      form.querySelector<HTMLInputElement>('input[name="deliveryType"]:checked')?.value ?? 'pickup';

    deliveryPanels.forEach((panel) => {
      const supportedValues = panel.dataset.deliveryPanel?.split(' ') ?? [];
      const isActive = supportedValues.includes(selectedDelivery);

      panel.hidden = !isActive;

      panel
        .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input, select, textarea',
        )
        .forEach((control) => {
          control.disabled = !isActive;

          if (control.hasAttribute('data-required-when-visible')) {
            control.required = isActive;
          }
        });
    });
  };

  const renderFiles = (): void => {
    if (!fileControl || !fileList || !fileClear) {
      return;
    }

    fileList.replaceChildren();

    Array.from(fileControl.files ?? []).forEach((file) => {
      const item = document.createElement('li');

      item.textContent = `${file.name} — ${(file.size / 1024 / 1024).toFixed(2)} МБ`;

      fileList.append(item);
    });

    fileClear.hidden = !fileControl.files?.length;
  };

  const validateFiles = (): boolean => {
    if (!fileControl || !fileError) {
      return true;
    }

    const files = Array.from(fileControl.files ?? []);
    const errors: string[] = [];

    files.forEach((file) => {
      if (!ALLOWED_FILE_NAME.test(file.name)) {
        errors.push(`Недопустимый формат файла «${file.name}».`);
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`Файл «${file.name}» превышает 10 МБ.`);
      }
    });

    const errorMessage = errors.join(' ');

    fileControl.setCustomValidity(errorMessage);
    fileError.textContent = errorMessage;
    fileError.hidden = errors.length === 0;

    return errors.length === 0;
  };

  const setStatus = (message: string, state: 'pending' | 'success' | 'error'): void => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  };

  const resetFormState = (): void => {
    updateDeliveryPanels();

    if (fileList) {
      fileList.replaceChildren();
    }

    if (fileError) {
      fileError.textContent = '';
      fileError.hidden = true;
    }

    if (fileClear) {
      fileClear.hidden = true;
    }

    fileControl?.setCustomValidity('');
  };

  const handleSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();

    const filesAreValid = validateFiles();

    if (!filesAreValid || !form.checkValidity()) {
      form.reportValidity();

      setStatus('Проверьте обязательные поля и приложенные файлы.', 'error');

      return;
    }

    if (!submitButton) {
      return;
    }

    const defaultButtonText = submitButton.textContent ?? '';

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';
    form.setAttribute('aria-busy', 'true');

    setStatus('Заявка отправляется…', 'pending');

    try {
      const result = await submitNonstandardRequest(new FormData(form));

      form.reset();
      resetFormState();

      setStatus(
        `Заявка № ${result.requestId} принята. Мы свяжемся с вами после её обработки.`,
        'success',
      );

      form.dispatchEvent(
        new CustomEvent('request:submitted', {
          bubbles: true,
          detail: {
            requestId: result.requestId,
          },
        }),
      );
    } catch {
      setStatus('Не удалось отправить заявку. Попробуйте ещё раз.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = defaultButtonText;
      form.removeAttribute('aria-busy');
    }
  };

  deliveryControls.forEach((control) => {
    control.addEventListener('change', updateDeliveryPanels);
  });

  fileControl?.addEventListener('change', () => {
    validateFiles();
    renderFiles();
  });

  fileClear?.addEventListener('click', () => {
    if (!fileControl) {
      return;
    }

    fileControl.value = '';
    validateFiles();
    renderFiles();
    fileControl.focus();
  });

  form.addEventListener('reset', () => {
    window.queueMicrotask(resetFormState);
  });

  form.addEventListener('submit', (event) => {
    void handleSubmit(event);
  });

  if (dateControl) {
    const minimumDate = new Date();

    minimumDate.setDate(minimumDate.getDate() + 3);
    dateControl.min = formatDateForInput(minimumDate);
  }

  updateDeliveryPanels();
};

export const initNonstandardRequestForms = (): void => {
  document.querySelectorAll<HTMLFormElement>('[data-nonstandard-request]').forEach(initRequestForm);
};
