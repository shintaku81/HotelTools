import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home.jsx'
import { USERS } from '../test/fixtures.js'

// Home.jsx is a synchronous presentational component (no useRooms / no async),
// so we can assert directly after render without waitFor/findBy.

// Labels rendered by the menu grid.
const LEADER_ONLY = ['CO管理', '翌日計画', '計画カレンダー', 'スタッフ', '部屋マスター']
const ALWAYS = ['通常清掃', '当日追加']

function renderHome(overrides = {}) {
  const props = {
    user: USERS.leader,
    onNavigate: vi.fn(),
    onLogout: vi.fn(),
    fontSize: 'medium',
    onFontSize: vi.fn(),
    ...overrides,
  }
  const utils = render(<Home {...props} />)
  return { ...utils, props }
}

describe('Home — user 未指定の堅牢化（意地悪/回帰）', () => {
  it('user 自体が undefined でもクラッシュせず「ゲストさん」と表示する', () => {
    expect(() => renderHome({ user: undefined })).not.toThrow()
    expect(screen.getByText('ゲストさん')).toBeInTheDocument()
  })

  it('name が空文字/空白のみのときも「ゲストさん」にフォールバックする', () => {
    renderHome({ user: { role: 'leader', name: '   ' } })
    expect(screen.getByText('ゲストさん')).toBeInTheDocument()
  })

  it('user={} （role欠落）でも cleaner 相当の制限メニューで描画される', () => {
    renderHome({ user: {} })
    for (const label of ALWAYS) expect(screen.getByText(label)).toBeInTheDocument()
    for (const label of LEADER_ONLY) expect(screen.queryByText(label)).not.toBeInTheDocument()
  })
})

