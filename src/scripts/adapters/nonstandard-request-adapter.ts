export interface NonstandardRequestResult {
  requestId: string;
}

const createRequestId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();

  return `RA-${timestamp}`;
};

export const submitNonstandardRequest = (formData: FormData): Promise<NonstandardRequestResult> => {
  // Адаптер намеренно изолирован. При интеграции с Битрикс
  // здесь будет fetch к реальному обработчику формы.
  void formData;

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        requestId: createRequestId(),
      });
    }, 700);
  });
};
