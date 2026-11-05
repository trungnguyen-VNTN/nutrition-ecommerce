import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MagnifyingGlass, Sparkle } from '@phosphor-icons/react';
import { z } from 'zod';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { productSchema } from '@/features/products/api/products';
import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { Note } from '@/components/ui/note';
import { apiErrorMessage, requestJson } from '@/lib/api/client';

const replySchema = z.object({
  reply: z.string(),
  products: z.array(productSchema),
});
const maxLength = 1000;
const suggestions = [
  'Tìm yến mạch',
  'Thực phẩm dưới 400 kcal mỗi khẩu phần',
  'Tìm sản phẩm không chứa đậu phộng',
];
const assistantMark = (
  <span
    aria-hidden="true"
    className="grid size-9 shrink-0 place-items-center rounded-pill bg-brand text-lime"
  >
    <Sparkle weight="fill" />
  </span>
);

export function ChatPage() {
  const identity = useSession();
  const [message, setMessage] = useState('');
  const [question, setQuestion] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const chat = useMutation({
    mutationFn: async (message: string) =>
      replySchema.parse(
        await requestJson('chat', {
          method: 'POST',
          body: JSON.stringify({ message }),
          signal: AbortSignal.timeout(18000),
        }),
      ),
  });
  return (
    <section className="grid items-start gap-6 md:grid-cols-[320px_minmax(0,1fr)] md:gap-8">
      <aside className="space-y-5">
        <header className="space-y-3">
          <p className="eyebrow">Nutrition Assistant</p>
          <h1 className="text-4xl font-extrabold">Tra cứu AI</h1>
          <p className="text-ink-muted">
            Bắt đầu từ điều bạn muốn ăn. Tìm thực phẩm phù hợp từ dữ liệu cửa
            hàng.
          </p>
        </header>
        <Note tone="medical">Thông tin tham khảo, không phải tư vấn y tế</Note>
        {identity && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Bạn có thể hỏi</h2>
            <div className="grid gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="h-auto justify-start text-left whitespace-normal"
                  disabled={chat.isPending}
                  onClick={() => {
                    setMessage(suggestion);
                    composer.current?.focus();
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
            <p className="text-sm text-ink-muted">
              Kết quả lấy từ dữ liệu sản phẩm. Thực phẩm chưa đủ dữ liệu sẽ
              không xuất hiện khi lọc dinh dưỡng hoặc allergen.
            </p>
          </div>
        )}
      </aside>
      {!identity ? (
        <SignInRequired />
      ) : (
        <div className="min-w-0 overflow-hidden rounded-sheet border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line p-4">
            {assistantMark}
            <div>
              <p className="font-bold">Nutrition Assistant</p>
              <p className="text-xs text-ink-muted">
                Chỉ tra cứu, mỗi câu hỏi độc lập
              </p>
            </div>
          </div>
          <div className="space-y-4 p-4 md:p-6">
            {question ? (
              <div className="ml-auto w-fit max-w-[85%] rounded-card rounded-br-none bg-brand p-4 text-cream">
                <p className="mb-1 text-xs font-semibold">Bạn</p>
                <p className="wrap-anywhere">{question}</p>
              </div>
            ) : (
              <div className="max-w-[85%] space-y-2 rounded-card rounded-tl-none bg-lime-soft p-4">
                <h2 className="text-lg font-bold">Một lựa chọn có hiểu biết</h2>
                <p className="text-sm">
                  Nhập câu hỏi hoặc chọn gợi ý để bắt đầu. Bạn có thể mở chi
                  tiết từng sản phẩm trong kết quả để xem nguồn dữ liệu và khẩu
                  phần.
                </p>
              </div>
            )}
            {chat.isPending && (
              <p
                className="w-fit animate-pulse rounded-card rounded-tl-none bg-sunken p-4 text-sm"
                role="status"
              >
                Đang tra cứu dữ liệu cửa hàng…
              </p>
            )}
            {chat.isError && (
              <ErrorState
                description={apiErrorMessage(chat.error)}
                error={chat.error}
                onRetry={() => chat.mutate(question)}
              />
            )}
            {chat.isSuccess && (
              <div className="space-y-4">
                <div className="max-w-[85%] rounded-card rounded-tl-none bg-lime-soft p-4">
                  <p role="status" className="wrap-anywhere">
                    {chat.data.reply}
                  </p>
                </div>
                {chat.data.products.length === 0 && (
                  <p className="text-sm text-ink-muted">
                    Bạn có thể thử tên thực phẩm khác hoặc điều chỉnh tiêu chí
                    tìm kiếm.
                  </p>
                )}
                <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {chat.data.products.map((product, index) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        index={index}
                        headingLevel={3}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <form
            className="space-y-3 border-t border-line bg-cream p-4 md:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const value = message.trim();
              if (!value) return;
              setQuestion(value);
              chat.mutate(value);
            }}
          >
            <Field
              label="Bạn muốn tìm thực phẩm nào?"
              hint="Không nhập thông tin sức khỏe riêng tư. Mỗi câu hỏi được tra cứu độc lập."
            >
              {(control) => (
                <Textarea
                  {...control}
                  ref={composer}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  name="message"
                  required
                  maxLength={maxLength}
                  rows={3}
                />
              )}
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-muted tabular-nums">
                {message.length.toLocaleString('vi-VN')} /{' '}
                {maxLength.toLocaleString('vi-VN')} ký tự
              </p>
              <Button
                type="submit"
                variant="sticker"
                loading={chat.isPending}
                disabled={!message.trim()}
              >
                <MagnifyingGlass />
                Tra cứu
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
