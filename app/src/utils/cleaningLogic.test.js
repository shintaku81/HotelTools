import { describe, it, expect } from 'vitest'
import {
  getRoomWeight,
  determineCleaningType,
  autoAssign,
  analyzeAssignment,
} from './cleaningLogic.js'

// ─────────────────────────────────────────────────────────────────────────────
// determineCleaningType — 泊数フィールド "現在/総泊数" から清掃種別を判定
//   current === total            → 'co'
//   total > 5 && current%3 === 0 → 'eco'
//   それ以外                      → null
// ─────────────────────────────────────────────────────────────────────────────
describe('determineCleaningType', () => {
  describe('正常系', () => {
    it('最終泊（current === total）は CO', () => {
      expect(determineCleaningType('1/1')).toBe('co')
      expect(determineCleaningType('5/5')).toBe('co')
      expect(determineCleaningType('6/6')).toBe('co')
      expect(determineCleaningType('9/9')).toBe('co')
    })

    it('長期滞在(>5泊)で3の倍数泊目は エコ', () => {
      expect(determineCleaningType('3/6')).toBe('eco')
      expect(determineCleaningType('6/9')).toBe('eco')
      expect(determineCleaningType('3/9')).toBe('eco')
      expect(determineCleaningType('9/12')).toBe('eco')
    })

    it('短期滞在(<=5泊)の連泊中は清掃なし(null)', () => {
      expect(determineCleaningType('3/5')).toBeNull()
      expect(determineCleaningType('2/4')).toBeNull()
      expect(determineCleaningType('1/3')).toBeNull()
    })

    it('長期滞在でも3の倍数でない泊目は清掃なし', () => {
      expect(determineCleaningType('1/6')).toBeNull()
      expect(determineCleaningType('2/6')).toBeNull()
      expect(determineCleaningType('4/9')).toBeNull()
      expect(determineCleaningType('5/9')).toBeNull()
    })
  })

  describe('意地悪 / 異常系', () => {
    it('falsy値はすべて null', () => {
      expect(determineCleaningType(null)).toBeNull()
      expect(determineCleaningType(undefined)).toBeNull()
      expect(determineCleaningType('')).toBeNull()
      expect(determineCleaningType(0)).toBeNull()
    })

    it('スラッシュ無しは null', () => {
      expect(determineCleaningType('3')).toBeNull()
      expect(determineCleaningType('abc')).toBeNull()
      expect(determineCleaningType('66')).toBeNull()
    })

    it('スラッシュが2つ以上は null', () => {
      expect(determineCleaningType('3/6/9')).toBeNull()
      expect(determineCleaningType('1/2/3/4')).toBeNull()
    })

    it('数値に変換できない部分は null', () => {
      expect(determineCleaningType('abc/def')).toBeNull()
      expect(determineCleaningType('x/6')).toBeNull()
      expect(determineCleaningType('3/y')).toBeNull()
    })

    it('総泊数0（ゼロ除算的な不正データ）は null', () => {
      expect(determineCleaningType('0/0')).toBeNull()
      expect(determineCleaningType('3/0')).toBeNull()
    })

    it('現在泊が0以下（負・ゼロ）は null', () => {
      expect(determineCleaningType('0/5')).toBeNull()
      expect(determineCleaningType('-3/6')).toBeNull()
    })

    it('小数を含む文字列は parseInt で整数化される', () => {
      // parseInt('3.9') === 3 → 3/6 はエコ
      expect(determineCleaningType('3.9/6')).toBe('eco')
    })

    it('数値型(slashを含まない)は null', () => {
      expect(determineCleaningType(36)).toBeNull()
    })

    it('境界: total=5 はエコ条件(total>5)を満たさない', () => {
      expect(determineCleaningType('3/5')).toBeNull()
    })

    it('境界: total=6 の3泊目はエコ', () => {
      expect(determineCleaningType('3/6')).toBe('eco')
    })

    it('current === total が eco条件より優先される', () => {
      // 3/3 は current===total なので co（eco条件 total>5 は満たさない）
      expect(determineCleaningType('3/3')).toBe('co')
      // 6/6 も co
      expect(determineCleaningType('6/6')).toBe('co')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getRoomWeight — 部屋番号から清掃ポイント(重み)を算出
//   S/W = 1.0, T = 1.2, TR = 2.0
// ─────────────────────────────────────────────────────────────────────────────
describe('getRoomWeight', () => {
  it('2Fの明示タイプ', () => {
    expect(getRoomWeight('201')).toBe(2.0) // TR
    expect(getRoomWeight('202')).toBe(1.2) // T
    expect(getRoomWeight('203')).toBe(1.0) // W
    expect(getRoomWeight('205')).toBe(1.0) // S
  })

  it('3F以上のパターン: 末尾17,18 は T(1.2)', () => {
    expect(getRoomWeight('317')).toBe(1.2)
    expect(getRoomWeight('418')).toBe(1.2)
    expect(getRoomWeight('717')).toBe(1.2)
  })

  it('3F以上のパターン: 末尾1,2,16,19 は W(1.0)', () => {
    expect(getRoomWeight('301')).toBe(1.0)
    expect(getRoomWeight('302')).toBe(1.0)
    expect(getRoomWeight('316')).toBe(1.0)
    expect(getRoomWeight('319')).toBe(1.0)
  })

  it('その他は S(1.0)', () => {
    expect(getRoomWeight('305')).toBe(1.0)
    expect(getRoomWeight('620')).toBe(1.0)
  })

  it('意地悪: 数値型でも文字列型でも同じ結果', () => {
    expect(getRoomWeight(317)).toBe(getRoomWeight('317'))
  })

  it('意地悪: 未知/不正な部屋番号でも 1.0 にフォールバック', () => {
    expect(getRoomWeight('')).toBe(1.0)
    expect(getRoomWeight('abc')).toBe(1.0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// autoAssign — ポイント予算ベースの自動割り当て
// ─────────────────────────────────────────────────────────────────────────────
describe('autoAssign', () => {
  const room = (num, weight, cleaningType = 'co') => ({
    room: String(num), floor: parseInt(String(num)[0]), weight, cleaningType,
  })

  it('出勤スタッフ0名なら空オブジェクト', () => {
    const rooms = [room('301', 1.0)]
    expect(autoAssign(rooms, [])).toEqual({})
    expect(autoAssign(rooms, [{ name: 'A', target: 10, active: false }])).toEqual({})
  })

  it('清掃対象(cleaningType != null)のみ割り当て対象', () => {
    const rooms = [
      room('301', 1.0, 'co'),
      room('302', 1.0, null), // ステイ → 対象外
      room('303', 1.0, 'eco'),
    ]
    const staff = [{ name: 'A', target: null, active: true }]
    const result = autoAssign(rooms, staff)
    expect(result['A'].rooms).toHaveLength(2)
    expect(result['A'].rooms.map(r => r.room)).toEqual(['301', '303'])
  })

  it('上限(target)に達したら次のスタッフへ', () => {
    const rooms = [
      room('301', 1.0), room('302', 1.0),
      room('303', 1.0), room('304', 1.0),
    ]
    const staff = [
      { name: 'A', target: 2, active: true },
      { name: 'B', target: 2, active: true },
    ]
    const result = autoAssign(rooms, staff)
    expect(result['A'].rooms.map(r => r.room)).toEqual(['301', '302'])
    expect(result['B'].rooms.map(r => r.room)).toEqual(['303', '304'])
  })

  it('target=null(無制限)のスタッフは全室を吸収', () => {
    const rooms = Array.from({ length: 30 }, (_, i) => room(301 + i, 1.0))
    const staff = [{ name: 'A', target: null, active: true }]
    const result = autoAssign(rooms, staff)
    expect(result['A'].rooms).toHaveLength(30)
    expect(result['A'].points).toBeCloseTo(30)
  })

  it('全員が上限ありで超過した分は最後のスタッフが吸収', () => {
    const rooms = [
      room('301', 1.0), room('302', 1.0),
      room('303', 1.0), room('304', 1.0), room('305', 1.0),
    ]
    const staff = [
      { name: 'A', target: 2, active: true },
      { name: 'B', target: 2, active: true },
    ]
    const result = autoAssign(rooms, staff)
    // 全5室が割り当てられ、誰も取りこぼさない
    const total = result['A'].rooms.length + result['B'].rooms.length
    expect(total).toBe(5)
    // 最後の B が超過分を吸収
    expect(result['B'].rooms.length).toBeGreaterThanOrEqual(2)
  })

  it('ポイントは重みの合計', () => {
    const rooms = [room('201', 2.0), room('202', 1.2), room('205', 1.0)]
    const staff = [{ name: 'A', target: null, active: true }]
    const result = autoAssign(rooms, staff)
    expect(result['A'].points).toBeCloseTo(4.2)
  })

  it('意地悪: 清掃対象が0室なら各スタッフ空配列', () => {
    const rooms = [room('301', 1.0, null), room('302', 1.0, null)]
    const staff = [{ name: 'A', target: 10, active: true }]
    const result = autoAssign(rooms, staff)
    expect(result['A'].rooms).toHaveLength(0)
    expect(result['A'].points).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// analyzeAssignment — 割り当て結果の警告生成
// ─────────────────────────────────────────────────────────────────────────────
describe('analyzeAssignment', () => {
  const room = (num, weight, cleaningType = 'co') => ({
    room: String(num), floor: parseInt(String(num)[0]), weight, cleaningType,
  })

  it('未割り当ての部屋があれば error 警告', () => {
    const rooms = [room('301', 1.0), room('302', 1.0)]
    const staff = [{ name: 'A', target: null, active: true }]
    const assignments = { A: { rooms: [rooms[0]], points: 1.0 } }
    const warnings = analyzeAssignment(rooms, staff, assignments)
    const err = warnings.find(w => w.level === 'error')
    expect(err).toBeTruthy()
    expect(err.message).toContain('302')
  })

  it('全室割り当て済みなら error 警告は出ない', () => {
    const rooms = [room('301', 1.0), room('302', 1.0)]
    const staff = [{ name: 'A', target: null, active: true }]
    const assignments = { A: { rooms: [rooms[0], rooms[1]], points: 2.0 } }
    const warnings = analyzeAssignment(rooms, staff, assignments)
    expect(warnings.find(w => w.level === 'error')).toBeFalsy()
  })

  it('上限合計を超過したら warn（全員上限ありの場合のみ）', () => {
    const rooms = [room('301', 1.0), room('302', 1.0), room('303', 1.0)]
    const staff = [{ name: 'A', target: 1, active: true }]
    const assignments = { A: { rooms, points: 3.0 } }
    const warnings = analyzeAssignment(rooms, staff, assignments)
    expect(warnings.find(w => w.level === 'warn')).toBeTruthy()
  })

  it('無制限スタッフが1人でもいれば容量警告は出さない', () => {
    const rooms = Array.from({ length: 50 }, (_, i) => room(301 + i, 1.0))
    const staff = [
      { name: 'A', target: 1, active: true },
      { name: 'B', target: null, active: true },
    ]
    const assignments = { A: { rooms: rooms.slice(0, 1), points: 1 }, B: { rooms: rooms.slice(1), points: 49 } }
    const warnings = analyzeAssignment(rooms, staff, assignments)
    expect(warnings.find(w => w.level === 'warn')).toBeFalsy()
  })

  it('清掃室数が少なすぎる(<60%)と info 警告', () => {
    const rooms = [room('301', 1.0)]
    const staff = [{ name: 'A', target: 10, active: true }]
    const assignments = { A: { rooms, points: 1.0 } }
    const warnings = analyzeAssignment(rooms, staff, assignments)
    expect(warnings.find(w => w.level === 'info')).toBeTruthy()
  })

  it('意地悪: assignments未指定(undefined)でも落ちない', () => {
    const rooms = [room('301', 1.0)]
    const staff = [{ name: 'A', target: null, active: true }]
    expect(() => analyzeAssignment(rooms, staff, undefined)).not.toThrow()
    const warnings = analyzeAssignment(rooms, staff, undefined)
    // 全室未割り当て扱い
    expect(warnings.find(w => w.level === 'error')).toBeTruthy()
  })

  it('意地悪: 清掃対象0室・スタッフありでも例外を投げない', () => {
    expect(() => analyzeAssignment([], [{ name: 'A', target: 10, active: true }], {})).not.toThrow()
  })
})
