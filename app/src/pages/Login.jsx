import { useState } from 'react'

// ─── Preset accounts (test credentials) ────────────────────────────────────────
// staff mode (/):      ID: staff / PW: 1234  → 清掃スタッフ（名前選択）
// admin mode (/admin): ID: admin / PW: admin → 管理者（フル権限）
const ACCOUNTS = {
  staff: [{ id: 'staff', password: '1234',  role: 'cleaner', displayRole: '清掃スタッフ' }],
  admin: [{ id: 'admin', password: 'admin', role: 'leader',  displayRole: '管理者', fixedName: '管理者' }],
  superadmin: [{ id: 'magurobo', password: 'magurobo', role: 'superadmin', displayRole: 'スーパーアドミン', fixedName: 'マグロボ' }],
}

const CLEANER_NAMES = [
  '結城', '戸田', '森山',
  '三浦', '佐々木', '北川', '福田', '高橋',
  '小松', '貞廣', '守山', '鹿又',
]

// ─── Name selection (after cleaner login) ──────────────────────────────────────
function NameSelectScreen({ onConfirm }) {
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-slate-500 text-sm mb-1">ログイン成功</p>
          <h2 className="text-xl font-bold text-slate-900">あなたの名前を選んでください</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {CLEANER_NAMES.map(n => (
            <button
              key={n}
              onClick={() => setName(n)}
              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all active:scale-95 touch-manipulation
                ${name === n
                  ? 'bg-slate-800 border-slate-800 text-white'
                  : 'bg-white border-slate-200 text-slate-700'}`}
            >
              {n}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="または直接入力"
          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-slate-400 mb-4"
        />

        <button
          onClick={() => name.trim() && onConfirm(name.trim())}
          disabled={!name.trim()}
          className={`w-full py-4 rounded-xl text-base font-bold transition-all active:scale-95
            ${name.trim() ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          この名前で入室する
        </button>
      </div>
    </div>
  )
}

// ─── Main Login Screen ──────────────────────────────────────────────────────────
export default function Login({ onLogin, mode = 'staff' }) {
  const [userId, setUserId]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [authedAccount, setAuthedAccount] = useState(null)
  const [showPw, setShowPw]     = useState(false)

  const isAdmin = mode === 'admin'
  const accounts = ACCOUNTS[mode] ?? ACCOUNTS.staff

  // After staff login → name select screen
  if (authedAccount && !authedAccount.fixedName) {
    return (
      <NameSelectScreen
        onConfirm={name => onLogin({ role: authedAccount.role, name })}
      />
    )
  }

  function handleSubmit(e) {
    e?.preventDefault()
    const account = accounts.find(
      a => a.id === userId.trim().toLowerCase() && a.password === password
    )
    if (!account) {
      setError('IDまたはパスワードが違います')
      return
    }
    setError('')
    if (account.fixedName) {
      onLogin({ role: account.role, name: account.fixedName })
    } else {
      setAuthedAccount(account)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-slate-900 text-2xl font-bold tracking-wide">
            ホテルパコジュニア 北見
          </h1>
          <p className="text-slate-500 text-sm mt-1">清掃管理システム</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User ID */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              ユーザーID
            </label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={userId}
              onChange={e => { setUserId(e.target.value); setError('') }}
              placeholder="例: staff"
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="パスワードを入力"
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base focus:outline-none focus:border-slate-500 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm px-1 touch-manipulation"
              >
                {showPw ? '隠す' : '表示'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!userId.trim() || !password}
            className={`w-full py-4 rounded-xl text-base font-bold tracking-wide transition-all active:scale-95 mt-2
              ${userId.trim() && password
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            ログイン
          </button>
        </form>

        {/* Hint */}
        <div className="mt-8 bg-slate-100 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-slate-500">テスト用アカウント</p>
          {mode === 'superadmin'
            ? <p className="text-xs text-slate-500">マグロボ: <span className="font-mono font-bold text-slate-700">magurobo</span> / <span className="font-mono font-bold text-slate-700">magurobo</span></p>
            : isAdmin
              ? <p className="text-xs text-slate-500">管理者: <span className="font-mono font-bold text-slate-700">admin</span> / <span className="font-mono font-bold text-slate-700">admin</span></p>
              : <p className="text-xs text-slate-500">清掃スタッフ: <span className="font-mono font-bold text-slate-700">staff</span> / <span className="font-mono font-bold text-slate-700">1234</span></p>
          }
        </div>

        {/* URL hint */}
        <p className="mt-4 text-center text-xs text-slate-400">
          {mode === 'superadmin'
            ? <span>スタッフ用: <span className="font-mono">/</span> / 管理者用: <span className="font-mono">/admin</span></span>
            : isAdmin
              ? <span>スタッフ用: <span className="font-mono">/</span></span>
              : <span>管理者用: <span className="font-mono">/admin</span></span>
          }
        </p>
      </div>
    </div>
  )
}
