import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode removed — causes double-invoke of effects in dev,
// which doubles API requests and triggers rate limiter.
createRoot(document.getElementById('root')).render(<App />)
