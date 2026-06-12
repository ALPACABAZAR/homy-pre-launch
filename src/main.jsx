// [HOMY] React entry point for homyforme.com: mounts the router with the landing page (App.jsx),
// Privacy and Impressum/Terms (LegalDocument.jsx) routes; loads global CSS and i18n.js (EN/DE).

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Privacy from './Privacy.jsx'
import AccountDeletion from './AccountDeletion.jsx'
import { Impressum, Terms } from './LegalDocument.jsx'
import './index.css'
import './i18n.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/de" element={<App />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/datenschutz" element={<Privacy />} />
        <Route path="/de/datenschutz" element={<Privacy />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />
        <Route path="/konto-loeschen" element={<AccountDeletion />} />
        <Route path="/de/konto-loeschen" element={<AccountDeletion />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/agb" element={<Terms />} />
        <Route path="/de/agb" element={<Terms />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/de/impressum" element={<Impressum />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
