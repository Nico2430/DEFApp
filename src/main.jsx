import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DEFApp from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DEFApp />
  </React.StrictMode>,
)
