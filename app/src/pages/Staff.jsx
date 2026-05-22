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
    setEditTarget(String(staffList[idx].target))
  }

  function commitEdit() {
    if (!editName.trim()) { setEditIdx(null); return }
    setStaffList(prev => prev.map((s, i) =>
      i === editIdx ? { ...s, name: editName.trim(), target: Math.max(1, parseInt(editTarget) || 10) } : s
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
    setStaffList(prev => [...prev, { name: newName.trim(), target: Math.max(1, parseInt(newTarget) || 10), active: true }])
    setNewName('')
    setNewTarget('11')
    setShowAdd(false)
  }

  function resetToDefault() {
    setStaffList(DEFAULT_STAFF.map(s => ({ ...s })))
  }

  const activeCount = staffList.filter(s => s.active).length
  const totalTarget = staffList.filter(s => s.active).reduce((sum, s) => sum + s.target, 0)

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
              <div className="text-2xl font-bold text-slate-800">{totalTarget}</div>
              <div className="text-xs text-slate-500">合計担当室数</div>
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
                max="20"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                className="w-16 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-indigo-400"
              />
              <span className="text-xs text-slate-500">室</span>
              <button onClick={addStaff} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold touch-manipulation">追加</button>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {staffList.map((staff, idx) => (
              <div key={idx} className={`flex items-center px-4 py-3 gap-3 ${!staff.active ? 'opacity-50' : ''}`}>

                {editIdx === idx ? (
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
                      max="20"
                      value={editTarget}
                      onChange={e => setEditTarget(e.target.value)}
                      className="w-14 border border-blue-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">室</span>
                    <button onClick={commitEdit} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold touch-manipulation">OK</button>
                  </>
                ) : (
                  <>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer touch-manipulation
                        ${staff.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                      onClick={() => toggleActive(idx)}
                    >
                      {staff.active ? '✓' : '—'}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-800">{staff.name}</span>
                    <span className="text-sm font-bold text-indigo-700">{staff.target}室</span>
                    <button
                      onClick={() => startEdit(idx)}
                      className="text-xs text-slate-400 px-2 py-1 rounded-lg active:bg-slate-100 touch-manipulation"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => removeStaff(idx)}
                      className="text-slate-300 text-base px-1 active:text-red-500 touch-manipulation"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700">
            <span className="font-bold">※ 出勤ON/OFF</span>は各スタッフ名の左のアイコンをタップ。
            清掃計画の割り当て時に出勤中のスタッフのみ対象になります。
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
