import { useState, useRef, useCallback } from 'react'
import { parseExcel, autoAssign } from '../utils/cleaningLogic.js'
import { loadStaff } from '../config/staff.js'

function TypeBadge({ type }) {
  if (type === 'co')  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">CO</span>
  if (type === 'eco') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">エコ</span>
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">ステイ</span>
}

const STAFF_COLORS = [
  'bg-blue-50 border-blue-300 text-blue-800',
  'bg-green-50 border-green-300 text-green-800',
  'bg-purple-50 border-purple-300 text-purple-800',
  'bg-pink-50 border-pink-300 text-pink-800',
  'bg-amber-50 border-amber-300 text-amber-800',
]

export default function CleaningPlan({ onBack }) {
  const [rooms, setRooms] = useState(null)
  const [staffList, setStaffList] = useState(() => loadStaff())
  const [assignments, setAssignments] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef()

  const processFile = useCallback((file) => {
    if (!file) return
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = parseExcel(e.target.result)
        setRooms(data)
        const assign = autoAssign(data, staffList)
        setAssignments(assign)
      } catch (err) {
        setError('ファイルの読み込みに失敗しました。XLS/XLSM形式か確認してください。')
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [staffList])

  function handleFileChange(e) {
    processFile(e.target.files[0])
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }

  function reAssign() {
    if (!rooms) return
    const assign = autoAssign(rooms, staffList)
    setAssignments(assign)
  }

  function toggleStaff(idx) {
    setStaffList(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s)
      return next
    })
  }

  const coCount  = rooms ? rooms.filter(r => r.cleaningType === 'co').length  : 0
  const ecoCount = rooms ? rooms.filter(r => r.cleaningType === 'eco').length : 0
  const stayCount = rooms ? rooms.filter(r => !r.cleaningType).length : 0

  const FLOORS = [2, 3, 4, 5, 6, 7]

  // Map room → assigned staff name
  const roomStaffMap = {}
  if (assignments) {
    Object.entries(assignments).forEach(([name, arr]) => {
      arr.forEach(r => { roomStaffMap[r.room] = name })
    })
  }

  const staffColorMap = {}
  loadStaff().forEach((s, i) => {
    staffColorMap[s.name] = STAFF_COLORS[i % STAFF_COLORS.length]
  })

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div>
          <p className="text-xs text-slate-400">翌日清掃</p>
          <p className="text-sm font-bold text-slate-900">計画・割り当て</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* File Upload */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'}
          `}
        >
          <input ref={fileInputRef} type="file" accept=".xls,.xlsx,.xlsm,.xlsb,.csv" className="hidden" onChange={handleFileChange} />
          <p className="text-2xl mb-2">📂</p>
          {fileName
            ? <p className="text-sm font-bold text-slate-700">{fileName}</p>
            : <p className="text-sm text-slate-500">PMSの予約一覧ファイルをタップして選択<br /><span className="text-xs text-slate-400">XLS / XLSM 対応</span></p>
          }
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        {/* Summary */}
        {rooms && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">解析結果</h2>
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
                <div className="text-2xl font-bold text-slate-500">{stayCount}</div>
                <div className="text-xs text-slate-400 font-medium">ステイ</div>
              </div>
            </div>
          </div>
        )}

        {/* Staff ON/OFF */}
        {rooms && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">出勤スタッフ</h2>
              <button onClick={reAssign} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold active:bg-indigo-700 touch-manipulation">
                再割り当て
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {staffList.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => toggleStaff(i)}
                  className={`
                    px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all touch-manipulation
                    ${s.active
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                    }
                  `}
                >
                  {s.name} ({s.target}室)
                </button>
              ))}
            </div>
            {assignments && (
              <div className="mt-3 space-y-1">
                {Object.entries(assignments).map(([name, arr]) => (
                  arr.length > 0 && (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-slate-700 font-medium">{name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-4 bg-indigo-400 rounded-full"
                          style={{ width: `${Math.min(100, arr.length / (staffList.find(s => s.name === name)?.target || 10) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 font-bold w-10 text-right">{arr.length}室</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan Table by Floor */}
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
                  const colorClass = staffName ? (staffColorMap[staffName] || 'bg-slate-50 border-slate-200 text-slate-600') : 'bg-white'
                  return (
                    <div key={r.room} className={`flex items-center px-4 py-2 gap-3 ${r.cleaningType ? colorClass.split(' ')[0] : ''}`}>
                      <span className="text-sm font-bold text-slate-800 w-10">{r.room}</span>
                      <TypeBadge type={r.cleaningType} />
                      <span className="text-xs text-slate-400 flex-1">{r.泊数}</span>
                      {staffName && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
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
