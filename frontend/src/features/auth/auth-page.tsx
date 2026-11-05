import { useState } from 'react';
import {
  CheckCircle,
  Eye,
  EyeSlash,
  LockSimple,
  Leaf,
} from '@phosphor-icons/react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import {
  authConfigured,
  confirmEmail,
  signIn,
  signUp,
  useSession,
} from './session';

const promises = [
  'Thông tin dinh dưỡng minh bạch',
  'Giỏ hàng và đơn mua trong một nơi',
  'AI hỗ trợ tra cứu, không tư vấn y tế',
];

function PasswordField({ register }: { register: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label="Mật khẩu"
      required
      hint={
        register
          ? 'Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.'
          : undefined
      }
    >
      {(control) => (
        <div className="relative">
          <Input
            {...control}
            className="pr-12"
            name="password"
            key="password"
            type={visible ? 'text' : 'password'}
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={8}
            maxLength={256}
          />
          <button
            type="button"
            className="absolute right-0 bottom-0 grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeSlash /> : <Eye />}
          </button>
        </div>
      )}
    </Field>
  );
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const identity = useSession();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (identity) return <Navigate to="/products" replace />;
  const title = confirm ? 'Xác minh email' : register ? 'Đăng ký' : 'Đăng nhập';
  return (
    <section className="grid items-stretch gap-8 md:grid-cols-2 md:gap-12">
      <div className="mx-auto w-full max-w-md space-y-6 md:py-8">
        <header className="space-y-3">
          <p className="eyebrow">Tài khoản nutrition</p>
          <h1 className="text-4xl font-extrabold">{title}</h1>
          <p className="text-ink-muted">
            {confirm
              ? 'Nhập mã được gửi đến email của bạn để hoàn tất xác minh.'
              : register
                ? 'Tạo tài khoản để bắt đầu mua sắm.'
                : 'Chào mừng bạn quay lại với Nutrition.'}
          </p>
        </header>
        {!authConfigured ? (
          <div
            className="space-y-3 rounded-control border border-dashed border-warning bg-warning-tint p-4 text-warning"
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
            <Field label="Email" required>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  disabled={busy || confirm}
                />
              )}
            </Field>
            {confirm ? (
              <Field label="Mã xác minh" required>
                {(control) => (
                  <Input
                    {...control}
                    name="code"
                    key="verification-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={10}
                  />
                )}
              </Field>
            ) : (
              <PasswordField register={register} />
            )}
            <Button
              className="w-full"
              type="submit"
              variant="sticker"
              loading={busy}
            >
              {title}
            </Button>
          </form>
        )}
        {message && (
          <p
            className="rounded-control border border-line bg-sunken p-4 text-sm"
            role="alert"
          >
            {message}
          </p>
        )}
        <Link
          className="inline-flex min-h-touch items-center font-semibold text-brand underline underline-offset-4"
          to={register ? '/login' : '/register'}
        >
          {register ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản'}
        </Link>
        <p className="text-sm text-ink-muted">
          Phiên đăng nhập chỉ lưu trong bộ nhớ. Tải lại trang sẽ cần đăng nhập
          lại.
        </p>
      </div>
      <aside className="flex flex-col justify-between gap-8 rounded-sheet bg-lime-soft p-6 md:p-10">
        <div className="space-y-4">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-pill bg-brand text-3xl text-lime"
          >
            <Leaf weight="fill" />
          </span>
          <h2 className="text-3xl font-bold">
            Mỗi lựa chọn tốt bắt đầu từ việc hiểu rõ.
          </h2>
          <p>
            Lưu giỏ hàng, theo dõi đơn mua và tra cứu thực phẩm phù hợp với bạn.
          </p>
        </div>
        <ul className="space-y-3 text-sm font-semibold">
          {promises.map((promise) => (
            <li key={promise} className="flex items-center gap-2">
              <CheckCircle weight="fill" className="icon text-lg text-brand" />
              {promise}
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

export function SignInRequired() {
  return (
    <div className="mx-auto max-w-copy space-y-4 rounded-card border border-dashed border-line-strong bg-surface p-8 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid size-14 place-items-center rounded-pill bg-lime-soft text-3xl text-brand"
      >
        <LockSimple />
      </span>
      <h2 className="text-xl font-bold">Dành riêng cho tài khoản của bạn</h2>
      <p className="text-ink-muted">
        Vui lòng đăng nhập để sử dụng chức năng này.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="sticker">
          <Link to="/login">Đăng nhập</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/products">Khám phá sản phẩm</Link>
        </Button>
      </div>
    </div>
  );
}
