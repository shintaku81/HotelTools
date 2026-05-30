// Floors.jsx — ステータス遷移ワークフローのブラックボックステスト
// メモリ(フォールバック)モードで動作: useRooms() は generateFallbackRooms() の
// デモ約99室を返す。既知の部屋: 403=cleaning/三浦, 407=cleaned/三浦,
// 202=checkout(清掃待ち,co)/結城, checkout_pending(CO待ち) 多数。
//
// USERS.cleaner = '結城', USERS.leader = '管理者'(role:leader), USERS.front = 'フロント'

import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Floors from './Floors.jsx'
import { USERS } from '../test/fixtures.js'

// 読み込み完了(loading表示が消える)を待ってから操作する。
async function renderFloors(props = {}) {
  const user = userEvent.setup()
  const onLogout = vi.fn()
  const onBack = vi.fn()
  const utils = render(
    <Floors user={USERS.leader} onLogout={onLogout} onBack={onBack} {...props} />
  )
  // ローディング消失 = データ描画完了。ログアウトボタンはロード後ヘッダーに常時出る。
  await screen.findByRole('button', { name: 'ログアウト' })
  // 念のためローディング表示が消えていることを確認
  await waitFor(() =>
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
  )
  return { user, onLogout, onBack, ...utils }
}

// 指定号室の部屋カードを取得(aria-label='○○号室 <ラベル>')。
function roomCard(roomNumber) {
  return screen.getByRole('button', { name: new RegExp(`^${roomNumber}号室`) })
}

// 部屋カードをクリックして詳細モーダルを開く。モーダルのコンテナ要素を返す。
async function openRoom(user, roomNumber) {
  await user.click(roomCard(roomNumber))
  // モーダルのヘッダー見出し '○○号室' が現れる
  const heading = await screen.findByRole('heading', { name: `${roomNumber}号室` })
  return heading
}

