// Integration tests for App.jsx — URL-based mode detection, login persistence,
// logout, and Home → screen navigation (and back).
//
// Black-box angle: we drive the app the way a user/browser would (changing the
// URL via history.pushState, typing credentials, clicking menus) and assert on
// visible text / roles — never on Tailwind classes (css:false in vite config).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

const STORAGE_KEY_STAFF = 'hotel_user_staff'
const STORAGE_KEY_ADMIN = 'hotel_user_admin'

// detectMode() reads window.location.pathname at render time. jsdom lets us
// rewrite it via history.pushState without a real navigation.
function setPath(path) {
  window.history.pushState({}, '', path)
}

beforeEach(() => {
  setPath('/') // default to staff mode unless a test opts into /admin
})

afterEach(() => {
  setPath('/')
})

// Helper: log in as the admin (leader) account on /admin. Admin has fixedName
// so it skips the name-select screen → lands straight on Home.
async function loginAsAdmin(user) {
  await user.type(screen.getByPlaceholderText('例: staff'), 'admin')
  await user.type(screen.getByPlaceholderText('パスワードを入力'), 'admin')
  await user.click(screen.getByRole('button', { name: 'ログイン' }))
}

// Helper: log in as staff (cleaner) on / and pick a name.
async function loginAsStaff(user, name = '結城') {
  await user.type(screen.getByPlaceholderText('例: staff'), 'staff')
  await user.type(screen.getByPlaceholderText('パスワードを入力'), '1234')
  await user.click(screen.getByRole('button', { name: 'ログイン' }))
  // Name-select screen appears next.
  await user.click(await screen.findByRole('button', { name }))
  await user.click(screen.getByRole('button', { name: 'この名前で入室する' }))
}

describe('App — mode detection', () => {
  it('shows the staff login on / (default mode)', () => {
    setPath('/')
    render(<App />)
    expect(screen.getByText('清掃管理システム')).toBeInTheDocument()
    // Staff hint reveals the staff test account.
    expect(screen.getByText(/清掃スタッフ:/)).toBeInTheDocument()
  })

  it('shows the admin login on /admin', () => {
    setPath('/admin')
    render(<App />)
    expect(screen.getByText(/管理者:/)).toBeInTheDocument()
    // The staff-specific hint should NOT be shown in admin mode.
    expect(screen.queryByText(/清掃スタッフ:/)).not.toBeInTheDocument()
  })

  it('treats a trailing-slash /admin/ as admin mode (path normalisation)', () => {
    setPath('/admin/')
    render(<App />)
    expect(screen.getByText(/管理者:/)).toBeInTheDocument()
  })

  it('falls back to staff mode for an unknown path', () => {
    setPath('/some/random/path')
    render(<App />)
    expect(screen.getByText(/清掃スタッフ:/)).toBeInTheDocument()
  })
})

describe('App — unauthenticated state', () => {
  it('renders Login (not Home) when no user is stored', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    // Home would render the logout button; it must be absent.
    expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()
  })

  it('does not restore a user when stored JSON is corrupt (defensive parse)', () => {
    // App wraps JSON.parse in try/catch — bad data must not crash or log in.
    localStorage.setItem(STORAGE_KEY_STAFF, '{not valid json')
    render(<App />)
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })
})

describe('App — login flow + persistence', () => {
  it('admin login lands on Home and persists under the admin key', async () => {
    const user = userEvent.setup()
    setPath('/admin')
    render(<App />)
    await loginAsAdmin(user)

    expect(await screen.findByText('管理者さん')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_ADMIN))
    expect(stored).toEqual({ role: 'leader', name: '管理者' })
    // Staff key must stay empty — keys are isolated per mode.
    expect(localStorage.getItem(STORAGE_KEY_STAFF)).toBeNull()
  })

  it('staff login goes through name select then persists under the staff key', async () => {
    const user = userEvent.setup()
    setPath('/')
    render(<App />)
    await loginAsStaff(user, '戸田')

    expect(await screen.findByText('戸田さん')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_STAFF))
    expect(stored).toEqual({ role: 'cleaner', name: '戸田' })
    expect(localStorage.getItem(STORAGE_KEY_ADMIN)).toBeNull()
  })

  it('rejects wrong credentials and stays on Login', async () => {
    const user = userEvent.setup()
    setPath('/admin')
    render(<App />)
    await user.type(screen.getByPlaceholderText('例: staff'), 'admin')
    await user.type(screen.getByPlaceholderText('パスワードを入力'), 'wrongpw')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('IDまたはパスワードが違います')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY_ADMIN)).toBeNull()
  })

  it('admin credentials do NOT work in staff mode (per-mode account isolation)', async () => {
    const user = userEvent.setup()
    setPath('/') // staff mode only accepts staff/1234
    render(<App />)
    await user.type(screen.getByPlaceholderText('例: staff'), 'admin')
    await user.type(screen.getByPlaceholderText('パスワードを入力'), 'admin')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(await screen.findByText('IDまたはパスワードが違います')).toBeInTheDocument()
  })
})

