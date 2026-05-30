import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'

// Black-box tests for Login.jsx.
// Modes:
//  - staff (default): staff/1234 → name-select screen → onLogin({role:'cleaner', name})
//  - admin: admin/admin → immediate onLogin({role:'leader', name:'管理者'})

// Helpers to grab fields by their visible labels.
function getIdInput() {
  return screen.getByPlaceholderText('例: staff')
}
function getPwInput() {
  return screen.getByPlaceholderText('パスワードを入力')
}
function getLoginButton() {
  return screen.getByRole('button', { name: 'ログイン' })
}

describe('Login - staff mode', () => {
  it('staff/1234 で認証すると名前選択画面に進む', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    // Name-select screen appears, onLogin not yet called.
    expect(await screen.findByText('あなたの名前を選んでください')).toBeInTheDocument()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('名前選択画面でプリセット名を選んで入室すると onLogin({role:cleaner, name}) が呼ばれる', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    await screen.findByText('あなたの名前を選んでください')
    await user.click(screen.getByRole('button', { name: '結城' }))
    await user.click(screen.getByRole('button', { name: 'この名前で入室する' }))

    expect(onLogin).toHaveBeenCalledTimes(1)
    expect(onLogin).toHaveBeenCalledWith({ role: 'cleaner', name: '結城' })
  })

  it('名前選択画面は直接入力した名前でも入室できる(trimされる)', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    await screen.findByText('あなたの名前を選んでください')
    const nameInput = screen.getByPlaceholderText('または直接入力')
    await user.type(nameInput, '  山田  ')
    await user.click(screen.getByRole('button', { name: 'この名前で入室する' }))

    expect(onLogin).toHaveBeenCalledWith({ role: 'cleaner', name: '山田' })
  })

  it('名前未入力では「入室する」ボタンがdisabled', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    await screen.findByText('あなたの名前を選んでください')
    expect(screen.getByRole('button', { name: 'この名前で入室する' })).toBeDisabled()
  })

  it('意地悪: 空白のみの名前ではdisabledのままで onLogin されない', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    await screen.findByText('あなたの名前を選んでください')
    const nameInput = screen.getByPlaceholderText('または直接入力')
    await user.type(nameInput, '   ')
    const confirmBtn = screen.getByRole('button', { name: 'この名前で入室する' })
    expect(confirmBtn).toBeDisabled()
    await user.click(confirmBtn)
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('意地悪: ID " STAFF " (大文字+前後空白) でも小文字化・trimされて認証が通る', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), ' STAFF ')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    expect(await screen.findByText('あなたの名前を選んでください')).toBeInTheDocument()
  })
})

describe('Login - admin mode', () => {
  it('admin/admin で認証すると即 onLogin({role:leader, name:管理者})', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="admin" />)

    await user.type(getIdInput(), 'admin')
    await user.type(getPwInput(), 'admin')
    await user.click(getLoginButton())

    expect(onLogin).toHaveBeenCalledTimes(1)
    expect(onLogin).toHaveBeenCalledWith({ role: 'leader', name: '管理者' })
    // No name-select screen for admin.
    expect(screen.queryByText('あなたの名前を選んでください')).not.toBeInTheDocument()
  })

  it('adminモードでは admin のヒント文が表示される', () => {
    render(<Login onLogin={vi.fn()} mode="admin" />)
    expect(screen.getByText('スタッフ用:')).toBeInTheDocument()
  })

  it('意地悪: adminモードで staff/1234 (別モードの正解) は通らない', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="admin" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    expect(onLogin).not.toHaveBeenCalled()
    expect(screen.getByText('IDまたはパスワードが違います')).toBeInTheDocument()
  })
})

