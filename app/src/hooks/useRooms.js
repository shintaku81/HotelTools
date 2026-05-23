import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadRoomOverrides } from '../utils/roomMasterStorage.js'

// occupancy = default number of guests per room type (drives amenity defaults)
export const ROOM_TYPE_CONFIG = {
  S:  { label: 'S',  weight: 1.0,  occupancy: 1, description: 'シングル' },
  SD: { label: 'SD', weight: 1.0,  occupancy: 2, description: 'セミダブル' },
  W:  { label: 'W',  weight: 1.0,  occupancy: 2, description: 'ダブル/ワイド' },
  T:  { label: 'T',  weight: 1.2,  occupancy: 2, description: 'ツイン' },
  TR: { label: 'TR', weight: 2.0,  occupancy: 3, description: 'トリプル' },
}

export const AMENITY_ITEMS = [
  { key: 'bath_towel',  label: 'バスタオル',     defaultCo: 1, defaultEco: 0 },
  { key: 'face_towel',  label: 'フェイスタオル',  defaultCo: 1, defaultEco: 0 },
  { key: 'wash_cloth',  label: 'ウォッシュタオル', defaultCo: 1, defaultEco: 0 },
  { key: 'bath_mat',    label: 'バスマット',      defaultCo: 1, defaultEco: 0 },
  { key: 'amenity_set', label: 'アメニティセット', defaultCo: 1, defaultEco: 0 },
  { key: 'shampoo',     label: 'シャンプー',      defaultCo: 1, defaultEco: 1 },
  { key: 'body_soap',   label: 'ボディソープ',    defaultCo: 1, defaultEco: 1 },
  { key: 'tissue',      label: 'ティッシュ',      defaultCo: 1, defaultEco: 0 },
]

// ─── Fallback: in-memory room data (used when Supabase env vars are not set) ───

function getStdRoomType(num) {
  const s = num % 100
  if ([1, 2, 16, 19].includes(s)) return 'W'
  if ([17, 18].includes(s)) return 'T'
  return 'S'
}

const FLOOR_ROOMS = {
  2: [[201, 'TR'], [202, 'T'], [203, 'W'], [205, 'S'], [206, 'S'], [207, 'S'], [208, 'S'], [210, 'S'], [211, 'S']],
  3: [301, 302, 303, 305, 306, 307, 308, 310, 311, 312, 314, 315, 316, 317, 318, 319, 320, 321],
  4: [401, 402, 403, 405, 406, 407, 408, 410, 411, 412, 414, 415, 416, 417, 418, 419, 420, 421],
  5: [501, 502, 503, 505, 506, 507, 508, 510, 511, 512, 514, 515, 516, 517, 518, 519, 520, 521],
  6: [601, 602, 603, 605, 606, 607, 608, 610, 611, 612, 614, 615, 616, 617, 618, 619, 620, 621],
  7: [701, 702, 703, 705, 706, 707, 708, 710, 711, 712, 714, 715, 716, 717, 718, 719, 720, 721],
}

function buildRoom(floor, num, type, extra = {}) {
  return {
    id: String(num), floor, room_number: String(num), room_type: type,
    status: 'stay', cleaning_type: null, assigned_staff: null,
    checkout_at: null, cleaning_start_at: null, cleaned_at: null,
    amenities: null, dnd: false, updated_at: new Date().toISOString(), updated_by: null,
    ...extra,
  }
}

function applyOverrides(rooms) {
  const overrides = loadRoomOverrides()
  if (Object.keys(overrides).length === 0) return rooms
  return rooms.map(r => overrides[r.room_number]
    ? { ...r, room_type: overrides[r.room_number] }
    : r
  )
}

