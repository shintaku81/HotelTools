import { describe, it, expect } from 'vitest'
import {
  PACO_JR_KITAMI, DEFAULT_HOTEL, ROOM_TYPE_CONFIG,
  defaultTypeRule, getRoomTypeFromHotel, getRoomWeightFromHotel,
  buildRoomsFromHotel, floorsOf, roomCountOf,
} from './hotels.js'
import { determineCleaningType, getRoomWeight } from '../utils/cleaningLogic.js'

// 可変構成のテスト用ホテル（部屋数・フロア構成が北見と異なる）
const SMALL_HOTEL = {
  id: 'small-inn',
  name: '小規模イン',
  floors: [
    { floor: 1, rooms: [101, 102, 103] },              // 3室・パターン解決
    { floor: 3, rooms: [                                 // フロア飛び(2F無し)
      { number: 301, type: 'T' }, { number: 302, type: 'TR' },
    ] },
  ],
  // 独自のタイプ重みを上書き（Tを1.5に）
  roomTypes: {
    ...ROOM_TYPE_CONFIG,
    T: { label: 'T', weight: 1.5, occupancy: 2, description: 'ツイン(特別)' },
  },
  cleaningRules: { ecoMinTotalNights: 3, ecoEveryNights: 2 },
}

describe('defaultTypeRule（末尾番号パターン）', () => {
  it('末尾17,18 は T', () => {
    expect(defaultTypeRule(317)).toBe('T')
    expect(defaultTypeRule(418)).toBe('T')
  })
  it('末尾1,2,16,19 は W', () => {
    [301, 302, 316, 319].forEach(n => expect(defaultTypeRule(n)).toBe('W'))
  })
  it('その他は S', () => {
    expect(defaultTypeRule(305)).toBe('S')
    expect(defaultTypeRule(620)).toBe('S')
  })
  it('意地悪: 不正値は S にフォールバック', () => {
    expect(defaultTypeRule('abc')).toBe('S')
    expect(defaultTypeRule('')).toBe('S')
  })
})

describe('PACO_JR_KITAMI（既定ホテル）', () => {
  it('DEFAULT_HOTEL は北見', () => {
    expect(DEFAULT_HOTEL.id).toBe('paco-jr-kitami')
  })

  it('99室・6フロアを再現する', () => {
    expect(roomCountOf(PACO_JR_KITAMI)).toBe(99)
    expect(floorsOf(PACO_JR_KITAMI)).toEqual([2, 3, 4, 5, 6, 7])
  })

  it('明示タイプ(2F)とパターン(3F+)が正しく解決される', () => {
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 201)).toBe('TR')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 202)).toBe('T')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 203)).toBe('W')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 205)).toBe('S')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 317)).toBe('T')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 319)).toBe('W')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 305)).toBe('S')
  })

  it('設定に無い部屋番号はパターンでフォールバック（Excel未知室）', () => {
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 999)).toBe('S')
    expect(getRoomTypeFromHotel(PACO_JR_KITAMI, 817)).toBe('T') // 末尾17
  })

  it('重みが正しい（TR=2.0 / T=1.2 / S=1.0）', () => {
    expect(getRoomWeightFromHotel(PACO_JR_KITAMI, 201)).toBe(2.0)
    expect(getRoomWeightFromHotel(PACO_JR_KITAMI, 202)).toBe(1.2)
    expect(getRoomWeightFromHotel(PACO_JR_KITAMI, 205)).toBe(1.0)
  })

  it('buildRoomsFromHotel が {floor,number,type} の99件を返す', () => {
    const rooms = buildRoomsFromHotel(PACO_JR_KITAMI)
    expect(rooms).toHaveLength(99)
    expect(rooms[0]).toEqual({ floor: 2, number: '201', type: 'TR' })
    expect(rooms.every(r => typeof r.number === 'string')).toBe(true)
  })

  it('既存の getRoomWeight ラッパーと結果が一致（後方互換）', () => {
    ;[201, 202, 203, 205, 317, 319, 305, 999].forEach(n => {
      expect(getRoomWeight(String(n))).toBe(getRoomWeightFromHotel(PACO_JR_KITAMI, n))
    })
  })
})

describe('可変構成ホテル（部屋数・フロアが異なる）', () => {
  it('総室数とフロア一覧が設定どおり（フロア飛びも保持）', () => {
    expect(roomCountOf(SMALL_HOTEL)).toBe(5)
    expect(floorsOf(SMALL_HOTEL)).toEqual([1, 3])
  })

  it('パターン解決と明示タイプが混在しても正しい', () => {
    expect(getRoomTypeFromHotel(SMALL_HOTEL, 101)).toBe('W') // 末尾1 → W
    expect(getRoomTypeFromHotel(SMALL_HOTEL, 103)).toBe('S')
    expect(getRoomTypeFromHotel(SMALL_HOTEL, 301)).toBe('T') // 明示
    expect(getRoomTypeFromHotel(SMALL_HOTEL, 302)).toBe('TR') // 明示(末尾2でもWにならない)
  })

  it('roomTypes 上書きで重みが変わる（T=1.5）', () => {
    expect(getRoomWeightFromHotel(SMALL_HOTEL, 301)).toBe(1.5)
    expect(getRoomWeightFromHotel(SMALL_HOTEL, 302)).toBe(2.0) // TRは既定のまま
  })

  it('buildRoomsFromHotel が可変件数を返す', () => {
    const rooms = buildRoomsFromHotel(SMALL_HOTEL)
    expect(rooms).toHaveLength(5)
    expect(rooms.map(r => r.number)).toEqual(['101', '102', '103', '301', '302'])
  })
})

describe('ホテルごとに可変な清掃ルール', () => {
  it('既定ルール（total>5 && current%3==0）でエコ判定', () => {
    expect(determineCleaningType('3/6')).toBe('eco')
    expect(determineCleaningType('2/6')).toBeNull()
  })

  it('ホテル独自ルール（total>3 && current%2==0）を渡せる', () => {
    const rules = SMALL_HOTEL.cleaningRules
    expect(determineCleaningType('2/4', rules)).toBe('eco') // 4>3 && 2%2==0
    expect(determineCleaningType('2/3', rules)).toBeNull()  // 3>3 が偽
    expect(determineCleaningType('4/4', rules)).toBe('co')  // current===total優先
  })
})
