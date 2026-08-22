import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from '@/entrypoints/popup/popup-app';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
