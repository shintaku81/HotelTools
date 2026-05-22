import { useState, useRef } from 'react'

const CLEANING_TYPES = [
  { value: 'extra', label: '追加清掃', color: 'bg-purple-600', light: 'bg-purple-50 border-purple-300 text-purple-800' },
  { value: 'co',    label: 'CO清掃',   color: 'bg-red-600',    light: 'bg-red-50 border-red-300 text-red-800' },
  { value: 'eco',   label: 'エコ清掃', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-300 text-orange-800' },
]

function formatTime(iso) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function ExtraCleanings({ onBack }) {
  const [extras, setExtras] = useState([])
  const [type, setType] = useState('extra')
  const [room, setRoom] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [noteTarget, setNoteTarget] = useState(null)  // id of entry being annotated
  const inputRef = useRef()

  const typeConfig = Object.fromEntries(CLEANING_TYPES.map(t => [t.value, t]))

  function handleAdd() {
    const trimmed = room.trim()
    if (!trimmed.match(/^\d{3}$/)) {
      setError('3桁で入力')
      return
    }
    setError('')
    setExtras(prev => [{
      id: Date.now(),
      room: trimmed,
      type,
      note: '',
      addedAt: new Date().toISOString(),
    }, ...prev])
    setRoom('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  function handleRemove(id) {
    setExtras(prev => prev.filter(e => e.id !== id))
  }

  function saveNote(id) {
    setExtras(prev => prev.map(e => e.id === id ? { ...e, note: note.trim() } : e))
    setNoteTarget(null)
    setNote('')
  }

  const selectedType = typeConfig[type]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div>
          <p className="text-xs text-slate-400">当日対応</p>
          <p className="text-sm font-bold text-slate-900">追加清掃</p>
        </div>
      </header>

      {/* Type selector — always visible */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex gap-2">
        {CLEANING_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`
              flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all touch-manipulation
              ${type === t.value
                ? `${t.color} text-white border-transparent shadow-sm`
                : 'border-slate-200 bg-white text-slate-500'}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick-add bar — always visible below type selector */}
      <div className={`px-4 py-3 border-b border-slate-200 flex gap-2 items-center ${selectedType.light} border`} style={{borderLeft:'none',borderRight:'none',borderTop:'none'}}>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            maxLength={3}
            placeholder="部屋番号 (例: 302)"
            value={room}
            onChange={e => { setRoom(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            className={`w-full rounded-xl px-4 py-3 text-xl font-bold text-slate-800 focus:outline-none border-2
              ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
          />
          {error && <p className="absolute -bottom-4 left-1 text-[10px] text-red-600">{error}</p>}
        </div>
        <button
          onClick={handleAdd}
          className={`px-5 py-3 rounded-xl text-white font-bold text-sm touch-manipulation shadow-sm ${selectedType.color} active:opacity-80`}
        >
          登録
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
        {extras.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mt-4">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm text-slate-400">種別を選んで部屋番号を入力し<br />「登録」を押してください</p>
          </div>
        )}

        {extras.map(entry => {
          const tc = typeConfig[entry.type]
          return (
            <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center px-4 py-3 gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg text-white ${tc.color}`}>
                  {tc.label}
                </span>
                <span className="text-lg font-bold text-slate-800 flex-1">{entry.room}号室</span>
                <span className="text-xs text-slate-400">{formatTime(entry.addedAt)}</span>
                <button
                  onClick={() => { setNoteTarget(entry.id); setNote(entry.note) }}
                  className="text-xs text-slate-400 px-2 py-1 rounded-lg active:bg-slate-100 touch-manipulation"
                >
                  メモ
                </button>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="text-slate-300 text-xl leading-none active:text-red-500 touch-manipulation w-6 text-center"
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

      {/* Note modal */}
      {noteTarget !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm sm:mx-4 px-6 py-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">メモを追加</h2>
            <input
              type="text"
              placeholder="例: 連泊中のお客様希望"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setNoteTarget(null); setNote('') }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm touch-manipulation"
              >
                キャンセル
              </button>
              <button
                onClick={() => saveNote(noteTarget)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white font-bold text-sm touch-manipulation"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