function generateFallbackRooms() {
  const ago = (m) => new Date(Date.now() - m * 60000).toISOString()
  const rooms = []

  FLOOR_ROOMS[2].forEach(([num, type]) => rooms.push(buildRoom(2, num, type)))
  ;[3, 4, 5, 6, 7].forEach(f => {
    FLOOR_ROOMS[f].forEach(num => rooms.push(buildRoom(f, num, getStdRoomType(num))))
  })

  const demos = {
    '201': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(45) },
    '202': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(30) },
    '205': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(20) },
    '301': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(82) },
    '302': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(58) },
    '303': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(40) },
    '306': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(50) },
    '308': { status: 'cleaning', cleaning_type: 'co',  assigned_staff: '三浦', checkout_at: ago(95), cleaning_start_at: ago(22) },
    '305': { status: 'cleaned',  cleaning_type: 'co',  assigned_staff: '三浦', checkout_at: ago(110), cleaning_start_at: ago(40), cleaned_at: ago(8),
             amenities: { bath_towel: 1, face_towel: 1, wash_cloth: 1, bath_mat: 1, amenity_set: 1, shampoo: 1, body_soap: 1, tissue: 1 } },
    '307': { status: 'cleaning', cleaning_type: 'eco', assigned_staff: '高橋', checkout_at: ago(75), cleaning_start_at: ago(10) },
    '401': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(52) },
    '402': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(44) },
    '405': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(28) },
    '501': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(35) },
    '502': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(26) },
    '505': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(38) },
    '601': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(47) },
    '602': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(31) },
    '701': { status: 'checkout', cleaning_type: 'co',  checkout_at: ago(53) },
    '702': { status: 'checkout', cleaning_type: 'eco', checkout_at: ago(29) },
  }

  return rooms.map(r => demos[r.room_number] ? { ...r, ...demos[r.room_number] } : r)
}

// ─── Supabase hook ──────────────────────────────────────────────────────────────

const USE_SUPABASE = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Merge rooms master + status rows into a single flat object
function mergeRoomData(roomsRows, statusRows) {
  const statusMap = Object.fromEntries(statusRows.map(s => [s.id, s]))
  return roomsRows.map(r => ({
    ...r,
    ...(statusMap[r.id] || {}),
    room_type: r.room_type,  // keep master room_type
  }))
}

export function useRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!USE_SUPABASE) {
      setRooms(applyOverrides(generateFallbackRooms()))
      setLoading(false)
      return
    }

    let subscription

    async function loadRooms() {
      const [{ data: roomsData, error: e1 }, { data: statusData, error: e2 }] = await Promise.all([
        supabase.from('rooms').select('*').order('floor').order('room_number'),
        supabase.from('room_status').select('*'),
      ])

      if (e1 || e2) {
        console.error('Supabase load error:', e1 || e2)
        setRooms(generateFallbackRooms())
        setLoading(false)
        return
      }

      setRooms(applyOverrides(mergeRoomData(roomsData, statusData)))
      setLoading(false)
    }

    loadRooms()

    // Real-time updates for room_status changes
    subscription = supabase
      .channel('room_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_status' },
        (payload) => {
          setRooms(prev => prev.map(r =>
            r.id === payload.new.id
              ? { ...r, ...payload.new, room_type: r.room_type }
              : r
          ))
        }
      )
      .subscribe()

    return () => { subscription?.unsubscribe() }
  }, [])

  const updateRoom = useCallback(async (id, updates) => {
    const now = new Date().toISOString()

    if (!USE_SUPABASE) {
      setRooms(prev => prev.map(r =>
        r.id === id ? { ...r, ...updates, updated_at: now } : r
      ))
      return { error: null }
    }

    const { error } = await supabase
      .from('room_status')
      .update({ ...updates, updated_at: now })
      .eq('id', id)

    if (error) {
      console.error('Supabase update error:', error)
      return { error }
    }

    // Optimistic update (realtime will also fire)
    setRooms(prev => prev.map(r =>
      r.id === id ? { ...r, ...updates, updated_at: now } : r
    ))

    return { error: null }
  }, [])

  return { rooms, loading, updateRoom }
}
