import { useState, useRef, useCallback } from 'react'
import { parseExcel, autoAssign, analyzeAssignment } from '../utils/cleaningLogic.js'
import { loadStaff, saveStaff } from '../config/staff.js'
import { savePlan } from '../utils/planStorage.js'

// 12-color palette for up to 12 staff
const STAFF_PALETTE = [
  { bg: 'bg-blue-600',    bar: 'bg-blue-500',    row: 'bg-blue-50'    },
  { bg: 'bg-emerald-600', bar: 'bg-emerald-500',  row: 'bg-emerald-50' },
  { bg: 'bg-violet-600',  bar: 'bg-violet-500',   row: 'bg-violet-50'  },
  { bg: 'bg-rose-600',    bar: 'bg-rose-500',     row: 'bg-rose-50'    },
  { bg: 'bg-amber-600',   bar: 'bg-amber-500',    row: 'bg-amber-50'   },
  { bg: 'bg-cyan-700',    bar: 'bg-cyan-600',     row: 'bg-cyan-50'    },
  { bg: 'bg-pink-600',    bar: 'bg-pink-500',     row: 'bg-pink-50'    },
  { bg: 'bg-lime-700',    bar: 'bg-lime-600',     row: 'bg-lime-50'    },
  { bg: 'bg-orange-600',  bar: 'bg-orange-500',   row: 'bg-orange-50'  },
  { bg: 'bg-teal-600',    bar: 'bg-teal-500',     row: 'bg-teal-50'    },
  { bg: 'bg-indigo-600',  bar: 'bg-indigo-500',   row: 'bg-indigo-50'  },
  { bg: 'bg-slate-600',   bar: 'bg-slate-500',    row: 'bg-slate-100'  },
]

const FLOORS = [2, 3, 4, 5, 6, 7]

function TypeBadge({ type }) {
  if (type === 'co')  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">CO</span>
  if (type === 'eco') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">エコ</span>
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">ステイ</span>
}

function RoomTypeBadge({ type }) {
  if (!type || type === 'S') return null
  const map = {
    SD: 'bg-sky-50 text-sky-600',
    W:  'bg-blue-50 text-blue-600',
    T:  'bg-purple-50 text-purple-600',
    TR: 'bg-pink-50 text-pink-700',
  }
  return <span className={`text-[9px] font-bold px-1 py-px rounded ${map[type] ?? 'bg-slate-100 text-slate-500'}`}>{type}</span>
}

