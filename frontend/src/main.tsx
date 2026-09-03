import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

// ── Global design system (must be first import so Tailwind base → components
//    → utilities cascade is applied before any component-level styles) ─────────
import './styles/globals.css';

// ── Mount ─────────────────────────────────────────────────────────────────────

const container = document.getElementById('root');
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!container) {
  throw new Error(
    '[main.tsx] Could not find #root element. ' +
    'Ensure index.html contains <div id="root"></div>.'
  );
}

if (!googleClientId) {
  throw new Error('[main.tsx] VITE_GOOGLE_CLIENT_ID is required.');
}

createRoot(container).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
