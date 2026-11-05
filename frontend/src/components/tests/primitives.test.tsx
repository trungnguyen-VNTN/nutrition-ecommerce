import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/app/messages.vi';
import { ApiError } from '@/lib/api/client';
import { ErrorState } from '../error-state';
import { Field, Input } from '../ui/field';
import { Qty } from '../ui/qty';
import { ToastProvider } from '../ui/toast';
import { toastDuration, useToast } from '../ui/toast-context';

describe('primitives', () => {
  it('ties label, hint and error to the control', () => {
    render(
      <Field label="Email" hint="Dùng email đã đăng ký" error="Email chưa đúng">
        {(control) => <Input type="email" {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Dùng email đã đăng ký Email chưa đúng',
    );
  });

  it('bounds the quantity stepper by min and stock', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(
      <Qty value={1} max={2} label="Yến mạch" onChange={change} />,
    );
    expect(
      screen.getByRole('button', { name: 'Giảm Yến mạch' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Tăng Yến mạch' }));
    expect(change).toHaveBeenCalledWith(2);
    rerender(<Qty value={2} max={2} label="Yến mạch" onChange={change} />);
    expect(
      screen.getByRole('button', { name: 'Tăng Yến mạch' }),
    ).toBeDisabled();
  });

  it('explains a 429 as a rate limit with a retry', () => {
    const { rerender } = render(
      <ErrorState
        description={messages.apiErrors.rateLimited}
        error={new ApiError(429)}
        onRetry={() => undefined}
      />,
    );
    expect(
      screen.getByRole('heading', { name: messages.rateLimitedTitle }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: messages.retry })).toBeVisible();
    rerender(
      <ErrorState
        description={messages.apiErrors.unavailable}
        error={new ApiError(503)}
        onRetry={() => undefined}
      />,
    );
    expect(
      screen.getByRole('heading', { name: messages.errorTitle }),
    ).toBeVisible();
  });

  it('announces toasts politely and dismisses them', async () => {
    vi.useFakeTimers();
    function Trigger() {
      const toast = useToast();
      return <button onClick={() => toast('Đã thêm vào giỏ')}>Thêm</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Thêm' });
    trigger.focus();
    act(() => trigger.click());
    const notice = screen.getByText('Đã thêm vào giỏ');
    expect(notice.closest('[aria-live="polite"]')).not.toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Thêm' }),
    );
    act(() => vi.advanceTimersByTime(toastDuration));
    expect(screen.queryByText('Đã thêm vào giỏ')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