describe('Floors — 描画とロード', () => {
  it('読み込み後にデモ室(403/407)が描画され、ローディング表示が消える', async () => {
    // 注: フォールバックモードでは useRooms() が useEffect 内で同期的にデータを
    // 投入するため「読み込み中...」表示はほぼ瞬時に消え観測しづらい。
    // ここでは最終的にデモ室が描画されローディングが消えることを検証する。
    render(<Floors user={USERS.leader} onLogout={() => {}} onBack={() => {}} />)
    expect(await screen.findByRole('button', { name: /403号室/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /407号室/ })).toBeInTheDocument()
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
  })

  it('デモ室の各ステータスがaria-labelに反映される(403=清掃中/407=確認待ち/202=清掃待ち)', async () => {
    await renderFloors()
    expect(roomCard(403)).toHaveAccessibleName('403号室 清掃中')
    expect(roomCard(407)).toHaveAccessibleName('407号室 確認待ち')
    // 202 は早退済みで checkout(co) → 清掃待ち
    expect(roomCard(202)).toHaveAccessibleName('202号室 清掃待ち')
  })

  it('onBack が渡されると戻るボタン(‹)が表示され押すと呼ばれる', async () => {
    const { user, onBack } = await renderFloors()
    const backBtn = screen.getByRole('button', { name: '‹' })
    await user.click(backBtn)
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('Floors — leader: checkout_pCO待ち → CO登録', () => {
  it('leaderが checkout_pending(CO待ち) の部屋を開くと「CO（チェックアウト確認）」が出る', async () => {
    const { user } = await renderFloors()
    // 301 は eco の checkout_pending(CO待ち)
    expect(roomCard(301)).toHaveAccessibleName('301号室 CO待ち')
    await openRoom(user, 301)
    expect(screen.getByRole('button', { name: 'CO（チェックアウト確認）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'エコ清掃で登録（連泊継続）' })).toBeInTheDocument()
  })

  it('「CO（チェックアウト確認）」を押すと checkout(清掃待ち) に遷移しモーダルが閉じる', async () => {
    const { user } = await renderFloors()
    await openRoom(user, 301)
    await user.click(screen.getByRole('button', { name: 'CO（チェックアウト確認）' }))
    // モーダルが閉じる
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '301号室' })).not.toBeInTheDocument()
    )
    // カードのステータスが清掃待ちに変化
    await waitFor(() =>
      expect(roomCard(301)).toHaveAccessibleName('301号室 清掃待ち')
    )
  })

  it('エコ清掃で登録を押すと checkout(清掃待ち)に遷移する', async () => {
    const { user } = await renderFloors()
    await openRoom(user, 302) // 302 = co の checkout_pending(CO待ち)
    expect(roomCard(302)).toHaveAccessibleName('302号室 CO待ち')
    await user.click(screen.getByRole('button', { name: 'エコ清掃で登録（連泊継続）' }))
    await waitFor(() =>
      expect(roomCard(302)).toHaveAccessibleName('302号室 清掃待ち')
    )
  })
})

describe('Floors — checkout(清掃待ち) → 担当する', () => {
  it('leaderが checkout の部屋を開くと「この部屋を担当する」が出る', async () => {
    const { user } = await renderFloors()
    await openRoom(user, 202) // 202 = checkout
    expect(screen.getByRole('button', { name: 'この部屋を担当する' })).toBeInTheDocument()
  })

  it('cleaner(結城)が checkout の部屋を担当すると cleaning(清掃中)になり担当=結城', async () => {
    const { user } = await renderFloors({ user: USERS.cleaner })
    // cleanerは初期フィルタ'mine'。202は結城担当なので見える。
    await openRoom(user, 202)
    await user.click(screen.getByRole('button', { name: 'この部屋を担当する' }))
    await waitFor(() =>
      expect(roomCard(202)).toHaveAccessibleName('202号室 清掃中')
    )
    // 再度開くと担当表示が結城
    await openRoom(user, 202)
    expect(screen.getByText('担当: 結城')).toBeInTheDocument()
  })
})

describe('Floors — cleaning(自分担当) → 清掃完了 → アメニティ記録', () => {
  it('cleaner(結城)が自分の cleaning 部屋で「清掃完了を記録」→アメニティモーダル→記録して完了 で cleaned になる', async () => {
    const { user } = await renderFloors({ user: USERS.cleaner })
    // まず 202(checkout/結城担当) を claim して cleaning/自分担当 にする
    await openRoom(user, 202)
    await user.click(screen.getByRole('button', { name: 'この部屋を担当する' }))
    await waitFor(() =>
      expect(roomCard(202)).toHaveAccessibleName('202号室 清掃中')
    )
    // 再度開く → cleaning かつ自分担当 → 「清掃完了を記録」
    await openRoom(user, 202)
    const completeBtn = screen.getByRole('button', { name: '清掃完了を記録' })
    await user.click(completeBtn)
    // アメニティモーダルが開く
    expect(await screen.findByRole('heading', { name: '202号室 アメニティ記録' })).toBeInTheDocument()
    // 「記録して完了」
    await user.click(screen.getByRole('button', { name: '記録して完了' }))
    await waitFor(() =>
      expect(roomCard(202)).toHaveAccessibleName('202号室 確認待ち')
    )
  })

  it('アメニティモーダルで増減ボタンが0未満にならない(境界値)', async () => {
    const { user } = await renderFloors({ user: USERS.cleaner })
    await openRoom(user, 202)
    await user.click(screen.getByRole('button', { name: 'この部屋を担当する' }))
    await waitFor(() => expect(roomCard(202)).toHaveAccessibleName('202号室 清掃中'))
    await openRoom(user, 202)
    await user.click(screen.getByRole('button', { name: '清掃完了を記録' }))
    await screen.findByRole('heading', { name: '202号室 アメニティ記録' })

    // シャンプー(co既定=1)を2回減らしても0で止まる
    const dec = screen.getByRole('button', { name: 'シャンプーを減らす' })
    await user.click(dec)
    await user.click(dec)
    // 行内のカウント表示が 0
    const row = screen.getByText('シャンプー').closest('div')
    expect(within(row).getByText('0')).toBeInTheDocument()
  })

  it('アメニティモーダルの「キャンセル」で詳細モーダルに戻る(完了しない)', async () => {
    const { user } = await renderFloors({ user: USERS.cleaner })
    await openRoom(user, 202)
    await user.click(screen.getByRole('button', { name: 'この部屋を担当する' }))
    await waitFor(() => expect(roomCard(202)).toHaveAccessibleName('202号室 清掃中'))
    await openRoom(user, 202)
    await user.click(screen.getByRole('button', { name: '清掃完了を記録' }))
    await screen.findByRole('heading', { name: '202号室 アメニティ記録' })
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    // 詳細モーダルに戻る
    expect(await screen.findByRole('heading', { name: '202号室' })).toBeInTheDocument()
    // まだ清掃中(cleaned になっていない)
    expect(roomCard(202)).toHaveAccessibleName('202号室 清掃中')
  })

  it('leaderは他人(三浦)担当の cleaning 部屋でも「清掃完了を記録」と「担当を解除」が出る', async () => {
    const { user } = await renderFloors() // leader
    await openRoom(user, 403) // 403 = cleaning/三浦
    expect(screen.getByRole('button', { name: '清掃完了を記録' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '担当を解除' })).toBeInTheDocument()
  })

  it('leaderが「担当を解除」を押すと checkout(清掃待ち)に戻る', async () => {
    const { user } = await renderFloors()
    await openRoom(user, 403)
    await user.click(screen.getByRole('button', { name: '担当を解除' }))
    await waitFor(() =>
      expect(roomCard(403)).toHaveAccessibleName('403号室 清掃待ち')
    )
  })
})

describe('Floors — cleaned(確認待ち) → 検査完了', () => {
  it('leaderが cleaned(407)を開くと「清掃済みにする（検査完了）」が出て押すと清掃済みになる', async () => {
    const { user } = await renderFloors()
    await openRoom(user, 407) // 407 = cleaned
    const approveBtn = screen.getByRole('button', { name: '清掃済みにする（検査完了）' })
    await user.click(approveBtn)
    await waitFor(() =>
      expect(roomCard(407)).toHaveAccessibleName('407号室 清掃済み')
    )
  })
})

describe('Floors — 権限による操作制限(意地悪/エッジ)', () => {
  it('cleanerには「自動割り当て」「日次初期化」ボタンが出ない', async () => {
    await renderFloors({ user: USERS.cleaner })
    expect(screen.queryByRole('button', { name: '自動割り当て' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '日次初期化' })).not.toBeInTheDocument()
  })

  it('leaderには「自動割り当て」「日次初期化」ボタンが出る', async () => {
    await renderFloors() // leader
    expect(screen.getByRole('button', { name: '自動割り当て' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '日次初期化' })).toBeInTheDocument()
  })

  it('cleanerが checkout_pending(CO待ち)を開いてもCO登録ボタンは出ない(担当ボタンも出ない)', async () => {
    const { user } = await renderFloors({ user: USERS.cleaner })
    // cleanerフィルタは'mine'。318は結城担当のCO待ち。
    expect(roomCard(318)).toHaveAccessibleName('318号室 CO待ち')
    await openRoom(user, 318)
    expect(screen.queryByRole('button', { name: 'CO（チェックアウト確認）' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この部屋を担当する' })).not.toBeInTheDocument()
    // 閉じるボタンのみ操作可能
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })

  it('cleanerが他人(三浦)担当の cleaning 部屋(403)を開いても「清掃完了を記録」は出ない', async () => {
    const { user } = await renderFloors({ user: USERS.cleaner })
    // cleanerは初期フィルタ'mine'のため403(三浦)は見えない。
    // フィルタを「全室」に切り替えて403を表示させる。
    const filter = screen.getByRole('combobox')
    await user.selectOptions(filter, 'all')
    await waitFor(() => expect(screen.queryByRole('button', { name: /403号室/ })).toBeInTheDocument())
    await openRoom(user, 403)
    expect(screen.queryByRole('button', { name: '清掃完了を記録' })).not.toBeInTheDocument()
    // 担当解除も(leader限定)出ない
    expect(screen.queryByRole('button', { name: '担当を解除' })).not.toBeInTheDocument()
  })
})

describe('Floors — front ロール', () => {
  it('frontは checkout_pending でCO/エコ登録ができるが、自動割り当て/日次初期化は出ない', async () => {
    const { user } = await renderFloors({ user: USERS.front })
    await openRoom(user, 301)
    expect(screen.getByRole('button', { name: 'CO（チェックアウト確認）' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '自動割り当て' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '日次初期化' })).not.toBeInTheDocument()
  })
})

describe('Floors — モーダル開閉とログアウト', () => {
  it('「閉じる」で詳細モーダルが閉じる', async () => {
    const { user } = await renderFloors()
    await openRoom(user, 407)
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '407号室' })).not.toBeInTheDocument()
    )
  })

  it('ログアウトボタンで onLogout が呼ばれる', async () => {
    const { user, onLogout } = await renderFloors()
    await user.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
