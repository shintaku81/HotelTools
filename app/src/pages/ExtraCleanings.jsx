import { useState, useRef } from 'react'

const CLEANING_TYPES = [
  { value: 'extra', label: '追加清掃', color: 'bg-purple-600', active: 'border-purple-500 bg-purple-600 text-white', light: 'bg-purple-50 text-purple-800 border-purple-300' },
  { value: 'co',    label: 'CO清掃',   color: 'bg-red-600',    active: 'border-red-500 bg-red-600 text-white',    light: 'bg-red-50 text-red-800 border-red-300' },
  { value: 'eco',   label: 'エコ清掃', color: 'bg-orange-500', active: 'border-orange-400 bg-orange-500 text-white', light: 'bg-orange-50 text-orange-800 border-orange-300' },
]

// Hotel room layout (matches useRooms.js FLOOR_ROOMS)
const FLOOR_ROOMS = {
  2: [201, 202, 203, 205, 206, 207, 208, 210, 211],
  3: [301, 302, 303, 305, 306, 307, 308, 310, 311, 312, 314, 315, 316, 317, 318, 319, 320, 321],
  4: [401, 402, 403, 405, 406, 407, 408, 410, 411, 412, 414, 415, 416, 417, 418, 419, 420, 421],
  5: [501, 502, 503, 505, 506, 507, 508, 510, 511, 512, 514, 515, 516, 517, 518, 519, 520, 521],
  6: [601, 602, 603, 605, 606, 607, 608, 610, 611, 612, 614, 615, 616, 617, 618, 619, 620, 621],
  7: [701, 702, 703, 705, 706, 707, 708, 710, 711, 712, 714, 715, 716, 717, 718, 719, 720, 721],
}
const FLOORS = [2, 3, 4, 5, 6, 7]

function formatTime(iso) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

// ─── Room Picker Screen ──────────────────────────────────────────────────────
function RoomPicker({ type, addedRooms, onSelect, onClose }) {
  const [activeFloor, setActiveFloor] = useState('all')
  const tc = CLEANING_TYPES.find(t => t.value === type)

  const addedSet = new Set(addedRooms.map(e => e.room))

  function handleRoomTap(roomNum) {
    onSelect(String(roomNum))
  }

  const floorsToShow = activeFloor === 'all' ? FLOORS : [activeFloor]

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onClose} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">×</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">部屋を選んでください</p>
          <p className="text-sm font-bold text-slate-900">
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white mr-2 ${tc.color}`}>{tc.label}</span>
            で登録
          </p>
        </div>
      </header>

      {/* Floor tabs */}
      <div className="bg-white border-b border-slate-200 flex overflow-x-auto flex-shrink-0">
        {[{ key: 'all', label: '全F' }, ...FLOORS.map(f => ({ key: f, label: `${f}F` }))].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFloor(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold touch-manipulation
              ${activeFloor === tab.key
                ? 'border-b-2 border-slate-700 text-slate-900'
                : 'text-slate-500 active:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Room grid */}
      <div className="flex-1 overflow-y-auto pb-6">
        {floorsToShow.map(floor => (
          <div key={floor}>
            {activeFloor === 'all' && (
              <div className="px-4 pt-4 pb-1">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{floor}F</h2>
              </div>
            )}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 px-3 py-2">
              {FLOOR_ROOMS[floor].map(roomNum => {
                const key = String(roomNum)
                const already = addedSet.has(key)
                return (
                  <button
                    key={roomNum}
                    onClick={() => handleRoomTap(roomNum)}
                    disabled={already}
                    className={`
                      h-[52px] w-full flex flex-col items-center justify-center rounded-xl border-2
                      active:scale-95 transition-transform duration-100 touch-manipulation
                      ${already
                        ? `${tc.color} border-transparent opacity-80`
                        : 'bg-white border-slate-200 active:border-slate-400'}
                    `}
                  >
                    <span className={`text-xs font-bold ${already ? 'text-white' : 'text-slate-700'}`}>
                      {roomNum}
                    </span>
                    {already && <span className="text-[9px] text-white/80 mt-0.5">追加済</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ExtraCleanings({ onBack }) {
  const [extras, setExtras] = useState([])
  const [type, setType] = useState('extra')
  const [room, setRoom] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [noteTarget, setNoteTarget] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const inputRef = useRef()

  const typeConfig = Object.fromEntries(CLEANING_TYPES.map(t => [t.value, t]))

  function addRoom(roomNum) {
    const trimmed = String(roomNum).trim()
    setExtras(prev => {
      if (prev.some(e => e.room === trimmed && e.type === type)) return prev
      return [{
        id: Date.now(),
        room: trimmed,
        type,
        note: '',
        addedAt: new Date().toISOString(),
      }, ...prev]
    })
  }

  function handleAdd() {
    const trimmed = room.trim()
    if (!trimmed.match(/^\d{3}$/)) { setError('3桁で入力'); return }
    setError('')
    addRoom(trimmed)
    setRoom('')
    inputRef.current?.focus()
  }

  function handlePickerSelect(roomNum) {
    addRoom(roomNum)
    // stay in picker so user can multi-select
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
    <>
      <div className="min-h-screen bg-slate-100 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
          <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
          <div className="flex-1">
            <p className="text-xs text-slate-400">当日対応</p>
            <p className="text-sm font-bold text-slate-900">追加清掃</p>
          </div>
          {extras.length > 0 && (
            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">
              {extras.length}件
            </span>
          )}
        </header>

        {/* Type selector */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex gap-2">
          {CLEANING_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all touch-manipulation
                ${type === t.value ? t.active : 'border-slate-200 bg-white text-slate-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Input + picker area */}
        <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-4 space-y-2">
          {/* Row 1: number input + 登録 */}
          <div className="flex gap-2 items-start">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={3}
                placeholder="部屋番号を直接入力 (例: 302)"
                value={room}
                onChange={e => { setRoom(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className={`w-full rounded-xl px-4 py-3 text-xl font-bold text-slate-800 focus:outline-none border-2
                  ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`}
              />
              {error && <p className="text-[10px] text-red-600 mt-1 pl-1">{error}</p>}
            </div>
            <button
              onClick={handleAdd}
              className={`px-5 py-3 rounded-xl text-white font-bold text-sm touch-manipulation ${selectedType.color} active:opacity-80`}
            >
              登録
            </button>
          </div>

          {/* Row 2: room picker button */}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-3 rounded-xl bg-slate-700 text-white font-bold text-sm touch-manipulation active:bg-slate-800 flex items-center justify-center gap-2"
          >
            <span className="text-base">🏨</span>
            <span>部屋を選んで追加する</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
          {extras.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mt-4">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-slate-400">
                部屋番号を入力するか<br />
                <span className="font-bold text-slate-600">「🏨 部屋選択」</span>から追加
              </p>
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
      </div>

      {/* Room Picker overlay */}
      {showPicker && (
        <RoomPicker
          type={type}
          addedRooms={extras}
          onSelect={handlePickerSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

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
    </>
  )
}
