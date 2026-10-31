import { ProductDataPage } from '@/features/admin/product-data-page';
import { ChatPage } from '@/features/chat/chat-page';
import { AdminPage } from '@/features/admin/admin-page';
import { HomePage } from '@/features/home/home-page';
import { AuthPage } from '@/features/auth/auth-page';
import { CartPage } from '@/features/commerce/cart-page';
import { CheckoutPage } from '@/features/commerce/checkout-page';
import { OrdersPage, OrderDetailPage } from '@/features/commerce/orders-page';
import { Link, Route, Routes } from 'react-router-dom';
import { ProductsPage } from '@/features/products/products-page';
import { ProductDetailPage } from '@/features/products/product-detail-page';
import { Button } from '@/components/ui/button';
import { Layout } from './layout';
import { messages } from './messages.vi';

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
