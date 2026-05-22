const OVERRIDES_KEY = 'hotel_room_overrides'
const LOG_KEY       = 'hotel_room_change_log'

export function loadRoomOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') } catch { return {} }
}

export function saveRoomTypeChange(roomNum, oldType, newType, changedBy) {
  const ov = loadRoomOverrides()
  ov[String(roomNum)] = newType
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(ov))

  const log = loadChangeLog()
  log.unshift({ roomNum: String(roomNum), oldType, newType, changedBy, changedAt: new Date().toISOString() })
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)))
}

export function loadChangeLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') } catch { return [] }
}
