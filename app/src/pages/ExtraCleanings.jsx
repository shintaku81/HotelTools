import { useState } from 'react'

const CLEANING_TYPES = [
  { value: 'co',  label: 'CO清掃',   color: 'bg-red-600' },
  { value: 'eco', label: 'エコ清掃', color: 'bg-orange-500' },
  { value: 'other', label: 'その他',  color: 'bg-slate-600' },
]

function formatTime(iso) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function ExtraCleanings({ onBack }) {
  const [extras, setExtras] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [room, setRoom] = useState('')
  const [type, setType] = useState('co')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function handleAdd() {
    if (!room.match(/^\d{3}$/)) {
      setError('部屋番号を3桁で入力してください（例: 302）')
      return
    }
    setError('')
    const entry = {
      id: Date.now(),
      room: room.trim(),
      type,
      note: note.trim(),
      addedAt: new Date().toISOString(),
    }
    setExtras(prev => [entry, ...prev])
    setRoom('')
    setNote('')
    setShowForm(false)
  }

  function handleRemove(id) {
    setExtras(prev => prev.filter(e => e.id !== id))
  }

  const typeConfig = Object.fromEntries(CLEANING_TYPES.map(t => [t.value, t]))

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">当日対応</p>
          <p className="text-sm font-bold text-slate-900">イレギュラー追加清掃</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold active:bg-orange-600 touch-manipulation"
        >
          ＋ 追加
        </button>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
        {extras.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm text-slate-500">追加清掃はまだありません</p>
            <p className="text-xs text-slate-400 mt-1">右上の「＋ 追加」で登録できます</p>
          </div>
        )}

        {extras.map(entry => {
          const tc = typeConfig[entry.type] || typeConfig.other
          return (
            <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-xl font-bold text-slate-800 w-12">{entry.room}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg text-white ${tc.color}`}>
                  {tc.label}
                </span>
                <span className="text-xs text-slate-400 flex-1 text-right">{formatTime(entry.addedAt)}</span>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="text-slate-300 text-lg leading-none px-1 active:text-red-500 touch-manipulation"
                >
                  ×
                </button>
              </div>
              {entry.note && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{entry.note}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm sm:mx-4">
            <div className="px-6 pt-6 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">イレギュラー清掃を追加</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Room number */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">部屋番号</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="例: 302"
                  value={room}
                  onChange={e => { setRoom(e.target.value); setError('') }}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-400"
                />
                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
              </div>

              {/* Cleaning type */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">清掃種別</label>
                <div className="flex gap-2">
                  {CLEANING_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={`
                        flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all touch-manipulation
                        ${type === t.value ? `${t.color} text-white border-transparent` : 'border-slate-200 text-slate-500'}
                      `}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">メモ（任意）</label>
                <input
                  type="text"
                  placeholder="例: 連泊中のお客様希望"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 space-y-2">
              <button
                onClick={handleAdd}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm active:bg-orange-600 touch-manipulation"
              >
                登録する
              </button>
              <button
                onClick={() => { setShowForm(false); setError('') }}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm active:bg-slate-200 touch-manipulation"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
