import { describe, it, expect, beforeEach } from 'vitest'
import { FONT_SIZES, loadFontSize, applyFontSize } from './fontSizeStorage.js'
import {
  savePlan, loadPlan, loadAllPlans, deletePlan, toggleHoliday, loadHolidays,
} from './planStorage.js'
import {
  loadRoomOverrides, saveRoomTypeChange, loadChangeLog,
} from './roomMasterStorage.js'

beforeEach(() => localStorage.clear())

// ─────────────────────────────────────────────────────────────────────────────
// fontSizeStorage
// ─────────────────────────────────────────────────────────────────────────────
describe('fontSizeStorage', () => {
  it('デフォルトは medium', () => {
    expect(loadFontSize()).toBe('medium')
  })

  it('applyFontSize で保存 → loadFontSize で復元', () => {
    applyFontSize('large')
    expect(loadFontSize()).toBe('large')
    expect(document.documentElement.style.fontSize).toBe(FONT_SIZES.large.px)
  })

  it('意地悪: 未知のサイズは medium の px にフォールバック（保存はされる）', () => {
    applyFontSize('gigantic')
    expect(document.documentElement.style.fontSize).toBe(FONT_SIZES.medium.px)
  })

  it('3段階(小中大)がすべて定義されている', () => {
    expect(Object.keys(FONT_SIZES)).toEqual(['small', 'medium', 'large'])
    Object.values(FONT_SIZES).forEach(s => {
      expect(s.label).toBeTruthy()
      expect(s.px).toMatch(/^\d+px$/)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// planStorage
// ─────────────────────────────────────────────────────────────────────────────
describe('planStorage', () => {
  const plan = { rooms: [{ room: '301' }], assignments: { A: { rooms: [] } }, staffList: [] }

  it('savePlan → loadPlan で往復', () => {
    savePlan('2026-05-30', plan)
    const loaded = loadPlan('2026-05-30')
    expect(loaded.rooms).toEqual(plan.rooms)
    expect(loaded.savedAt).toBeTruthy()
  })

  it('存在しない日付は null', () => {
    expect(loadPlan('1999-01-01')).toBeNull()
  })

  it('複数日付を保持できる', () => {
    savePlan('2026-05-30', plan)
    savePlan('2026-05-31', plan)
    expect(Object.keys(loadAllPlans())).toEqual(['2026-05-30', '2026-05-31'])
  })

  it('deletePlan で1件だけ削除', () => {
    savePlan('2026-05-30', plan)
    savePlan('2026-05-31', plan)
    deletePlan('2026-05-30')
    expect(loadPlan('2026-05-30')).toBeNull()
    expect(loadPlan('2026-05-31')).not.toBeNull()
  })

  it('意地悪: 壊れたJSONが入っていても loadAllPlans は {} を返す', () => {
    localStorage.setItem('hotel_cleaning_plans', '{壊れた')
    expect(loadAllPlans()).toEqual({})
  })

  it('上書き保存で最新の内容になる', () => {
    savePlan('2026-05-30', plan)
    savePlan('2026-05-30', { ...plan, rooms: [{ room: '999' }] })
    expect(loadPlan('2026-05-30').rooms[0].room).toBe('999')
  })
})

describe('planStorage: 休館日', () => {
  it('toggleHoliday で追加 → 再度で削除', () => {
    let h = toggleHoliday('2026-06-01')
    expect(h.has('2026-06-01')).toBe(true)
    h = toggleHoliday('2026-06-01')
    expect(h.has('2026-06-01')).toBe(false)
  })

  it('loadHolidays は永続化された Set を返す', () => {
    toggleHoliday('2026-06-01')
    toggleHoliday('2026-06-02')
    const h = loadHolidays()
    expect(h.has('2026-06-01')).toBe(true)
    expect(h.has('2026-06-02')).toBe(true)
    expect(h.size).toBe(2)
  })

  it('意地悪: 壊れた休館日データでも空Setにフォールバック', () => {
    localStorage.setItem('hotel_holidays', 'not-json')
    expect(loadHolidays().size).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// roomMasterStorage
// ─────────────────────────────────────────────────────────────────────────────
describe('roomMasterStorage', () => {
  it('初期状態は overrides空・ログ空', () => {
    expect(loadRoomOverrides()).toEqual({})
    expect(loadChangeLog()).toEqual([])
  })

  it('saveRoomTypeChange で override と変更ログが記録される', () => {
    saveRoomTypeChange('305', 'S', 'T', '管理者')
    expect(loadRoomOverrides()['305']).toBe('T')
    const log = loadChangeLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ roomNum: '305', oldType: 'S', newType: 'T', changedBy: '管理者' })
    expect(log[0].changedAt).toBeTruthy()
  })

  it('最新の変更がログ先頭(unshift)に来る', () => {
    saveRoomTypeChange('305', 'S', 'T', 'A')
    saveRoomTypeChange('306', 'S', 'W', 'B')
    const log = loadChangeLog()
    expect(log[0].roomNum).toBe('306')
    expect(log[1].roomNum).toBe('305')
  })

  it('数値の部屋番号も文字列キーで正規化される', () => {
    saveRoomTypeChange(305, 'S', 'T', 'A')
    expect(loadRoomOverrides()['305']).toBe('T')
  })

  it('意地悪: ログは200件で打ち切られる', () => {
    for (let i = 0; i < 210; i++) saveRoomTypeChange(300 + i, 'S', 'T', 'A')
    expect(loadChangeLog().length).toBe(200)
  })

  it('意地悪: 壊れたデータでも安全にフォールバック', () => {
    localStorage.setItem('hotel_room_overrides', '###')
    localStorage.setItem('hotel_room_change_log', '###')
    expect(loadRoomOverrides()).toEqual({})
    expect(loadChangeLog()).toEqual([])
  })
})
