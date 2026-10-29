import { Link, Route, Routes } from 'react-router-dom';
import { ProductsPage } from '@/features/products/products-page';
import { ProductDetailPage } from '@/features/products/product-detail-page';
import { Button } from '@/components/ui/button';
import { Layout } from './layout';
import { messages } from './messages.vi';
import { PlaceholderPage } from './placeholder-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PlaceholderPage title={messages.home} />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route
          path="cart"
          element={<PlaceholderPage title={messages.cart} />}
        />
        <Route
          path="orders"
          element={<PlaceholderPage title={messages.orders} />}
        />
        <Route
          path="login"
          element={<PlaceholderPage title={messages.login} />}
        />
        <Route
          path="chat"
          element={<PlaceholderPage title={messages.chat} isChat />}
        />
        <Route
          path="admin"
          element={<PlaceholderPage title={messages.admin} />}
        />
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
