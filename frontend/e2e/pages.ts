export const pages = [
  { path: '/', name: 'home', title: 'Hiểu thực phẩm. Chọn điều phù hợp.' },
  { path: '/products', name: 'products', title: 'Sản phẩm' },
  {
    path: '/products/oats',
    name: 'product-detail',
    title: 'Yến mạch nguyên hạt',
  },
  { path: '/cart', name: 'cart', title: 'Giỏ hàng' },
  { path: '/orders', name: 'orders', title: 'Đơn hàng' },
  { path: '/login', name: 'login', title: 'Đăng nhập' },
  { path: '/chat', name: 'chat', title: 'Tra cứu AI' },
  { path: '/admin', name: 'admin', title: 'Quản trị' },
] as const;
