import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AuthGate from './components/AuthGate';
import './index.css';
import './components/ManualMode.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
