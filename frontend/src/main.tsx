import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './app/providers';
import { AppRoutes } from './app/router';
import './styles/globals.css';

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing root element');
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </Providers>
    </StrictMode>,
  );
}

// A worker startup failure must stop rendering before any catalog request can escape.
void bootstrap();
