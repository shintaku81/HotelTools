import { useState } from 'react'
import { useRooms } from '../hooks/useRooms.js'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function groupByFloor(rooms) {
  const g = {}
  rooms.forEach(r => {
    if (!g[r.floor]) g[r.floor] = []
    g[r.floor].push(r)
  })
  return g
}

export default function Checkout({ onBack }) {
  const { rooms, loading, updateRoom } = useRooms()
  const [processing, setProcessing] = useState(null)

  const pending = rooms
    .filter(r => r.status === 'checkout_pending')
    .sort((a, b) => Number(a.room_number) - Number(b.room_number))

  const done = rooms
    .filter(r => r.status === 'checkout')
    .sort((a, b) => Number(a.room_number) - Number(b.room_number))

  const allCo  = rooms.filter(r => ['checkout_pending', 'checkout'].includes(r.status) && r.cleaning_type !== 'eco')
  const allEco = rooms.filter(r => ['checkout_pending', 'checkout'].includes(r.status) && r.cleaning_type === 'eco')
  const doneCo  = allCo.filter(r => r.status === 'checkout').length
  const doneEco = allEco.filter(r => r.status === 'checkout').length

  async function confirm(room, type) {
    if (processing) return
    setProcessing(room.id)
    await updateRoom(room.id, {
      status: 'checkout',
      cleaning_type: type,
      checkout_at: new Date().toISOString(),
    })
    setProcessing(null)
  }

  const pendingByFloor = groupByFloor(pending)
  const floors = Object.keys(pendingByFloor).map(Number).sort((a, b) => a - b)

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
            <p className="text-lg font-bold text-slate-800">{pending.length}<span className="text-xs font-normal text-slate-400">室</span></p>
          </div>
        </div>

        {/* Progress counters */}
        <div className="flex gap-3 px-4 pb-3">
          <div className="flex-1 bg-blue-50 rounded-xl px-3 py-2 text-center">
            <p className="text-base font-bold text-blue-700 leading-none">
              {doneCo}
              <span className="text-xs font-normal text-blue-400"> / {allCo.length}室</span>
            </p>
            <p className="text-xs text-blue-500 mt-0.5">CO退室確認</p>
          </div>
          <div className="flex-1 bg-emerald-50 rounded-xl px-3 py-2 text-center">
            <p className="text-base font-bold text-emerald-700 leading-none">
              {doneEco}
              <span className="text-xs font-normal text-emerald-400"> / {allEco.length}室</span>
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">エコ外出確認</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-10">

        {/* ─── Pending ─── */}
        {pending.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-slate-700 font-bold text-base">全室確認完了</p>
            <p className="text-slate-400 text-sm mt-1">すべての退室・外出を確認しました</p>
          </div>
        ) : (
          <>
            <div className="px-4 pt-4 pb-1">
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                未確認 — {pending.length}室
              </p>
            </div>

            {floors.map(floor => (
              <div key={floor} className="mb-1">
                <div className="px-4 py-1.5 bg-slate-200/70">
                  <p className="text-xs font-bold text-slate-600">{floor}F</p>
                </div>
                <div className="bg-white divide-y divide-slate-100">
                  {pendingByFloor[floor].map(room => {
                    const isEco = room.cleaning_type === 'eco'
                    const busy  = processing === room.id
                    return (
                      <div key={room.id} className="flex items-center px-4 py-3 gap-3">
                        {/* Room info */}
                        <div className="w-14 shrink-0">
                          <p className="text-base font-bold text-slate-900 leading-none">{room.room_number}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{room.room_type}</p>
                        </div>

                        {/* Type badge */}
                        {isEco ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">エコ</span>
                        ) : (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">CO</span>
                        )}

                        {/* Assigned staff */}
                        <span className="flex-1 text-xs text-slate-400 truncate">
                          {room.assigned_staff ? `担:${room.assigned_staff}` : ''}
                        </span>

                        {/* Action */}
                        {busy ? (
                          <span className="text-xs text-slate-300 px-4">…</span>
                        ) : isEco ? (
                          <button
                            onClick={() => confirm(room, 'eco')}
                            className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold touch-manipulation active:bg-emerald-700"
                          >
                            外出確認
                          </button>
                        ) : (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => confirm(room, 'eco')}
                              className="px-2.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold touch-manipulation active:bg-emerald-100"
                            >
                              エコ
                            </button>
                            <button
                              onClick={() => confirm(room, 'co')}
                              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold touch-manipulation active:bg-blue-700"
                            >
                              退室確認
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ─── Done ─── */}
        {done.length > 0 && (
          <>
            <div className="px-4 pt-5 pb-1">
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                確認済み — {done.length}室
              </p>
            </div>
            <div className="bg-white divide-y divide-slate-100">
              {done.map(room => {
                const isEco = room.cleaning_type === 'eco'
                return (
                  <div key={room.id} className="flex items-center px-4 py-2.5 gap-3 opacity-55">
                    <div className="w-14 shrink-0">
                      <p className="text-sm font-bold text-slate-600 leading-none">{room.room_number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{room.room_type}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold
                      ${isEco ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isEco ? 'エコ' : 'CO'}
                    </span>
                    <span className="flex-1 text-xs text-slate-400 truncate">
                      {room.assigned_staff || ''}
                    </span>
                    <span className="text-xs text-slate-400">
                      ✓ {fmtTime(room.checkout_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
