import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';

const focusable = 'a[href],button:not(:disabled),input,select,summary';

// One filter form on every width: CSS makes it a side panel from 940px and a modal
// bottom sheet below. Opening moves focus in; Esc, scrim and the close button leave.
export function FilterSheet({
  id,
  open,
  onClose,
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector('button')?.focus();
    return () => opener?.focus();
  }, [open]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !sheet.current) return;
    const items = Array.from(
      sheet.current.querySelectorAll<HTMLElement>(focusable),
    ).filter(
      (item) =>
        item.tagName === 'SUMMARY' || !item.closest('details:not([open])'),
    );
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <>
      {open && (
        <div aria-hidden="true" className="filter-scrim" onClick={onClose} />
      )}
      <div
        ref={sheet}
        id={id}
        className="filter-sheet"
        data-open={open}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={open ? messages.filters : undefined}
        onKeyDown={onKeyDown}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{messages.filters}</h2>
          <button
            type="button"
            className="control-transition grid size-11 place-items-center rounded-control hover:bg-sunken md:hidden"
            aria-label={messages.closeFilters}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
