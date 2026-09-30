export interface CallbackRequestResult {
  requestId: string;
}

const createRequestId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();

  return `CALL-${timestamp}`;
};

export const submitCallbackRequest = (formData: FormData): Promise<CallbackRequestResult> => {
  // Изолированный демонстрационный адаптер.
  // При интеграции с Битрикс здесь появится fetch
  // к реальному обработчику формы.
  void formData;

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        requestId: createRequestId(),
      });
    }, 600);
  });
};
