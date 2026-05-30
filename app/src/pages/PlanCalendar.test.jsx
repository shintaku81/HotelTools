// Tests for PlanCalendar — month grid, day cells, holiday toggle, plan marks,
// and onNavigatePlan / onBack callbacks. Black-box + adversarial cases.
//
// The component reads plans/holidays from localStorage at mount via
// useState(loadAllPlans) / useState(loadHolidays), so we must seed storage
// BEFORE rendering. It uses real `new Date()`, so we freeze the clock with
// vi.setSystemTime to keep "today"/"tomorrow"/past/future deterministic.

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanCalendar from './PlanCalendar.jsx'

const PLANS_KEY = 'hotel_cleaning_plans'
const HOLIDAYS_KEY = 'hotel_holidays'

// Freeze "today" to a mid-month weekday so prev/next days both exist in-month.
// 2026-06-15 is a Monday.
const FIXED_NOW = new Date('2026-06-15T09:00:00')
const TODAY = '2026-06-15'
const TOMORROW = '2026-06-16'
// Yesterday (2026-06-14) is used via the literal /^14/ matcher in the past-day test.

function seedPlans(map) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(map))
}
function seedHolidays(list) {
  localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(list))
}
function readHolidays() {
  return JSON.parse(localStorage.getItem(HOLIDAYS_KEY) ?? '[]')
}

function makePlan(overrides = {}) {
  return {
    rooms: [
      { cleaningType: 'co' },
      { cleaningType: 'co' },
      { cleaningType: 'eco' },
    ],
    assignments: { 結城: { rooms: [1, 2], points: 5.5 } },
    staffList: ['結城'],
    savedAt: '2026-06-10T03:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  // Fake ONLY the Date clock — leave timers real so userEvent's internal
  // delays still resolve (faking all timers makes user.click() hang/timeout).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PlanCalendar — month view', () => {
  it('renders the current month/year header', () => {
    render(<PlanCalendar />)
    expect(screen.getByText('2026年 6月')).toBeInTheDocument()
  })

  it('renders weekday headers 日〜土', () => {
    render(<PlanCalendar />)
    for (const wd of ['日', '月', '火', '水', '木', '金', '土']) {
      expect(screen.getByText(wd)).toBeInTheDocument()
    }
  })

  it('renders a day button for every day in June (30 days)', () => {
    render(<PlanCalendar />)
    // Day 1 and day 30 exist; day 31 does not (June has 30 days).
    expect(screen.getByRole('button', { name: /^1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^30$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^31$/ })).not.toBeInTheDocument()
  })

  it('navigates to the previous and next month and wraps the year', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)

    // Previous month button is the first ‹ inside the month nav row.
    const next = screen.getByRole('button', { name: '›' })
    const prevButtons = screen.getAllByRole('button', { name: '‹' })
    // There are two ‹ buttons: header back and month-prev. Month-prev is the last.
    const prev = prevButtons[prevButtons.length - 1]

    await user.click(prev)
    expect(screen.getByText('2026年 5月')).toBeInTheDocument()

    await user.click(next)
    await user.click(next)
    expect(screen.getByText('2026年 7月')).toBeInTheDocument()
  })

  it('wraps December -> January across the year boundary', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)
    const next = screen.getByRole('button', { name: '›' })
    // From June, click next 6 times to reach December, once more -> January 2027.
    for (let i = 0; i < 6; i++) await user.click(next)
    expect(screen.getByText('2026年 12月')).toBeInTheDocument()
    await user.click(next)
    expect(screen.getByText('2027年 1月')).toBeInTheDocument()
  })

  it('wraps January -> December backwards across the year boundary', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)
    const prevButtons = screen.getAllByRole('button', { name: '‹' })
    const prev = prevButtons[prevButtons.length - 1]
    // June -> back to January (5 clicks), once more -> December 2025.
    for (let i = 0; i < 5; i++) await user.click(prev)
    expect(screen.getByText('2026年 1月')).toBeInTheDocument()
    await user.click(prev)
    expect(screen.getByText('2025年 12月')).toBeInTheDocument()
  })
})

describe('PlanCalendar — plan marks', () => {
  it('marks days that have a saved plan (renders detail card with CO/eco counts)', async () => {
    seedPlans({ [TODAY]: makePlan() })
    const user = userEvent.setup()
    render(<PlanCalendar />)

    // Selecting the day with a plan shows the plan summary.
    await user.click(screen.getByRole('button', { name: /^15/ }))
    expect(screen.getByText('CO 2室')).toBeInTheDocument()
    expect(screen.getByText('エコ 1室')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '計画を表示' })).toBeInTheDocument()
  })

  it('shows "no plan saved" for a day without a plan', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)
    // Tomorrow is preselected by default (no plan seeded).
    expect(
      screen.getByText('この日の計画はまだ保存されていません'),
    ).toBeInTheDocument()
  })
})

