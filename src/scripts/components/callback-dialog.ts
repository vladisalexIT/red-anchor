import { submitCallbackRequest } from '../adapters/callback-request-adapter';

const isValidPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');

  return digits.length === 10 || digits.length === 11;
};

const initCallbackDialog = (dialog: HTMLDialogElement): void => {
  if (dialog.dataset.callbackInitialized === 'true') {
    return;
  }

  const form = dialog.querySelector<HTMLFormElement>('[data-callback-form]');
  const closeButtons = dialog.querySelectorAll<HTMLButtonElement>('[data-callback-close]');
  const phone = dialog.querySelector<HTMLInputElement>('[data-callback-phone]');
  const submitButton = dialog.querySelector<HTMLButtonElement>('[data-callback-submit]');
  const status = dialog.querySelector<HTMLElement>('[data-callback-status]');

  if (!form || !phone || !submitButton || !status) {
    return;
  }

  let lastTrigger: HTMLElement | null = null;

  const clearStatus = (): void => {
    status.textContent = '';
    status.removeAttribute('data-state');
    status.hidden = true;
  };

  const resetDialog = (): void => {
    form.reset();
    phone.setCustomValidity('');
    clearStatus();
    form.removeAttribute('aria-busy');
    submitButton.disabled = false;
    submitButton.textContent = 'Заказать звонок';
  };

  const closeDialog = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const validatePhone = (): boolean => {
    const value = phone.value.trim();

    if (!value) {
      phone.setCustomValidity('');

      return true;
    }

    const valid = isValidPhone(value);

    phone.setCustomValidity(valid ? '' : 'Введите корректный номер телефона.');

    return valid;
  };

  const setStatus = (message: string, state: 'pending' | 'success' | 'error'): void => {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  };

  const handleSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();

    validatePhone();

    if (!form.checkValidity()) {
      form.reportValidity();

      setStatus('Проверьте обязательные поля формы.', 'error');

      return;
    }

    const defaultButtonText = submitButton.textContent ?? 'Заказать звонок';

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';
    form.setAttribute('aria-busy', 'true');

    setStatus('Заявка отправляется…', 'pending');

    try {
      const formData = new FormData(form);

      formData.set('sourcePage', window.location.href);

      const result = await submitCallbackRequest(formData);

      form.reset();
      phone.setCustomValidity('');

      setStatus(
        `Заявка № ${result.requestId} принята. Мы перезвоним вам в указанное время.`,
        'success',
      );

      status.focus();

      form.dispatchEvent(
        new CustomEvent('callback:submitted', {
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

  document.querySelectorAll<HTMLElement>('[data-callback-open]').forEach((trigger) => {
    const targetId = trigger.getAttribute('aria-controls');

    if (targetId !== dialog.id) {
      return;
    }

    trigger.addEventListener('click', () => {
      if (dialog.open) {
        return;
      }

      lastTrigger = trigger;
      clearStatus();

      dialog.showModal();
      document.body.classList.add('has-dialog-open');

      window.requestAnimationFrame(() => {
        const firstControl = form.querySelector<HTMLInputElement>('input:not([type="hidden"])');

        firstControl?.focus();
      });
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeDialog);
  });

  phone.addEventListener('input', () => {
    phone.setCustomValidity('');
  });

  phone.addEventListener('blur', validatePhone);

  form.addEventListener('submit', (event) => {
    void handleSubmit(event);
  });

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) {
      return;
    }

    const panel = dialog.querySelector<HTMLElement>('.callback-dialog__panel');

    if (!panel) {
      return;
    }

    const bounds = panel.getBoundingClientRect();
    const outsidePanel =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (outsidePanel) {
      closeDialog();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-dialog-open');
    resetDialog();
    lastTrigger?.focus();
    lastTrigger = null;
  });

  dialog.dataset.callbackInitialized = 'true';
};

export const initCallbackDialogs = (): void => {
  document
    .querySelectorAll<HTMLDialogElement>('[data-callback-dialog]')
    .forEach(initCallbackDialog);
};