describe('App — restore on reload', () => {
  it('restores the admin user from localStorage on mount (no login needed)', async () => {
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify({ role: 'leader', name: '管理者' }))
    setPath('/admin')
    render(<App />)
    expect(await screen.findByText('管理者さん')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  })

  it('does NOT restore the staff user when in admin mode (keys are mode-scoped)', () => {
    // A staff session must not leak into the /admin instance.
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify({ role: 'cleaner', name: '結城' }))
    setPath('/admin')
    render(<App />)
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })
})

describe('App — logout', () => {
  it('clears the stored user and returns to Login', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify({ role: 'leader', name: '管理者' }))
    setPath('/admin')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'ログアウト' }))

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY_ADMIN)).toBeNull()
  })
})

describe('App — Home navigation (admin / leader)', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify({ role: 'leader', name: '管理者' }))
    setPath('/admin')
  })

  it('navigates Home → 当日追加 (ExtraCleanings) and back', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('管理者さん')

    await user.click(screen.getByRole('button', { name: /当日追加/ }))
    // ExtraCleanings screen header ("当日対応" is unique; "追加清掃" appears
    // twice — as the title and as a type-selector button).
    expect(await screen.findByText('当日対応')).toBeInTheDocument()

    // Back arrow (‹) returns to Home.
    await user.click(screen.getByRole('button', { name: '‹' }))
    expect(await screen.findByText('管理者さん')).toBeInTheDocument()
  })

  it('navigates Home → スタッフ (Staff) and back', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('管理者さん')

    await user.click(screen.getByRole('button', { name: /スタッフ/ }))
    // Staff screen renders a back control; returning shows Home again.
    const back = await screen.findByRole('button', { name: '‹' })
    await user.click(back)
    expect(await screen.findByText('管理者さん')).toBeInTheDocument()
  })

  it('shows leader-only menus on Home (CO管理 / 翌日計画 / 部屋マスター)', async () => {
    render(<App />)
    await screen.findByText('管理者さん')
    expect(screen.getByRole('button', { name: /CO管理/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /翌日計画/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /部屋マスター/ })).toBeInTheDocument()
  })
})

describe('App — Home navigation (staff / cleaner)', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify({ role: 'cleaner', name: '結城' }))
    setPath('/')
  })

  it('hides leader-only menus for a cleaner', async () => {
    render(<App />)
    await screen.findByText('結城さん')
    // Cleaner sees only 通常清掃 + 当日追加.
    expect(screen.getByRole('button', { name: /通常清掃/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /当日追加/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /CO管理/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /翌日計画/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /スタッフ/ })).not.toBeInTheDocument()
  })

  it('a cleaner can still open 当日追加 and return Home', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('結城さん')

    await user.click(screen.getByRole('button', { name: /当日追加/ }))
    expect(await screen.findByText('当日対応')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '‹' }))
    expect(await screen.findByText('結城さん')).toBeInTheDocument()
  })

  it('logout from a cleaner Home wipes only the staff key', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'ログアウト' }))
    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY_STAFF)).toBeNull()
  })
})

describe('App — Home header surface', () => {
  it("renders the logged-in user's name and the logout button in the header", async () => {
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify({ role: 'leader', name: '管理者' }))
    setPath('/admin')
    render(<App />)
    const header = (await screen.findByText('管理者さん')).closest('header')
    expect(header).toBeTruthy()
    expect(within(header).getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  })
})
