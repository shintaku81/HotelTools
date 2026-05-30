import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Staff from './Staff.jsx'
import { DEFAULT_STAFF, loadStaff } from '../config/staff.js'

// Staff settings screen — black-box behaviour tests.
// Runs in in-memory mode; loadStaff() falls back to DEFAULT_STAFF when
// localStorage has no saved config (setup.js clears storage per test).

const STORAGE_KEY = 'hotel_staff_config'

// Re-read what was persisted to localStorage by handleSave / saveStaff.
function readSaved() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

// Find the list row (the flex container) that contains a given staff name.
// In display mode the name is a <span>; in edit mode it becomes an <input>
// whose value is the name. Handle both so the locator stays stable across
// entering/leaving edit mode.
function rowForName(name) {
  const node = screen.queryByText(name) ?? screen.getByDisplayValue(name)
  return node.closest('div.flex')
}

beforeEach(() => {
  // Ensure a known starting point (no saved config -> defaults).
  localStorage.clear()
})

describe('Staff — 一覧表示', () => {
  it('退職していないデフォルトスタッフ全員を表示する', () => {
    render(<Staff onBack={() => {}} />)
    // None of DEFAULT_STAFF are retired, so all names should appear.
    for (const s of DEFAULT_STAFF) {
      expect(screen.getByText(s.name)).toBeInTheDocument()
    }
  })

  it('上限が設定されたスタッフはpt表記、nullは∞表記', () => {
    render(<Staff onBack={() => {}} />)
    const yuuki = rowForName('結城') // target 11
    expect(within(yuuki).getByText('11pt')).toBeInTheDocument()
    const miura = rowForName('三浦') // target null
    expect(within(miura).getByText('∞')).toBeInTheDocument()
  })

  it('サマリの出勤予定人数はactiveなスタッフ数と一致する', () => {
    render(<Staff onBack={() => {}} />)
    const activeCount = DEFAULT_STAFF.filter(s => !s.retired && s.active).length
    // 3 default active (結城/戸田/森山)
    expect(activeCount).toBe(3)
    expect(screen.getByText('出勤予定').previousSibling).toHaveTextContent(String(activeCount))
  })

  it('上限合計ptはactive かつ target!=null の合計', () => {
    render(<Staff onBack={() => {}} />)
    // 11 + 10 + 10 = 31
    expect(screen.getByText('上限合計 (pt)').previousSibling).toHaveTextContent('31')
  })
})

describe('Staff — 出勤(active)トグル', () => {
  it('出勤アイコンをタップするとactiveが反転し出勤予定数が減る', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const yuuki = rowForName('結城') // active -> ✓
    const icon = within(yuuki).getByText('✓')
    await user.click(icon)
    // After toggle: now shows — and active count drops 3 -> 2
    expect(within(rowForName('結城')).getByText('—')).toBeInTheDocument()
    expect(screen.getByText('出勤予定').previousSibling).toHaveTextContent('2')
  })

  it('非出勤スタッフのアイコンをタップすると出勤予定数が増える', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const miura = rowForName('三浦') // inactive -> —
    await user.click(within(miura).getByText('—'))
    expect(within(rowForName('三浦')).getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('出勤予定').previousSibling).toHaveTextContent('4')
  })
})

describe('Staff — 上限(target)編集', () => {
  it('編集ボタンで入力欄が出て、新しい上限を保存できる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const yuuki = rowForName('結城')
    await user.click(within(yuuki).getByText('編集'))
    // edit inputs: name + number
    const numberInput = within(rowForName('結城')).getByRole('spinbutton')
    await user.clear(numberInput)
    await user.type(numberInput, '7')
    await user.click(within(rowForName('結城')).getByText('OK'))
    expect(within(rowForName('結城')).getByText('7pt')).toBeInTheDocument()
  })

  it('上限を空欄にすると∞(無制限)になる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('結城')).getByText('編集'))
    const numberInput = within(rowForName('結城')).getByRole('spinbutton')
    await user.clear(numberInput)
    await user.click(within(rowForName('結城')).getByText('OK'))
    expect(within(rowForName('結城')).getByText('∞')).toBeInTheDocument()
  })

  it('意地悪: 上限に 0 や負値を入れても最低1ptに丸められる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('戸田')).getByText('編集'))
    const numberInput = within(rowForName('戸田')).getByRole('spinbutton')
    await user.clear(numberInput)
    await user.type(numberInput, '0')
    await user.click(within(rowForName('戸田')).getByText('OK'))
    // Math.max(1, parseInt('0')||1) -> parseInt('0')=0 falsy -> 1
    expect(within(rowForName('戸田')).getByText('1pt')).toBeInTheDocument()
  })

  it('意地悪: 編集中に名前を空にしてOKすると変更がキャンセルされる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('森山')).getByText('編集'))
    // Only one row is in edit mode, so the edit inputs/OK are unique globally.
    const nameInput = screen.getByDisplayValue('森山')
    await user.clear(nameInput)
    // also change target to verify it does NOT apply
    const numberInput = screen.getByRole('spinbutton')
    await user.clear(numberInput)
    await user.type(numberInput, '99')
    await user.click(screen.getByText('OK'))
    // commitEdit early-returns: name kept, target unchanged (still 10pt)
    expect(screen.getByText('森山')).toBeInTheDocument()
    expect(within(rowForName('森山')).getByText('10pt')).toBeInTheDocument()
  })
})

