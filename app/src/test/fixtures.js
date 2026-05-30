// Shared test fixtures + helpers for component/integration tests.
// Tests run in in-memory (fallback) mode — see vite.config.js test.env.

export const USERS = {
  cleaner: { role: 'cleaner', name: '結城' },
  leader:  { role: 'leader',  name: '管理者' },
  front:   { role: 'front',   name: 'フロント' },
}

let _id = 0
// Build a single room object matching the shape produced by useRooms.
export function makeRoom(overrides = {}) {
  _id += 1
  return {
    id: String(overrides.room_number ?? `r${_id}`),
    floor: overrides.floor ?? 3,
    room_number: String(overrides.room_number ?? 301),
    room_type: overrides.room_type ?? 'S',
    status: overrides.status ?? 'checkout_pending',
    cleaning_type: overrides.cleaning_type ?? null,
    assigned_staff: overrides.assigned_staff ?? null,
    checkout_at: null,
    cleaning_start_at: null,
    cleaned_at: null,
    amenities: null,
    dnd: false,
    updated_at: new Date('2026-05-30T00:00:00Z').toISOString(),
    updated_by: null,
    ...overrides,
  }
}

// Seed localStorage with a known staff config (active workers for pickers).
export function seedStaff(list) {
  localStorage.setItem('hotel_staff_config', JSON.stringify(list ?? [
    { name: '結城', target: 11, active: true, retired: false },
    { name: '戸田', target: 10, active: true, retired: false },
    { name: '森山', target: 10, active: true, retired: false },
  ]))
}
