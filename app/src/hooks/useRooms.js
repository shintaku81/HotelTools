import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadRoomOverrides } from '../utils/roomMasterStorage.js'
import { DEFAULT_HOTEL, ROOM_TYPE_CONFIG, AMENITY_ITEMS, buildRoomsFromHotel } from '../config/hotels.js'

// 部屋タイプ定義・アメニティ品目はホテル設定(config/hotels.js)を正本とし、
// 後方互換のため従来どおり useRooms から re-export する。
export { ROOM_TYPE_CONFIG, AMENITY_ITEMS }

// ─── Fallback: in-memory room data (used when Supabase env vars are not set) ───

function buildRoom(floor, num, type, extra = {}) {
  return {
    id: String(num), floor, room_number: String(num), room_type: type,
    status: 'checkout_pending', cleaning_type: null, assigned_staff: null,
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

  // 部屋の正本はホテル設定から生成（マルチホテル対応）
  const rooms = buildRoomsFromHotel(DEFAULT_HOTEL)
    .map(r => buildRoom(r.floor, r.number, r.type))

  // 2026/05/23 清掃勤務表（新）に基づくデモ状態
  const demos = {}

  // CO（チェックアウト予定）: 担当スタッフ込み
  const coRooms = {
    // 2F — 結城
    '202': '結城', '203': '結城', '205': '結城', '206': '結城',
    '207': '結城', '208': '結城', '210': '結城',
    // 3F — 鹿又・結城
    '302': '鹿又', '305': '鹿又', '307': '鹿又', '308': '鹿又',
    '310': '鹿又', '311': '鹿又', '312': '鹿又', '314': '鹿又',
    '315': '鹿又', '316': '鹿又', '317': '鹿又',
    '318': '結城', '319': '結城', '320': '結城', '321': '結城',
    // 4F — 三浦・小松
    '401': '三浦', '402': '三浦', '405': '三浦', '406': '三浦',
    '407': '三浦', '408': '三浦', '410': '三浦', '411': '三浦',
    '412': '三浦', '417': '三浦',
    '414': '小松', '418': '小松', '420': '小松', '421': '小松',
    // 5F — 小松・貞廣
    '501': '小松', '502': '小松', '503': '小松', '505': '小松',
    '506': '小松', '507': '小松',
    '508': '貞廣', '510': '貞廣', '511': '貞廣', '512': '貞廣',
    '514': '貞廣', '515': '貞廣', '516': '貞廣', '517': '貞廣',
    '518': '貞廣', '520': '貞廣',
    // 6F — 貞廣・高橋
    '605': '貞廣', '607': '高橋', '611': '高橋',
    // 7F — 高橋
    '703': '高橋', '708': '高橋', '720': '高橋',
  }

  // エコ（連泊・エコ清掃予定）: 清掃種別のみ事前確定
  const ecoRooms = [
    '201', '211',
    '301', '303', '306',
    '415', '416',
    '519', '521',
    '601', '602', '603', '606', '608', '612', '614', '615', '616', '617', '618', '619', '620',
    '701', '705', '707', '710', '711', '712', '714', '715', '718', '721',
  ]

  // ステイ（連泊・清掃なし）
  const stayRooms = ['419', '610', '621', '702', '706', '716', '719']

  // 空室
  const emptyRooms = ['717']

  Object.entries(coRooms).forEach(([n, staff]) => {
    demos[n] = { status: 'checkout_pending', cleaning_type: null, assigned_staff: staff }
  })
  ecoRooms.forEach(n => {
    demos[n] = { status: 'checkout_pending', cleaning_type: 'eco' }
  })
  stayRooms.forEach(n => {
    demos[n] = { status: 'stay', cleaning_type: null }
  })
  emptyRooms.forEach(n => {
    demos[n] = { status: 'available', cleaning_type: null }
  })

  // 朝8時台に早退済み → 既に清掃待ち（フロントが登録済みのサンプル）
  const earlyOut = { '202': ago(70), '305': ago(55), '501': ago(80) }
  Object.entries(earlyOut).forEach(([n, t]) => {
    demos[n] = { ...demos[n], status: 'checkout', checkout_at: t, cleaning_type: 'co' }
  })

  // 清掃中サンプル
  demos['403'] = {
    status: 'cleaning', cleaning_type: 'co', assigned_staff: '三浦',
    checkout_at: ago(100), cleaning_start_at: ago(22),
  }

  // 清掃完了（確認待ち）サンプル
  demos['407'] = {
    status: 'cleaned', cleaning_type: 'co', assigned_staff: '三浦',
    checkout_at: ago(130), cleaning_start_at: ago(55), cleaned_at: ago(12),
    amenities: { bath_towel: 1, face_towel: 1, wash_cloth: 1, bath_mat: 1, amenity_set: 1, shampoo: 1, body_soap: 1, tissue: 1 },
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

    setRooms(prev => prev.map(r =>
      r.id === id ? { ...r, ...updates, updated_at: now } : r
    ))

    return { error: null }
  }, [])

  // 全室を清掃待ち（CO）状態にリセット — 管理者が日次初期化に使用
  const resetAllRooms = useCallback(async () => {
    const now = new Date().toISOString()
    const resetData = {
      status: 'checkout_pending',
      cleaning_type: null,
      assigned_staff: null,
      cleaning_start_at: null,
      cleaned_at: null,
      amenities: null,
      checkout_at: null,
      updated_at: now,
    }

    if (!USE_SUPABASE) {
      setRooms(prev => prev.map(r => ({ ...r, ...resetData })))
      return { error: null }
    }

    const ids = rooms.map(r => r.id)
    const { error } = await supabase
      .from('room_status')
      .update(resetData)
      .in('id', ids)

    if (error) {
      console.error('Supabase reset error:', error)
      return { error }
    }

    setRooms(prev => prev.map(r => ({ ...r, ...resetData })))
    return { error: null }
  }, [rooms])

  // assignments: [{id: '201', staff: '田中'}, ...]
  const bulkAssignRooms = useCallback(async (assignments) => {
    const now = new Date().toISOString()

    if (!USE_SUPABASE) {
      setRooms(prev => prev.map(r => {
        const a = assignments.find(x => x.id === r.id)
        return a ? { ...r, assigned_staff: a.staff, updated_at: now } : r
      }))
      return { error: null }
    }

    // Supabase: group by staff for efficient batch updates
    const byStaff = {}
    assignments.forEach(a => {
      if (!byStaff[a.staff]) byStaff[a.staff] = []
      byStaff[a.staff].push(a.id)
    })
    for (const [staff, ids] of Object.entries(byStaff)) {
      const { error } = await supabase
        .from('room_status')
        .update({ assigned_staff: staff, updated_at: now })
        .in('id', ids)
      if (error) return { error }
    }

    setRooms(prev => prev.map(r => {
      const a = assignments.find(x => x.id === r.id)
      return a ? { ...r, assigned_staff: a.staff, updated_at: now } : r
    }))
    return { error: null }
  }, [])

  return { rooms, loading, updateRoom, resetAllRooms, bulkAssignRooms }
}
