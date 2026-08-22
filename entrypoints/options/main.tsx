import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from '@/entrypoints/options/options-app';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
