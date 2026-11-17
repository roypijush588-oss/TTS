import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

async function bootstrap() {
  // In dev mode, if a previously cached index.html omitted the React Refresh preamble,
  // initialize it dynamically before importing React components and update any stale SW.
  if (
    import.meta.hot &&
    typeof window !== 'undefined' &&
    !(window as unknown as { $RefreshReg$?: unknown }).$RefreshReg$
  ) {
    try {
      const refreshPath = '/@react-refresh';
      const refreshMod = await import(/* @vite-ignore */ refreshPath);
      refreshMod.injectIntoGlobalHook(window);
      const win = window as unknown as {
        $RefreshReg$?: () => void;
        $RefreshSig$?: () => (type: unknown) => unknown;
      };
      win.$RefreshReg$ = () => {};
      win.$RefreshSig$ = () => (type) => type;
    } catch {
      // Ignore if React Refresh runtime is unavailable
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((reg) => {
            reg.update().catch(() => {});
          });
        })
        .catch(() => {});
    }
  }

  // Register Service Worker with safe automatic updates and periodic version checks
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check for SW updates every hour without caching stale versions
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      // App shell precached for offline launch
    },
  });

  const { default: App } = await import('./App.tsx');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
