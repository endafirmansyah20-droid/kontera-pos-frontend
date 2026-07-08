import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// PWA service worker hanya aktif di production. Di dev mode SW cache-first
// bentrok dengan webpack HMR (chunk hash berubah tiap edit → serve stale →
// reload → loop). Unregister SW lama supaya user yang sebelumnya sudah
// terinfeksi juga clean di dev.
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
} else {
  serviceWorkerRegistration.unregister();
  // Bersihkan cache SW lama di dev supaya asset selalu fresh dari webpack.
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}
