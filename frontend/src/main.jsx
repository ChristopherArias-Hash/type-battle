import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import ProtectedRoute from './utils/ProtectedRoute.jsx'
import MainPage from './pages/MainPage.jsx'
import GamePlay from './pages/GamePlay.jsx'
import NotFound from './pages/NotFound.jsx'
import PatchNotes from './pages/PatchNotes.jsx'
import Generator from './admin/Generator.jsx'
import { AuthProvider } from './utils/authContext.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/patch-notes" element={<PatchNotes />} />
          <Route path="/secret" element={<Generator />} />
          <Route path="/game/:id" element={<ProtectedRoute><GamePlay /></ProtectedRoute>} />
           <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)