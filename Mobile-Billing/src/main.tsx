import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { DatabaseProvider } from './DatabaseContext.tsx'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

jeepSqlite(window);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DatabaseProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DatabaseProvider>
  </StrictMode>,
)
