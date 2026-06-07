import React from 'react'
import ReactDOM from 'react-dom/client'
import ArmorApp from './ArmorApp.jsx'
import { ArmorDataProvider } from './context/ArmorDataContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initAnalytics } from './utils/analytics.js'
import './index.css'

initAnalytics();

// Dispatch swUpdated event when a new service worker takes over
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return;
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('swUpdated', { detail: newWorker }));
        }
      });
    });
    // Also fire for any already-waiting worker
    if (reg.waiting) {
      window.dispatchEvent(new CustomEvent('swUpdated', { detail: reg.waiting }));
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ArmorDataProvider>
                <ArmorApp />
            </ArmorDataProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
