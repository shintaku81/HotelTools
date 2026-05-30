import { useState } from 'react'
import {
  loadHotels, addHotel, updateHotel, removeHotel, hotelSummaries,
} from '../config/hotelRegistry.js'
import { defaultTypeRule } from '../config/hotels.js'

// ─── スーパーアドミン（マグロボ） ────────────────────────────────────────────────
// ベンダー横断でホテルを管理する画面。ホテルの追加/リネーム/削除と
// 全ホテルの構成サマリ（横断ダッシュボード）を表示する。

// クイック追加: フロア番号と室数から部屋を自動生成（番号は floor*100+1..、タイプはパターン）
function buildFloorsFromQuick(rows) {
  return rows
    .filter(r => Number(r.floor) > 0 && Number(r.count) > 0)
    .map(r => {
      const floor = Number(r.floor)
      const count = Number(r.count)
      const rooms = Array.from({ length: count }, (_, i) => {
        const number = floor * 100 + (i + 1)
        return { number, type: defaultTypeRule(number) }
      })
      return { floor, rooms }
    })
}

function HotelCard({ summary, onRename, onDelete, canDelete }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-900">{summary.name}</p>
          <p className="text-xs text-slate-400 font-mono">{summary.id}</p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 whitespace-nowrap">
          {summary.rooms}室 / {summary.floorCount}フロア
        </span>
      </div>
      <div className="text-xs text-slate-500">
        フロア: {summary.floors.join('・')}
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onRename(summary)}
          className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold active:bg-slate-200 touch-manipulation"
        >
          名称変更
        </button>
        <button
          onClick={() => onDelete(summary)}
          disabled={!canDelete}
          className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold active:bg-red-100 touch-manipulation border border-red-200 disabled:opacity-40"
        >
          削除
        </button>
      </div>
    </div>
  )
}

export default function SuperAdmin({ onLogout }) {
  const [hotels, setHotels] = useState(loadHotels)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [rows, setRows] = useState([{ floor: '', count: '' }])
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const summaries = hotelSummaries()

  function refresh() { setHotels(loadHotels()) }
  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2000) }

  function resetForm() {
    setName(''); setRows([{ floor: '', count: '' }]); setError(''); setShowAdd(false)
  }

  function handleAdd() {
    if (!name.trim()) { setError('ホテル名を入力してください'); return }
    const floors = buildFloorsFromQuick(rows)
    if (floors.length === 0) { setError('フロアと室数を1つ以上入力してください'); return }
    const { error: e } = addHotel({ name: name.trim(), floors, cleaningRules: { ecoMinTotalNights: 5, ecoEveryNights: 3 } })
    if (e) { setError(e); return }
    refresh(); resetForm(); flash(`${name.trim()} を追加しました`)
  }

  function handleRename(summary) {
    const next = window.prompt('新しいホテル名', summary.name)
    if (next == null || !next.trim()) return
    updateHotel(summary.id, { name: next.trim() })
    refresh(); flash('名称を変更しました')
  }

  function handleDelete(summary) {
    if (!window.confirm(`「${summary.name}」を削除します。よろしいですか？`)) return
    const { error: e } = removeHotel(summary.id)
    if (e) { flash(e); return }
    refresh(); flash('削除しました')
  }

  function updateRow(i, key, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }
  function addRow() { setRows(prev => [...prev, { floor: '', count: '' }]) }
  function removeRow(i) { setRows(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev) }

  const totalRooms = summaries.reduce((s, h) => s + h.rooms, 0)

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-violet-900 text-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-violet-300">マグロボ スーパーアドミン</p>
            <h1 className="text-lg font-bold">ホテル管理コンソール</h1>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold active:bg-white/20 touch-manipulation"
            >
              ログアウト
            </button>
          )}
        </div>
      </header>

      {/* Cross-hotel summary */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-violet-700">{summaries.length}</div>
          <div className="text-xs text-slate-500">登録ホテル</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-violet-700">{totalRooms}</div>
          <div className="text-xs text-slate-500">総客室数</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-violet-700">
            {summaries.reduce((s, h) => s + h.floorCount, 0)}
          </div>
          <div className="text-xs text-slate-500">総フロア数</div>
        </div>
      </div>

      {/* Hotel list */}
      <div className="flex-1 px-4 pb-24">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-600">登録ホテル一覧</h2>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold active:bg-violet-700 touch-manipulation"
          >
            {showAdd ? '閉じる' : '＋ ホテル追加'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-xl border border-violet-200 p-4 mb-3 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">ホテル名</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="例: ホテルパコ 札幌"
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">フロア構成（フロア番号 / 室数）</label>
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="number" min="1" value={r.floor}
                      onChange={e => updateRow(i, 'floor', e.target.value)}
                      placeholder="F" aria-label={`フロア${i + 1}の階数`}
                      className="w-16 border-2 border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-violet-400"
                    />
                    <span className="text-slate-400 text-sm">F ×</span>
                    <input
                      type="number" min="1" value={r.count}
                      onChange={e => updateRow(i, 'count', e.target.value)}
                      placeholder="室数" aria-label={`フロア${i + 1}の室数`}
                      className="w-20 border-2 border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-violet-400"
                    />
                    <span className="text-slate-400 text-sm">室</span>
                    <button
                      onClick={() => removeRow(i)}
                      aria-label={`フロア${i + 1}を削除`}
                      className="ml-auto text-slate-400 text-sm px-2 active:text-red-500 touch-manipulation"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addRow}
                className="mt-2 text-xs text-violet-600 font-semibold active:text-violet-800"
              >
                ＋ フロアを追加
              </button>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={handleAdd}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm active:bg-violet-700 touch-manipulation"
            >
              このホテルを登録
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map(s => (
            <HotelCard
              key={s.id}
              summary={s}
              onRename={handleRename}
              onDelete={handleDelete}
              canDelete={summaries.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
