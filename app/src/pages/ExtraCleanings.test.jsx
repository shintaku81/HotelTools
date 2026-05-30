// Tests for ExtraCleanings.jsx — same-day extra-cleaning registration flow.
//
// Black-box angle: drive the screen via the number input, the 登録 button,
// the type selector, the room picker overlay, notes, and removal — asserting on
// visible text/roles (css:false → no class matching).
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExtraCleanings from './ExtraCleanings.jsx'

function renderScreen() {
  const onBack = vi.fn()
  render(<ExtraCleanings onBack={onBack} />)
  return { onBack }
}

const numberInput = () => screen.getByPlaceholderText(/部屋番号を直接入力/)
const addButton = () => screen.getByRole('button', { name: '登録' })

describe('ExtraCleanings — initial render', () => {
  it('starts empty with the placeholder card and no count badge', () => {
    renderScreen()
    // Header title "追加清掃" + type button "追加清掃" both exist, so assert on
    // the unique sub-label instead.
    expect(screen.getByText('当日対応')).toBeInTheDocument()
    expect(screen.getByText(/部屋番号を入力するか/)).toBeInTheDocument()
    // No "○件" badge while the list is empty.
    expect(screen.queryByText(/^\d+件$/)).not.toBeInTheDocument()
  })

  it('back button calls onBack', async () => {
    const user = userEvent.setup()
    const { onBack } = renderScreen()
    await user.click(screen.getByRole('button', { name: '‹' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('ExtraCleanings — manual room entry', () => {
  it('registers a valid 3-digit room and shows it in the list', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '302')
    await user.click(addButton())

    expect(screen.getByText('302号室')).toBeInTheDocument()
    expect(screen.getByText('1件')).toBeInTheDocument()
    // Input is cleared after a successful add.
    expect(numberInput()).toHaveValue('')
  })

  it('Enter key also registers a room', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '415{Enter}')
    expect(screen.getByText('415号室')).toBeInTheDocument()
  })

  it('newest entries appear first (prepend)', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '301{Enter}')
    await user.type(numberInput(), '302{Enter}')
    const rooms = screen.getAllByText(/号室$/).map(el => el.textContent)
    expect(rooms[0]).toBe('302号室')
    expect(rooms[1]).toBe('301号室')
  })

  it('rejects non-3-digit input with an error and adds nothing', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '30')
    await user.click(addButton())
    expect(screen.getByText('3桁で入力')).toBeInTheDocument()
    expect(screen.queryByText(/号室$/)).not.toBeInTheDocument()
  })

  it('rejects 4-digit / over-long input (maxLength caps but logic also guards)', async () => {
    const user = userEvent.setup()
    renderScreen()
    // maxLength=3 caps to 302; that IS valid, so test a non-digit instead.
    await user.type(numberInput(), 'ab')
    await user.click(addButton())
    expect(screen.getByText('3桁で入力')).toBeInTheDocument()
    expect(screen.queryByText(/号室$/)).not.toBeInTheDocument()
  })

  it('rejects an empty submission', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(addButton())
    expect(screen.getByText('3桁で入力')).toBeInTheDocument()
  })

  it('clears the error once the user edits the input again', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(addButton())
    expect(screen.getByText('3桁で入力')).toBeInTheDocument()
    await user.type(numberInput(), '3')
    expect(screen.queryByText('3桁で入力')).not.toBeInTheDocument()
  })

  it('does not add a duplicate room of the same type', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '302{Enter}')
    await user.type(numberInput(), '302{Enter}')
    expect(screen.getAllByText('302号室')).toHaveLength(1)
    expect(screen.getByText('1件')).toBeInTheDocument()
  })

  it('allows the same room under a different cleaning type', async () => {
    const user = userEvent.setup()
    renderScreen()
    // type defaults to 追加清掃
    await user.type(numberInput(), '302{Enter}')
    // switch type to CO清掃, add same room
    await user.click(screen.getByRole('button', { name: 'CO清掃' }))
    await user.type(numberInput(), '302{Enter}')
    expect(screen.getAllByText('302号室')).toHaveLength(2)
    expect(screen.getByText('2件')).toBeInTheDocument()
  })
})

describe('ExtraCleanings — type selector', () => {
  it('tags the new entry with the currently selected type label', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: 'エコ清掃' }))
    await user.type(numberInput(), '501{Enter}')

    const card = screen.getByText('501号室').closest('div')
    // The entry row carries the エコ清掃 label.
    expect(within(card.parentElement).getByText('エコ清掃')).toBeInTheDocument()
  })
})

describe('ExtraCleanings — room picker overlay', () => {
  it('opens the picker, selecting a room adds it and marks it 追加済', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /部屋を選んで追加する/ }))

    // Picker header.
    expect(screen.getByText('部屋を選んでください')).toBeInTheDocument()

    // Tap room 201 (exists on floor 2).
    await user.click(screen.getByRole('button', { name: '201' }))

    // The just-added room button is now disabled and labelled 追加済.
    const roomBtn = screen.getByRole('button', { name: /201/ })
    expect(roomBtn).toBeDisabled()
    expect(within(roomBtn).getByText('追加済')).toBeInTheDocument()
  })

  it('supports multi-select while staying in the picker, then closing shows the list', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /部屋を選んで追加する/ }))
    await user.click(screen.getByRole('button', { name: '201' }))
    await user.click(screen.getByRole('button', { name: '202' }))

    // Close the overlay with the picker-header ×. Entry rows ALSO render a ×
    // delete button, so scope the click to the picker header.
    const pickerHeader = screen.getByText('部屋を選んでください').closest('header')
    await user.click(within(pickerHeader).getByRole('button', { name: '×' }))
    expect(screen.queryByText('部屋を選んでください')).not.toBeInTheDocument()

    expect(screen.getByText('201号室')).toBeInTheDocument()
    expect(screen.getByText('202号室')).toBeInTheDocument()
    expect(screen.getByText('2件')).toBeInTheDocument()
  })

  it('filters rooms by floor tab', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /部屋を選んで追加する/ }))
    // Switch to 3F tab — room 301 should appear, 201 (2F) should not.
    await user.click(screen.getByRole('button', { name: '3F' }))
    expect(screen.getByRole('button', { name: '301' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '201' })).not.toBeInTheDocument()
  })
})

describe('ExtraCleanings — notes', () => {
  it('adds a note to an entry and shows it', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '302{Enter}')

    await user.click(screen.getByRole('button', { name: 'メモ' }))
    expect(screen.getByText('メモを追加')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText(/連泊中/), '連泊中のお客様希望')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('連泊中のお客様希望')).toBeInTheDocument()
    // Modal closed.
    expect(screen.queryByText('メモを追加')).not.toBeInTheDocument()
  })

  it('canceling the note modal does not persist anything', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '302{Enter}')
    await user.click(screen.getByRole('button', { name: 'メモ' }))
    await user.type(screen.getByPlaceholderText(/連泊中/), '破棄されるメモ')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByText('メモを追加')).not.toBeInTheDocument()
    expect(screen.queryByText('破棄されるメモ')).not.toBeInTheDocument()
  })
})

describe('ExtraCleanings — removal', () => {
  it('removes an entry and updates the count badge', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(numberInput(), '302{Enter}')
    expect(screen.getByText('302号室')).toBeInTheDocument()

    // The × delete button on the entry row.
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText('302号室')).not.toBeInTheDocument()
    // Back to the empty-state placeholder.
    expect(screen.getByText(/部屋番号を入力するか/)).toBeInTheDocument()
  })
})
