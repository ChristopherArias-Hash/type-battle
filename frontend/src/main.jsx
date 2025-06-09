import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {BrowserRouter, Routes, Route} from 'react-router-dom'
import './index.css'

import MainPage from './pages/MainPage.jsx'
import GamePlay from './pages/GamePlay.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
    <Route path = "/" element={<MainPage />} />
    <Route path = "/game" element={<GamePlay />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
