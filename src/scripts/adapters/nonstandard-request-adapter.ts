import { sendRequest, type RequestResult } from '../lib/request';
export type NonstandardRequestResult = RequestResult;
export const submitNonstandardRequest = (formData: FormData): Promise<NonstandardRequestResult> =>
  sendRequest('request', formData);
