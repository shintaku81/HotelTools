const STORAGE_KEY = 'hotel_staff_config'

// target: number = point limit, null = no limit
// active: working today
// retired: left the hotel (hidden from daily picker but kept for history)
export const DEFAULT_STAFF = [
  { name: '結城',   target: 11,   active: true,  retired: false },
  { name: '戸田',   target: 10,   active: true,  retired: false },
  { name: '森山',   target: 10,   active: true,  retired: false },
  { name: '三浦',   target: null, active: false, retired: false },
  { name: '佐々木', target: null, active: false, retired: false },
  { name: '北川',   target: null, active: false, retired: false },
  { name: '福田',   target: null, active: false, retired: false },
  { name: '高橋',   target: null, active: false, retired: false },
  { name: '小松',   target: null, active: false, retired: false },
  { name: '貞廣',   target: null, active: false, retired: false },
  { name: '守山',   target: null, active: false, retired: false },
  { name: '鹿又',   target: null, active: false, retired: false },
]

export function loadStaff() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_STAFF.map(s => ({ ...s }))
    const savedList = JSON.parse(saved)
    const savedNames = new Set(savedList.map(s => s.name))
    return [
      // Ensure retired field exists on old saved entries
      ...savedList.map(s => ({ retired: false, ...s })),
      // Append any new default staff not yet in saved list
      ...DEFAULT_STAFF.filter(s => !savedNames.has(s.name)).map(s => ({ ...s, active: false })),
    ]
  } catch {
    return DEFAULT_STAFF.map(s => ({ ...s }))
  }
}

export function saveStaff(staffList) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList))
}
