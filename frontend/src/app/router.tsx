import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/features/home/home-page';
import { Button } from '@/components/ui/button';
import { Layout } from './layout';
import { messages } from './messages.vi';

// Route-level splitting: only the home page ships in the entry bundle.
const ProductsPage = lazy(() =>
  import('@/features/products/products-page').then((m) => ({
    default: m.ProductsPage,
  })),
);
const ProductDetailPage = lazy(() =>
  import('@/features/products/product-detail-page').then((m) => ({
    default: m.ProductDetailPage,
  })),
);
const CartPage = lazy(() =>
  import('@/features/commerce/cart-page').then((m) => ({
    default: m.CartPage,
  })),
);
const CheckoutPage = lazy(() =>
  import('@/features/commerce/checkout-page').then((m) => ({
    default: m.CheckoutPage,
  })),
);
const OrdersPage = lazy(() =>
  import('@/features/commerce/orders-page').then((m) => ({
    default: m.OrdersPage,
  })),
);
const OrderDetailPage = lazy(() =>
  import('@/features/commerce/orders-page').then((m) => ({
    default: m.OrderDetailPage,
  })),
);
const AuthPage = lazy(() =>
  import('@/features/auth/auth-page').then((m) => ({ default: m.AuthPage })),
);
const ChatPage = lazy(() =>
  import('@/features/chat/chat-page').then((m) => ({ default: m.ChatPage })),
);
const AdminPage = lazy(() =>
  import('@/features/admin/admin-page').then((m) => ({
    default: m.AdminPage,
  })),
);
const ProductDataPage = lazy(() =>
  import('@/features/admin/product-data-page').then((m) => ({
    default: m.ProductDataPage,
  })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="admin/products/:id" element={<ProductDataPage />} />
        <Route path="register" element={<AuthPage register />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="admin/orders/:id" element={<OrderDetailPage admin />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route
          path="*"
          element={
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold">{messages.notFound}</h1>
              <p>{messages.notFoundDescription}</p>
              <Button asChild>
                <Link to="/">{messages.backHome}</Link>
              </Button>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
