export function initFormValidation(): void {
  document
    .querySelectorAll<HTMLFormElement>(
      '[data-callback-form], [data-nonstandard-request], [data-question-form]',
    )
    .forEach((form) => {
      const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
      const fields = [
        ...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          'input, textarea, select',
        ),
      ];
      const update = () => {
        if (!submit) return;
        const disabled =
          form.getAttribute('aria-busy') === 'true' ||
          fields.some((field) => !field.disabled && !field.validity.valid);
        if (submit.disabled !== disabled) {
          submit.disabled = disabled;
        }
      };
      fields.forEach((field) => {
        if (field instanceof HTMLInputElement && field.type === 'tel') {
          field.inputMode = 'tel';
          const validate = () => {
            const count = field.value.replace(/\D/g, '').length;
            field.setCustomValidity(field.value && count !== 11 ? 'Введите номер из 11 цифр.' : '');
          };
          field.addEventListener('input', () => {
            const caret = field.selectionStart;
            const atEnd = caret === field.value.length;
            let digits = field.value.replace(/\D/g, '');
            if (digits.startsWith('8')) digits = '7' + digits.slice(1);
            if (digits && !digits.startsWith('7')) digits = '7' + digits;
            digits = digits.slice(0, 11);
            const local = digits.slice(1);
            let formatted = digits ? '+7' : '';
            if (local) formatted += ` (${local.slice(0, 3)}`;
            if (local.length >= 3) formatted += ')';
            if (local.length > 3) formatted += ` ${local.slice(3, 6)}`;
            if (local.length > 6) formatted += `-${local.slice(6, 8)}`;
            if (local.length > 8) formatted += `-${local.slice(8, 10)}`;
            field.value = formatted;
            if (!atEnd && caret !== null)
              field.setSelectionRange(
                Math.min(caret, formatted.length),
                Math.min(caret, formatted.length),
              );
            validate();
          });
          field.addEventListener('blur', validate);
        }
        field.addEventListener('blur', () => {
          field.setAttribute('aria-invalid', String(!field.validity.valid));
          if (!field.validity.valid) field.reportValidity();
          update();
        });
      });
      form.addEventListener('input', update);
      form.addEventListener('change', update);
      form.addEventListener('reset', () => queueMicrotask(update));
      new MutationObserver(update).observe(form, {
        attributes: true,
        subtree: true,
        attributeFilter: ['disabled', 'required', 'aria-busy'],
      });
      update();
    });
}
