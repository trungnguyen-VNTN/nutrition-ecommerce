import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import { ToastContext, toastDuration, type ToastTone } from './toast-context';

type Toast = { id: number; text: string; tone: ToastTone };

// Polite live region: toasts never take focus and dismiss after 4 s (skill: toast-accessibility).
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    nextId.current += 1;
    setToasts((all) => [...all.slice(-2), { id: nextId.current, text, tone }]);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="toast-region">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toastDuration);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);
  const Glyph = toast.tone === 'success' ? CheckCircle : WarningCircle;
  return (
    <div className="toast" data-tone={toast.tone}>
      <Glyph className="icon text-xl" />
      <p className="flex-1">{toast.text}</p>
      <button
        type="button"
        className="-my-2 -mr-2 grid size-11 place-items-center rounded-control hover:bg-cream/15"
        aria-label={messages.closeNotice}
        onClick={() => onDismiss(toast.id)}
      >
        <X />
      </button>
    </div>
  );
}
