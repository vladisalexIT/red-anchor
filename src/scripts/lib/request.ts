export interface RequestResult {
  requestId: string;
  demo?: boolean;
}
export async function sendRequest(
  kind: 'callback' | 'request' | 'question',
  data: FormData,
): Promise<RequestResult> {
  if (import.meta.env.VITE_FORMS_MODE === 'demo') {
    return { requestId: `DEMO-${Date.now().toString(36).toUpperCase()}`, demo: true };
  }
  const endpoints: Record<string, unknown> = {
    callback: import.meta.env.VITE_CALLBACK_ENDPOINT,
    request: import.meta.env.VITE_REQUEST_ENDPOINT,
    question: import.meta.env.VITE_QUESTION_ENDPOINT,
  };
  const endpoint = endpoints[kind];
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new Error('Отправка не подключена. Свяжитесь с нами по телефону или электронной почте.');
  }
  const url = new URL(endpoint, location.origin);
  if (url.origin !== location.origin)
    throw new Error('Для отправки нужен обработчик на домене сайта.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    const response = await fetch(url, {
      method: 'POST',
      body: data,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    });
    if (!response.ok) throw new Error('Не удалось отправить заявку. Повторите попытку позже.');
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== 'object' ||
      !('requestId' in result) ||
      typeof result.requestId !== 'string' ||
      !result.requestId.trim()
    ) {
      throw new Error('Сервер не подтвердил получение заявки. Свяжитесь с нами напрямую.');
    }
    return { requestId: result.requestId };
  } finally {
    window.clearTimeout(timeout);
  }
}
