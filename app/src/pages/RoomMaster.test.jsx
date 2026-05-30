import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomMaster from './RoomMaster.jsx'
import { loadRoomOverrides, loadChangeLog } from '../utils/roomMasterStorage.js'

// Room master screen — black-box behaviour tests.
// RoomMaster does NOT use useRooms(): it reads/writes localStorage directly
// via roomMasterStorage (overrides + change log), so there is no async loading.
// setup.js clears localStorage before each test, giving a clean default state.

const OVERRIDES_KEY = 'hotel_room_overrides'
const LOG_KEY       = 'hotel_room_change_log'

function readOverrides() {
  const raw = localStorage.getItem(OVERRIDES_KEY)
  return raw ? JSON.parse(raw) : {}
}
function readLog() {
  const raw = localStorage.getItem(LOG_KEY)
  return raw ? JSON.parse(raw) : []
}

// Open the edit modal for a given room number by clicking its grid button.
// Each room button contains the room number text; getByRole('button', {name})
// matches the accessible name (room number + type badge text).
async function openRoom(user, roomNum) {
  // The grid button's accessible name starts with the room number.
  // Grid button text is the room number immediately followed by the type
  // badge (e.g. "305S" or "305W変更済"), no separating space — so match the
  // exact number followed by a non-digit (the type token).
  const btns = screen.getAllByRole('button')
  const target = btns.find(b => new RegExp(`^${roomNum}(\\D|$)`).test(b.textContent.trim()))
  expect(target, `room button ${roomNum} should exist`).toBeTruthy()
  await user.click(target)
  // Modal heading confirms it opened.
  return await screen.findByRole('heading', { name: new RegExp(`^${roomNum}号室`) })
}

// Inside the open modal, pick a new room-type by clicking the type button.
// Type buttons are labelled like "S シングル" — match by leading type token.
async function pickType(user, type) {
  const dialogBtns = screen.getAllByRole('button')
  // Type buttons contain the type token followed by its description.
  const btn = dialogBtns.find(b => new RegExp(`^${type}\\b`).test(b.textContent.trim()) &&
    /シングル|セミダブル|ダブル|ツイン|トリプル/.test(b.textContent))
  expect(btn, `type button ${type} should exist in modal`).toBeTruthy()
  await user.click(btn)
}

async function typeChanger(user, name) {
  const input = screen.getByPlaceholderText('例: 田中')
  await user.clear(input)
  if (name) await user.type(input, name)
  return input
}

async function clickSave(user) {
  await user.click(screen.getByRole('button', { name: '変更を保存' }))
}

