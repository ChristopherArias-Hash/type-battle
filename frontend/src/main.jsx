import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import './index.css'
import ProtectedRoute from './utils/ProtectedRoute.jsx'
import MainPage from './pages/MainPage.jsx'
import GamePlay from './pages/GamePlay.jsx'
import { AuthProvider } from './utils/authContext.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/game" element={<ProtectedRoute><GamePlay /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)