describe('Home — メニュー表示の権限分離', () => {
  it("role='leader' は7メニュー全部表示する", () => {
    renderHome({ user: USERS.leader })
    for (const label of [...ALWAYS, ...LEADER_ONLY]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // 念のためメニューボタン総数=7
    const navButtons = screen.getAllByRole('button').filter(b =>
      [...ALWAYS, ...LEADER_ONLY].some(l => b.textContent.includes(l)),
    )
    expect(navButtons).toHaveLength(7)
  })

  it("role='front' も7メニュー全部表示する(leaderと同等)", () => {
    renderHome({ user: USERS.front })
    for (const label of [...ALWAYS, ...LEADER_ONLY]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("role='cleaner' は通常清掃と当日追加のみ表示する", () => {
    renderHome({ user: USERS.cleaner })
    for (const label of ALWAYS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("role='cleaner' は CO管理/翌日計画/カレンダー/スタッフ/部屋マスター を非表示にする(権限分離)", () => {
    renderHome({ user: USERS.cleaner })
    for (const label of LEADER_ONLY) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('意地悪: 未知のrole(不正データ)は cleaner と同様に制限メニューが見えない', () => {
    // role が 'leader'/'front' 以外なら isLeaderOrFront=false 扱いになるはず。
    renderHome({ user: { name: 'X', role: 'guest' } })
    for (const label of ALWAYS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    for (const label of LEADER_ONLY) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})

describe('Home — ナビゲーション', () => {
  it('メニュークリックで onNavigate(key) が対応するキーで呼ばれる', async () => {
    const user = userEvent.setup()
    const { props } = renderHome({ user: USERS.leader })

    await user.click(screen.getByText('通常清掃'))
    expect(props.onNavigate).toHaveBeenCalledWith('cleaning')

    await user.click(screen.getByText('CO管理'))
    expect(props.onNavigate).toHaveBeenCalledWith('checkout')

    await user.click(screen.getByText('翌日計画'))
    expect(props.onNavigate).toHaveBeenCalledWith('plan')

    await user.click(screen.getByText('計画カレンダー'))
    expect(props.onNavigate).toHaveBeenCalledWith('calendar')

    await user.click(screen.getByText('当日追加'))
    expect(props.onNavigate).toHaveBeenCalledWith('extra')

    await user.click(screen.getByText('スタッフ'))
    expect(props.onNavigate).toHaveBeenCalledWith('staff')

    await user.click(screen.getByText('部屋マスター'))
    expect(props.onNavigate).toHaveBeenCalledWith('roommaster')

    expect(props.onNavigate).toHaveBeenCalledTimes(7)
  })

  it('意地悪: cleaner は制限メニューが存在しないので押せない(onNavigateはCO管理等で呼ばれない)', async () => {
    const user = userEvent.setup()
    const { props } = renderHome({ user: USERS.cleaner })

    await user.click(screen.getByText('当日追加'))
    expect(props.onNavigate).toHaveBeenCalledWith('extra')
    // 制限キーは一度も呼ばれない
    const calledKeys = props.onNavigate.mock.calls.map(c => c[0])
    for (const key of ['checkout', 'plan', 'calendar', 'staff', 'roommaster']) {
      expect(calledKeys).not.toContain(key)
    }
  })
})

describe('Home — フォントサイズ切替', () => {
  it('小/中/大ボタンが表示され、クリックで onFontSize がそのキーで呼ばれる', async () => {
    const user = userEvent.setup()
    const { props } = renderHome({ user: USERS.leader, fontSize: 'medium' })

    const small = screen.getByRole('button', { name: '小' })
    const medium = screen.getByRole('button', { name: '中' })
    const large = screen.getByRole('button', { name: '大' })
    expect(small).toBeInTheDocument()
    expect(medium).toBeInTheDocument()
    expect(large).toBeInTheDocument()

    await user.click(small)
    expect(props.onFontSize).toHaveBeenCalledWith('small')

    await user.click(large)
    expect(props.onFontSize).toHaveBeenCalledWith('large')

    await user.click(medium)
    expect(props.onFontSize).toHaveBeenCalledWith('medium')
  })

  it('フォントサイズクリックで applyFontSize 経由 localStorage に保存される(副作用)', async () => {
    const user = userEvent.setup()
    renderHome({ user: USERS.leader })
    await user.click(screen.getByRole('button', { name: '大' }))
    expect(localStorage.getItem('hotel_font_size')).toBe('large')
  })

  it('意地悪: onFontSize 未指定でもクリックでクラッシュしない(optional chaining)', async () => {
    const user = userEvent.setup()
    render(
      <Home
        user={USERS.leader}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
        fontSize="medium"
        onFontSize={undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: '小' }))
    // クラッシュしなければ後続のアサーションに到達する
    expect(localStorage.getItem('hotel_font_size')).toBe('small')
  })
})

describe('Home — ログアウト / ヘッダ表示', () => {
  it('ログアウトボタンで onLogout が呼ばれる', async () => {
    const user = userEvent.setup()
    const { props } = renderHome({ user: USERS.leader })
    await user.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(props.onLogout).toHaveBeenCalledTimes(1)
  })

  it('ユーザー名が「◯◯さん」で表示される', () => {
    renderHome({ user: USERS.leader })
    // {name} と "さん" は別テキストノードなので部分一致で検証する。
    expect(screen.getByText(/管理者/)).toBeInTheDocument()
    expect(screen.getByText(/さん/)).toBeInTheDocument()
  })

  it('意地悪: name が無いと名前が空の「さん」だけが表示される(本体の改善点)', () => {
    // React は {undefined} を何も描画しないため、表示は "さん"(名前部分が空)になる。
    // 落ちはしないが、誰のホーム画面か分からず不親切。
    // → 本体側でフォールバック表示(例: 「ゲストさん」)が望ましい(レポートに記載)。
    const { container } = renderHome({ user: { role: 'leader' } })
    expect(container.textContent).toContain('さん')
    expect(container.textContent).not.toContain('undefined')
    // 名前なしでもメニュー自体は描画される(クラッシュしない)
    expect(screen.getByText('通常清掃')).toBeInTheDocument()
  })
})