describe('RoomMaster — 初期表示', () => {
  it('全6フロアの見出しと部屋ボタンを表示する', () => {
    render(<RoomMaster onBack={() => {}} />)
    for (const f of [2, 3, 4, 5, 6, 7]) {
      expect(screen.getByText(`${f}F`)).toBeInTheDocument()
    }
    // 2Fの代表的な部屋番号
    expect(screen.getByRole('button', { name: /^201/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^721/ })).toBeInTheDocument()
  })

  it('オーバーライドが無い部屋にはデフォルトタイプを表示し「変更済」は出ない', () => {
    render(<RoomMaster onBack={() => {}} />)
    // 201 は FLOOR2_DEFAULTS で 'TR'
    const r201 = screen.getByRole('button', { name: /^201/ })
    expect(within(r201).getByText('TR')).toBeInTheDocument()
    expect(within(r201).queryByText('変更済')).not.toBeInTheDocument()
    // 標準階の末尾17/18 は 'T'、末尾1/2/16/19 は 'W'、その他は 'S'
    const r317 = screen.getByRole('button', { name: /^317/ })
    expect(within(r317).getByText('T')).toBeInTheDocument()
    const r301 = screen.getByRole('button', { name: /^301/ })
    expect(within(r301).getByText('W')).toBeInTheDocument()
    const r305 = screen.getByRole('button', { name: /^305/ })
    expect(within(r305).getByText('S')).toBeInTheDocument()
  })

  it('保存済みオーバーライドを反映し「変更済」バッジを表示する', () => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify({ '305': 'W' }))
    render(<RoomMaster onBack={() => {}} />)
    const r305 = screen.getByRole('button', { name: /^305/ })
    expect(within(r305).getByText('W')).toBeInTheDocument()
    expect(within(r305).getByText('変更済')).toBeInTheDocument()
  })

  it('onBack を ‹ ボタンで呼ぶ', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<RoomMaster onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: '‹' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('RoomMaster — タイプ変更フロー', () => {
  it('新タイプ選択＋変更者名入力で保存し、永続化・履歴追加・バッジ表示する', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305) // default 'S'
    // 現在タイプ S が表示されている
    expect(screen.getByText('現在:')).toBeInTheDocument()

    await pickType(user, 'W')
    await typeChanger(user, '田中')
    await clickSave(user)

    // モーダルが閉じる
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^305号室/ })).not.toBeInTheDocument()
    })

    // localStorage に永続化
    expect(readOverrides()['305']).toBe('W')
    const log = readLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ roomNum: '305', oldType: 'S', newType: 'W', changedBy: '田中' })
    expect(typeof log[0].changedAt).toBe('string')

    // グリッドが即時更新され「変更済」が出る
    const r305 = screen.getByRole('button', { name: /^305/ })
    expect(within(r305).getByText('W')).toBeInTheDocument()
    expect(within(r305).getByText('変更済')).toBeInTheDocument()
  })

  it('変更者名が空だとエラーを出し保存しない', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305)
    await pickType(user, 'W')
    // 名前未入力のまま保存
    await clickSave(user)

    expect(await screen.findByText('変更者名を入力してください')).toBeInTheDocument()
    // モーダルは開いたまま
    expect(screen.getByRole('heading', { name: /^305号室/ })).toBeInTheDocument()
    // 何も永続化されない
    expect(readOverrides()['305']).toBeUndefined()
    expect(readLog()).toHaveLength(0)
  })

  it('意地悪: 変更者名が空白のみは無効として扱う', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305)
    await pickType(user, 'W')
    await typeChanger(user, '   ')
    await clickSave(user)

    expect(await screen.findByText('変更者名を入力してください')).toBeInTheDocument()
    expect(readLog()).toHaveLength(0)
  })

  it('変更者名は trim されて保存される', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305)
    await pickType(user, 'W')
    await typeChanger(user, '  佐藤  ')
    await clickSave(user)

    await waitFor(() => expect(readLog()).toHaveLength(1))
    expect(readLog()[0].changedBy).toBe('佐藤')
  })

  it('現在と同じタイプを選んで保存しても履歴を残さずモーダルを閉じる', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305) // default 'S'
    // S のまま（同タイプ）、名前は入力する
    await typeChanger(user, '田中')
    await clickSave(user)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^305号室/ })).not.toBeInTheDocument()
    })
    // オーバーライドも履歴も発生しない
    expect(readOverrides()['305']).toBeUndefined()
    expect(readLog()).toHaveLength(0)
  })

  it('キャンセルすると保存されない', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305)
    await pickType(user, 'T')
    await typeChanger(user, '田中')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^305号室/ })).not.toBeInTheDocument()
    })
    expect(readOverrides()['305']).toBeUndefined()
    expect(readLog()).toHaveLength(0)
  })
})

