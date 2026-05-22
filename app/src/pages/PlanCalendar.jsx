import { useState } from 'react'
import { loadAllPlans, loadHolidays, toggleHoliday, deletePlan } from '../utils/planStorage.js'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function PlanCalendar({ onBack, onNavigatePlan }) {
  const TODAY = todayStr()
  const [year, setYear]     = useState(new Date().getFullYear())
  const [month, setMonth]   = useState(new Date().getMonth()) // 0-indexed
  const [selected, setSelected] = useState(tomorrowStr())
  const [plans, setPlans]     = useState(loadAllPlans)
  const [holidays, setHolidays] = useState(loadHolidays)

  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function handleToggleHoliday(ds) {
    const updated = toggleHoliday(ds)
    setHolidays(new Set(updated))
  }

  function handleDeletePlan(ds) {
    if (!window.confirm(`${ds} の計画を削除しますか？`)) return
    deletePlan(ds)
    setPlans(loadAllPlans())
  }

  function getDayClasses(ds) {
    const hasPlan  = !!plans[ds]
    const isHol    = holidays.has(ds)
    const isPast   = ds < TODAY
    const isSel    = ds === selected
    const dayOfWeek = new Date(ds).getDay()

    let base = 'aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold border-2 touch-manipulation transition-all '
    if (isSel) base += 'ring-2 ring-offset-1 ring-slate-700 scale-95 '

    if (isHol)            base += 'bg-slate-200 border-slate-300 text-slate-500 '
    else if (hasPlan)     base += 'bg-green-100 border-green-400 text-green-800 '
    else if (isPast)      base += 'bg-slate-50 border-slate-100 text-slate-300 '
    else                  base += 'bg-amber-50 border-amber-200 text-amber-700 '

    if (ds === TODAY) base += 'ring-2 ring-blue-400 ring-offset-1 '
    if (dayOfWeek === 0) base += '!text-red-400 '
    if (dayOfWeek === 6) base += '!text-blue-400 '

    return base
  }

  const selectedPlan = selected ? plans[selected] : null
  const isSelHoliday = selected && holidays.has(selected)

  // Build grid cells (nulls for empty prefix cells)
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(year, month, d))

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">清掃計画</p>
          <p className="text-sm font-bold text-slate-900">カレンダー</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* Calendar card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-2 rounded-lg active:bg-slate-100 text-slate-600 text-lg touch-manipulation">‹</button>
            <span className="text-base font-bold text-slate-800">{year}年 {month + 1}月</span>
            <button onClick={nextMonth} className="p-2 rounded-lg active:bg-slate-100 text-slate-600 text-lg touch-manipulation">›</button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-bold py-1
                ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((ds, idx) => {
              if (!ds) return <div key={`empty-${idx}`} />
              const dayNum = parseInt(ds.split('-')[2])
              const isHol  = holidays.has(ds)
              const hasPlan = !!plans[ds]
              return (
                <button key={ds} onClick={() => setSelected(ds === selected ? null : ds)} className={getDayClasses(ds)}>
                  <span className="leading-none">{dayNum}</span>
                  {isHol  && <span className="text-[8px] mt-0.5 font-normal">休</span>}
                  {hasPlan && !isHol && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-3 flex-wrap">
            <LegendItem color="bg-green-100 border-green-400" label="計画確定" />
            <LegendItem color="bg-amber-50 border-amber-200" label="未設定" />
            <LegendItem color="bg-slate-200 border-slate-300" label="休館/メンテ" />
          </div>
        </div>

        {/* Selected day detail */}
        {selected && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">{selected}</h3>
              <button
                onClick={() => handleToggleHoliday(selected)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold border touch-manipulation
                  ${isSelHoliday ? 'bg-slate-600 text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
              >
                {isSelHoliday ? '休館解除' : '休館/メンテ'}
              </button>
            </div>

            {selectedPlan ? (
              <PlanSummary
                plan={selectedPlan}
                onNavigate={() => onNavigatePlan && onNavigatePlan(selected)}
                onDelete={() => { handleDeletePlan(selected); setSelected(null) }}
              />
            ) : (
              <div className="text-center py-4">
                {isSelHoliday
                  ? <p className="text-sm text-slate-400">休館日・メンテナンス日</p>
                  : <>
                      <p className="text-sm text-slate-400 mb-3">この日の計画はまだ保存されていません</p>
                      {selected >= TODAY && onNavigatePlan && (
                        <button
                          onClick={() => onNavigatePlan(selected)}
                          className="py-2 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm touch-manipulation active:bg-indigo-700"
                        >
                          計画を作成する
                        </button>
                      )}
                    </>
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-slate-500">
      <span className={`w-3 h-3 rounded border-2 inline-block ${color}`} />
      {label}
    </span>
  )
}

function PlanSummary({ plan, onNavigate, onDelete }) {
  const rooms = plan.rooms ?? []
  const co  = rooms.filter(r => r.cleaningType === 'co').length
  const eco = rooms.filter(r => r.cleaningType === 'eco').length
  const savedTime = new Date(plan.savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <p className="text-[10px] text-slate-400 mb-2">保存: {savedTime}</p>
      <div className="flex gap-2 mb-3">
        <span className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">CO {co}室</span>
        <span className="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-200">エコ {eco}室</span>
      </div>
      {plan.assignments && (
        <div className="space-y-1 mb-3">
          {Object.entries(plan.assignments).map(([name, { rooms: rs, points }]) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 w-12 flex-shrink-0">{name}</span>
              <span className="text-slate-500">{rs.length}室 / {typeof points === 'number' ? points.toFixed(1) : points}pt</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onNavigate}
          className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm touch-manipulation active:bg-indigo-700"
        >
          計画を表示
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm border border-red-200 touch-manipulation active:bg-red-100"
        >
          削除
        </button>
      </div>
    </>
  )
}
