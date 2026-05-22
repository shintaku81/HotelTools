import * as XLSX from 'xlsx'

// ─── Cleaning type determination ────────────────────────────────────────────────
// 泊数フィールド: "現在の泊目/総泊数" (e.g. 3/6 = 3rd night of 6-night stay)
// Rules:
//   current == total             → CO清掃 (last night before checkout)
//   total > 5 AND current%3==0  → エコ清掃 (eco stay, every 3rd night)
//   otherwise                   → 清掃不要

export function determineCleaningType(泊数) {
  if (!泊数 || !String(泊数).includes('/')) return null
  const parts = String(泊数).split('/')
  if (parts.length !== 2) return null
  const current = parseInt(parts[0])
  const total   = parseInt(parts[1])
  if (isNaN(current) || isNaN(total) || total === 0) return null

  if (current === total) return 'co'
  if (total > 5 && current % 3 === 0) return 'eco'
  return null
}

// ─── Excel parser ───────────────────────────────────────────────────────────────
// Expects the "利用者検索" style XLS/XLSM export from the hotel PMS.
// Column layout (0-indexed): 0=No, 1=予約番号, 2=C/In日, 3=泊数, 4=到着, 5=部屋番号, 6=タイプ

export function parseExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const results = []
  for (let i = 3; i < rows.length; i++) {  // skip 3 header rows
    const row = rows[i]
    const roomNum = String(row[5] ?? '').trim()
    const 泊数    = String(row[3] ?? '').trim()
    if (!roomNum || !泊数 || !泊数.includes('/')) continue

    const cleaningType = determineCleaningType(泊数)
    const floor = parseInt(roomNum[0])

    results.push({
      room:         roomNum,
      floor:        isNaN(floor) ? 0 : floor,
      泊数,
      cleaningType,  // 'co' | 'eco' | null
    })
  }

  // Sort: floor asc, room number asc (for contiguous assignment)
  results.sort((a, b) => a.floor !== b.floor ? a.floor - b.floor : parseInt(a.room) - parseInt(b.room))
  return results
}

// ─── Auto-assignment ────────────────────────────────────────────────────────────
// Assigns cleaning rooms to active staff in contiguous floor blocks.
// Lower floors assigned first (better elevator efficiency).

export function autoAssign(allRooms, staffList) {
  const activeStaff = staffList.filter(s => s.active)
  if (activeStaff.length === 0) return {}

  // Only rooms that need cleaning
  const toClean = allRooms.filter(r => r.cleaningType !== null)

  // Assign contiguous blocks
  const assignments = {}
  activeStaff.forEach(s => { assignments[s.name] = [] })

  let idx = 0
  for (const staff of activeStaff) {
    const count = Math.min(staff.target, toClean.length - idx)
    for (let i = 0; i < count && idx < toClean.length; i++, idx++) {
      assignments[staff.name].push(toClean[idx])
    }
  }

  // Any overflow rooms → distribute round-robin
  while (idx < toClean.length) {
    const staff = activeStaff[idx % activeStaff.length]
    assignments[staff.name].push(toClean[idx])
    idx++
  }

  return assignments
}
