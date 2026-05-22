import * as XLSX from 'xlsx'

// ─── Room type weights ───────────────────────────────────────────────────────
// S / W (single / wide): 1.0 pt
// T  (twin):             1.2 pt
// TR (triple):           2.0 pt

const ROOM_WEIGHTS = { S: 1.0, W: 1.0, T: 1.2, TR: 2.0 }

// Floor 2 has explicit types; floors 3-7 follow a pattern
const FLOOR2_TYPES = {
  201: 'TR', 202: 'T', 203: 'W', 205: 'S', 206: 'S',
  207: 'S',  208: 'S', 210: 'S', 211: 'S',
}

function getRoomType(roomNum) {
  const n = parseInt(roomNum)
  if (FLOOR2_TYPES[n]) return FLOOR2_TYPES[n]
  const last2 = n % 100
  if ([17, 18].includes(last2)) return 'T'
  if ([1, 2, 16, 19].includes(last2)) return 'W'
  return 'S'
}

export function getRoomWeight(roomNum) {
  return ROOM_WEIGHTS[getRoomType(roomNum)] ?? 1.0
}

// ─── Cleaning type determination ─────────────────────────────────────────────
// 泊数フィールド: "現在の泊目/総泊数" (e.g. 3/6 = 3rd night of 6-night stay)
//   current == total             → CO清掃 (last night before checkout)
//   total > 5 AND current%3==0  → エコ清掃 (eco stay, every 3rd night)

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

// ─── Excel parser ─────────────────────────────────────────────────────────────
export function parseExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const results = []
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i]
    const roomNum = String(row[5] ?? '').trim()
    const 泊数    = String(row[3] ?? '').trim()
    if (!roomNum || !泊数 || !泊数.includes('/')) continue

    const cleaningType = determineCleaningType(泊数)
    const floor  = parseInt(roomNum[0])
    const type   = getRoomType(roomNum)
    const weight = ROOM_WEIGHTS[type] ?? 1.0

    results.push({ room: roomNum, floor: isNaN(floor) ? 0 : floor, 泊数, cleaningType, roomType: type, weight })
  }

  results.sort((a, b) => a.floor !== b.floor ? a.floor - b.floor : parseInt(a.room) - parseInt(b.room))
  return results
}

// ─── Auto-assignment (point-based) ───────────────────────────────────────────
// Each staff has a "target" in points (S=1.0, T=1.2, TR=2.0).
// Rooms are assigned in floor-ascending order for efficient routing.

export function autoAssign(allRooms, staffList) {
  const activeStaff = staffList.filter(s => s.active)
  if (activeStaff.length === 0) return {}

  const toClean = allRooms.filter(r => r.cleaningType !== null)

  // Budget (points) per staff
  const budgets = activeStaff.map(s => ({ ...s, used: 0.0, rooms: [] }))

  let staffIdx = 0
  for (const room of toClean) {
    if (staffIdx >= budgets.length) break
    const current = budgets[staffIdx]
    current.rooms.push(room)
    current.used += room.weight

    // Move to next staff when budget exceeded
    if (current.used >= current.target) staffIdx++
  }

  // Any overflow → last active staff
  const overflow = toClean.slice(budgets.reduce((s, b) => s + b.rooms.length, 0))
  if (overflow.length > 0 && budgets.length > 0) {
    const last = budgets[budgets.length - 1]
    overflow.forEach(r => { last.rooms.push(r); last.used += r.weight })
  }

  const result = {}
  budgets.forEach(b => { result[b.name] = { rooms: b.rooms, points: b.used } })
  return result
}

// ─── Assignment analysis / alerts ────────────────────────────────────────────
export function analyzeAssignment(allRooms, staffList, assignments) {
  const activeStaff = staffList.filter(s => s.active)
  const totalCapacity = activeStaff.reduce((s, st) => s + st.target, 0)
  const toClean = allRooms.filter(r => r.cleaningType !== null)
  const totalPoints = toClean.reduce((s, r) => s + r.weight, 0)

  const warnings = []

  // Rooms not assigned to anyone
  const assignedRooms = new Set(
    Object.values(assignments ?? {}).flatMap(({ rooms }) => rooms.map(r => r.room))
  )
  const unassigned = toClean.filter(r => !assignedRooms.has(r.room))

  if (unassigned.length > 0) {
    warnings.push({
      level: 'error',
      message: `${unassigned.length}室が割り当て超過のため未割り当てです（${unassigned.map(r => r.room).join('・')}）`,
    })
  }

  if (totalPoints > totalCapacity + 0.01) {
    const over = (totalPoints - totalCapacity).toFixed(1)
    warnings.push({
      level: 'warn',
      message: `清掃ポイント合計（${totalPoints.toFixed(1)}pt）がスタッフ上限合計（${totalCapacity}pt）を${over}pt超過しています`,
    })
  } else if (activeStaff.length > 0 && totalPoints < totalCapacity * 0.6) {
    warnings.push({
      level: 'info',
      message: `清掃室数がスタッフ上限の${Math.round((totalPoints / totalCapacity) * 100)}%です。出勤スタッフ数の調整を検討してください`,
    })
  }

  return warnings
}
