import { useState } from 'react'
import { ROOM_TYPE_CONFIG } from '../hooks/useRooms.js'
import { loadRoomOverrides, saveRoomTypeChange, loadChangeLog } from '../utils/roomMasterStorage.js'

const FLOOR_ROOMS = {
  2: [201, 202, 203, 205, 206, 207, 208, 210, 211],
  3: [301, 302, 303, 305, 306, 307, 308, 310, 311, 312, 314, 315, 316, 317, 318, 319, 320, 321],
  4: [401, 402, 403, 405, 406, 407, 408, 410, 411, 412, 414, 415, 416, 417, 418, 419, 420, 421],
  5: [501, 502, 503, 505, 506, 507, 508, 510, 511, 512, 514, 515, 516, 517, 518, 519, 520, 521],
  6: [601, 602, 603, 605, 606, 607, 608, 610, 611, 612, 614, 615, 616, 617, 618, 619, 620, 621],
  7: [701, 702, 703, 705, 706, 707, 708, 710, 711, 712, 714, 715, 716, 717, 718, 719, 720, 721],
}
const FLOORS = [2, 3, 4, 5, 6, 7]

const FLOOR2_DEFAULTS = { 201: 'TR', 202: 'T', 203: 'W', 205: 'S', 206: 'S', 207: 'S', 208: 'S', 210: 'S', 211: 'S' }

function getDefaultType(roomNum) {
  const n = parseInt(roomNum)
  if (FLOOR2_DEFAULTS[n]) return FLOOR2_DEFAULTS[n]
  const last2 = n % 100
  if ([17, 18].includes(last2)) return 'T'
  if ([1, 2, 16, 19].includes(last2)) return 'W'
  return 'S'
}

const TYPE_BADGE = {
  S:  'bg-slate-100 text-slate-600',
  SD: 'bg-sky-100 text-sky-700',
  W:  'bg-blue-100 text-blue-700',
  T:  'bg-purple-100 text-purple-700',
  TR: 'bg-pink-100 text-pink-800',
}

function fmtTime(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function RoomMaster({ onBack }) {
  const [overrides, setOverrides] = useState(loadRoomOverrides)
  const [changeLog, setChangeLog] = useState(loadChangeLog)
  const [editing, setEditing]     = useState(null) // { roomNum, currentType }
  const [newType, setNewType]     = useState('')
  const [changedBy, setChangedBy] = useState('')
  const [error, setError]         = useState('')
  const [showLog, setShowLog]     = useState(false)

  function openEdit(roomNum) {
    const current = overrides[roomNum] ?? getDefaultType(roomNum)
    setEditing({ roomNum, currentType: current })
    setNewType(current)
    setChangedBy('')
    setError('')
  }

  function handleSave() {
    if (!changedBy.trim()) { setError('変更者名を入力してください'); return }
    if (newType === editing.currentType) { setEditing(null); return }
    saveRoomTypeChange(editing.roomNum, editing.currentType, newType, changedBy.trim())
    setOverrides(loadRoomOverrides())
    setChangeLog(loadChangeLog())
    setEditing(null)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">設定</p>
          <p className="text-sm font-bold text-slate-900">部屋マスター管理</p>
        </div>
        <button
          onClick={() => setShowLog(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 touch-manipulation active:bg-slate-200"
        >
          変更履歴
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        <p className="text-xs text-slate-500 px-1">
          部屋番号をタップしてタイプを変更できます。変更者名の入力が必要です。
        </p>

        {/* Floor-by-floor room grid */}
        {FLOORS.map(floor => (
          <div key={floor} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-700">{floor}F</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3">
              {FLOOR_ROOMS[floor].map(roomNum => {
                const key  = String(roomNum)
                const type = overrides[key] ?? getDefaultType(key)
                const isOverridden = !!overrides[key]
                return (
                  <button
                    key={roomNum}
                    onClick={() => openEdit(key)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 border-slate-200 bg-white active:bg-slate-50 touch-manipulation gap-0.5"
                  >
                    <span className="text-xs font-bold text-slate-700">{roomNum}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TYPE_BADGE[type] ?? ''}`}>{type}</span>
                    {isOverridden && <span className="text-[8px] text-indigo-500 font-bold">変更済</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Change log */}
        {showLog && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">変更履歴</h3>
            </div>
            {changeLog.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">変更履歴はありません</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {changeLog.slice(0, 50).map((log, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <span className="font-bold text-slate-700 w-10 flex-shrink-0">{log.roomNum}</span>
                    <span className="text-slate-400 flex-shrink-0">{log.oldType}</span>
                    <span className="text-slate-400 flex-shrink-0">→</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${TYPE_BADGE[log.newType] ?? ''}`}>{log.newType}</span>
                    <span className="text-slate-600 flex-1">{log.changedBy}</span>
                    <span className="text-slate-400 flex-shrink-0">{fmtTime(log.changedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm sm:mx-4 px-6 py-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-800">{editing.roomNum}号室 タイプ変更</h2>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">現在: <span className={`font-bold px-2 py-0.5 rounded ${TYPE_BADGE[editing.currentType] ?? ''}`}>{editing.currentType}</span></p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">新しいタイプを選択</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ROOM_TYPE_CONFIG).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => setNewType(type)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border-2 touch-manipulation transition-all
                      ${newType === type ? 'bg-slate-700 text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50'}`}
                  >
                    {type}
                    <span className="text-[11px] font-normal ml-1 opacity-70">{cfg.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">変更者名（必須）</label>
              <input
                type="text"
                placeholder="例: 田中"
                value={changedBy}
                onChange={e => { setChangedBy(e.target.value); setError('') }}
                autoFocus
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm touch-manipulation active:bg-slate-200">
                キャンセル
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white font-bold text-sm touch-manipulation active:bg-slate-800">
                変更を保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
