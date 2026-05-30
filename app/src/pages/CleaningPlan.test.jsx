// CleaningPlan.test.jsx — 翌日清掃の計画・割り当て画面 のブラックボックステスト
//
// 注意: CleaningPlan は useRooms を使わず、自前の state を持つ同期描画コンポーネント。
// Excel 取込は <input type="file"> + FileReader 経由なので、ここでは
//   1) 取込なしで到達できる UI（初期表示・日付バナー・日付切替・スタッフ設定）
//   2) planStorage の保存/読込の純粋ロジック
// に絞ってテストする。Excel パース後の割り当て表示は cleaningLogic 側の責務であり、
// FileReader のモックが必要なため本ファイルでは扱わない（実装に沿った現実的な範囲）。

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import CleaningPlan from './CleaningPlan.jsx'
import { savePlan, loadPlan, loadAllPlans, deletePlan } from '../utils/planStorage.js'

const STAFF_KEY = 'hotel_staff_config'

function renderPlan(props = {}) {
  return render(<CleaningPlan onBack={() => {}} {...props} />)
}

describe('CleaningPlan 初期表示', () => {
  it('ヘッダーと計画対象日バナーが表示される', () => {
    renderPlan()
    expect(screen.getByText('翌日清掃')).toBeInTheDocument()
    expect(screen.getByText('計画・割り当て')).toBeInTheDocument()
    expect(screen.getByText('計画対象日')).toBeInTheDocument()
  })

  it('initialDate を渡すと日付バナーにその日付が整形表示される', () => {
    // 2026-05-22 は金曜日
    renderPlan({ initialDate: '2026-05-22' })
    expect(screen.getByText('2026年5月22日（金）')).toBeInTheDocument()
    // date input にも反映される
    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toHaveValue('2026-05-22')
  })

  it('initialDate 未指定なら「翌日」が初期値になる', () => {
    // 実日付に依存するので、date input の値が today+1 であることを検証
    const expected = (() => {
      const d = new Date(); d.setDate(d.getDate() + 1)
      return d.toISOString().slice(0, 10)
    })()
    renderPlan()
    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toHaveValue(expected)
  })

  it('初期状態では取込前なのでファイル選択エリアが表示され、割り当て結果は出ない', () => {
    renderPlan()
    expect(screen.getByText('PMSの予約一覧ファイルを選択')).toBeInTheDocument()
    expect(screen.queryByText('割り当て結果')).not.toBeInTheDocument()
    expect(screen.queryByText('解析結果')).not.toBeInTheDocument()
    // クリアボタンも未取込時は出ない
    expect(screen.queryByRole('button', { name: 'クリア' })).not.toBeInTheDocument()
  })

  it('デフォルトのスタッフ一覧（出勤・担当ポイント）が表示される', () => {
    renderPlan()
    expect(screen.getByText('出勤スタッフ・担当ポイント')).toBeInTheDocument()
    // DEFAULT_STAFF の代表メンバー
    expect(screen.getByText('結城')).toBeInTheDocument()
    expect(screen.getByText('戸田')).toBeInTheDocument()
    expect(screen.getByText('森山')).toBeInTheDocument()
  })
})

describe('CleaningPlan 日付切替', () => {
  it('date input を変更するとバナーの整形表示が追従する', async () => {
    renderPlan({ initialDate: '2026-05-22' })
    const dateInput = document.querySelector('input[type="date"]')

    // type="date" の制御コンポーネントは fireEvent.change で React の onChange を発火させる
    fireEvent.change(dateInput, { target: { value: '2026-12-25' } })

    // 2026-12-25 は金曜日
    expect(await screen.findByText('2026年12月25日（金）')).toBeInTheDocument()
    expect(dateInput).toHaveValue('2026-12-25')
  })

  it('onOpenCalendar を渡すとカレンダーボタンが現れ、押すと現在の日付で呼ばれる', async () => {
    const user = userEvent.setup()
    const calls = []
    renderPlan({ initialDate: '2026-05-22', onOpenCalendar: (d) => calls.push(d) })
    const btn = screen.getByRole('button', { name: /カレンダー/ })
    await user.click(btn)
    expect(calls).toEqual(['2026-05-22'])
  })

  it('onOpenCalendar 未指定ならカレンダーボタンは表示されない', () => {
    renderPlan({ initialDate: '2026-05-22' })
    expect(screen.queryByRole('button', { name: /カレンダー/ })).not.toBeInTheDocument()
  })
})

