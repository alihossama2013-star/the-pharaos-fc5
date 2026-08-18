import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handlers to prevent unhandled script/media errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress cross-origin media/audio/network promise rejections
    if (event.reason && (
      String(event.reason).includes('unavailable') ||
      String(event.reason).includes('AudioContext') ||
      String(event.reason).includes('play()') ||
      String(event.reason).includes('Firestore')
    )) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.') {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
