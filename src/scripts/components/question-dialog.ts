import { sendRequest } from '../lib/request';
export function initQuestionDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-question-dialog]');
  const form = dialog?.querySelector<HTMLFormElement>('form');
  const status = dialog?.querySelector<HTMLElement>('[data-question-status]');
  const submit = form?.querySelector<HTMLButtonElement>('[type="submit"]');
  if (!dialog || !form || !status || !submit) return;
  let trigger: HTMLElement | null = null;
  document.addEventListener('click', (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            '[data-question-open], .home-questions a, .home-questions button',
          )
        : null;
    if (!target) return;
    event.preventDefault();
    if (dialog.open) return;
    trigger = target;
    status.hidden = true;
    dialog.showModal();
    document.body.classList.add('has-dialog-open');
  });
  dialog.querySelector('[data-question-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('has-dialog-open');
    trigger?.focus();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.hasAttribute('aria-busy') || !form.reportValidity()) return;
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    status.hidden = false;
    status.textContent = 'Отправляем…';
    try {
      const result = await sendRequest('question', new FormData(form));
      status.textContent = result.demo
        ? 'Демонстрационный режим: данные проверены, но никуда не отправлены.'
        : `Вопрос № ${result.requestId} отправлен.`;
      if (!result.demo) form.reset();
      status.focus();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Не удалось отправить вопрос.';
    } finally {
      form.removeAttribute('aria-busy');
      form.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}
