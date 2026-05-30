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
import Checkout from './pages/Checkout.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'

// URL-based mode detection
// /            → staff mode      (cleaner role)
// /admin       → admin mode      (leader role)
// /superadmin  → superadmin mode (マグロボ: 全ホテル横断管理)
function detectMode() {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path === '/admin') return 'admin'
  if (path === '/superadmin') return 'superadmin'
  return 'staff'
}

const STORAGE_KEYS = {
  staff: 'hotel_user_staff',
  admin: 'hotel_user_admin',
  superadmin: 'hotel_user_super',
}

export default function App() {
  const mode = detectMode()   // 'staff' | 'admin' | 'superadmin'
  const storageKey = STORAGE_KEYS[mode] ?? STORAGE_KEYS.staff

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

  function openCalendarFromPlan(date) {
    if (date) setPlanDate(date)  // preserve date CleaningPlan was on
    setScreen('calendar')
  }

  if (!user) return <Login onLogin={handleLogin} mode={mode} />

  // スーパーアドミン（マグロボ）はホテル管理コンソールへ
  if (mode === 'superadmin') return <SuperAdmin onLogout={handleLogout} />

  if (screen === 'cleaning')    return <Floors user={user} onLogout={handleLogout} onBack={() => setScreen('home')} />
  if (screen === 'plan')        return <CleaningPlan onBack={() => setScreen('home')} initialDate={planDate} onOpenCalendar={openCalendarFromPlan} />
  if (screen === 'calendar')    return <PlanCalendar onBack={() => setScreen('home')} onNavigatePlan={navigateToPlan} />
  if (screen === 'extra')       return <ExtraCleanings onBack={() => setScreen('home')} />
  if (screen === 'staff')       return <Staff onBack={() => setScreen('home')} />
  if (screen === 'roommaster')  return <RoomMaster onBack={() => setScreen('home')} />
  if (screen === 'checkout')    return <Checkout onBack={() => setScreen('home')} />

  return <Home user={user} onNavigate={setScreen} onLogout={handleLogout} mode={mode} fontSize={fontSize} onFontSize={setFontSize} />
}
