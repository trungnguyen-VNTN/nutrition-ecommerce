export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(
    amount,
  );
}
