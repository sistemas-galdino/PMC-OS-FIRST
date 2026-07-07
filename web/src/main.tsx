import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AmbienteBanner } from '@/components/ambiente-banner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AmbienteBanner />
    <App />
    <Toaster theme="dark" position="bottom-right" richColors />
  </StrictMode>,
)