describe('PlanCalendar — holiday toggle', () => {
  it('toggles a day to holiday and persists to storage', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)

    // Default selected day is tomorrow. Toggle button reads "休館/メンテ".
    const toggle = screen.getByRole('button', { name: '休館/メンテ' })
    await user.click(toggle)

    // Persisted to localStorage.
    expect(readHolidays()).toContain(TOMORROW)
    // Button now reads "休館解除".
    expect(screen.getByRole('button', { name: '休館解除' })).toBeInTheDocument()
    // Holiday message shown instead of the create prompt.
    expect(screen.getByText('休館日・メンテナンス日')).toBeInTheDocument()
  })

  it('round-trips the holiday toggle (set then unset) and clears storage', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)

    await user.click(screen.getByRole('button', { name: '休館/メンテ' }))
    expect(readHolidays()).toContain(TOMORROW)

    // Toggle back off.
    await user.click(screen.getByRole('button', { name: '休館解除' }))
    expect(readHolidays()).not.toContain(TOMORROW)
    expect(screen.getByRole('button', { name: '休館/メンテ' })).toBeInTheDocument()
  })

  it('reflects a pre-seeded holiday on mount as "休館解除"', () => {
    seedHolidays([TOMORROW])
    render(<PlanCalendar />)
    expect(screen.getByRole('button', { name: '休館解除' })).toBeInTheDocument()
    expect(screen.getByText('休館日・メンテナンス日')).toBeInTheDocument()
  })

  it('shows 休 marker inside a holiday day cell', async () => {
    seedHolidays([TODAY])
    render(<PlanCalendar />)
    // The day-15 cell contains a 休 marker span. Locate the cell by its day
    // number, then assert the 休 marker is present inside it.
    const cell = screen
      .getAllByRole('button')
      .find((b) => b.textContent === '15休')
    expect(cell).toBeTruthy()
    expect(within(cell).getByText('休')).toBeInTheDocument()
  })
})

describe('PlanCalendar — navigation callbacks', () => {
  it('calls onBack when the header back arrow is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<PlanCalendar onBack={onBack} />)
    // The header back ‹ is the first ‹ button.
    const backButtons = screen.getAllByRole('button', { name: '‹' })
    await user.click(backButtons[0])
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('calls onNavigatePlan with the date when "計画を作成する" is clicked (future day, no plan)', async () => {
    const onNavigatePlan = vi.fn()
    const user = userEvent.setup()
    render(<PlanCalendar onNavigatePlan={onNavigatePlan} />)
    // Tomorrow is preselected, future, no plan -> "計画を作成する" shows.
    await user.click(screen.getByRole('button', { name: '計画を作成する' }))
    expect(onNavigatePlan).toHaveBeenCalledWith(TOMORROW)
  })

  it('calls onNavigatePlan with the date when "計画を表示" is clicked (day with plan)', async () => {
    seedPlans({ [TOMORROW]: makePlan() })
    const onNavigatePlan = vi.fn()
    const user = userEvent.setup()
    render(<PlanCalendar onNavigatePlan={onNavigatePlan} />)
    await user.click(screen.getByRole('button', { name: '計画を表示' }))
    expect(onNavigatePlan).toHaveBeenCalledWith(TOMORROW)
  })

  it('does NOT offer "計画を作成する" for a past day without a plan', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)
    // Select yesterday (past, no plan).
    await user.click(screen.getByRole('button', { name: /^14/ }))
    expect(screen.getByText('この日の計画はまだ保存されていません')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '計画を作成する' })).not.toBeInTheDocument()
  })

  it('does not crash when callbacks are omitted (no onNavigatePlan)', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)
    // No onNavigatePlan -> create button is not rendered (guarded by &&).
    expect(screen.queryByRole('button', { name: '計画を作成する' })).not.toBeInTheDocument()
  })
})

describe('PlanCalendar — selection behaviour', () => {
  it('toggles selection off when the already-selected day is clicked again', async () => {
    const user = userEvent.setup()
    render(<PlanCalendar />)
    // Tomorrow (16) is preselected -> detail card visible.
    expect(screen.getByText('この日の計画はまだ保存されていません')).toBeInTheDocument()
    // Click day 16 to deselect.
    await user.click(screen.getByRole('button', { name: /^16$/ }))
    expect(
      screen.queryByText('この日の計画はまだ保存されていません'),
    ).not.toBeInTheDocument()
  })

  it('deletes a plan (confirm=true) and clears the detail card', async () => {
    seedPlans({ [TODAY]: makePlan() })
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<PlanCalendar />)

    await user.click(screen.getByRole('button', { name: /^15/ }))
    expect(screen.getByText('CO 2室')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '削除' }))
    // Plan removed from storage and selection cleared.
    expect(JSON.parse(localStorage.getItem(PLANS_KEY))).toEqual({})
    expect(screen.queryByText('CO 2室')).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('does NOT delete a plan when confirm is cancelled', async () => {
    seedPlans({ [TODAY]: makePlan() })
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<PlanCalendar />)

    await user.click(screen.getByRole('button', { name: /^15/ }))
    await user.click(screen.getByRole('button', { name: '削除' }))
    // Plan still present in storage.
    expect(JSON.parse(localStorage.getItem(PLANS_KEY))).toHaveProperty(TODAY)
    confirmSpy.mockRestore()
  })
})

describe('PlanCalendar — adversarial / edge cases', () => {
  it('survives corrupt plans JSON in localStorage (falls back to empty)', () => {
    localStorage.setItem(PLANS_KEY, '{not valid json')
    expect(() => render(<PlanCalendar />)).not.toThrow()
    expect(screen.getByText('2026年 6月')).toBeInTheDocument()
  })

  it('survives corrupt holidays JSON in localStorage (falls back to empty set)', () => {
    localStorage.setItem(HOLIDAYS_KEY, 'garbage')
    expect(() => render(<PlanCalendar />)).not.toThrow()
    // Default selected (tomorrow) is not a holiday.
    expect(screen.getByRole('button', { name: '休館/メンテ' })).toBeInTheDocument()
  })

  it('renders a plan that has no rooms/assignments arrays without crashing', async () => {
    seedPlans({ [TODAY]: { savedAt: '2026-06-10T03:00:00.000Z' } })
    const user = userEvent.setup()
    render(<PlanCalendar />)
    await user.click(screen.getByRole('button', { name: /^15/ }))
    // rooms defaults to [] -> CO 0室 / エコ 0室.
    expect(screen.getByText('CO 0室')).toBeInTheDocument()
    expect(screen.getByText('エコ 0室')).toBeInTheDocument()
  })
})
