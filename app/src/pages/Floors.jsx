import { useState, useEffect, useCallback } from 'react'
import { useRooms, AMENITY_ITEMS, ROOM_TYPE_CONFIG } from '../hooks/useRooms.js'
import { loadStaff } from '../config/staff.js'

// ─── Utilities ────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  return `${h}時間${m % 60}分前`
}

function getStatusConfig(room) {
  if (room.status === 'stay') {
    return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-400', dot: 'bg-slate-300', label: '在室中' }
  }
  if (room.status === 'checkout_pending') {
    return { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', dot: 'bg-violet-400', label: 'CO待ち' }
  }
  if (room.status === 'available') {
    return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500', label: '清掃済み' }
  }
  if (room.status === 'checkout' && room.cleaning_type === 'co') {
    return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', dot: 'bg-red-500', label: '清掃待ち' }
  }
  if (room.status === 'checkout' && room.cleaning_type === 'eco') {
    return { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', dot: 'bg-orange-400', label: '清掃待ち' }
  }
  if (room.status === 'checkout') {
    return { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', dot: 'bg-yellow-400', label: '清掃待ち' }
  }
  if (room.status === 'cleaning') {
    return { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-400', label: '清掃中' }
  }
  if (room.status === 'cleaned') {
    return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', dot: 'bg-blue-500', label: '確認待ち' }
  }
  return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600', dot: 'bg-gray-400', label: '不明' }
}

function buildDefaultAmenities(cleaningType, roomType) {
  const cfg = ROOM_TYPE_CONFIG[roomType] ?? ROOM_TYPE_CONFIG.S
  const occ = cfg.occupancy
  const counts = {}
  AMENITY_ITEMS.forEach(item => {
    const base = cleaningType === 'eco' ? item.defaultEco : item.defaultCo
    // towel-type items scale with occupancy; consumables (shampoo etc) already per-person
    const scales = ['bath_towel', 'face_towel', 'wash_cloth', 'bath_mat', 'amenity_set']
    counts[item.key] = base > 0 && scales.includes(item.key) ? base * occ : base
  })
  return counts
}

const FLOORS = [2, 3, 4, 5, 6, 7]

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleLabel(role) {
  if (role === 'front') return 'フロント'
  if (role === 'leader') return 'リーダー'
  if (role === 'cleaner') return 'スタッフ'
  return role
}

function CleaningTypeBadge({ type, small = false }) {
  if (!type) return null
  const base = small ? 'text-[9px] px-0.5 py-px rounded font-bold leading-none' : 'text-xs px-1.5 py-0.5 rounded font-bold'
  if (type === 'co') return <span className={`${base} bg-red-100 text-red-700 border border-red-300`}>CO</span>
  if (type === 'eco') return <span className={`${base} bg-orange-100 text-orange-700 border border-orange-300`}>エコ</span>
  return null
}

function RoomTypeBadge({ type, small = false }) {
  if (type === 'S') return null
  const base = small ? 'text-[9px] px-0.5 py-px rounded font-bold leading-none' : 'text-xs px-1.5 py-0.5 rounded font-bold'
  if (type === 'T') return <span className={`${base} bg-blue-100 text-blue-600`}>{type}</span>
  if (type === 'TR') return <span className={`${base} bg-purple-100 text-purple-700`}>{type}</span>
  return <span className={`${base} bg-slate-200 text-slate-600`}>{type}</span>
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-bounce-in pointer-events-none">
      {message}
    </div>
  )
}

// ─── Room Card ─────────────────────────────────────────────────────────────────

function RoomCard({ room, onClick }) {
  const sc = getStatusConfig(room)

  return (
    <button
      onClick={() => onClick(room)}
      className={`
        h-[46px] w-full flex flex-col items-center justify-center
        rounded border-2 ${sc.bg} ${sc.border}
        active:scale-95 transition-transform duration-100
        touch-manipulation select-none overflow-hidden
      `}
      aria-label={`${room.room_number}号室 ${sc.label}`}
    >
      <span className={`text-xs font-bold leading-none ${sc.text}`}>{room.room_number}</span>
      <div className="h-3 flex items-center justify-center gap-px mt-0.5">
        {room.cleaning_type && <CleaningTypeBadge type={room.cleaning_type} small />}
        <RoomTypeBadge type={room.room_type} small />
      </div>
      <span className={`text-[9px] leading-none ${sc.text} mt-0.5`}>{sc.label}</span>
    </button>
  )
}

// ─── Room Grid ─────────────────────────────────────────────────────────────────

function RoomGrid({ rooms, onCardClick }) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1 px-3 py-2">
      {rooms.map(room => (
        <RoomCard key={room.id} room={room} onClick={onCardClick} />
      ))}
    </div>
  )
}

// ─── Amenity Modal ──────────────────────────────────────────────────────────────

function AmenityModal({ room, amenityCounts, setAmenityCounts, onComplete, onCancel, loading }) {
  function step(key, delta) {
    setAmenityCounts(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 0) + delta),
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm sm:mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{room.room_number}号室 アメニティ記録</h2>
          <div className="mt-1">
            <CleaningTypeBadge type={room.cleaning_type} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {AMENITY_ITEMS.map(item => {
            const count = amenityCounts[item.key] ?? 0
            const dimmed = count === 0
            return (
              <div key={item.key} className={`flex items-center justify-between ${dimmed ? 'opacity-40' : ''}`}>
                <span className="text-sm text-slate-700">{item.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => step(item.key, -1)}
                    className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center active:bg-slate-300 touch-manipulation"
                    aria-label={`${item.label}を減らす`}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-slate-800">{count}</span>
                  <button
                    onClick={() => step(item.key, 1)}
                    className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center active:bg-slate-300 touch-manipulation"
                    aria-label={`${item.label}を増やす`}
                  >
                    ＋
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-slate-100 space-y-2">
          <button
            onClick={onComplete}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700 disabled:opacity-60 touch-manipulation"
          >
            {loading ? '記録中...' : '記録して完了'}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm active:bg-slate-200 touch-manipulation"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Room Detail Modal ──────────────────────────────────────────────────────────

function RoomDetailModal({ room, user, onClose, onAction, onOpenAmenity, loading }) {
  const sc = getStatusConfig(room)
  const { role, name } = user

  const isOwnRoom = room.assigned_staff === name
  const canStartAmenity =
    (role === 'cleaner' && room.status === 'cleaning' && isOwnRoom) ||
    (role === 'leader' && room.status === 'cleaning')

  let timeLabel = ''
  if (room.status === 'checkout' && room.checkout_at) {
    timeLabel = `CO: ${relativeTime(room.checkout_at)}`
  } else if (room.status === 'cleaning' && room.cleaning_start_at) {
    timeLabel = `清掃中: ${relativeTime(room.cleaning_start_at)}`
  } else if (room.status === 'cleaned' && room.cleaned_at) {
    timeLabel = `完了: ${relativeTime(room.cleaned_at)}`
  } else if (room.status === 'available' && room.updated_at) {
    timeLabel = `更新: ${relativeTime(room.updated_at)}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm sm:mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-slate-800">{room.room_number}号室</h2>
            <div className="flex gap-1.5 items-center">
              <CleaningTypeBadge type={room.cleaning_type} />
              <RoomTypeBadge type={room.room_type} />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${sc.dot}`} />
            <span className={`text-sm font-semibold ${sc.text}`}>{sc.label}</span>
          </div>

          {/* Time info */}
          {timeLabel && (
            <p className="text-xs text-slate-400 mt-1">{timeLabel}</p>
          )}

          {/* Staff */}
          {room.assigned_staff && (
            <p className="text-xs text-slate-500 mt-1">担当: {room.assigned_staff}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 space-y-2">

          {/* front/leader + checkout_pending → register actual checkout (CO or eco) */}
          {(role === 'front' || role === 'leader') && room.status === 'checkout_pending' && (
            <>
              <button
                onClick={() => onAction('checkout_co')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm active:bg-red-700 disabled:opacity-60 touch-manipulation"
              >
                CO（チェックアウト確認）
              </button>
              <button
                onClick={() => onAction('checkout_eco')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm active:bg-orange-600 disabled:opacity-60 touch-manipulation"
              >
                エコ清掃で登録（連泊継続）
              </button>
            </>
          )}

          {/* front/leader + available → re-register if needed */}
          {(role === 'front' || role === 'leader') && room.status === 'available' && (
            <>
              <button
                onClick={() => onAction('checkout_co')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm active:bg-red-700 disabled:opacity-60 touch-manipulation"
              >
                CO清掃で再登録
              </button>
              <button
                onClick={() => onAction('checkout_eco')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm active:bg-orange-600 disabled:opacity-60 touch-manipulation"
              >
                エコ清掃で再登録
              </button>
            </>
          )}

          {/* cleaner + checkout → claim */}
          {role === 'cleaner' && room.status === 'checkout' && (
            <button
              onClick={() => onAction('claim')}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm active:bg-amber-600 disabled:opacity-60 touch-manipulation"
            >
              {loading ? '処理中...' : 'この部屋を担当する'}
            </button>
          )}

          {/* leader + checkout → claim */}
          {role === 'leader' && room.status === 'checkout' && (
            <button
              onClick={() => onAction('claim')}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm active:bg-amber-600 disabled:opacity-60 touch-manipulation"
            >
              {loading ? '処理中...' : 'この部屋を担当する'}
            </button>
          )}

          {/* cleaner/leader + cleaning → complete (opens amenity modal) */}
          {canStartAmenity && (
            <>
              <button
                onClick={onOpenAmenity}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700 disabled:opacity-60 touch-manipulation"
              >
                清掃完了を記録
              </button>
              {/* leader: release assignment */}
              {role === 'leader' && (
                <button
                  onClick={() => onAction('unassign')}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white border border-slate-300 text-slate-600 font-semibold text-sm active:bg-slate-50 disabled:opacity-60 touch-manipulation"
                >
                  担当を解除
                </button>
              )}
            </>
          )}

          {/* leader + cleaned → mark available */}
          {role === 'leader' && room.status === 'cleaned' && (
            <button
              onClick={() => onAction('approve')}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm active:bg-green-700 disabled:opacity-60 touch-manipulation"
            >
              {loading ? '処理中...' : '清掃済みにする（検査完了）'}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm active:bg-slate-200 touch-manipulation"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

// ─── Filter Select ─────────────────────────────────────────────────────────────

function FilterSelect({ filterMode, onChange, userRole, userName }) {
  const staff = loadStaff().filter(s => s.active && !s.retired)
  return (
    <select
      value={filterMode}
      onChange={e => onChange(e.target.value)}
      className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 touch-manipulation focus:outline-none focus:border-indigo-400"
    >
      <option value="all">全室</option>
      <option value="mine">{userName}（自分）</option>
      {userRole === 'leader' && staff.map(s => (
        s.name !== userName && <option key={s.name} value={s.name}>{s.name}</option>
      ))}
    </select>
  )
}

function StatsBar({ rooms }) {
  const stay = rooms.filter(r => r.status === 'stay').length
  const coPending = rooms.filter(r => r.status === 'checkout_pending').length
  const waiting = rooms.filter(r => r.status === 'checkout').length
  const cleaning = rooms.filter(r => r.status === 'cleaning').length
  const cleaned = rooms.filter(r => r.status === 'cleaned').length
  const available = rooms.filter(r => r.status === 'available').length

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto">
      <StatBadge color="slate" label="在室中" count={stay} />
      <StatBadge color="violet" label="CO待ち" count={coPending} />
      <StatBadge color="red" label="清掃待ち" count={waiting} />
      <StatBadge color="amber" label="清掃中" count={cleaning} />
      <StatBadge color="blue" label="確認待ち" count={cleaned} />
      <StatBadge color="green" label="清掃済み" count={available} />
    </div>
  )
}

function StatBadge({ color, label, count }) {
  const colorMap = {
    slate:  'bg-slate-100 text-slate-500',
    violet: 'bg-violet-100 text-violet-700',
    red:    'bg-red-100 text-red-700',
    amber:  'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${colorMap[color]}`}>
      {label} <span className="font-bold">{count}</span>件
    </span>
  )
}

// ─── Floor Tabs ─────────────────────────────────────────────────────────────────

function FloorTabs({ activeFloor, onChange, rooms }) {
  function nonAvailableCount(floor) {
    if (floor === 'all' || floor === 'progress') return 0
    return rooms.filter(r => r.floor === floor && ['checkout_pending', 'checkout', 'cleaning', 'cleaned'].includes(r.status)).length
  }

  const tabs = [
    { key: 'all', label: '全体' },
    { key: 'progress', label: '進捗' },
    ...FLOORS.map(f => ({ key: f, label: `${f}F` })),
  ]

  return (
    <div className="bg-white border-b border-slate-200 flex overflow-x-auto">
      {tabs.map(tab => {
        const active = activeFloor === tab.key
        const badge = nonAvailableCount(tab.key)
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              flex-shrink-0 px-4 py-3 text-sm font-semibold relative touch-manipulation
              ${active
                ? 'border-b-2 border-slate-700 text-slate-900'
                : 'text-slate-500 active:bg-slate-50'
              }
            `}
          >
            {tab.label}
            {badge > 0 && (
              <span className="ml-1 text-red-600 font-bold text-xs">({badge})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Amenity Summary (leader only) ──────────────────────────────────────────────

function AmenitySummary({ rooms }) {
  const cleanedRooms = rooms.filter(r => r.amenities)

  const byFloor = {}
  cleanedRooms.forEach(room => {
    const f = room.floor
    if (!byFloor[f]) byFloor[f] = {}
    AMENITY_ITEMS.forEach(item => {
      byFloor[f][item.key] = (byFloor[f][item.key] || 0) + (room.amenities[item.key] || 0)
    })
  })

  const floors = Object.keys(byFloor).sort()
  if (floors.length === 0) return null

  return (
    <div className="bg-white mx-4 mb-4 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700">アメニティ集計（清掃完了済み）</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {floors.map(f => {
          const data = byFloor[f]
          const parts = AMENITY_ITEMS
            .filter(item => data[item.key] > 0)
            .map(item => `${item.label}×${data[item.key]}`)
          if (parts.length === 0) return null
          return (
            <div key={f} className="px-4 py-2">
              <span className="text-xs font-bold text-slate-600 mr-2">{f}F:</span>
              <span className="text-xs text-slate-500">{parts.join('、')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Progress Dashboard ─────────────────────────────────────────────────────────

function ProgressDashboard({ rooms }) {
  // Rooms planned for cleaning today (have a cleaning_type assigned)
  const planned = rooms.filter(r => r.cleaning_type !== null)
  const completed = planned.filter(r => r.status === 'cleaned' || r.status === 'available')
  const cleaning  = planned.filter(r => r.status === 'cleaning')
  const waiting   = planned.filter(r => r.status === 'checkout')
  const rate = planned.length > 0 ? Math.round(completed.length / planned.length * 100) : 0

  // Staff breakdown: rooms cleaned (status cleaned or amenities recorded)
  const staffMap = {}
  rooms.forEach(r => {
    if (r.assigned_staff && (r.status === 'cleaning' || r.status === 'cleaned' || r.amenities)) {
      if (!staffMap[r.assigned_staff]) staffMap[r.assigned_staff] = { cleaning: 0, cleaned: 0 }
      if (r.status === 'cleaned' || r.amenities) staffMap[r.assigned_staff].cleaned++
      else staffMap[r.assigned_staff].cleaning++
    }
  })
  const staffList = Object.entries(staffMap).sort((a, b) => (b[1].cleaned + b[1].cleaning) - (a[1].cleaned + a[1].cleaning))
  const maxTotal = staffList.length > 0 ? staffList[0][1].cleaned + staffList[0][1].cleaning : 1

  return (
    <div className="p-4 space-y-4 pb-8">

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">本日の清掃進捗</h2>

        {/* Big numbers */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-200">
            <div className="text-3xl font-bold text-green-700">{completed.length}</div>
            <div className="text-xs text-green-600 mt-0.5 font-medium">清掃完了</div>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-3 text-center border border-red-200">
            <div className="text-3xl font-bold text-red-700">{waiting.length + cleaning.length}</div>
            <div className="text-xs text-red-600 mt-0.5 font-medium">清掃待ち</div>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
            <div className="text-3xl font-bold text-slate-700">{planned.length}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">本日計画</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div
            className="h-4 rounded-full bg-green-500 transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(rate, rate > 0 ? 8 : 0)}%` }}
          >
            {rate >= 15 && <span className="text-[10px] font-bold text-white">{rate}%</span>}
          </div>
        </div>
        {rate < 15 && rate > 0 && (
          <div className="text-right text-xs text-slate-500 mt-1">{rate}%</div>
        )}

        {/* Sub breakdown */}
        <div className="flex gap-3 mt-3 text-xs text-slate-500">
          <span><span className="font-bold text-amber-600">{cleaning.length}</span> 件清掃中</span>
          <span><span className="font-bold text-red-600">{waiting.length}</span> 件清掃待ち</span>
          <span><span className="font-bold text-green-600">{completed.length}</span> 件済み</span>
        </div>
      </div>

      {/* Staff breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">担当者別 清掃数</h2>
        {staffList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">まだ担当者がいません</p>
        ) : (
          <div className="space-y-3">
            {staffList.map(([name, counts]) => {
              const total = counts.cleaned + counts.cleaning
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 w-14 flex-shrink-0 font-medium">{name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden flex">
                    {counts.cleaned > 0 && (
                      <div
                        className="bg-green-500 h-5 flex items-center justify-center"
                        style={{ width: `${counts.cleaned / maxTotal * 100}%` }}
                      />
                    )}
                    {counts.cleaning > 0 && (
                      <div
                        className="bg-amber-400 h-5 flex items-center justify-center"
                        style={{ width: `${counts.cleaning / maxTotal * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="text-right w-14 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-800">{total}室</span>
                    {counts.cleaning > 0 && (
                      <span className="text-[10px] text-amber-600 ml-1">({counts.cleaning}中)</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex gap-3 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />完了</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />清掃中</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function Floors({ user, onLogout, onBack }) {
  const { rooms, loading, updateRoom, resetAllRooms, bulkAssignRooms } = useRooms()

  const [activeFloor, setActiveFloor] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [modalType, setModalType] = useState(null) // 'detail' | 'amenity'
  const [amenityCounts, setAmenityCounts] = useState({})
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [filterMode, setFilterMode] = useState(user.role === 'cleaner' ? 'mine' : 'all')

  async function handleAutoAssign() {
    const activeStaff = loadStaff().filter(s => s.active && !s.retired)
    if (!activeStaff.length) { showToast('出勤スタッフがいません'); return }

    const targets = rooms.filter(r =>
      (r.status === 'checkout_pending' || r.status === 'checkout') && !r.assigned_staff
    )
    if (!targets.length) { showToast('割り当て可能な清掃待ち部屋がありません'); return }

    // weighted round-robin: target null → 他の平均
    const withTarget = activeStaff.filter(s => s.target !== null)
    const avg = withTarget.length > 0
      ? withTarget.reduce((s, st) => s + st.target, 0) / withTarget.length
      : 10
    const staffState = activeStaff.map(s => ({ name: s.name, weight: s.target ?? avg, assigned: 0 }))

    const assignments = targets.map(room => {
      const best = staffState.reduce((a, b) =>
        (a.assigned / a.weight) <= (b.assigned / b.weight) ? a : b
      )
      best.assigned++
      return { id: room.id, staff: best.name }
    })

    setActionLoading(true)
    const { error } = await bulkAssignRooms(assignments)
    setActionLoading(false)
    if (!error) showToast(`${targets.length}室を${activeStaff.length}名に自動割り当てしました`)
  }

  async function handleResetAllRooms() {
    if (!window.confirm('全室を「CO待ち（チェックアウト予定）」状態にリセットします。\nよろしいですか？')) return
    setActionLoading(true)
    const { error } = await resetAllRooms()
    setActionLoading(false)
    if (!error) showToast('全室をCO待ちにリセットしました')
  }

  function showToast(msg) {
    setToast(msg)
  }

  function dismissToast() {
    setToast(null)
  }

  // When a card is tapped, find the fresh version of the room from state
  function openDetail(room) {
    const fresh = rooms.find(r => r.id === room.id) || room
    setSelectedRoom(fresh)
    setModalType('detail')
  }

  function closeModal() {
    setSelectedRoom(null)
    setModalType(null)
    setAmenityCounts({})
  }

  function openAmenityModal() {
    if (!selectedRoom) return
    const defaults = buildDefaultAmenities(selectedRoom.cleaning_type, selectedRoom.room_type)
    setAmenityCounts(defaults)
    setModalType('amenity')
  }

  const handleAction = useCallback(async (action) => {
    if (!selectedRoom) return
    setActionLoading(true)
    const now = new Date().toISOString()

    let updates = {}
    let toastMsg = ''

    switch (action) {
      case 'checkout_co':
        updates = { status: 'checkout', cleaning_type: 'co', checkout_at: now, updated_by: user.name }
        toastMsg = `${selectedRoom.room_number}号室をCO清掃待ちに登録しました`
        break
      case 'checkout_eco':
        updates = { status: 'checkout', cleaning_type: 'eco', checkout_at: now, updated_by: user.name }
        toastMsg = `${selectedRoom.room_number}号室をエコ清掃待ちに登録しました`
        break
      case 'claim':
        updates = { status: 'cleaning', assigned_staff: user.name, cleaning_start_at: now, updated_by: user.name }
        toastMsg = `${selectedRoom.room_number}号室の清掃を開始しました`
        break
      case 'unassign':
        updates = { status: 'checkout', assigned_staff: null, cleaning_start_at: null, updated_by: user.name }
        toastMsg = `${selectedRoom.room_number}号室の担当を解除しました`
        break
      case 'approve':
        updates = { status: 'available', updated_by: user.name }
        toastMsg = `${selectedRoom.room_number}号室を清掃済みにしました`
        break
      default:
        setActionLoading(false)
        return
    }

    const { error } = await updateRoom(selectedRoom.id, updates)
    setActionLoading(false)
    if (!error) {
      showToast(toastMsg)
      closeModal()
    }
  }, [selectedRoom, user, updateRoom])

  const handleAmenityComplete = useCallback(async () => {
    if (!selectedRoom) return
    setActionLoading(true)
    const now = new Date().toISOString()
    const updates = {
      status: 'cleaned',
      amenities: { ...amenityCounts },
      cleaned_at: now,
      updated_by: user.name,
    }
    const { error } = await updateRoom(selectedRoom.id, updates)
    setActionLoading(false)
    if (!error) {
      showToast(`${selectedRoom.room_number}号室の清掃を完了しました`)
      closeModal()
    }
  }, [selectedRoom, amenityCounts, user, updateRoom])

  // Sync selectedRoom when rooms change (in case we have modal open)
  const currentSelectedRoom = selectedRoom
    ? rooms.find(r => r.id === selectedRoom.id) || selectedRoom
    : null

  // 担当フィルター（'all' / 'mine' / スタッフ名）
  const filteredRooms = filterMode === 'all'
    ? rooms
    : filterMode === 'mine'
      ? rooms.filter(r => r.assigned_staff === user.name)
      : rooms.filter(r => r.assigned_staff === filterMode)

  // Filtered rooms for display
  const displayRooms = activeFloor === 'all'
    ? filteredRooms
    : filteredRooms.filter(r => r.floor === activeFloor)

  const floorGroups = FLOORS.map(f => ({
    floor: f,
    rooms: filteredRooms.filter(r => r.floor === f),
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-2 px-4 py-3 shadow-sm">
        {onBack && (
          <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        )}
        <div className="flex-1">
          <p className="text-xs text-slate-400 leading-tight">ホテルパコジュニア 北見</p>
          <p className="text-sm font-bold text-slate-900 leading-tight">通常清掃</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-right mr-0.5">
            <p className="text-xs text-slate-400 leading-tight">{RoleLabel(user.role)}</p>
            <p className="text-sm text-slate-700 font-medium leading-tight">{user.name}</p>
          </div>

          {/* 担当フィルター（cleaner/leader） */}
          {(user.role === 'cleaner' || user.role === 'leader') && (
            <FilterSelect
              filterMode={filterMode}
              onChange={setFilterMode}
              userRole={user.role}
              userName={user.name}
            />
          )}

          {/* 自動割り当て（leader） */}
          {user.role === 'leader' && (
            <button
              onClick={handleAutoAssign}
              disabled={actionLoading}
              className="px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold active:bg-indigo-100 touch-manipulation border border-indigo-200 disabled:opacity-50"
              title="清掃待ち部屋をスタッフに自動割り当て"
            >
              自動割り当て
            </button>
          )}

          {/* 日次初期化（leader） */}
          {user.role === 'leader' && (
            <button
              onClick={handleResetAllRooms}
              disabled={actionLoading}
              className="px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold active:bg-amber-100 touch-manipulation border border-amber-200 disabled:opacity-50"
              title="全室をCO待ちにリセット（日次初期化）"
            >
              日次初期化
            </button>
          )}

          <button
            onClick={onLogout}
            className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold active:bg-slate-200 touch-manipulation border border-slate-200"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar rooms={rooms} />

      {/* Floor Tabs */}
      <FloorTabs activeFloor={activeFloor} onChange={setActiveFloor} rooms={filteredRooms} />

      {/* Room Content */}
      <div className="flex-1 overflow-y-auto">
        {activeFloor === 'progress' ? (
          <ProgressDashboard rooms={rooms} />
        ) : activeFloor === 'all' ? (
          <div className="pb-4">
            {floorGroups.map(({ floor, rooms: floorRooms }) => (
              <div key={floor}>
                <div className="px-4 pt-4 pb-1">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{floor}F</h2>
                </div>
                <RoomGrid rooms={floorRooms} onCardClick={openDetail} />
              </div>
            ))}
            {/* Amenity Summary for leader */}
            {user.role === 'leader' && <AmenitySummary rooms={rooms} />}
          </div>
        ) : (
          <div className="pb-4">
            <RoomGrid rooms={displayRooms} onCardClick={openDetail} />
            {user.role === 'leader' && <AmenitySummary rooms={displayRooms} />}
          </div>
        )}
      </div>

      {/* Room Detail Modal */}
      {modalType === 'detail' && currentSelectedRoom && (
        <RoomDetailModal
          room={currentSelectedRoom}
          user={user}
          onClose={closeModal}
          onAction={handleAction}
          onOpenAmenity={openAmenityModal}
          loading={actionLoading}
        />
      )}

      {/* Amenity Modal */}
      {modalType === 'amenity' && currentSelectedRoom && (
        <AmenityModal
          room={currentSelectedRoom}
          amenityCounts={amenityCounts}
          setAmenityCounts={setAmenityCounts}
          onComplete={handleAmenityComplete}
          onCancel={() => setModalType('detail')}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={dismissToast} />}
    </div>
  )
}