export default function CleaningPlan({ onBack, initialDate }) {
  const [rooms, setRooms]             = useState(null)
  const [staffList, setStaffList]     = useState(() => loadStaff())
  const [assignments, setAssignments] = useState(null)
  const [warnings, setWarnings]       = useState([])
  const [dragOver, setDragOver]       = useState(false)
  const [error, setError]             = useState('')
  const [saveDate, setSaveDate]       = useState(() => {
    if (initialDate) return initialDate
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef()

  // Build palette map from current staffList order
  const paletteMap = {}
  staffList.forEach((s, i) => { paletteMap[s.name] = STAFF_PALETTE[i % STAFF_PALETTE.length] })

  function toggleStaff(idx) {
    setStaffList(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s)
      saveStaff(next)
      return next
    })
  }

  function updateTarget(idx, rawVal) {
    const trimmed = String(rawVal).trim()
    const n = trimmed === '' ? null : parseInt(trimmed)
    if (n !== null && (isNaN(n) || n < 1 || n > 99)) return
    setStaffList(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, target: n } : s)
      saveStaff(next)
      return next
    })
  }

  const processFile = useCallback((file) => {
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = parseExcel(e.target.result)
        const asgn = autoAssign(data, staffList)
        setRooms(data)
        setAssignments(asgn)
        setWarnings(analyzeAssignment(data, staffList, asgn))
        setSaved(false)
      } catch (err) {
        setError('ファイルの読み込みに失敗しました。XLS/XLSM形式か確認してください。')
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [staffList])

  function handleFileChange(e) { processFile(e.target.files[0]); e.target.value = '' }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }

  function handleClear() {
    setRooms(null); setAssignments(null); setWarnings([]); setError(''); setSaved(false)
  }

  function reAssign() {
    if (!rooms) return
    const asgn = autoAssign(rooms, staffList)
    setAssignments(asgn)
    setWarnings(analyzeAssignment(rooms, staffList, asgn))
    setSaved(false)
  }

  function handleSavePlan() {
    if (!rooms || !assignments) return
    savePlan(saveDate, { rooms, assignments, staffList })
    setSaved(true)
  }

  const activeStaff    = staffList.filter(s => s.active)
  const coCount        = rooms ? rooms.filter(r => r.cleaningType === 'co').length  : 0
  const ecoCount       = rooms ? rooms.filter(r => r.cleaningType === 'eco').length : 0
  const stayCount      = rooms ? rooms.filter(r => !r.cleaningType).length          : 0

  const roomStaffMap = {}
  if (assignments) {
    Object.entries(assignments).forEach(([name, { rooms: arr }]) => {
      arr.forEach(r => { roomStaffMap[r.room] = name })
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">翌日清掃</p>
          <p className="text-sm font-bold text-slate-900">計画・割り当て</p>
        </div>
        {rooms && (
          <button onClick={handleClear} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-200 active:bg-red-100 touch-manipulation">
            クリア
          </button>
        )}
      </header>

      {/* ── Assignment summary (visible after assignment) ── */}
      {assignments && (
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">割り当て結果</p>
          <div className="space-y-1.5">
            {activeStaff.map(s => {
              const asgn    = assignments[s.name] ?? { rooms: [], points: 0 }
              const palette = paletteMap[s.name] ?? STAFF_PALETTE[0]
              const unlimited = s.target === null
              // For unlimited staff, show bar relative to 15pt as visual reference
              const pct = unlimited
                ? Math.min(100, (asgn.points / 15) * 100)
                : Math.min(100, (asgn.points / s.target) * 100)
              return (
                <div key={s.name} className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${palette.bg} w-12 text-center flex-shrink-0`}>
                    {s.name}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-5 rounded-full ${palette.bar} flex items-center justify-end pr-1.5 transition-all`}
                      style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%` }}
                    >
                      {pct >= 20 && <span className="text-[9px] text-white font-bold">{asgn.rooms.length}室</span>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 w-24 text-right flex-shrink-0">
                    <span className="font-bold">{asgn.rooms.length}室</span>
                    <span className="text-slate-400 ml-1">
                      ({asgn.points.toFixed(1)}pt{unlimited ? ' / ∞' : `/ ${s.target}`})
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
          {/* Confirm save */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
            <input
              type="date" value={saveDate}
              onChange={e => { setSaveDate(e.target.value); setSaved(false) }}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleSavePlan}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold touch-manipulation transition-all flex-shrink-0
                ${saved ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-indigo-600 text-white active:bg-indigo-700'}`}
            >
              {saved ? '✓ 保存済み' : '確定・保存'}
            </button>
          </div>
        </div>
      )}

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="px-4 pt-3 space-y-2 bg-white border-b border-slate-200 pb-3">
          {warnings.map((w, i) => {
            const styles = { error: 'bg-red-50 border-red-200 text-red-700', warn: 'bg-amber-50 border-amber-200 text-amber-800', info: 'bg-blue-50 border-blue-200 text-blue-700' }
            const icons  = { error: '⚠️', warn: '⚠️', info: 'ℹ️' }
            return (
              <div key={i} className={`text-xs rounded-xl border px-3 py-2 flex gap-2 ${styles[w.level]}`}>
                <span>{icons[w.level]}</span><span>{w.message}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* ── Staff configuration (always visible first) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">出勤スタッフ・担当ポイント</h2>
            {rooms && (
              <button onClick={reAssign} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold active:bg-indigo-700 touch-manipulation">
                再割り当て
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
            {staffList.map((s, i) => {
              const palette = paletteMap[s.name] ?? STAFF_PALETTE[0]
              return (
                <label key={s.name} className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none active:bg-slate-50 ${!s.active ? 'opacity-40' : ''}`}>
                  <input
                    type="checkbox"
                    checked={s.active}
                    onChange={() => toggleStaff(i)}
                    className="w-4 h-4 rounded cursor-pointer accent-slate-700 flex-shrink-0"
                  />
                  <span className={`text-sm font-bold flex-1 truncate ${s.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                    {s.name}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <input
                      type="number"
                      value={s.target ?? ''}
                      min={1}
                      max={99}
                      placeholder="∞"
                      onChange={e => updateTarget(i, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-12 text-center border border-slate-200 rounded-lg py-0.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400 disabled:opacity-40 placeholder:text-slate-400"
                    />
                    <span className="text-[10px] text-slate-400">pt</span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* ── File upload ── */}
        {!rooms ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'}`}
          >
            <input ref={fileInputRef} type="file" accept=".xls,.xlsx,.xlsm,.xlsb,.csv" className="hidden" onChange={handleFileChange} />
            <p className="text-3xl mb-3">📂</p>
            <p className="text-sm font-bold text-slate-700">PMSの予約一覧ファイルを選択</p>
            <p className="text-xs text-slate-400 mt-1">XLS / XLSM 対応　　タップまたはドラッグ&ドロップ</p>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 text-sm font-semibold active:bg-slate-50 touch-manipulation"
          >
            <input ref={fileInputRef} type="file" accept=".xls,.xlsx,.xlsm,.xlsb,.csv" className="hidden" onChange={handleFileChange} />
            📂 別のファイルを読み込む
          </button>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        {/* ── Summary counts ── */}
        {rooms && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">解析結果</h2>
            <div className="flex gap-3">
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-700">{coCount}</div>
                <div className="text-xs text-red-600 font-medium">CO清掃</div>
              </div>
              <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{ecoCount}</div>
                <div className="text-xs text-orange-600 font-medium">エコ清掃</div>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                <div className="text-2xl font-bold text-slate-400">{stayCount}</div>
                <div className="text-xs text-slate-400 font-medium">ステイ</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Floor plan table (Excel-like) ── */}
        {rooms && assignments && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left w-12">部屋</th>
                  <th className="px-1 py-2 text-left w-10">区分</th>
                  <th className="px-1 py-2 text-left w-14">清掃</th>
                  <th className="px-1 py-2 text-left">泊数</th>
                  <th className="px-1 py-2 text-right">担当</th>
                </tr>
              </thead>
              <tbody>
                {FLOORS.map(floor => {
                  const floorRooms = rooms.filter(r => r.floor === floor)
                  if (floorRooms.length === 0) return null
                  return (
                    <FloorRows
                      key={floor}
                      floor={floor}
                      rooms={floorRooms}
                      roomStaffMap={roomStaffMap}
                      paletteMap={paletteMap}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FloorRows({ floor, rooms, roomStaffMap, paletteMap }) {
  return (
    <>
      <tr>
        <td colSpan={5} className="px-3 py-1 bg-slate-100 border-y border-slate-200 text-xs font-bold text-slate-600 tracking-wider">
          {floor}F
        </td>
      </tr>
      {rooms.map(r => {
        const staffName = roomStaffMap[r.room]
        const palette   = staffName ? (paletteMap[staffName] ?? STAFF_PALETTE[0]) : null
        const rowBg     = palette && r.cleaningType ? palette.row : ''
        return (
          <tr key={r.room} className={`border-b border-slate-100 ${rowBg}`}>
            <td className="px-3 py-1.5 font-bold text-slate-800 text-sm">{r.room}</td>
            <td className="px-1 py-1.5"><RoomTypeBadge type={r.roomType} /></td>
            <td className="px-1 py-1.5"><TypeBadge type={r.cleaningType} /></td>
            <td className="px-1 py-1.5 text-xs text-slate-400">{r.泊数}</td>
            <td className="px-2 py-1.5 text-right">
              {staffName && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${palette?.bg} whitespace-nowrap`}>
                  {staffName}
                </span>
              )}
            </td>
          </tr>
        )
      })}
    </>
  )
}
