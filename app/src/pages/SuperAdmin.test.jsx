import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdmin from './SuperAdmin.jsx'
import { loadHotels } from '../config/hotelRegistry.js'

beforeEach(() => localStorage.clear())

describe('SuperAdmin — 初期表示', () => {
  it('マグロボのコンソールと既定ホテルを表示する', () => {
    render(<SuperAdmin onLogout={vi.fn()} />)
    expect(screen.getByText('ホテル管理コンソール')).toBeInTheDocument()
    expect(screen.getByText('ホテルパコジュニア 北見')).toBeInTheDocument()
    // 横断サマリ + カードの双方に 99(室) が現れる
    expect(screen.getAllByText('99').length).toBeGreaterThan(0)
    expect(screen.getByText('総客室数')).toBeInTheDocument()
  })

  it('ログアウトボタンで onLogout が呼ばれる', async () => {
    const onLogout = vi.fn()
    const user = userEvent.setup()
    render(<SuperAdmin onLogout={onLogout} />)
    await user.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogout).toHaveBeenCalled()
  })
})

describe('SuperAdmin — ホテル追加', () => {
  it('名前とフロア構成を入力して新ホテルを登録できる', async () => {
    const user = userEvent.setup()
    render(<SuperAdmin onLogout={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '＋ ホテル追加' }))
    await user.type(screen.getByPlaceholderText('例: ホテルパコ 札幌'), 'パコ札幌')
    await user.type(screen.getByLabelText('フロア1の階数'), '3')
    await user.type(screen.getByLabelText('フロア1の室数'), '10')
    await user.click(screen.getByRole('button', { name: 'このホテルを登録' }))

    // 登録され一覧に出る（名前とID表示で複数ヒット）+ 永続化
    expect((await screen.findAllByText('パコ札幌')).length).toBeGreaterThan(0)
    const persisted = loadHotels().find(h => h.name === 'パコ札幌')
    expect(persisted).toBeTruthy()
    expect(persisted.floors[0].rooms).toHaveLength(10)
  })

  it('意地悪: ホテル名が空だとエラーで登録されない', async () => {
    const user = userEvent.setup()
    render(<SuperAdmin onLogout={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '＋ ホテル追加' }))
    await user.type(screen.getByLabelText('フロア1の階数'), '2')
    await user.type(screen.getByLabelText('フロア1の室数'), '5')
    await user.click(screen.getByRole('button', { name: 'このホテルを登録' }))
    expect(screen.getByText('ホテル名を入力してください')).toBeInTheDocument()
    expect(loadHotels()).toHaveLength(1)
  })

  it('意地悪: フロア未入力だとエラー', async () => {
    const user = userEvent.setup()
    render(<SuperAdmin onLogout={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '＋ ホテル追加' }))
    await user.type(screen.getByPlaceholderText('例: ホテルパコ 札幌'), '不完全ホテル')
    await user.click(screen.getByRole('button', { name: 'このホテルを登録' }))
    expect(screen.getByText('フロアと室数を1つ以上入力してください')).toBeInTheDocument()
  })

  it('フロア行を追加して複数フロア構成にできる', async () => {
    const user = userEvent.setup()
    render(<SuperAdmin onLogout={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '＋ ホテル追加' }))
    await user.type(screen.getByPlaceholderText('例: ホテルパコ 札幌'), '多層ホテル')
    await user.type(screen.getByLabelText('フロア1の階数'), '1')
    await user.type(screen.getByLabelText('フロア1の室数'), '4')
    await user.click(screen.getByRole('button', { name: '＋ フロアを追加' }))
    await user.type(screen.getByLabelText('フロア2の階数'), '2')
    await user.type(screen.getByLabelText('フロア2の室数'), '6')
    await user.click(screen.getByRole('button', { name: 'このホテルを登録' }))

    const h = loadHotels().find(x => x.name === '多層ホテル')
    expect(h.floors).toHaveLength(2)
    expect(h.floors[1].rooms).toHaveLength(6)
  })
})

describe('SuperAdmin — 削除ガード', () => {
  it('ホテルが1件のときは削除ボタンが無効', () => {
    render(<SuperAdmin onLogout={vi.fn()} />)
    // 1ホテルのみ → 削除ボタンはちょうど1つで、無効
    const delBtn = screen.getByRole('button', { name: '削除' })
    expect(delBtn).toBeDisabled()
  })
})
