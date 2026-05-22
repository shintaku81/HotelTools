import { useState, useRef, useCallback } from 'react'
import { parseExcel, autoAssign } from '../utils/cleaningLogic.js'
import { loadStaff } from '../config/staff.js'

function TypeBadge({ type }) {
  if (type === 'co')  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">CO</span>
  if (type === 'eco') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">エコ</span>
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">ステイ</span>
}

function RoomTypeBadge({ type }) {
  if (!type || type === 'S') return null
  const map = { W: 'bg-blue-50 text-blue-600', T: 'bg-purple-50 text-purple-600', TR: 'bg-pink-50 text-pink-700' }
  return <span className={`text-[9px] font-bold px-1 py-px rounded ${map[type] ?? ''}`}>{type}</span>
}

const STAFF_PALETTE = [
  { bg: 'bg-blue-600',   light: 'bg-blue-50 border-blue-300 text-blue-800',   bar: 'bg-blue-500' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-300 text-emerald-800', bar: 'bg-emerald-500' },
  { bg: 'bg-violet-600', light: 'bg-violet-50 border-violet-300 text-violet-800', bar: 'bg-violet-500' },
  { bg: 'bg-rose-600',   light: 'bg-rose-50 border-rose-300 text-rose-800',   bar: 'bg-rose-500' },
  { bg: 'bg-amber-600',  light: 'bg-amber-50 border-amber-300 text-amber-800', bar: 'bg-amber-500' },
]

const FLOORS = [2, 3, 4, 5, 6, 7]

export default function CleaningPlan({ onBack }) {
  const [rooms, setRooms]           = useState(null)
  const [staffList, setStaffList]   = useState(() => loadStaff())
  const [assignments, setAssignments] = useState(null)  // { name: { rooms, points } }
  const [dragOver, setDragOver]     = useState(false)
  const [fileName, setFileName]     = useState('')
  const [error, setError]           = useState('')
  const fileInputRef = useRef()

  // Map name → palette index
  const paletteMap = {}
  loadStaff().forEach((s, i) => { paletteMap[s.name] = STAFF_PALETTE[i % STAFF_PALETTE.length] })

  const processFile = useCallback((file) => {
    if (!file) return
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = parseExcel(e.target.result)
        setRooms(data)
        setAssignments(autoAssign(data, staffList))
      } catch (err) {
        setError('ファイルの読み込みに失敗しました。XLS/XLSM形式か確認してください。')
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [staffList])

  function handleFileChange(e) { processFile(e.target.files[0]); e.target.value = '' }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }

  function handleClear() {
    setRooms(null)
    setAssignments(null)
    setFileName('')
    setError('')
  }

  function reAssign() {
    if (!rooms) return
    setAssignments(autoAssign(rooms, staffList))
  }

  function toggleStaff(idx) {
    setStaffList(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s))
  }

  const coCount   = rooms ? rooms.filter(r => r.cleaningType === 'co').length  : 0
  const ecoCount  = rooms ? rooms.filter(r => r.cleaningType === 'eco').length : 0
  const stayCount = rooms ? rooms.filter(r => !r.cleaningType).length : 0

  // Room → staff name map
  const roomStaffMap = {}
  if (assignments) {
    Object.entries(assignments).forEach(([name, { rooms: arr }]) => {
      arr.forEach(r => { roomStaffMap[r.room] = name })
    })
  }

  const activeStaff = staffList.filter(s => s.active)

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">翌日清掃</p>
          <p className="text-sm font-bold text-slate-900">計画・割り当て</p>
        </div>
        {rooms && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-200 active:bg-red-100 touch-manipulation"
          >
            クリア
          </button>
        )}
      </header>

      {/* ── Staff summary bar (visible after assignment) ── */}
      {assignments && (
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">スタッフ割り当て一覧</p>
          <div className="space-y-2">
            {activeStaff.map(s => {
              const asgn = assignments[s.name] ?? { rooms: [], points: 0 }
              const palette = paletteMap[s.name] ?? STAFF_PALETTE[0]
              const pct = Math.min(100, (asgn.points / s.target) * 100)
              return (
                <div key={s.name} className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${palette.bg} min-w-[48px] text-center`}>
                    {s.name}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-5 rounded-full ${palette.bar} flex items-center justify-end pr-1.5 transition-all`}
                      style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%` }}
                    >
                      {pct >= 20 && (
                        <span className="text-[9px] text-white font-bold">{asgn.rooms.length}室</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-20 text-right">
                    {asgn.rooms.length}室
                    <span className="text-slate-400 font-normal ml-1">({asgn.points.toFixed(1)}pt)</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* File Upload */}
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
          /* Re-upload button */
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 text-sm font-semibold active:bg-slate-50 touch-manipulation"
          >
            📂 別のファイルを読み込む
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".xls,.xlsx,.xlsm,.xlsb,.csv" className="hidden" onChange={handleFileChange} />

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        {/* Summary counts */}
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

        {/* Staff ON/OFF + reassign */}
        {rooms && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">出勤スタッフ</h2>
              <button
                onClick={reAssign}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold active:bg-indigo-700 touch-manipulation"
              >
                再割り当て
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {staffList.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => { toggleStaff(i) }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all touch-manipulation
                    ${s.active
                      ? `${paletteMap[s.name]?.bg ?? 'bg-slate-700'} text-white border-transparent`
                      : 'border-slate-200 bg-slate-50 text-slate-400 line-through'}`}
                >
                  {s.name}（{s.target}pt）
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan table by floor */}
        {rooms && assignments && FLOORS.map(floor => {
          const floorRooms = rooms.filter(r => r.floor === floor)
          if (floorRooms.length === 0) return null
          return (
            <div key={floor} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">{floor}F</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {floorRooms.map(r => {
                  const staffName = roomStaffMap[r.room]
                  const palette   = staffName ? (paletteMap[staffName] ?? STAFF_PALETTE[0]) : null
                  return (
                    <div key={r.room} className={`flex items-center px-4 py-2 gap-2 ${palette && r.cleaningType ? palette.bg.replace('600','50').replace('bg-','bg-') : ''}`}>
                      <span className="text-sm font-bold text-slate-800 w-10">{r.room}</span>
                      <RoomTypeBadge type={r.roomType} />
                      <TypeBadge type={r.cleaningType} />
                      <span className="text-xs text-slate-400 flex-1">{r.泊数}</span>
                      <span className="text-xs text-slate-400">{r.weight !== 1.0 ? `${r.weight}pt` : ''}</span>
                      {staffName && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${palette?.bg}`}>
                          {staffName}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
