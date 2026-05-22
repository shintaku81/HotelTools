import { useState, useEffect } from 'react'
import { loadFontSize, applyFontSize } from './utils/fontSizeStorage.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Floors from './pages/Floors.jsx'
import CleaningPlan from './pages/CleaningPlan.jsx'
import PlanCalendar from './pages/PlanCalendar.jsx'
import ExtraCleanings from './pages/ExtraCleanings.jsx'
import Staff from './pages/Staff.jsx'
import RoomMaster from './pages/RoomMaster.jsx'

// URL-based mode detection
// /        → staff mode  (cleaner role)
// /admin   → admin mode  (leader role)
function detectMode() {
  const path = window.location.pathname.replace(/\/$/, '')
  return path === '/admin' ? 'admin' : 'staff'
}

const STORAGE_KEY_STAFF = 'hotel_user_staff'
const STORAGE_KEY_ADMIN  = 'hotel_user_admin'

export default function App() {
  const mode = detectMode()   // 'staff' | 'admin'
  const storageKey = mode === 'admin' ? STORAGE_KEY_ADMIN : STORAGE_KEY_STAFF

  const [user, setUser]         = useState(null)
  const [screen, setScreen]     = useState('home')
  const [planDate, setPlanDate] = useState(null)
  const [fontSize, setFontSize] = useState(loadFontSize)

  useEffect(() => { applyFontSize(fontSize) }, [fontSize])

  useEffect(() => {
    applyFontSize(loadFontSize())  // restore on mount
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [storageKey])

  function handleLogin(userData) {
    localStorage.setItem(storageKey, JSON.stringify(userData))
    setUser(userData)
    setScreen('home')
  }

  function handleLogout() {
    localStorage.removeItem(storageKey)
    setUser(null)
    setScreen('home')
  }

  function navigateToPlan(date) {
    setPlanDate(date)
    setScreen('plan')
  }

  if (!user) return <Login onLogin={handleLogin} mode={mode} />

  if (screen === 'cleaning')    return <Floors user={user} onLogout={handleLogout} onBack={() => setScreen('home')} />
  if (screen === 'plan')        return <CleaningPlan onBack={() => setScreen('home')} initialDate={planDate} />
  if (screen === 'calendar')    return <PlanCalendar onBack={() => setScreen('home')} onNavigatePlan={navigateToPlan} />
  if (screen === 'extra')       return <ExtraCleanings onBack={() => setScreen('home')} />
  if (screen === 'staff')       return <Staff onBack={() => setScreen('home')} />
  if (screen === 'roommaster')  return <RoomMaster onBack={() => setScreen('home')} />

  return <Home user={user} onNavigate={setScreen} onLogout={handleLogout} mode={mode} fontSize={fontSize} onFontSize={setFontSize} />
}
