import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_STAFF, loadStaff, saveStaff } from './staff.js'

beforeEach(() => localStorage.clear())

describe('staff config', () => {
  it('保存が無ければデフォルトスタッフを返す（コピー）', () => {
    const list = loadStaff()
    expect(list).toHaveLength(DEFAULT_STAFF.length)
    // ミューテーション防止: 返り値を変えてもDEFAULTは不変
    list[0].name = 'CHANGED'
    expect(DEFAULT_STAFF[0].name).not.toBe('CHANGED')
  })

  it('saveStaff → loadStaff で往復', () => {
    const custom = [{ name: '田中', target: 8, active: true, retired: false }]
    saveStaff(custom)
    const loaded = loadStaff()
    expect(loaded.find(s => s.name === '田中')).toMatchObject({ target: 8, active: true })
  })

  it('保存済みに無い新規デフォルトスタッフは active=false で追記される', () => {
    // 結城だけ保存 → 残りのデフォルトが追記される
    saveStaff([{ name: '結城', target: 11, active: true, retired: false }])
    const loaded = loadStaff()
    expect(loaded.length).toBe(DEFAULT_STAFF.length)
    const appended = loaded.find(s => s.name === '戸田')
    expect(appended.active).toBe(false)
  })

  it('古い保存データに retired フィールドが無くても補完される', () => {
    saveStaff([{ name: '結城', target: 11, active: true }]) // retired欠落
    const loaded = loadStaff()
    expect(loaded.find(s => s.name === '結城')).toHaveProperty('retired')
  })

  it('意地悪: 壊れたJSONはデフォルトにフォールバック', () => {
    localStorage.setItem('hotel_staff_config', '{壊れ')
    expect(loadStaff()).toHaveLength(DEFAULT_STAFF.length)
  })

  it('DEFAULT_STAFF の target は数値か null のみ', () => {
    DEFAULT_STAFF.forEach(s => {
      expect(s.target === null || typeof s.target === 'number').toBe(true)
    })
  })

  it('重複なくスタッフ名が一意である', () => {
    const names = DEFAULT_STAFF.map(s => s.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
