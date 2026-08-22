import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidepanelApp } from '@/entrypoints/sidepanel/sidepanel-app';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidepanelApp />
  </React.StrictMode>,
);
