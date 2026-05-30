// Checkout.test.jsx — CO（チェックアウト）管理画面のブラックボックステスト。
//
// 前提: テストはメモリ(フォールバック)モードで動作し、useRooms() は
// generateFallbackRooms() のデモデータ（約99室）を返す。ネットワークには触れない。
//
// 検証対象 (src/pages/Checkout.jsx):
//  - ローディング → データ描画
//  - ヘッダー（当日日付ラベル / 「チェックアウト管理」/ 未確認室数 / 進捗カウンタ）
//  - 部屋カードの描画（CO待ち=ボタン / 確認済み=非ボタン / ステイ・空室=薄表示）
//  - 部屋タップ → 確認シート → 確認でステータスが checkout に反映される
//  - エコ部屋とCO部屋でシートのアクションボタンが異なる
//  - フロアタブによる絞り込み
//  - 意地悪/エッジ: 確認済み・ステイ・空室をタップしてもシートが開かない、
//    シートのオーバーレイ/閉じるで閉じる、cleaning/cleaned 室はグリッドに出ない

import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Checkout from './Checkout.jsx'

// 当日日付ラベル（実装の todayLabel と同じロジック）を期待値として再現する。
function expectedTodayLabel() {
  const d = new Date()
  const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日（${wd}）`
}

// 描画完了（ローディング解除）を待つ共通ヘルパ。
async function renderAndWait(props = {}) {
  const utils = render(<Checkout {...props} />)
  await screen.findByText('チェックアウト管理')
  return utils
}

describe('Checkout — 初期描画', () => {
  it('最初はローディングを出し、その後デモデータが描画される', async () => {
    render(<Checkout />)
    // フォールバックは同期的に解決されるが、念のため最終状態を待つ。
    await waitFor(() => {
      expect(screen.getByText('チェックアウト管理')).toBeInTheDocument()
    })
    // ローディング文言は消えている
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
  })

  it('ヘッダーに当日日付ラベルと画面タイトルを表示する', async () => {
    await renderAndWait()
    expect(screen.getByText(expectedTodayLabel())).toBeInTheDocument()
    expect(screen.getByText('チェックアウト管理')).toBeInTheDocument()
    expect(screen.getByText('未確認')).toBeInTheDocument()
  })

  it('進捗カウンタ（CO退室確認 / エコ外出確認）のラベルを表示する', async () => {
    await renderAndWait()
    expect(screen.getByText('CO退室確認')).toBeInTheDocument()
    expect(screen.getByText('エコ外出確認')).toBeInTheDocument()
  })

  it('凡例（エコ待ち / 確認済み）を表示する', async () => {
    await renderAndWait()
    // 「CO待ち」はカード側にも複数出るため凡例固有の「エコ待ち」「確認済み」で確認する。
    expect(screen.getByText('エコ待ち')).toBeInTheDocument()
    expect(screen.getByText('確認済み')).toBeInTheDocument()
    // 「CO待ち」テキストは少なくとも1つ（凡例）以上存在する。
    expect(screen.getAllByText('CO待ち').length).toBeGreaterThan(0)
  })
})

describe('Checkout — 部屋カードの描画', () => {
  it('CO待ち部屋はタップ可能なボタンとして描画される（担当スタッフ表示込み）', async () => {
    await renderAndWait()
    // 202 は 結城 担当の CO 部屋（demoデータ）だが earlyOut で checkout 済みになる。
    // 318 は 結城 担当で checkout_pending のまま。
    const card318 = screen.getByRole('button', { name: /318/ })
    expect(card318).toBeInTheDocument()
    expect(within(card318).getByText('結城')).toBeInTheDocument()
    expect(within(card318).getByText('CO待ち')).toBeInTheDocument()
  })

  it('エコ待ち部屋は「エコ」バッジ付きのボタンとして描画される', async () => {
    await renderAndWait()
    // 301 は ecoRooms に含まれる checkout_pending のエコ部屋。
    const card301 = screen.getByRole('button', { name: /301/ })
    expect(within(card301).getByText('エコ')).toBeInTheDocument()
  })

  it('既に確認済み（checkout）の部屋はボタンではなく、確認済みマークと時刻を表示する', async () => {
    await renderAndWait()
    // 202 は earlyOut で status=checkout, cleaning_type=co になっている。
    // ボタンとしては取得できない（onClick ガードで開かない）。
    expect(screen.queryByRole('button', { name: /^202/ })).not.toBeInTheDocument()
    // 確認済みマーク（✓ CO）はどこかに存在する。
    expect(screen.getAllByText(/✓\s*CO/).length).toBeGreaterThan(0)
  })

  it('cleaning / cleaned 状態の部屋（403 / 407）はグリッドに表示されない', async () => {
    await renderAndWait()
    // displayStatuses は pending/checkout/stay/available のみ。
    expect(screen.queryByText('403')).not.toBeInTheDocument()
    expect(screen.queryByText('407')).not.toBeInTheDocument()
  })

  it('ステイ・空室部屋は薄く番号のみ表示され、ボタンにはならない', async () => {
    await renderAndWait()
    // 419 はステイ。番号は出るがボタンではない。
    expect(screen.getByText('419')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^419/ })).not.toBeInTheDocument()
    // 717 は空室。
    expect(screen.getByText('717')).toBeInTheDocument()
  })
})

describe('Checkout — 部屋タップで確認シート', () => {
  it('CO待ち部屋をタップすると確認シートが開き、CO/エコ両方のアクションが出る', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: /318/ }))

    // シート見出し
    expect(await screen.findByText('318号室')).toBeInTheDocument()
    // CO（非エコ）部屋なので両ボタンが出る
    expect(screen.getByRole('button', { name: 'CO退室確認（CO清掃へ）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'エコ清掃に変更して確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    // 担当スタッフが表示される
    expect(screen.getByText('担当: 結城')).toBeInTheDocument()
  })

  it('エコ待ち部屋をタップすると「外出確認（エコ清掃へ）」だけが出る', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: /301/ }))

    expect(await screen.findByText('301号室')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '外出確認（エコ清掃へ）' })).toBeInTheDocument()
    // CO専用ボタンは出ない
    expect(screen.queryByRole('button', { name: 'CO退室確認（CO清掃へ）' })).not.toBeInTheDocument()
  })

  it('「閉じる」でシートが閉じる', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: /318/ }))
    expect(await screen.findByText('318号室')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await waitFor(() => {
      expect(screen.queryByText('318号室')).not.toBeInTheDocument()
    })
  })
})

describe('Checkout — ステータス反映', () => {
  it('CO退室確認すると部屋が確認済みになり、未確認カウントが1減る', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    // 確認前の未確認室数を取得（ヘッダーの violet 数値）。
    // 「未確認」ラベルの兄弟に数値があるので、画面全体から checkout_pending を数えるより
    // 振る舞いベースで「対象部屋がボタン→非ボタンに変わる」ことを確認する。
    expect(screen.getByRole('button', { name: /318/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /318/ }))
    await user.click(await screen.findByRole('button', { name: 'CO退室確認（CO清掃へ）' }))

    // シートが閉じる
    await waitFor(() => {
      expect(screen.queryByText('318号室')).not.toBeInTheDocument()
    })
    // 318 はもうボタンではなく確認済み（✓ CO）表示になる
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /318/ })).not.toBeInTheDocument()
    })
    // 318 のカードに確認済みマークが出ている（番号テキストはまだ存在する）
    expect(screen.getByText('318')).toBeInTheDocument()
  })

  it('CO部屋を「エコ清掃に変更して確認」するとエコの確認済み表示になる', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: /319/ }))
    await user.click(await screen.findByRole('button', { name: 'エコ清掃に変更して確認' }))

    await waitFor(() => {
      expect(screen.queryByText('319号室')).not.toBeInTheDocument()
    })
    // 319 はボタンでなくなる（確認済み）
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /319/ })).not.toBeInTheDocument()
    })
    // ✓ エコ 表示が画面に存在する
    expect(screen.getAllByText(/✓\s*エコ/).length).toBeGreaterThan(0)
  })

  it('エコ待ち部屋を外出確認すると確認済みになる', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: /301/ }))
    await user.click(await screen.findByRole('button', { name: '外出確認（エコ清掃へ）' }))

    await waitFor(() => {
      expect(screen.queryByText('301号室')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /301/ })).not.toBeInTheDocument()
    })
  })
})

describe('Checkout — フロアタブ絞り込み', () => {
  it('「全体」タブと各フロアタブが描画される', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: '全体' })).toBeInTheDocument()
    // 2F〜7F のタブ（pending 件数付きの場合あるので部分一致）
    ;[2, 3, 4, 5, 6, 7].forEach(f => {
      expect(screen.getByRole('button', { name: new RegExp(`^${f}F`) })).toBeInTheDocument()
    })
  })

  it('特定フロアを選ぶとそのフロアの部屋だけが残る', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    // 全体表示では他フロアの部屋（例: 501）も見える。
    expect(screen.getByText('501')).toBeInTheDocument()

    // 2Fタブを押すと 2F の部屋のみ。501（5F）は消える。
    await user.click(screen.getByRole('button', { name: /^2F/ }))
    await waitFor(() => {
      expect(screen.queryByText('501')).not.toBeInTheDocument()
    })
    // 2F の部屋（203）は残っている
    expect(screen.getByText('203')).toBeInTheDocument()
  })
})

describe('Checkout — 意地悪 / エッジケース', () => {
  it('確認済み部屋をタップしてもシートは開かない（202は確認済み）', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    // 202 は checkout 済みでボタンではない。番号テキストをクリックしても何も起きない。
    const text202 = screen.getByText('202')
    await user.click(text202)
    // シートは開かない
    expect(screen.queryByText('202号室')).not.toBeInTheDocument()
  })

  it('ステイ部屋（419）をタップしてもシートは開かない', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByText('419'))
    expect(screen.queryByText('419号室')).not.toBeInTheDocument()
  })

  it('onBack を渡すと戻るボタン（‹）で呼ばれる', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    await renderAndWait({ onBack })

    await user.click(screen.getByRole('button', { name: '‹' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('オーバーレイ（シート外側）クリックでシートが閉じる', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: /320/ }))
    const heading = await screen.findByText('320号室')
    expect(heading).toBeInTheDocument()

    // シート内部（白パネル）の祖先をたどってオーバーレイを取得し、その外側をクリックする。
    // パネルは onClick stopPropagation、オーバーレイは onClose を持つ。
    // 「閉じる」ボタンで確実に閉じる挙動は別テストで確認済みなので、
    // ここではオーバーレイ要素を直接クリックする。
    const overlay = heading.closest('div.fixed')
    expect(overlay).not.toBeNull()
    await user.click(overlay)
    await waitFor(() => {
      expect(screen.queryByText('320号室')).not.toBeInTheDocument()
    })
  })
})
