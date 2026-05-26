import { useState } from 'react'
import { useRooms } from '../hooks/useRooms.js'

const FLOORS = [2, 3, 4, 5, 6, 7]

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

// ─── Room card (checkout view) ─────────────────────────────────────────────────

function CheckoutRoomCard({ room, onClick }) {
  const isPending = room.status === 'checkout_pending'
  const isDone    = room.status === 'checkout'
  const isEco     = room.cleaning_type === 'eco'

  if (isPending) {
    return (
      <button
        onClick={() => onClick(room)}
        className={`
          h-[54px] w-full flex flex-col items-center justify-center gap-0.5
          rounded border-2 touch-manipulation select-none
          active:scale-95 transition-transform duration-100
          ${isEco
            ? 'bg-emerald-50 border-emerald-400'
            : 'bg-violet-50 border-violet-400'}
        `}
      >
        <span className={`text-xs font-bold leading-none ${isEco ? 'text-emerald-700' : 'text-violet-700'}`}>
          {room.room_number}
        </span>
        {isEco
          ? <span className="text-[9px] px-1 py-px rounded bg-emerald-100 text-emerald-700 font-bold leading-none">エコ</span>
          : <span className="text-[9px] text-violet-500 leading-none">CO待ち</span>
        }
        {room.assigned_staff && (
          <span className="text-[8px] text-slate-400 leading-none truncate max-w-full px-0.5">
            {room.assigned_staff}
          </span>
        )}
      </button>
    )
  }

  if (isDone) {
    return (
      <div className={`
        h-[54px] w-full flex flex-col items-center justify-center gap-0.5
        rounded border-2 opacity-50
        ${isEco ? 'bg-emerald-50 border-emerald-300' : 'bg-blue-50 border-blue-300'}
      `}>
        <span className={`text-xs font-bold leading-none ${isEco ? 'text-emerald-600' : 'text-blue-600'}`}>
          {room.room_number}
        </span>
        <span className={`text-[9px] font-bold leading-none ${isEco ? 'text-emerald-500' : 'text-blue-500'}`}>
          ✓ {isEco ? 'エコ' : 'CO'}
        </span>
        <span className="text-[8px] text-slate-400 leading-none">{fmtTime(room.checkout_at)}</span>
      </div>
    )
  }

  // stay / available / other — show dimly for context
  return (
    <div className="h-[54px] w-full flex flex-col items-center justify-center rounded border border-slate-200 bg-slate-50 opacity-30">
      <span className="text-[10px] text-slate-400">{room.room_number}</span>
    </div>
  )
}

// ─── Confirmation bottom sheet ─────────────────────────────────────────────────

