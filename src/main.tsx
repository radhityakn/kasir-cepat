import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { StoreProvider } from './context/StoreContext.tsx'
import AuthGuard from './components/AuthGuard.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <AppProvider>
          <AuthGuard>
            <App />
          </AuthGuard>
        </AppProvider>
      </StoreProvider>
    </AuthProvider>
  </StrictMode>,
)
