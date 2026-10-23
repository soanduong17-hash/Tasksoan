// Fix for React 19 in cross-origin iframes (AI Studio preview):
// React 19's User Timing profiling in development mode tries to deeply inspect props on re-renders,
// which attempts to access cross-origin window/parent objects, throwing SecurityError.
// Setting console.timeStamp to undefined turns off React 19's supportsUserTiming.
if (typeof console !== 'undefined' && 'timeStamp' in console) {
  try {
    Object.defineProperty(console, 'timeStamp', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  } catch {
    (console as any).timeStamp = undefined;
  }
}

// Global safety handler for cross-origin frame access errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.message &&
      (event.message.includes('cross-origin frame') ||
        event.message.includes('Blocked a frame with origin'))
    ) {
      event.preventDefault();
      console.warn('[Handled] Cross-origin frame access blocked in iframe environment.');
    }
  });
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

