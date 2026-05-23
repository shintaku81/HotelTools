import { useState } from 'react'
import { loadStaff, saveStaff, DEFAULT_STAFF } from '../config/staff.js'

export default function Staff({ onBack }) {
  const [staffList, setStaffList] = useState(() => loadStaff())
  const [editIdx, setEditIdx] = useState(null)
  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('11')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    saveStaff(staffList)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function startEdit(idx) {
    setEditIdx(idx)
    setEditName(staffList[idx].name)
    setEditTarget(staffList[idx].target === null ? '' : String(staffList[idx].target))
  }

  function commitEdit() {
    if (!editName.trim()) { setEditIdx(null); return }
    const trimmed = editTarget.trim()
    const t = trimmed === '' ? null : Math.max(1, parseInt(trimmed) || 1)
    setStaffList(prev => prev.map((s, i) =>
      i === editIdx ? { ...s, name: editName.trim(), target: t } : s
    ))
    setEditIdx(null)
  }

  function toggleActive(idx) {
    setStaffList(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s))
  }

  function removeStaff(idx) {
    setStaffList(prev => prev.filter((_, i) => i !== idx))
  }

  function addStaff() {
    if (!newName.trim()) return
    const trimmed = newTarget.trim()
    const t = trimmed === '' ? null : Math.max(1, parseInt(trimmed) || 1)
    setStaffList(prev => [...prev, { name: newName.trim(), target: t, active: true, retired: false }])
    setNewName('')
    setNewTarget('')
    setShowAdd(false)
  }

  function retireStaff(idx) {
    setStaffList(prev => prev.map((s, i) => i === idx ? { ...s, retired: true, active: false } : s))
  }

  function unretireStaff(idx) {
    setStaffList(prev => prev.map((s, i) => i === idx ? { ...s, retired: false } : s))
  }

  function resetToDefault() {
    setStaffList(DEFAULT_STAFF.map(s => ({ ...s })))
  }

  const activeStaff  = staffList.filter(s => !s.retired)
  const retiredStaff = staffList.filter(s => s.retired)
  const activeCount  = activeStaff.filter(s => s.active).length
  const limitedStaff = activeStaff.filter(s => s.active && s.target !== null)
  const totalTarget  = limitedStaff.reduce((sum, s) => sum + s.target, 0)

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3 px-4 py-3 shadow-sm">
        <button onClick={onBack} className="text-slate-500 text-lg font-bold px-1 active:opacity-60 touch-manipulation">‹</button>
        <div className="flex-1">
          <p className="text-xs text-slate-400">管理</p>
          <p className="text-sm font-bold text-slate-900">スタッフ設定</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation transition-colors
            ${saved ? 'bg-green-500 text-white' : 'bg-slate-700 text-white active:bg-slate-800'}`}
        >
          {saved ? '保存済み ✓' : '保存'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex gap-4 text-center">
            <div className="flex-1">
              <div className="text-2xl font-bold text-slate-800">{activeCount}</div>
              <div className="text-xs text-slate-500">出勤予定</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-slate-800">
                {limitedStaff.length > 0 ? totalTarget : '∞'}
              </div>
              <div className="text-xs text-slate-500">上限合計 (pt)</div>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">スタッフ一覧</h2>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-lg font-bold touch-manipulation"
            >
              ＋ 追加
            </button>
          </div>

          {showAdd && (
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex gap-2 items-center">
              <input
                type="text"
                placeholder="名前"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                value={newTarget}
                placeholder="∞"
                onChange={e => setNewTarget(e.target.value)}
                className="w-16 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-indigo-400 placeholder:text-slate-400"
              />
              <span className="text-xs text-slate-500">pt</span>
              <button onClick={addStaff} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold touch-manipulation">追加</button>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {activeStaff.map((staff, idx) => {
              const realIdx = staffList.indexOf(staff)
              return (
                <div key={realIdx} className={`flex items-center px-4 py-3 gap-3 ${!staff.active ? 'opacity-50' : ''}`}>
                  {editIdx === realIdx ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="99"
                        value={editTarget}
                        placeholder="∞"
                        onChange={e => setEditTarget(e.target.value)}
                        className="w-16 border border-blue-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none placeholder:text-slate-400"
                      />
                      <span className="text-xs text-slate-500">pt</span>
                      <button onClick={commitEdit} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold touch-manipulation">OK</button>
                    </>
                  ) : (
                    <>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer touch-manipulation
                          ${staff.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                        onClick={() => toggleActive(realIdx)}
                      >
                        {staff.active ? '✓' : '—'}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-slate-800">{staff.name}</span>
                      <span className="text-sm font-bold text-indigo-700">
                        {staff.target === null ? '∞' : `${staff.target}pt`}
                      </span>
                      <button
                        onClick={() => startEdit(realIdx)}
                        className="text-xs text-slate-400 px-2 py-1 rounded-lg active:bg-slate-100 touch-manipulation"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => retireStaff(realIdx)}
                        className="text-xs text-amber-600 px-2 py-1 rounded-lg border border-amber-200 active:bg-amber-50 touch-manipulation"
                        title="無効化（退職）"
                      >
                        無効化
                      </button>
                      <button
                        onClick={() => removeStaff(realIdx)}
                        className="text-slate-300 text-base px-1 active:text-red-500 touch-manipulation"
                        title="完全削除"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Retired staff */}
        {retiredStaff.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">退職済みスタッフ</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {retiredStaff.map((staff) => {
                const realIdx = staffList.indexOf(staff)
                return (
                  <div key={realIdx} className="flex items-center px-4 py-3 gap-3 opacity-50">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">休</span>
                    <span className="flex-1 text-sm text-slate-500 line-through">{staff.name}</span>
                    <button
                      onClick={() => unretireStaff(realIdx)}
                      className="text-xs text-indigo-600 px-2 py-1 rounded-lg border border-indigo-200 active:bg-indigo-50 touch-manipulation"
                    >
                      復帰
                    </button>
                    <button
                      onClick={() => removeStaff(realIdx)}
                      className="text-slate-300 text-base px-1 active:text-red-500 touch-manipulation"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700">
            <span className="font-bold">※ 出勤ON/OFF</span>は各スタッフ名の左のアイコンをタップ。
            上限ptは空欄にすると無制限（∞）。無効化すると履歴に残したまま非表示になります。
          </p>
        </div>

        <button
          onClick={resetToDefault}
          className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-500 text-sm font-medium active:bg-slate-100 touch-manipulation"
        >
          デフォルトに戻す
        </button>
      </div>
    </div>
  )
}
