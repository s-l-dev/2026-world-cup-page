import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import List from './pages/List.jsx'
import Detail from './pages/Detail.jsx'
import Odds from './pages/Odds.jsx'
import Players from './pages/Players.jsx'
import Methodology from './pages/Methodology.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<List />} />
      <Route path="/m/:id" element={<Detail />} />
      <Route path="/odds/:id" element={<Odds />} />
      <Route path="/players" element={<Players />} />
      <Route path="/methodology" element={<Methodology />} />
    </Routes>
  </BrowserRouter>
)
