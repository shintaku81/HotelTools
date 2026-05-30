# マルチホテル対応 & スーパーアドミン（マグロボ）機能 — 仕様書

> 作成: 2026-05-30
> ステータス: 設計（実装はこの仕様に従って段階的に行う）
> 関連: [REQUIREMENTS.md](./REQUIREMENTS.md) / [SPEC.md](./SPEC.md)

---

## 0. 背景・ゴール

現状は **ホテルパコジュニア北見（6F・99室）専用** にハードコードされている。
これを **複数ホテルで使える清掃管理 SaaS** に拡張する。ホテルごとに
**部屋数・フロア構成・部屋タイプ・スタッフ・館名が異なる** 点を吸収する。

ベンダー「**マグロボ（Magurobo）**」が **スーパーアドミン** として全ホテルを横断管理する。

### ロール階層（拡張後）

| ロール | 範囲 | 説明 | URL |
|--------|------|------|-----|
| `superadmin`（マグロボ） | 全ホテル横断 | ホテルの追加/編集/削除・横断進捗・各館設定 | `/superadmin` |
| `leader`（リーダー/管理者） | 1ホテル | 計画・割当・承認・各種設定 | `/admin` |
| `front`（フロント） | 1ホテル | CO登録・進捗確認 | （今後） |
| `cleaner`（清掃スタッフ） | 1ホテル | 担当開始・清掃完了記録 | `/` |

---

## 1. 仕様チェック（現行ハードコード箇所の棚卸し）

マルチホテル化で「ホテル設定」に外出しすべき定数・ロジックの所在：

| # | 箇所 | 内容 | 可変性 |
|---|------|------|--------|
| 1 | `src/utils/cleaningLogic.js` `FLOOR2_TYPES` | 2Fの部屋→タイプ対応表 | **ホテル可変** |
| 2 | `src/utils/cleaningLogic.js` `getRoomType()` | 3-7Fの末尾番号パターン(17,18→T 等) | **ホテル可変** |
| 3 | `src/utils/cleaningLogic.js` `ROOM_WEIGHTS` | タイプ→清掃ポイント | 既定共通（上書き可にすると尚良） |
| 4 | `src/utils/cleaningLogic.js` `determineCleaningType()` | エコ判定 `total>5 && current%3==0` | ホテル可変（清掃ルール） |
| 5 | `src/hooks/useRooms.js` `FLOOR_ROOMS` | フロア→部屋番号一覧（99室の正本） | **ホテル可変** |
| 6 | `src/hooks/useRooms.js` `generateFallbackRooms()` | 99室生成＋デモ状態 | 部屋部分はホテル可変 |
| 7 | `src/hooks/useRooms.js` `ROOM_TYPE_CONFIG` | タイプ定義(weight/occupancy/desc) | 既定共通 |
| 8 | `src/hooks/useRooms.js` `AMENITY_ITEMS` | アメニティ品目とCO/Eco既定数 | ホテル可変（既定共通でも可） |
| 9 | `src/pages/Floors.jsx` `FLOORS=[2..7]` | フロア一覧 | **ホテル可変** |
| 10 | `src/pages/Login.jsx` / `Home.jsx` | 館名 "ホテルパコジュニア 北見" 文字列 | **ホテル可変** |
| 11 | `src/pages/Login.jsx` `CLEANER_NAMES` | スタッフ名一覧 | **ホテル可変** |
| 12 | `src/config/staff.js` `DEFAULT_STAFF` | 既定スタッフ＋上限 | **ホテル可変** |
| 13 | localStorage キー群 | `hotel_staff_config` 等が全ホテル共有 | **ホテルでスコープ必要** |
| 14 | Supabase `rooms`/`room_status` | `hotel_id` 列なし | **列追加 or テーブル分離が必要** |

### 既存仕様との不整合（要追従）

- REQUIREMENTS.md §4 のステータス遷移は `stay → checkout` だが、実装は
  migration_002 で **`checkout_pending`（CO待ち）** が追加済み。実フローは
  `checkout_pending → checkout → cleaning → cleaned → available`。
  → 本対応のついでに REQUIREMENTS を追従させる（別タスク）。

---

## 2. データモデル：ホテル設定オブジェクト

```js
// src/config/hotels.js（新規）
export const HotelConfig = {
  id: 'paco-jr-kitami',          // 一意ID（localStorage/Supabaseのスコープキー）
  name: 'ホテルパコジュニア 北見',
  shortName: '北見',
  // フロア構成：部屋の正本。部屋タイプはここで明示（パターン不要に）
  floors: [
    { floor: 2, rooms: [
      { number: '201', type: 'TR' }, { number: '202', type: 'T' },
      { number: '203', type: 'W' },  { number: '205', type: 'S' }, /* ... */
    ]},
    // 3F..7F も同様に列挙
  ],
  // 任意上書き（無ければ共通デフォルトを使用）
  roomTypes: null,        // { S:{weight,occupancy,description}, ... } 上書き可
  amenityItems: null,     // AMENITY_ITEMS 上書き可
  cleaningRules: { ecoMinTotalNights: 5, ecoEveryNights: 3 }, // エコ判定の閾値
  // 既定スタッフ（初回のみ。以後は hotelスコープのstaff設定が正本）
  staff: [
    { name: '結城', target: 11, active: true, retired: false }, /* ... */
  ],
}
```

