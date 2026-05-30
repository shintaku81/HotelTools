import * as XLSX from 'xlsx'
import { DEFAULT_HOTEL, DEFAULT_CLEANING_RULES, getRoomTypeFromHotel, getRoomWeightFromHotel } from '../config/hotels.js'

// ─── Room type / weight ──────────────────────────────────────────────────────
// 部屋タイプ・清掃ポイントはホテル設定(config/hotels.js)から導出する。
// 既定ホテル(パコジュニア北見)を使う後方互換ラッパーを公開。
//   S / W = 1.0 pt, T = 1.2 pt, TR = 2.0 pt

function getRoomType(roomNum, hotel = DEFAULT_HOTEL) {
  return getRoomTypeFromHotel(hotel, roomNum)
}

export function getRoomWeight(roomNum, hotel = DEFAULT_HOTEL) {
  return getRoomWeightFromHotel(hotel, roomNum)
}

// ─── Cleaning type determination ─────────────────────────────────────────────
// 泊数フィールド: "現在の泊目/総泊数" (e.g. 3/6 = 3rd night of 6-night stay)
//   current == total                         → CO清掃 (last night before checkout)
//   total > ecoMinTotalNights AND
//   current % ecoEveryNights == 0            → エコ清掃 (long-stay periodic)
// ルールはホテルごとに可変（既定は total>5 かつ current%3==0）。

export function determineCleaningType(泊数, rules = DEFAULT_CLEANING_RULES) {
  if (!泊数 || !String(泊数).includes('/')) return null
  const parts = String(泊数).split('/')
  if (parts.length !== 2) return null
  const current = parseInt(parts[0])
  const total   = parseInt(parts[1])
  if (isNaN(current) || isNaN(total) || total === 0 || current <= 0) return null

  const { ecoMinTotalNights, ecoEveryNights } = rules ?? DEFAULT_CLEANING_RULES
  if (current === total) return 'co'
  if (total > ecoMinTotalNights && current % ecoEveryNights === 0) return 'eco'
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
    const weight = getRoomWeight(roomNum)

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
  const budgets = activeStaff.map(s => ({ ...s, used: 0.0, rooms: [] }))

  let staffIdx = 0
  for (const room of toClean) {
    if (staffIdx >= budgets.length) break
    const current = budgets[staffIdx]
    current.rooms.push(room)
    current.used += room.weight

    // null target = unlimited; only advance when limit is set and exceeded
    if (current.target !== null && current.used >= current.target) staffIdx++
  }

  // Overflow beyond all limited staff → last staff absorbs (only relevant when all have limits)
  const totalAssigned = budgets.reduce((s, b) => s + b.rooms.length, 0)
  const overflow = toClean.slice(totalAssigned)
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
  const hasUnlimited = activeStaff.some(s => s.target === null)
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
      message: `${unassigned.length}室が未割り当てです（${unassigned.map(r => r.room).join('・')}）`,
    })
  }

  // Capacity warnings only apply when all active staff have limits
  if (!hasUnlimited) {
    const totalCapacity = activeStaff.reduce((s, st) => s + st.target, 0)
    if (totalPoints > totalCapacity + 0.01) {
      const over = (totalPoints - totalCapacity).toFixed(1)
      warnings.push({
        level: 'warn',
        message: `清掃ポイント合計（${totalPoints.toFixed(1)}pt）がスタッフ上限合計（${totalCapacity}pt）を${over}pt超過しています`,
      })
    } else if (activeStaff.length > 0 && totalCapacity > 0 && totalPoints < totalCapacity * 0.6) {
      warnings.push({
        level: 'info',
        message: `清掃室数がスタッフ上限の${Math.round((totalPoints / totalCapacity) * 100)}%です。出勤スタッフ数の調整を検討してください`,
      })
    }
  }

  return warnings
}
