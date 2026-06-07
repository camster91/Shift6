import { useEffect, useState } from 'react';

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Auto-dismiss after 10 seconds
    const dismissTimer = setTimeout(() => setShowUpdate(false), 10000);

    const onUpdate = (event) => {
      setWaitingWorker(event.detail);
      setShowUpdate(true);
      clearTimeout(dismissTimer);
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    window.addEventListener('swUpdated', onUpdate);

    // Poll for waiting service worker on mount
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowUpdate(true);
        clearTimeout(dismissTimer);
      }
      reg?.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
            clearTimeout(dismissTimer);
          }
        });
      });
    });

    return () => {
      clearTimeout(dismissTimer);
      window.removeEventListener('swUpdated', onUpdate);
    };
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-500 text-slate-900 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm">
      <span className="text-sm font-bold">New version available</span>
      <button
        onClick={() => {
          waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }}
        className="px-3 py-1 bg-slate-900 text-cyan-400 rounded-lg text-sm font-bold"
      >
        Reload
      </button>
    </div>
  );
}