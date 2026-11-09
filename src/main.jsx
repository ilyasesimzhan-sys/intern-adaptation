import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { StoreProvider } from './store/StoreContext.jsx'
import { ThemeProvider } from './store/ThemeContext.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <HashRouter>
          <StoreProvider>
            <App />
          </StoreProvider>
        </HashRouter>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>,
)
