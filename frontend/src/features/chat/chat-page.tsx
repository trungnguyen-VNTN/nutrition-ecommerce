import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { productSchema } from '@/features/products/api/products';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { apiErrorMessage, requestJson } from '@/lib/api/client';

const replySchema = z.object({
  reply: z.string(),
  products: z.array(productSchema),
});
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
    <section className="space-y-8">
      <header className="max-w-copy space-y-3">
        <p className="text-sm font-semibold text-primary-700">
          Nutrition Assistant
        </p>
        <h1 className="text-3xl font-semibold">Tra cứu AI</h1>
        <p className="text-lg text-neutral-700">
          Bắt đầu từ điều bạn muốn ăn. Tìm thực phẩm phù hợp từ dữ liệu cửa
          hàng.
        </p>
      </header>
      <p className="rounded-control border border-allergen-border bg-allergen-bg p-4 text-sm text-allergen-text">
        Thông tin tham khảo, không phải tư vấn y tế
      </p>
      {!identity ? (
        <SignInRequired />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <aside className="space-y-6 rounded-card bg-primary-50 p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Bạn có thể hỏi</h2>
              <p className="text-sm text-neutral-700">
                Tra cứu theo tên, năng lượng, protein hoặc loại trừ allergen.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3">
              {[
                'Tìm yến mạch',
                'Thực phẩm dưới 400 kcal mỗi khẩu phần',
                'Tìm sản phẩm không chứa đậu phộng',
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="secondary"
                  className="h-auto whitespace-normal text-left"
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
            <p className="text-sm text-neutral-700">
              Kết quả lấy từ dữ liệu sản phẩm. Thực phẩm chưa đủ dữ liệu sẽ
              không xuất hiện khi lọc dinh dưỡng hoặc allergen.
            </p>
          </aside>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {question ? (
              <div className="ml-8 rounded-card bg-primary-700 p-4 text-neutral-50">
                <p className="mb-2 text-sm font-semibold">Bạn</p>
                <p className="break-words">{question}</p>
              </div>
            ) : (
              <div className="rounded-card border border-neutral-200 p-6 space-y-3">
                <h2 className="text-xl font-semibold">
                  Một lựa chọn có hiểu biết
                </h2>
                <p className="text-neutral-700">
                  Nhập câu hỏi hoặc chọn gợi ý để bắt đầu. Bạn có thể mở chi
                  tiết từng sản phẩm trong kết quả để xem nguồn dữ liệu và khẩu
                  phần.
                </p>
              </div>
            )}
            {chat.isPending && (
              <p className="rounded-card bg-neutral-100 p-6" role="status">
                Đang tra cứu dữ liệu cửa hàng…
              </p>
            )}
            {chat.isError && (
              <div className="rounded-card border border-danger p-4 space-y-3">
                <p role="alert">{apiErrorMessage(chat.error)}</p>
                <Button
                  variant="secondary"
                  onClick={() => chat.mutate(question)}
                >
                  Thử lại
                </Button>
              </div>
            )}
            {chat.isSuccess && (
              <div className="space-y-6 rounded-card border border-neutral-200 p-4 md:p-6">
                <p className="text-sm font-semibold text-primary-700">
                  Nutrition Assistant
                </p>
                <p role="status">{chat.data.reply}</p>
                {chat.data.products.length === 0 && (
                  <p className="text-sm text-neutral-700">
                    Bạn có thể thử tên thực phẩm khác hoặc điều chỉnh tiêu chí
                    tìm kiếm.
                  </p>
                )}
                <ul className="grid gap-4 sm:grid-cols-2">
                  {chat.data.products.map((product, index) => (
                    <li key={product.id}>
                      <ProductCard product={product} index={index} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <form
              className="space-y-4 rounded-card border border-neutral-200 bg-neutral-100 p-4 md:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                const value = message.trim();
                if (!value) return;
                setQuestion(value);
                chat.mutate(value);
              }}
            >
              <label className="block">
                Bạn muốn tìm thực phẩm nào?
                <textarea
                  ref={composer}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  aria-describedby="chat-privacy"
                  name="message"
                  className="mt-2 block min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 p-3"
                  required
                  maxLength={1000}
                  rows={3}
                />
              </label>
              <p id="chat-privacy" className="text-sm text-neutral-700">
                Tối đa 1.000 ký tự. Không nhập thông tin sức khỏe riêng tư. Mỗi
                câu hỏi được tra cứu độc lập.
              </p>
              <Button
                type="submit"
                loading={chat.isPending}
                disabled={!message.trim()}
              >
                Tra cứu
              </Button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
