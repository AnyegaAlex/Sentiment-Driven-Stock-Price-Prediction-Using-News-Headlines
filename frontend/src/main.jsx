import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ReactGA from 'react-ga4';

// ✅ Initialize Google Analytics (only in production)
if (import.meta.env.PROD) {
  ReactGA.initialize('G-9J5C2GHZG0');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);