describe('Staff — 追加', () => {
  it('追加ボタンでフォームが開き、新スタッフを追加できる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(screen.getByText('＋ 追加'))
    const nameInput = screen.getByPlaceholderText('名前')
    await user.type(nameInput, '田中')
    // newTarget defaults to '11', clear it to exercise the ∞ (null) path.
    const targetInput = screen.getByPlaceholderText('∞')
    await user.clear(targetInput)
    // there are two ＋追加/追加; the form submit is the indigo "追加" button
    const submit = screen.getAllByText('追加').find(b => b.tagName === 'BUTTON' && b.className.includes('indigo-600'))
    await user.click(submit)
    expect(screen.getByText('田中')).toBeInTheDocument()
    // empty target -> null -> ∞ shown
    expect(within(rowForName('田中')).getByText('∞')).toBeInTheDocument()
  })

  it('意地悪: 空の名前では追加できない', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const before = screen.getAllByText('編集').length
    await user.click(screen.getByText('＋ 追加'))
    // leave name empty, type only target
    const targetInput = screen.getByPlaceholderText('∞')
    await user.type(targetInput, '5')
    const submit = screen.getAllByText('追加').find(b => b.tagName === 'BUTTON' && b.className.includes('indigo-600'))
    await user.click(submit)
    // No new editable row added (form stays open, addStaff early-returns)
    const after = screen.getAllByText('編集').length
    expect(after).toBe(before)
  })

  it('意地悪: 空白だけの名前も追加できない', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const before = screen.getAllByText('編集').length
    await user.click(screen.getByText('＋ 追加'))
    await user.type(screen.getByPlaceholderText('名前'), '   ')
    const submit = screen.getAllByText('追加').find(b => b.tagName === 'BUTTON' && b.className.includes('indigo-600'))
    await user.click(submit)
    expect(screen.getAllByText('編集').length).toBe(before)
  })
})

describe('Staff — 退職(retired)', () => {
  it('無効化すると退職済みセクションへ移動し、出勤予定数が減る', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('結城')).getByText('無効化'))
    // retired section header appears
    expect(screen.getByText('退職済みスタッフ')).toBeInTheDocument()
    // 結城 now line-through in retired list, has 復帰 button
    const retiredRow = rowForName('結城')
    expect(within(retiredRow).getByText('復帰')).toBeInTheDocument()
    // active count drops 3 -> 2
    expect(screen.getByText('出勤予定').previousSibling).toHaveTextContent('2')
  })

  it('復帰させると一覧へ戻る(retired=false, active維持)', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('結城')).getByText('無効化'))
    await user.click(within(rowForName('結城')).getByText('復帰'))
    // back in active list -> has 編集 button again
    expect(within(rowForName('結城')).getByText('編集')).toBeInTheDocument()
    // unretire keeps active as-is (retireStaff set active:false), so count stays 2
    expect(screen.getByText('出勤予定').previousSibling).toHaveTextContent('2')
  })
})

describe('Staff — 完全削除', () => {
  it('×ボタンでスタッフを完全削除できる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const fukuda = rowForName('福田')
    await user.click(within(fukuda).getByTitle('完全削除'))
    expect(screen.queryByText('福田')).not.toBeInTheDocument()
  })
})

describe('Staff — saveStaffでの永続化', () => {
  it('保存ボタンで現在のリストがlocalStorageに書き込まれる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    expect(readSaved()).toBeNull()
    await user.click(screen.getByText('保存'))
    const saved = readSaved()
    expect(saved).not.toBeNull()
    expect(saved.length).toBe(DEFAULT_STAFF.length)
    expect(saved.find(s => s.name === '結城').target).toBe(11)
  })

  it('編集→保存後に loadStaff() で変更が読み戻せる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('戸田')).getByText('編集'))
    const numberInput = within(rowForName('戸田')).getByRole('spinbutton')
    await user.clear(numberInput)
    await user.type(numberInput, '8')
    await user.click(within(rowForName('戸田')).getByText('OK'))
    await user.click(screen.getByText('保存'))
    const reloaded = loadStaff()
    expect(reloaded.find(s => s.name === '戸田').target).toBe(8)
  })

  it('保存ボタンを押すとラベルが「保存済み ✓」に変わる', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    const saveBtn = screen.getByText('保存')
    await user.click(saveBtn)
    expect(screen.getByText('保存済み ✓')).toBeInTheDocument()
  })
})

describe('Staff — デフォルトに戻す / onBack', () => {
  it('削除後でもデフォルトに戻すで元のスタッフが復元される', async () => {
    const user = userEvent.setup()
    render(<Staff onBack={() => {}} />)
    await user.click(within(rowForName('福田')).getByTitle('完全削除'))
    expect(screen.queryByText('福田')).not.toBeInTheDocument()
    await user.click(screen.getByText('デフォルトに戻す'))
    expect(screen.getByText('福田')).toBeInTheDocument()
  })

  it('戻るボタンでonBackが呼ばれる', async () => {
    const user = userEvent.setup()
    let called = false
    render(<Staff onBack={() => { called = true }} />)
    await user.click(screen.getByText('‹'))
    expect(called).toBe(true)
  })
})