describe('CleaningPlan スタッフ設定（取込前でも操作可能）', () => {
  it('チェックボックスでスタッフの出勤をトグルでき、localStorage に保存される', async () => {
    const user = userEvent.setup()
    renderPlan()
    const checkboxes = screen.getAllByRole('checkbox')
    // 先頭スタッフ（結城）はデフォルトで active=true
    expect(checkboxes[0]).toBeChecked()
    await user.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()

    const saved = JSON.parse(localStorage.getItem(STAFF_KEY))
    expect(saved[0].active).toBe(false)
  })

  it('担当ポイントを変更すると localStorage に反映される', async () => {
    const user = userEvent.setup()
    renderPlan()
    const numberInputs = screen.getAllByRole('spinbutton')
    // 先頭スタッフのターゲットを変更
    await user.clear(numberInputs[0])
    await user.type(numberInputs[0], '8')

    const saved = JSON.parse(localStorage.getItem(STAFF_KEY))
    expect(saved[0].target).toBe(8)
  })

  it('意地悪: ポイントに 0 を入れても境界バリデーションで弾かれ反映されない', async () => {
    const user = userEvent.setup()
    renderPlan()
    const numberInputs = screen.getAllByRole('spinbutton')
    await user.clear(numberInputs[0])
    // 0 は range外(1-99)なので updateTarget が早期 return する
    await user.type(numberInputs[0], '0')

    const saved = JSON.parse(localStorage.getItem(STAFF_KEY))
    // 弾かれた結果、null（空文字 clear 後）または元の値のまま。少なくとも 0 にはならない
    expect(saved[0].target).not.toBe(0)
  })

  it('意地悪: ポイント 100（上限超過）も弾かれて反映されない', async () => {
    const user = userEvent.setup()
    renderPlan()
    const numberInputs = screen.getAllByRole('spinbutton')
    await user.clear(numberInputs[0])
    await user.type(numberInputs[0], '100')

    const saved = JSON.parse(localStorage.getItem(STAFF_KEY))
    expect(saved[0].target).not.toBe(100)
  })

  it('ポイントを空にすると null（無制限/∞）になる', async () => {
    const user = userEvent.setup()
    renderPlan()
    const numberInputs = screen.getAllByRole('spinbutton')
    await user.clear(numberInputs[0])

    const saved = JSON.parse(localStorage.getItem(STAFF_KEY))
    expect(saved[0].target).toBeNull()
  })
})

describe('planStorage 保存/読込ロジック', () => {
  beforeEach(() => localStorage.clear())

  const samplePlan = {
    rooms: [{ room: '301', floor: 3, cleaningType: 'co', weight: 1 }],
    assignments: { 結城: { rooms: [{ room: '301' }], points: 1 } },
    staffList: [{ name: '結城', target: 11, active: true }],
  }

  it('savePlan で保存した計画を loadPlan で取り出せる（savedAt が付与される）', () => {
    savePlan('2026-05-23', samplePlan)
    const loaded = loadPlan('2026-05-23')
    expect(loaded).not.toBeNull()
    expect(loaded.rooms).toEqual(samplePlan.rooms)
    expect(loaded.assignments).toEqual(samplePlan.assignments)
    expect(typeof loaded.savedAt).toBe('string')
  })

  it('存在しない日付の loadPlan は null', () => {
    expect(loadPlan('1999-01-01')).toBeNull()
  })

  it('複数日付を保存しても日付キーで独立管理される', () => {
    savePlan('2026-05-23', samplePlan)
    savePlan('2026-05-24', { ...samplePlan, rooms: [] })
    const all = loadAllPlans()
    expect(Object.keys(all).sort()).toEqual(['2026-05-23', '2026-05-24'])
    expect(loadPlan('2026-05-24').rooms).toEqual([])
  })

  it('同一日付を上書き保存すると最新内容に置き換わる', () => {
    savePlan('2026-05-23', samplePlan)
    savePlan('2026-05-23', { ...samplePlan, rooms: [{ room: '999' }] })
    expect(loadPlan('2026-05-23').rooms).toEqual([{ room: '999' }])
  })

  it('deletePlan で該当日付だけ削除され、他は残る', () => {
    savePlan('2026-05-23', samplePlan)
    savePlan('2026-05-24', samplePlan)
    deletePlan('2026-05-23')
    expect(loadPlan('2026-05-23')).toBeNull()
    expect(loadPlan('2026-05-24')).not.toBeNull()
  })

  it('意地悪: localStorage が壊れた JSON でも loadAllPlans は {} を返す', () => {
    localStorage.setItem('hotel_cleaning_plans', '{壊れたJSON')
    expect(loadAllPlans()).toEqual({})
    expect(loadPlan('2026-05-23')).toBeNull()
  })

  it('CleaningPlan で表示中の saveDate と同じキーで savePlan→loadPlan が往復できる', () => {
    // 画面の date input の値（initialDate）をそのままキーに使うシナリオの整合性確認
    const dateStr = '2026-05-22'
    renderPlan({ initialDate: dateStr })
    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toHaveValue(dateStr)
    savePlan(dateStr, samplePlan)
    expect(loadPlan(dateStr)).not.toBeNull()
  })
})

describe('CleaningPlan スタッフ設定の永続化反映', () => {
  it('事前に保存したスタッフ設定（active/target）が初期描画に反映される', () => {
    // 結城を非出勤・戸田だけ active のカスタム構成
    localStorage.setItem(STAFF_KEY, JSON.stringify([
      { name: '結城', target: 11, active: false, retired: false },
      { name: '戸田', target: 7,  active: true,  retired: false },
    ]))
    renderPlan()
    const checkboxes = screen.getAllByRole('checkbox')
    // 保存した順に並ぶ前提：結城=未チェック, 戸田=チェック
    const yuki = checkboxes[0]
    const toda = checkboxes[1]
    expect(yuki).not.toBeChecked()
    expect(toda).toBeChecked()
  })
})
