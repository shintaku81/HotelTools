import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadHotels, saveHotels, getHotel, slugifyId,
  addHotel, updateHotel, removeHotel,
  getActiveHotelId, setActiveHotelId, getActiveHotel, hotelSummaries,
} from './hotelRegistry.js'

beforeEach(() => localStorage.clear())

const tinyHotel = (name = '新ホテル') => ({
  name,
  floors: [{ floor: 1, rooms: [101, 102] }],
})

describe('hotelRegistry — 初期化', () => {
  it('空のとき既定ホテル(北見)でシードされる', () => {
    const hotels = loadHotels()
    expect(hotels).toHaveLength(1)
    expect(hotels[0].id).toBe('paco-jr-kitami')
  })

  it('意地悪: 壊れたJSONでもシードにフォールバック', () => {
    localStorage.setItem('hotel_registry', '###壊れ')
    expect(loadHotels()[0].id).toBe('paco-jr-kitami')
  })

  it('意地悪: 空配列が保存されていてもシードに戻す', () => {
    localStorage.setItem('hotel_registry', '[]')
    expect(loadHotels()).toHaveLength(1)
  })
})

describe('hotelRegistry — 追加/更新/削除', () => {
  it('addHotel で2件目を追加（idは自動生成）', () => {
    const { error, hotels, id } = addHotel(tinyHotel('札幌'))
    expect(error).toBeNull()
    expect(hotels).toHaveLength(2)
    expect(id).toBeTruthy()
    expect(getHotel(id).name).toBe('札幌')
  })

  it('意地悪: 同一IDの重複追加はエラー', () => {
    addHotel({ id: 'dup', ...tinyHotel() })
    const { error } = addHotel({ id: 'dup', ...tinyHotel() })
    expect(error).toBeTruthy()
  })

  it('updateHotel で名称変更（idは固定）', () => {
    const { id } = addHotel(tinyHotel('旧名'))
    updateHotel(id, { name: '新名', id: 'hack' })
    expect(getHotel(id).name).toBe('新名')
    expect(getHotel('hack')).toBeNull()
  })

  it('removeHotel で削除できる', () => {
    const { id } = addHotel(tinyHotel('消す'))
    const { error, hotels } = removeHotel(id)
    expect(error).toBeNull()
    expect(hotels.some(h => h.id === id)).toBe(false)
  })

  it('意地悪: 最後の1件は削除できない', () => {
    const { error } = removeHotel('paco-jr-kitami')
    expect(error).toBeTruthy()
    expect(loadHotels()).toHaveLength(1)
  })

  it('アクティブホテル削除時はアクティブが別ホテルに移る', () => {
    const { id } = addHotel(tinyHotel('一時'))
    setActiveHotelId(id)
    expect(getActiveHotelId()).toBe(id)
    removeHotel(id)
    expect(getActiveHotelId()).toBe('paco-jr-kitami')
  })
})

describe('hotelRegistry — slugifyId', () => {
  it('英数字から slug を作る', () => {
    expect(slugifyId('Paco Sapporo')).toBe('paco-sapporo')
  })
  it('重複時は連番を付与', () => {
    expect(slugifyId('A', ['a'])).toBe('a-2')
    expect(slugifyId('A', ['a', 'a-2'])).toBe('a-3')
  })
  it('意地悪: 記号のみ/空文字は hotel にフォールバック', () => {
    expect(slugifyId('!!!')).toBe('hotel')
    expect(slugifyId('')).toBe('hotel')
  })
})

describe('hotelRegistry — アクティブ/サマリ', () => {
  it('既定のアクティブは先頭ホテル', () => {
    expect(getActiveHotelId()).toBe('paco-jr-kitami')
    expect(getActiveHotel().id).toBe('paco-jr-kitami')
  })

  it('意地悪: 存在しないIDをアクティブ指定しても先頭にフォールバック', () => {
    setActiveHotelId('nonexistent')
    expect(getActiveHotelId()).toBe('paco-jr-kitami')
  })

  it('hotelSummaries が室数/フロアを集計', () => {
    addHotel(tinyHotel('小館'))
    const sums = hotelSummaries()
    const paco = sums.find(s => s.id === 'paco-jr-kitami')
    const small = sums.find(s => s.name === '小館')
    expect(paco.rooms).toBe(99)
    expect(small.rooms).toBe(2)
    expect(small.floorCount).toBe(1)
  })
})
