import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '@/test/render';
import { AuthPage } from './auth-page';
import { confirmEmail, signIn, signUp } from './session';

vi.mock('./session', () => ({
  authConfigured: true,
  useSession: () => null,
  signUp: vi.fn(),
  confirmEmail: vi.fn(),
  signIn: vi.fn(),
}));

function mount(path = '/register') {
  renderApp(
    <Routes>
      <Route path="/register" element={<AuthPage register />} />
      <Route path="/login" element={<AuthPage />} />
    </Routes>,
    path,
  );
}

beforeEach(() => {
  vi.mocked(signUp).mockReset().mockResolvedValue(undefined);
  vi.mocked(confirmEmail).mockReset().mockResolvedValue(undefined);
  vi.mocked(signIn).mockReset().mockResolvedValue(undefined);
});

describe('account forms', () => {
  it('registers, confirms email, and returns to sign-in instead of registering again', async () => {
    mount();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'Example123!');
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
    const code = await screen.findByLabelText('Mã xác minh');
    expect(signUp).toHaveBeenCalledWith('demo@example.com', 'Example123!');
    expect(screen.getByLabelText('Email')).toBeDisabled();
    await user.type(code, '123456');
    await user.click(screen.getByRole('button', { name: 'Xác minh email' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' }),
    ).toBeVisible();
    expect(confirmEmail).toHaveBeenCalledWith('demo@example.com', '123456');
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('does not submit missing required fields', async () => {
    mount();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByLabelText('Email')).toBeInvalid();
    expect(screen.getByLabelText('Mật khẩu')).toBeInvalid();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('shows a recoverable sign-in error without exposing provider details', async () => {
    vi.mocked(signIn).mockRejectedValue(
      new Error('Internal provider diagnostic'),
    );
    mount('/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'Example123!');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể hoàn tất.',
    );
    expect(
      screen.queryByText('Internal provider diagnostic'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });
});