### 派生ヘルパー（設定駆動）

```js
buildRoomsFromHotel(hotel)      // floors[] → 部屋オブジェクト配列（id/floor/room_number/room_type）
getRoomTypeFromHotel(hotel, n)  // floorsを検索。未登録番号はパターン(後方互換)でフォールバック
getRoomWeightFromHotel(hotel,n) // type→weight（roomTypes上書き考慮）
determineCleaningType(泊数, rules) // rulesを引数化（既定で現行と同値）
floorsOf(hotel)                 // [2,3,...] を設定から導出（FLOORS定数を置換）
```

> **後方互換が最優先**：`paco-jr-kitami` 設定は現行99室レイアウト・現行デモ状態を
> 完全再現する。既定 `rules` は現行の `total>5 && current%3==0` と一致させる。
> 既存のユニットテスト（cleaningLogic等）が一切壊れないことを受け入れ条件とする。

---

## 3. ストレージのホテルスコープ化

| 現行キー | 新キー（スコープ化） |
|----------|----------------------|
| `hotel_staff_config` | `h:{hotelId}:staff_config` |
| `hotel_cleaning_plans` | `h:{hotelId}:cleaning_plans` |
| `hotel_holidays` | `h:{hotelId}:holidays` |
| `hotel_room_overrides` | `h:{hotelId}:room_overrides` |
| `hotel_room_change_log` | `h:{hotelId}:room_change_log` |
| （新規）`hotel_active_id` | 現在操作中のホテルID |
| （新規）`hotel_registry` | スーパーアドミンが登録した全ホテル設定の配列 |

- フォント・ログインセッションは全ホテル共通のままでよい。
- 移行：旧キーが存在し新キーが無ければ `paco-jr-kitami` スコープへ一度だけマイグレート。

### Supabase（将来）

- `hotels(id, name, config JSONB, created_at)` テーブル追加。
- `rooms`/`room_status` に `hotel_id` 列追加（複合PK or FK）。
- RLS でホテル単位のアクセス制御（superadmin は全件）。

---

## 4. スーパーアドミン（マグロボ）機能

- 認証：`/superadmin` で `magurobo / magurobo`（暫定。将来 Supabase Auth）。
- 画面：
  1. **ホテル一覧** — 登録済みホテルのカード（館名・部屋数・本日進捗サマリ）。
  2. **ホテル追加/編集** — 館名・フロア構成（フロアと部屋を追加/編集）・既定スタッフ。
     部屋はフロアごとに「番号＋タイプ」を表で編集。CSVや一括入力補助があると尚良。
  3. **横断ダッシュボード** — 全ホテルの清掃進捗（完了/待ち/進行中）を一覧。
  4. **ホテル切替** — 任意ホテルの管理画面（leader相当）に「成り代わり」で入る。
- 影響範囲：`App.jsx` に `detectMode()` の `/superadmin` 分岐と `superadmin` ロールを追加。

---

## 5. 段階的実装計画（受け入れ条件つき）

1. **[T13] 設定駆動リファクタ**
   - `src/config/hotels.js` と派生ヘルパー追加。`paco-jr-kitami` を既定として現行を再現。
   - `useRooms`/`cleaningLogic`/`Floors.FLOORS` を設定駆動に置換（後方互換）。
   - 受け入れ：既存テスト全部グリーン＋新ヘルパーのユニットテスト追加。
2. **ストレージのスコープ化＋マイグレーション**（T13の一部 or 後続）。
3. **[T14] スーパーアドミン画面＋ロール＋ホテルレジストリ**。
   - 受け入れ：2館目（例：小規模ホテル 3F・30室）を追加して切替・進捗表示できる。
4. **REQUIREMENTS.md の追従更新**（checkout_pending・マルチホテル・ロール表）。

---

## 6. リスク・留意

- **後方互換**：現行ユーザー（北見）の挙動・データを壊さない。デフォルトホテルで吸収。
- **過剰設計回避**：まずは localStorage ベースのレジストリで MVP。Supabase 列追加は次段階。
- **テスト**：ホテル設定は純データなので、可変構成（部屋数違い）をユニットテストで網羅しやすい。
  「30室ホテル」「フロア飛び（1F無し）」「タイプ全種」などのフィクスチャを用意する。
