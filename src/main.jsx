import React from 'react'
import ReactDOM from 'react-dom/client'
import Shift6App from './Shift6App.jsx'
import { Shift6DataProvider } from './context/Shift6DataContext.jsx'
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
            <Shift6DataProvider>
                <Shift6App />
            </Shift6DataProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
