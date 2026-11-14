import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '@/test/render';
import { ForgotPasswordPage } from './forgot-password-page';
import { confirmPasswordReset, requestPasswordReset } from './session';

vi.mock('./session', () => ({
  authConfigured: true,
  useSession: () => null,
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}));

function mount() {
  renderApp(
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Routes>,
    '/forgot-password',
  );
}

beforeEach(() => {
  vi.mocked(requestPasswordReset).mockReset().mockResolvedValue(undefined);
  vi.mocked(confirmPasswordReset).mockReset().mockResolvedValue(undefined);
});

describe('forgot password', () => {
  it('requests a code, then sets a new password with it', async () => {
    mount();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.click(screen.getByRole('button', { name: 'Gửi mã' }));
    expect(requestPasswordReset).toHaveBeenCalledWith('demo@example.com');
    // Same wording whether or not the account exists.
    expect(
      await screen.findByText(/Nếu demo@example.com có tài khoản/),
    ).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    await user.type(screen.getByLabelText('Mã đặt lại'), ' 123456 ');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'Example123!');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(confirmPasswordReset).toHaveBeenCalledWith(
      'demo@example.com',
      '123456',
      'Example123!',
    );
    expect(
      await screen.findByRole('heading', { name: 'Đã đổi mật khẩu' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('explains rate limits and wrong codes without leaking details', async () => {
    mount();
    const user = userEvent.setup();
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      Object.assign(new Error('internal'), { name: 'LimitExceededException' }),
    );
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.click(screen.getByRole('button', { name: 'Gửi mã' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('quá nhiều lần');
    await user.click(screen.getByRole('button', { name: 'Gửi mã' }));
    vi.mocked(confirmPasswordReset).mockRejectedValueOnce(
      Object.assign(new Error('internal'), { name: 'CodeMismatchException' }),
    );
    await user.type(await screen.findByLabelText('Mã đặt lại'), '000000');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'Example123!');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Kiểm tra mã');
    expect(alert).not.toHaveTextContent('internal');
  });

  it('does not send without an email', async () => {
    mount();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Gửi mã' }));
    expect(screen.getByLabelText('Email')).toBeInvalid();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});