describe('RoomMaster — 変更履歴', () => {
  it('履歴トグルで履歴パネルを開閉し、空のときは案内文を出す', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await user.click(screen.getByRole('button', { name: '変更履歴' }))
    expect(screen.getByRole('heading', { name: '変更履歴' })).toBeInTheDocument()
    expect(screen.getByText('変更履歴はありません')).toBeInTheDocument()

    // もう一度押すと閉じる
    await user.click(screen.getByRole('button', { name: '変更履歴' }))
    expect(screen.queryByRole('heading', { name: '変更履歴' })).not.toBeInTheDocument()
  })

  it('意地悪: 同一部屋を複数回変更したとき履歴は新しい順(先頭が最新)で並ぶ', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    // 305: S -> W (田中)
    await openRoom(user, 305)
    await pickType(user, 'W')
    await typeChanger(user, '田中')
    await clickSave(user)
    await waitFor(() => expect(readLog()).toHaveLength(1))

    // 305: W -> T (鈴木) ※openRoomで現在タイプがWになっていること
    await openRoom(user, 305)
    await pickType(user, 'T')
    await typeChanger(user, '鈴木')
    await clickSave(user)
    await waitFor(() => expect(readLog()).toHaveLength(2))

    // 305: T -> TR (高橋)
    await openRoom(user, 305)
    await pickType(user, 'TR')
    await typeChanger(user, '高橋')
    await clickSave(user)
    await waitFor(() => expect(readLog()).toHaveLength(3))

    const log = readLog()
    // unshift により先頭が最新
    expect(log.map(l => l.newType)).toEqual(['TR', 'T', 'W'])
    expect(log.map(l => l.oldType)).toEqual(['T', 'W', 'S'])
    expect(log.map(l => l.changedBy)).toEqual(['高橋', '鈴木', '田中'])

    // UI 上でも最新の oldType→newType が反映される
    await user.click(screen.getByRole('button', { name: '変更履歴' }))
    const panel = screen.getByRole('heading', { name: '変更履歴' }).closest('div').parentElement
    // 履歴行に3件分の変更者が表示される
    expect(within(panel).getByText('高橋')).toBeInTheDocument()
    expect(within(panel).getByText('鈴木')).toBeInTheDocument()
    expect(within(panel).getByText('田中')).toBeInTheDocument()

    // 最終的なオーバーライドは TR
    expect(readOverrides()['305']).toBe('TR')
    const r305 = screen.getByRole('button', { name: /^305/ })
    expect(within(r305).getByText('TR')).toBeInTheDocument()
  })

  it('再オープン時に現在タイプは直近のオーバーライド値になる', async () => {
    const user = userEvent.setup()
    render(<RoomMaster onBack={() => {}} />)

    await openRoom(user, 305) // S
    await pickType(user, 'W')
    await typeChanger(user, '田中')
    await clickSave(user)
    await waitFor(() => expect(readOverrides()['305']).toBe('W'))

    // 再オープン → 現在タイプ表示が W
    await openRoom(user, 305)
    // モーダル内「現在:」の段落に直近オーバーライド W バッジが入っている。
    // 型選択ボタンにも "W" があるため、「現在:」段落に限定して検証する。
    const currentLine = screen.getByText('現在:').closest('p')
    expect(within(currentLine).getByText('W')).toBeInTheDocument()
  })

  it('既存の履歴(localStorage)を読み込んで表示する', async () => {
    const user = userEvent.setup()
    const seeded = [
      { roomNum: '410', oldType: 'S', newType: 'T', changedBy: '既存者', changedAt: '2026-05-29T10:30:00.000Z' },
    ]
    localStorage.setItem(LOG_KEY, JSON.stringify(seeded))
    render(<RoomMaster onBack={() => {}} />)

    await user.click(screen.getByRole('button', { name: '変更履歴' }))
    // 変更者名は履歴パネルにしか出ないので一意。"410" は部屋グリッドにも
    // 出るためパネル内に限定して検証する。
    const changer = screen.getByText('既存者')
    const logRow = changer.closest('div.px-4')
    expect(logRow).toBeTruthy()
    expect(within(logRow).getByText('410')).toBeInTheDocument()
    expect(within(logRow).getByText('T')).toBeInTheDocument()
  })
})

describe('RoomMaster — 不正データ/堅牢性', () => {
  it('オーバーライドのJSONが壊れていても落ちずにデフォルト表示する', () => {
    localStorage.setItem(OVERRIDES_KEY, '{壊れたJSON')
    localStorage.setItem(LOG_KEY, 'not-json')
    expect(() => render(<RoomMaster onBack={() => {}} />)).not.toThrow()
    // デフォルトタイプで描画される
    const r305 = screen.getByRole('button', { name: /^305/ })
    expect(within(r305).getByText('S')).toBeInTheDocument()
  })

  it('storage: クリーン状態では overrides/log が空である', () => {
    // setup.js が beforeEach で localStorage を消すので初期状態は空。
    expect(loadRoomOverrides()).toEqual({})
    expect(loadChangeLog()).toEqual([])
  })
})
