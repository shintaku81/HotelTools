// Default staff configuration – stored in localStorage as 'hotel_staff_config'
export const DEFAULT_STAFF = [
  { name: 'ゆうき', target: 11, active: true },
  { name: '戸田',   target: 10, active: true },
  { name: '森山',   target: 10, active: true },
]

export function loadStaff() {
  try {
    const saved = localStorage.getItem('hotel_staff_config')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_STAFF.map(s => ({ ...s }))
}

export function saveStaff(staffList) {
  localStorage.setItem('hotel_staff_config', JSON.stringify(staffList))
}