describe('Login - 認証失敗', () => {
  it('誤ったIDではエラーメッセージが表示され onLogin されない', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'wrong')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())

    expect(screen.getByText('IDまたはパスワードが違います')).toBeInTheDocument()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('誤ったパスワードではエラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '0000')
    await user.click(getLoginButton())

    expect(screen.getByText('IDまたはパスワードが違います')).toBeInTheDocument()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('意地悪: パスワードは大文字小文字を区別する(ADMINは通らない)', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="admin" />)

    await user.type(getIdInput(), 'admin')
    await user.type(getPwInput(), 'ADMIN')
    await user.click(getLoginButton())

    expect(screen.getByText('IDまたはパスワードが違います')).toBeInTheDocument()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('エラー表示後にID入力を変えるとエラーが消える', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)

    await user.type(getIdInput(), 'wrong')
    await user.type(getPwInput(), 'bad')
    await user.click(getLoginButton())
    expect(screen.getByText('IDまたはパスワードが違います')).toBeInTheDocument()

    await user.type(getIdInput(), 'x')
    expect(screen.queryByText('IDまたはパスワードが違います')).not.toBeInTheDocument()
  })
})

describe('Login - ボタンdisabled制御', () => {
  it('ID/PW空ではログインボタンがdisabled', () => {
    render(<Login onLogin={vi.fn()} mode="staff" />)
    expect(getLoginButton()).toBeDisabled()
  })

  it('IDのみ入力ではまだdisabled', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)
    await user.type(getIdInput(), 'staff')
    expect(getLoginButton()).toBeDisabled()
  })

  it('PWのみ入力ではまだdisabled', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)
    await user.type(getPwInput(), '1234')
    expect(getLoginButton()).toBeDisabled()
  })

  it('意地悪: IDが空白のみではdisabled(trimで空判定)', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)
    await user.type(getIdInput(), '   ')
    await user.type(getPwInput(), '1234')
    expect(getLoginButton()).toBeDisabled()
  })

  it('ID/PW両方入力でenabledになる', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)
    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    expect(getLoginButton()).toBeEnabled()
  })
})

describe('Login - パスワード表示トグル', () => {
  it('初期状態はパスワードが隠れている(type=password)で「表示」ボタンがある', () => {
    render(<Login onLogin={vi.fn()} mode="staff" />)
    expect(getPwInput()).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: '表示' })).toBeInTheDocument()
  })

  it('「表示」を押すと type=text になり、ボタンが「隠す」に変わる', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)

    await user.click(screen.getByRole('button', { name: '表示' }))
    expect(getPwInput()).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: '隠す' })).toBeInTheDocument()
  })

  it('再度トグルすると password に戻る', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={vi.fn()} mode="staff" />)

    await user.click(screen.getByRole('button', { name: '表示' }))
    await user.click(screen.getByRole('button', { name: '隠す' }))
    expect(getPwInput()).toHaveAttribute('type', 'password')
  })

  it('表示トグルボタンはtype=buttonでフォーム送信を起こさない', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="staff" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(screen.getByRole('button', { name: '表示' }))
    // トグルしただけで認証は走らない。
    expect(onLogin).not.toHaveBeenCalled()
    expect(screen.queryByText('あなたの名前を選んでください')).not.toBeInTheDocument()
  })
})

describe('Login - 表示要素', () => {
  it('staffモードではタイトルとヒントが表示される', () => {
    render(<Login onLogin={vi.fn()} mode="staff" />)
    expect(screen.getByText('ホテルパコジュニア 北見')).toBeInTheDocument()
    expect(screen.getByText('管理者用:')).toBeInTheDocument()
  })

  it('mode未指定(デフォルト)でも staff として動作する', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())
    expect(await screen.findByText('あなたの名前を選んでください')).toBeInTheDocument()
  })

  it('意地悪: 不正なmode値でもクラッシュせず staff にフォールバックして認証が通る', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} mode="bogus" />)

    await user.type(getIdInput(), 'staff')
    await user.type(getPwInput(), '1234')
    await user.click(getLoginButton())
    expect(await screen.findByText('あなたの名前を選んでください')).toBeInTheDocument()
  })
})
