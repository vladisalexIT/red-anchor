import { sendRequest, type RequestResult } from '../lib/request';
export type CallbackRequestResult = RequestResult;
export const submitCallbackRequest = (formData: FormData): Promise<CallbackRequestResult> =>
  sendRequest('callback', formData);
