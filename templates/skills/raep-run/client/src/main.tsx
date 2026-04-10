import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[RapidX] Root element #root not found in document');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