function ConfirmSheet({ room, onConfirm, onClose, loading }) {
  if (!room) return null
  const isEco = room.cleaning_type === 'eco'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-sm px-6 pb-8 pt-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-2xl font-bold text-slate-900">{room.room_number}号室</span>
          <span className="text-sm text-slate-400">{room.room_type}</span>
          {isEco && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">エコ</span>
          )}
        </div>
        {room.assigned_staff && (
          <p className="text-xs text-slate-400 mb-4">担当: {room.assigned_staff}</p>
        )}
        {!room.assigned_staff && <div className="mb-4" />}

        <div className="space-y-2.5">
          {isEco ? (
            <button
              onClick={() => onConfirm(room, 'eco')}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm active:bg-emerald-700 disabled:opacity-60 touch-manipulation"
            >
              {loading ? '処理中...' : '外出確認（エコ清掃へ）'}
            </button>
          ) : (
            <>
              <button
                onClick={() => onConfirm(room, 'co')}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm active:bg-red-700 disabled:opacity-60 touch-manipulation"
              >
                {loading ? '処理中...' : 'CO退室確認（CO清掃へ）'}
              </button>
              <button
                onClick={() => onConfirm(room, 'eco')}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-sm active:bg-emerald-100 disabled:opacity-60 touch-manipulation"
              >
                エコ清掃に変更して確認
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm active:bg-slate-200 touch-manipulation"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Floor tab ─────────────────────────────────────────────────────────────────

function FloorTabs({ activeFloor, onChange, rooms }) {
  return (
    <div className="bg-white border-b border-slate-200 flex overflow-x-auto">
      <button
        onClick={() => onChange('all')}
        className={`flex-shrink-0 px-4 py-3 text-sm font-semibold touch-manipulation
          ${activeFloor === 'all' ? 'border-b-2 border-slate-700 text-slate-900' : 'text-slate-500 active:bg-slate-50'}`}
      >
        全体
      </button>
      {FLOORS.map(f => {
        const pending = rooms.filter(r => r.floor === f && r.status === 'checkout_pending').length
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold touch-manipulation
              ${activeFloor === f ? 'border-b-2 border-slate-700 text-slate-900' : 'text-slate-500 active:bg-slate-50'}`}
          >
            {f}F
            {pending > 0 && (
              <span className="ml-1 text-violet-600 font-bold text-xs">({pending})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Checkout({ onBack }) {
  const { rooms, loading, updateRoom } = useRooms()
  const [activeFloor, setActiveFloor]   = useState('all')
  const [selected, setSelected]         = useState(null)
  const [processing, setProcessing]     = useState(false)

  const allCo  = rooms.filter(r => ['checkout_pending','checkout'].includes(r.status) && r.cleaning_type !== 'eco')
  const allEco = rooms.filter(r => ['checkout_pending','checkout'].includes(r.status) && r.cleaning_type === 'eco')
  const doneCo  = allCo.filter(r => r.status === 'checkout').length
  const doneEco = allEco.filter(r => r.status === 'checkout').length
  const totalPending = rooms.filter(r => r.status === 'checkout_pending').length

  // rooms to show in grid — co/eco pending + done, plus context (stay/available dimmed)
  const displayStatuses = new Set(['checkout_pending', 'checkout', 'stay', 'available'])
  const displayRooms = rooms.filter(r => displayStatuses.has(r.status))

  const floorRooms = activeFloor === 'all'
    ? displayRooms
    : displayRooms.filter(r => r.floor === activeFloor)

  const byFloor = {}
  floorRooms.forEach(r => {
    if (!byFloor[r.floor]) byFloor[r.floor] = []
    byFloor[r.floor].push(r)
  })
  const floorKeys = Object.keys(byFloor).map(Number).sort((a, b) => a - b)

  async function handleConfirm(room, type) {
    setProcessing(true)
    await updateRoom(room.id, {
      status: 'checkout',
      cleaning_type: type,
      checkout_at: new Date().toISOString(),
    })
    setProcessing(false)
    setSelected(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation"
          >‹</button>
          <div className="flex-1">
            <p className="text-xs text-slate-400">フロント業務</p>
            <p className="text-sm font-bold text-slate-900">チェックアウト管理</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">未確認</p>
            <p className="text-lg font-bold text-violet-700">
              {totalPending}<span className="text-xs font-normal text-slate-400">室</span>
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-4 pb-3">
          <div className="flex-1 bg-blue-50 rounded-xl px-3 py-2 text-center">
            <p className="text-base font-bold text-blue-700 leading-none">
              {doneCo}
              <span className="text-xs font-normal text-blue-400"> / {allCo.length}室</span>
            </p>
            <p className="text-[11px] text-blue-500 mt-0.5">CO退室確認</p>
          </div>
          <div className="flex-1 bg-emerald-50 rounded-xl px-3 py-2 text-center">
            <p className="text-base font-bold text-emerald-700 leading-none">
              {doneEco}
              <span className="text-xs font-normal text-emerald-400"> / {allEco.length}室</span>
            </p>
            <p className="text-[11px] text-emerald-500 mt-0.5">エコ外出確認</p>
          </div>
          {totalPending === 0 && (
            <div className="flex-1 bg-green-50 rounded-xl px-3 py-2 text-center flex items-center justify-center">
              <p className="text-sm font-bold text-green-700">全室完了 ✓</p>
            </div>
          )}
        </div>
      </header>

      {/* Floor tabs */}
      <FloorTabs activeFloor={activeFloor} onChange={setActiveFloor} rooms={rooms} />

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 overflow-x-auto bg-white border-b border-slate-100">
        <span className="flex items-center gap-1 text-xs text-violet-600 whitespace-nowrap">
          <span className="inline-block w-3 h-3 rounded border-2 border-violet-400 bg-violet-50" /> CO待ち
        </span>
        <span className="flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap">
          <span className="inline-block w-3 h-3 rounded border-2 border-emerald-400 bg-emerald-50" /> エコ待ち
        </span>
        <span className="flex items-center gap-1 text-xs text-blue-500 whitespace-nowrap">
          <span className="inline-block w-3 h-3 rounded border-2 border-blue-300 bg-blue-50 opacity-50" /> 確認済み
        </span>
      </div>

      {/* Room grids */}
      <div className="flex-1 overflow-y-auto pb-10">
        {floorKeys.map(floor => {
          const flRooms = byFloor[floor].sort((a, b) => Number(a.room_number) - Number(b.room_number))
          const pendingCount = flRooms.filter(r => r.status === 'checkout_pending').length
          return (
            <div key={floor} className="mb-2">
              <div className="px-4 py-1.5 bg-slate-200/70 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">{floor}F</span>
                {pendingCount > 0 && (
                  <span className="text-xs text-violet-600 font-semibold">{pendingCount}室未確認</span>
                )}
              </div>
              <div className="bg-white px-3 py-2">
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1">
                  {flRooms.map(room => (
                    <CheckoutRoomCard
                      key={room.id}
                      room={room}
                      onClick={r => r.status === 'checkout_pending' && setSelected(r)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirmation sheet */}
      {selected && (
        <ConfirmSheet
          room={selected}
          onConfirm={handleConfirm}
          onClose={() => setSelected(null)}
          loading={processing}
        />
      )}
    </div>
  )
}
