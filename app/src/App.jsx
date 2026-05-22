import { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import Floors from './pages/Floors.jsx'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('hotel_staff')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  const handleLogin = (userData) => {
    localStorage.setItem('hotel_staff', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('hotel_staff')
    setUser(null)
  }

  if (!user) return <Login onLogin={handleLogin} />
  return <Floors user={user} onLogout={handleLogout} />
}
