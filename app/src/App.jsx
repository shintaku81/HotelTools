import { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Floors from './pages/Floors.jsx'
import CleaningPlan from './pages/CleaningPlan.jsx'
import ExtraCleanings from './pages/ExtraCleanings.jsx'
import Staff from './pages/Staff.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [screen, setScreen] = useState('home')  // 'home' | 'cleaning' | 'plan' | 'extra' | 'staff'

  useEffect(() => {
    const saved = localStorage.getItem('hotel_staff')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  const handleLogin = (userData) => {
    localStorage.setItem('hotel_staff', JSON.stringify(userData))
    setUser(userData)
    setScreen('home')
  }

  const handleLogout = () => {
    localStorage.removeItem('hotel_staff')
    setUser(null)
    setScreen('home')
  }

  if (!user) return <Login onLogin={handleLogin} />

  if (screen === 'cleaning') return <Floors user={user} onLogout={handleLogout} onBack={() => setScreen('home')} />
  if (screen === 'plan')     return <CleaningPlan onBack={() => setScreen('home')} />
  if (screen === 'extra')    return <ExtraCleanings onBack={() => setScreen('home')} />
  if (screen === 'staff')    return <Staff onBack={() => setScreen('home')} />

  return <Home user={user} onNavigate={setScreen} onLogout={handleLogout} />
}
