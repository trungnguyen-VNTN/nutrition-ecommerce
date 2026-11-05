import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error';
export const ToastContext = createContext<
  (text: string, tone?: ToastTone) => void
>(() => undefined);

export const toastDuration = 4000;

export function useToast() {
  return useContext(ToastContext);
}
