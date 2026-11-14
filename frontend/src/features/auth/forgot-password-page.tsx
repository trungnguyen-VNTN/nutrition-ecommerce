import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { PasswordField } from './auth-page';
import {
  authConfigured,
  confirmPasswordReset,
  requestPasswordReset,
  useSession,
} from './session';

type Step = 'email' | 'code' | 'done';

// Two steps: request a code by email, then set a new password with it. Messages never say whether
// the email has an account (the Cognito client also hides it).
export function ForgotPasswordPage() {
  const identity = useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  if (identity) return <Navigate to="/products" replace />;

  const go = (next: Step) => {
    setStep(next);
    // Move focus to the new step's heading for screen reader and keyboard users.
    requestAnimationFrame(() => heading.current?.focus());
  };

  return (
    <section className="mx-auto w-full max-w-md space-y-6 md:py-8">
      <header className="space-y-3">
        <p className="eyebrow">Tài khoản nutrition</p>
        <h1 ref={heading} tabIndex={-1} className="text-4xl font-extrabold">
          {step === 'done' ? 'Đã đổi mật khẩu' : 'Quên mật khẩu'}
        </h1>
        <p className="text-ink-muted">
          {step === 'email'
            ? 'Nhập email tài khoản. Nếu email đã đăng ký, chúng tôi sẽ gửi mã đặt lại mật khẩu.'
            : step === 'code'
              ? `Nếu ${email} có tài khoản, mã đặt lại đã được gửi tới email đó. Nhập mã và mật khẩu mới.`
              : 'Bạn có thể đăng nhập bằng mật khẩu mới.'}
        </p>
        {step !== 'done' && (
          <p className="text-sm text-ink-muted">
            Bước {step === 'email' ? 1 : 2} / 2
          </p>
        )}
      </header>
      {!authConfigured ? (
        <p
          className="rounded-control border border-dashed border-warning bg-warning-tint p-4 text-warning"
          role="alert"
        >
          Đăng nhập chưa được cấu hình cho môi trường này.
        </p>
      ) : step === 'done' ? (
        <Button asChild variant="sticker" className="w-full">
          <Link to="/login">Đăng nhập</Link>
        </Button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            setBusy(true);
            setError('');
            try {
              if (step === 'email') {
                await requestPasswordReset(email);
                go('code');
              } else {
                await confirmPasswordReset(
                  email,
                  String(values.get('code')).trim(),
                  String(values.get('password')),
                );
                go('done');
              }
            } catch (failure) {
              const name = failure instanceof Error ? failure.name : '';
              setError(
                name === 'LimitExceededException' ||
                  name === 'TooManyRequestsException'
                  ? 'Bạn đã thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.'
                  : step === 'email'
                    ? 'Không thể gửi mã lúc này. Vui lòng thử lại.'
                    : 'Không thể đổi mật khẩu. Kiểm tra mã (mã có hạn dùng) và yêu cầu mật khẩu rồi thử lại.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Email" required>
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                disabled={busy || step === 'code'}
              />
            )}
          </Field>
          {step === 'code' && (
            <>
              <Field label="Mã đặt lại" required>
                {(control) => (
                  <Input
                    {...control}
                    name="code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={10}
                  />
                )}
              </Field>
              <PasswordField register label="Mật khẩu mới" />
            </>
          )}
          <Button
            className="w-full"
            type="submit"
            variant="sticker"
            loading={busy}
          >
            {step === 'email' ? 'Gửi mã' : 'Đổi mật khẩu'}
          </Button>
          {step === 'code' && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setError('');
                go('email');
              }}
            >
              Dùng email khác hoặc gửi lại mã
            </Button>
          )}
        </form>
      )}
      {error && (
        <p
          className="rounded-control border border-line bg-sunken p-4 text-sm"
          role="alert"
        >
          {error}
        </p>
      )}
      <Link
        className="inline-flex min-h-touch items-center font-semibold text-brand underline underline-offset-4"
        to="/login"
      >
        Quay lại đăng nhập
      </Link>
    </section>
  );
}
