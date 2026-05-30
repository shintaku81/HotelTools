// ─── ホテルレジストリ ──────────────────────────────────────────────────────────
// スーパーアドミン（マグロボ）が管理する全ホテルの設定を localStorage に保持する。
// MVP段階では localStorage ベース。将来 Supabase の hotels テーブルへ移行する
// （SPEC_MULTIHOTEL.md §3 参照）。

import { PACO_JR_KITAMI, roomCountOf, floorsOf } from './hotels.js'

const REGISTRY_KEY = 'hotel_registry'
const ACTIVE_KEY = 'hotel_active_id'

// レジストリが空のときの初期データ（既定ホテル＝北見）
function seed() {
  return [structuredCloneSafe(PACO_JR_KITAMI)]
}

// structuredClone はテスト環境差異があるため安全な簡易ディープコピー
function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function loadHotels() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (!raw) {
      const seeded = seed()
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return seed()
    return parsed
  } catch {
    return seed()
  }
}

export function saveHotels(hotels) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(hotels))
}

export function getHotel(id) {
  return loadHotels().find(h => h.id === id) ?? null
}

// 一意なIDを生成（name から slug、衝突時は連番）
export function slugifyId(name, existingIds = []) {
  const base = String(name ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'hotel'
  if (!existingIds.includes(base)) return base
  let i = 2
  while (existingIds.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}

// ホテルを追加。idが無ければ name から自動生成。重複idはエラー返却。
export function addHotel(hotel) {
  const hotels = loadHotels()
  const id = hotel.id || slugifyId(hotel.name, hotels.map(h => h.id))
  if (hotels.some(h => h.id === id)) {
    return { error: 'ホテルIDが重複しています', hotels }
  }
  const next = [...hotels, { ...hotel, id }]
  saveHotels(next)
  return { error: null, hotels: next, id }
}

export function updateHotel(id, patch) {
  const hotels = loadHotels()
  const idx = hotels.findIndex(h => h.id === id)
  if (idx === -1) return { error: 'ホテルが見つかりません', hotels }
  const next = [...hotels]
  next[idx] = { ...next[idx], ...patch, id } // idは固定
  saveHotels(next)
  return { error: null, hotels: next }
}

// ホテル削除。最後の1件は削除不可（最低1ホテルを保証）。
export function removeHotel(id) {
  const hotels = loadHotels()
  if (hotels.length <= 1) return { error: '最後のホテルは削除できません', hotels }
  const next = hotels.filter(h => h.id !== id)
  saveHotels(next)
  if (getActiveHotelId() === id) setActiveHotelId(next[0].id)
  return { error: null, hotels: next }
}

export function getActiveHotelId() {
  const saved = localStorage.getItem(ACTIVE_KEY)
  const hotels = loadHotels()
  if (saved && hotels.some(h => h.id === saved)) return saved
  return hotels[0]?.id ?? null
}

export function setActiveHotelId(id) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function getActiveHotel() {
  return getHotel(getActiveHotelId()) ?? loadHotels()[0]
}

// 横断ダッシュボード用の構造サマリ
export function hotelSummaries() {
  return loadHotels().map(h => ({
    id: h.id,
    name: h.name,
    rooms: roomCountOf(h),
    floors: floorsOf(h),
    floorCount: floorsOf(h).length,
  }))
}
