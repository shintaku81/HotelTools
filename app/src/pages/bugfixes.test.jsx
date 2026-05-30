import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExtraCleanings from './ExtraCleanings.jsx'
import Floors from './Floors.jsx'
import { weekdayOf } from './PlanCalendar.jsx'
import { USERS } from '../test/fixtures.js'

// ─────────────────────────────────────────────────────────────────────────────
// #20 ExtraCleanings: 手動入力の部屋実在チェック
// ─────────────────────────────────────────────────────────────────────────────
describe('#20 ExtraCleanings — 部屋実在チェック', () => {
  it('実在する部屋(302)は登録できる', async () => {
    const user = userEvent.setup()
    render(<ExtraCleanings onBack={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/部屋番号を直接入力/), '302')
    await user.click(screen.getByRole('button', { name: '登録' }))
    expect(screen.getByText('302号室')).toBeInTheDocument()
  })

  it('意地悪: 存在しない部屋(299)は「存在しない部屋番号です」で弾く', async () => {
    const user = userEvent.setup()
    render(<ExtraCleanings onBack={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/部屋番号を直接入力/), '299')
    await user.click(screen.getByRole('button', { name: '登録' }))
    expect(screen.getByText('存在しない部屋番号です')).toBeInTheDocument()
    expect(screen.queryByText('299号室')).not.toBeInTheDocument()
  })

  it('意地悪: 欠番(204/209/313)も存在しないので弾く', async () => {
    const user = userEvent.setup()
    render(<ExtraCleanings onBack={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/部屋番号を直接入力/), '204')
    await user.click(screen.getByRole('button', { name: '登録' }))
    expect(screen.getByText('存在しない部屋番号です')).toBeInTheDocument()
  })

  it('意地悪: 3桁未満は従来どおり「3桁で入力」', async () => {
    const user = userEvent.setup()
    render(<ExtraCleanings onBack={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/部屋番号を直接入力/), '30')
    await user.click(screen.getByRole('button', { name: '登録' }))
    expect(screen.getByText('3桁で入力')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #22 PlanCalendar: 曜日算出のTZ非依存
// ─────────────────────────────────────────────────────────────────────────────
describe('#22 weekdayOf — TZ非依存の曜日算出', () => {
  it('ローカル日付として解釈する（UTCずれを起こさない）', () => {
    // new Date(y, m-1, d) と一致すること = ローカル解釈
    expect(weekdayOf('2026-06-15')).toBe(new Date(2026, 5, 15).getDay())
    expect(weekdayOf('2026-01-01')).toBe(new Date(2026, 0, 1).getDay())
    expect(weekdayOf('2026-12-31')).toBe(new Date(2026, 11, 31).getDay())
  })

  it('日曜=0・土曜=6 を返す', () => {
    // 2026-05-31 は日曜
    expect(weekdayOf('2026-05-31')).toBe(0)
    // 2026-05-30 は土曜
    expect(weekdayOf('2026-05-30')).toBe(6)
  })

  it('意地悪: 不正な文字列は NaN', () => {
    expect(weekdayOf('')).toBeNaN()
    expect(weekdayOf('not-a-date')).toBeNaN()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #22 Floors: 他スタッフ担当済み部屋の claim 横取り防止
// ─────────────────────────────────────────────────────────────────────────────
describe('#22 Floors — 担当横取りの確認', () => {
  it('他スタッフ担当の清掃待ち部屋を担当しようとすると確認が出る／キャンセルで担当が変わらない', async () => {
    const user = userEvent.setup()
    // 結城としてログイン。デモ室305は status=checkout / 担当=鹿又（他人）
    render(<Floors user={USERS.cleaner} onLogout={vi.fn()} onBack={vi.fn()} />)
    // cleaver初期フィルタは「自分」。先に全室表示へ切替（他人担当の305を表示）
    const filter = await screen.findByRole('combobox')
    await user.selectOptions(filter, 'all')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const card = await screen.findByLabelText(/305号室/)
    await user.click(card)
    const claimBtn = await screen.findByRole('button', { name: 'この部屋を担当する' })
    await user.click(claimBtn)

    // 確認が出て、キャンセルしたので担当は鹿又のまま（清掃中にならない）
    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText(/担当: 鹿又/)).toBeInTheDocument()
    })
    confirmSpy.mockRestore()
  })
})
