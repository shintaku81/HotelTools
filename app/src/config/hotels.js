// ─── マルチホテル設定 ──────────────────────────────────────────────────────────
// ホテルごとに部屋数・フロア構成・部屋タイプが異なる。各ホテルを「設定オブジェクト」
// として表現し、部屋データ生成・タイプ解決・フロア一覧をすべてここから導出する。
// 既存のホテルパコジュニア北見(6F・99室)を PACO_JR_KITAMI として完全再現する
// （後方互換: 既存テストが一切壊れないことを受け入れ条件とする）。
//
// 詳細設計は /SPEC_MULTIHOTEL.md を参照。

// ─── 部屋タイプ定義（全ホテル共通デフォルト） ───────────────────────────────────
// occupancy = タイプ別の標準人数（アメニティ既定数のスケールに使う）
export const ROOM_TYPE_CONFIG = {
  S:  { label: 'S',  weight: 1.0, occupancy: 1, description: 'シングル' },
  SD: { label: 'SD', weight: 1.0, occupancy: 2, description: 'セミダブル' },
  W:  { label: 'W',  weight: 1.0, occupancy: 2, description: 'ダブル/ワイド' },
  T:  { label: 'T',  weight: 1.2, occupancy: 2, description: 'ツイン' },
  TR: { label: 'TR', weight: 2.0, occupancy: 3, description: 'トリプル' },
}

// ─── アメニティ品目（全ホテル共通デフォルト） ─────────────────────────────────
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

// ─── 清掃ルールの既定値 ────────────────────────────────────────────────────────
// エコ清掃: 総泊数 > ecoMinTotalNights かつ 現在泊が ecoEveryNights の倍数
export const DEFAULT_CLEANING_RULES = { ecoMinTotalNights: 5, ecoEveryNights: 3 }

// ─── 既定タイプ規則（部屋がタイプを明示しない場合のパターン） ───────────────────
// 末尾17,18 → T(ツイン) / 末尾1,2,16,19 → W(ワイド) / その他 → S(シングル)
export function defaultTypeRule(roomNumber) {
  const s = parseInt(roomNumber) % 100
  if ([17, 18].includes(s)) return 'T'
  if ([1, 2, 16, 19].includes(s)) return 'W'
  return 'S'
}

// ─── ホテル: パコジュニア北見（既定ホテル / 現行99室を再現） ──────────────────────
// floors[].rooms[] は数値(タイプはパターン解決)か {number,type}(明示)のどちらでも可。
export const PACO_JR_KITAMI = {
  id: 'paco-jr-kitami',
  name: 'ホテルパコジュニア 北見',
  shortName: '北見',
  floors: [
    { floor: 2, rooms: [
      { number: 201, type: 'TR' }, { number: 202, type: 'T' }, { number: 203, type: 'W' },
      { number: 205, type: 'S' },  { number: 206, type: 'S' }, { number: 207, type: 'S' },
      { number: 208, type: 'S' },  { number: 210, type: 'S' }, { number: 211, type: 'S' },
    ] },
    { floor: 3, rooms: [301, 302, 303, 305, 306, 307, 308, 310, 311, 312, 314, 315, 316, 317, 318, 319, 320, 321] },
    { floor: 4, rooms: [401, 402, 403, 405, 406, 407, 408, 410, 411, 412, 414, 415, 416, 417, 418, 419, 420, 421] },
    { floor: 5, rooms: [501, 502, 503, 505, 506, 507, 508, 510, 511, 512, 514, 515, 516, 517, 518, 519, 520, 521] },
    { floor: 6, rooms: [601, 602, 603, 605, 606, 607, 608, 610, 611, 612, 614, 615, 616, 617, 618, 619, 620, 621] },
    { floor: 7, rooms: [701, 702, 703, 705, 706, 707, 708, 710, 711, 712, 714, 715, 716, 717, 718, 719, 720, 721] },
  ],
  cleaningRules: { ...DEFAULT_CLEANING_RULES },
}

// 既定（アクティブ）ホテル。マルチホテルのレジストリ導入までは常にこれ。
export const DEFAULT_HOTEL = PACO_JR_KITAMI

// ─── 派生ヘルパー（設定駆動） ───────────────────────────────────────────────────

function roomNumberOf(r) { return typeof r === 'object' ? r.number : r }
function roomTypeOf(r) {
  if (typeof r === 'object' && r.type) return r.type
  return defaultTypeRule(roomNumberOf(r))
}

// ホテル設定の部屋番号→タイプ。未登録番号はパターンでフォールバック（Excel取込の未知室対応）。
export function getRoomTypeFromHotel(hotel, roomNumber) {
  const n = parseInt(roomNumber)
  for (const f of hotel.floors) {
    for (const r of f.rooms) {
      if (roomNumberOf(r) === n) return roomTypeOf(r)
    }
  }
  return defaultTypeRule(n)
}

// タイプ→清掃ポイント（ホテルが roomTypes を上書きしていれば考慮）
export function getRoomWeightFromHotel(hotel, roomNumber) {
  const type = getRoomTypeFromHotel(hotel, roomNumber)
  const cfg = (hotel.roomTypes ?? ROOM_TYPE_CONFIG)[type] ?? ROOM_TYPE_CONFIG[type]
  return cfg?.weight ?? 1.0
}

// ホテル設定から平坦な部屋リスト [{ floor, number(string), type }] を生成
export function buildRoomsFromHotel(hotel) {
  const out = []
  for (const f of hotel.floors) {
    for (const r of f.rooms) {
      out.push({ floor: f.floor, number: String(roomNumberOf(r)), type: roomTypeOf(r) })
    }
  }
  return out
}

// フロア番号一覧（昇順）
export function floorsOf(hotel) {
  return hotel.floors.map(f => f.floor)
}

// 総室数
export function roomCountOf(hotel) {
  return hotel.floors.reduce((s, f) => s + f.rooms.length, 0)
}
