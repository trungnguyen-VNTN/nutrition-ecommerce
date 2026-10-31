import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  authConfigured,
  confirmEmail,
  signIn,
  signUp,
  useSession,
} from './session';

export function AuthPage({ register = false }: { register?: boolean }) {
  const identity = useSession();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (identity) return <Navigate to="/products" replace />;
  const title = confirm ? 'Xác minh email' : register ? 'Đăng ký' : 'Đăng nhập';
  const input =
    'block mt-2 min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 px-3';
  return (
    <section className="grid overflow-hidden rounded-card border border-neutral-200 lg:grid-cols-2">
      <aside className="order-last flex flex-col justify-between gap-8 bg-primary-700 p-6 text-neutral-50 md:p-12 lg:order-first">
        <div className="space-y-4">
          <p className="text-sm font-semibold">Nutrition · Tài khoản của bạn</p>
          <h2 className="text-3xl font-semibold">
            Mỗi lựa chọn tốt bắt đầu từ việc hiểu rõ.
          </h2>
          <p className="text-lg">
            Lưu giỏ hàng, theo dõi đơn mua và tra cứu thực phẩm phù hợp với bạn.
          </p>
        </div>
        <ul className="space-y-4 text-sm">
          <li className="border-t border-primary-500 pt-4">
            01 · Thông tin dinh dưỡng minh bạch
          </li>
          <li className="border-t border-primary-500 pt-4">
            02 · Giỏ hàng và đơn mua trong một nơi
          </li>
          <li className="border-t border-primary-500 pt-4">
            03 · AI hỗ trợ tra cứu, không tư vấn y tế
          </li>
        </ul>
      </aside>
      <div className="order-first space-y-6 p-6 md:p-12 lg:order-last">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-neutral-700">
            {confirm
              ? 'Nhập mã được gửi đến email của bạn để hoàn tất xác minh.'
              : register
                ? 'Tạo tài khoản để bắt đầu mua sắm.'
                : 'Chào mừng bạn quay lại với Nutrition.'}
          </p>
        </header>
        {!authConfigured ? (
          <div
            className="space-y-3 rounded-control border border-allergen-border bg-allergen-bg p-4 text-allergen-text"
            role="alert"
          >
            <p>Đăng nhập chưa được cấu hình cho môi trường này.</p>
            <Link
              className="inline-flex min-h-touch items-center font-semibold underline"
              to="/products"
            >
              Tiếp tục khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              setBusy(true);
              setMessage('');
              try {
                if (confirm) {
                  await confirmEmail(email, String(values.get('code')));
                  setConfirm(false);
                  setMessage('Email đã xác minh. Bạn có thể đăng nhập.');
                  navigate('/login', { replace: true });
                } else if (register) {
                  await signUp(email, String(values.get('password')));
                  setConfirm(true);
                } else await signIn(email, String(values.get('password')));
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.name === 'UserNotConfirmedException'
                )
                  setConfirm(true);
                else
                  setMessage(
                    'Không thể hoàn tất. Kiểm tra thông tin, yêu cầu mật khẩu hoặc mã xác minh rồi thử lại.',
                  );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block">
              Email
              <input
                className={input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                disabled={busy || confirm}
              />
            </label>
            {confirm ? (
              <label className="block">
                Mã xác minh
                <input
                  className={input}
                  name="code"
                  key="verification-code"
                  autoComplete="one-time-code"
                  required
                  maxLength={10}
                />
              </label>
            ) : (
              <label className="block">
                Mật khẩu
                <input
                  className={input}
                  name="password"
                  key="password"
                  type="password"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={8}
                  maxLength={256}
                  required
                />
              </label>
            )}
            {register && !confirm && (
              <p className="text-sm text-neutral-700">
                Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
              </p>
            )}
            <Button className="w-full" type="submit" loading={busy}>
              {title}
            </Button>
          </form>
        )}
        {message && (
          <p
            className="rounded-control border border-neutral-200 bg-neutral-100 p-4 text-sm"
            role="alert"
          >
            {message}
          </p>
        )}
        <Link
          className="inline-flex min-h-touch items-center text-primary-700 underline"
          to={register ? '/login' : '/register'}
        >
          {register ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản'}
        </Link>
        <p className="text-sm text-neutral-700">
          Phiên đăng nhập chỉ lưu trong bộ nhớ. Tải lại trang sẽ cần đăng nhập
          lại.
        </p>
      </div>
    </section>
  );
}

export function SignInRequired() {
  return (
    <div className="mx-auto max-w-copy space-y-4 rounded-card border border-neutral-200 bg-primary-50 p-8 text-center">
      <span aria-hidden="true" className="text-3xl text-primary-700">
        ↗
      </span>
      <h2 className="text-xl font-semibold">
        Dành riêng cho tài khoản của bạn
      </h2>
      <p className="text-neutral-700">
        Vui lòng đăng nhập để sử dụng chức năng này.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/login">Đăng nhập</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/products">Khám phá sản phẩm</Link>
        </Button>
      </div>
    </div>
  );
}
