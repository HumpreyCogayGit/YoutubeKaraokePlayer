import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PartyProvider } from './contexts/PartyContext'
import './index.css'

// Wrapper to pass user ID to PartyProvider
const AppWithProviders = () => {
  return (
    <AuthProvider>
      <PartyProviderWrapper />
    </AuthProvider>
  )
}

const PartyProviderWrapper = () => {
  const { user } = useAuth()
  return (
    <PartyProvider userId={user?.id} userName={user?.name}>
      <App />
    </PartyProvider>
  )
}

const rootElement = document.getElementById('root')!

// Only create root once
if (!rootElement.hasAttribute('data-reactroot')) {
  rootElement.setAttribute('data-reactroot', 'true')
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppWithProviders />
    </React.StrictMode>,
  )
}
