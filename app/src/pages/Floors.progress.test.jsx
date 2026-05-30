// Floors.jsx の集計 / フィルター / 進捗ダッシュボード / リーダー操作系を
// ブラックボックス視点でテストする（ワークフロー遷移は Floors.test.jsx 側を想定し、
// こちらは「見えている数値・絞り込み・トースト」に集中する）。
//
// テストはメモリ(フォールバック)モードで動く（vite.config.js test.env で
// VITE_SUPABASE_URL='' 固定）。useRooms() は generateFallbackRooms() のデモ
// データ（約99室）を返す。デモデータの既知の内訳（2026/05/23 デモ）:
//   stay(在室中)     : 419,610,621,702,706,716,719            = 7
//   available(清掃済): 717                                    = 1
//   cleaning(清掃中) : 403                                    = 1
//   cleaned(確認待ち): 407                                    = 1
//   checkout(清掃待ち): 202,305,501（朝の早退で登録済み）     = 3
//   checkout_pending : 残り（CO待ち）

import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Floors from './Floors.jsx'
import { USERS, seedStaff } from '../test/fixtures.js'

// デモ部屋が描画されるまで待つ（loading→データ）。
async function renderFloors(user) {
  const utils = render(<Floors user={user} onLogout={() => {}} onBack={() => {}} />)
  // StatsBar の「件」付きバッジが出るまで待つ（loading解除の安定指標）。
  await waitFor(() => expect(statBadgeCount('在室中')).not.toBeNull())
  return utils
}

// StatsBar のバッジ数値を取得する。ステータスのラベル文字列（在室中/CO待ち等）は
// RoomCard 上にも出現するため、「<label> <n>件」という StatsBar 固有の形にだけ
// マッチする関数マッチャで取得し、カードの同名ラベルと混同しないようにする。
function statBadgeCount(label) {
  const re = new RegExp(`^${label}\\s*\\d+件$`)
  const matches = screen.queryAllByText((_content, el) => {
    if (!el) return false
    // span 直下のテキストノードと <span>数字</span> をまとめた textContent で判定。
    return re.test(el.textContent.replace(/\s+/g, ' ').trim()) &&
      // 親に同じテキストが伝播するのを避け、最末端の StatBadge span のみ拾う
      Array.from(el.children).every(c => c.tagName === 'SPAN' && /^\d+$/.test(c.textContent))
  })
  if (matches.length === 0) return null
  const txt = matches[0].textContent.replace(/[^0-9]/g, '')
  return Number(txt)
}

describe('Floors — StatsBar 集計', () => {
  it('各ステータスの件数バッジが既知のデモ内訳で表示される', async () => {
    await renderFloors(USERS.leader)

    // 6つのステータスバッジが全て StatsBar に存在する。
    expect(statBadgeCount('在室中')).not.toBeNull()
    expect(statBadgeCount('CO待ち')).not.toBeNull()
    expect(statBadgeCount('清掃待ち')).not.toBeNull()
    expect(statBadgeCount('清掃中')).not.toBeNull()
    expect(statBadgeCount('確認待ち')).not.toBeNull()
    expect(statBadgeCount('清掃済み')).not.toBeNull()

    // 既知のデモ件数。在室中=7 / 清掃中=1 / 確認待ち=1 / 清掃済み=1 / 清掃待ち=3。
    expect(statBadgeCount('在室中')).toBe(7)
    expect(statBadgeCount('清掃中')).toBe(1)
    expect(statBadgeCount('確認待ち')).toBe(1)
    expect(statBadgeCount('清掃済み')).toBe(1)
    expect(statBadgeCount('清掃待ち')).toBe(3)
  })

  it('StatsBar は担当フィルターに関係なく全室を集計する（rooms 全体）', async () => {
    // cleaner の初期 filterMode は 'mine' だが、StatsBar は rooms（全室）を見る。
    await renderFloors(USERS.cleaner)
    expect(statBadgeCount('在室中')).toBe(7)
  })
})

describe('Floors — フロアタブ切替', () => {
  it('「進捗」タブで進捗ダッシュボード（本日の清掃進捗・担当者別清掃数）が表示される', async () => {
    const user = userEvent.setup()
    await renderFloors(USERS.leader)

    // 初期は「全体」。ダッシュボード見出しはまだ無い。
    expect(screen.queryByText('本日の清掃進捗')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '進捗' }))

    expect(await screen.findByText('本日の清掃進捗')).toBeInTheDocument()
    expect(screen.getByText('担当者別 清掃数')).toBeInTheDocument()
    // ダッシュボードの3つの大きな指標ラベル
    expect(screen.getByText('清掃完了')).toBeInTheDocument()
    expect(screen.getByText('本日計画')).toBeInTheDocument()
  })

  it('進捗ダッシュボードには担当者別バーが出る（デモでは三浦が清掃中/完了を持つ）', async () => {
    const user = userEvent.setup()
    await renderFloors(USERS.leader)
    await user.click(screen.getByRole('button', { name: '進捗' }))
    await screen.findByText('担当者別 清掃数')

    // 403(cleaning)/407(cleaned) の assigned_staff は三浦。担当者別に名前が出る。
    expect(screen.getByText('三浦')).toBeInTheDocument()
  })

  it('「2F」タブ選択時はそのフロアの部屋だけ表示される', async () => {
    const user = userEvent.setup()
    await renderFloors(USERS.leader)

    // 初期(全体)では3F以上の部屋も描画されている。
    expect(screen.getByLabelText(/301号室/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /2F/ }))

    // 2F の部屋（201〜211）は表示、3F以上は非表示。
    await waitFor(() => {
      expect(screen.getByLabelText(/201号室/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/301号室/)).not.toBeInTheDocument()
    })
  })

  it('フロアタブのバッジは清掃が必要な部屋数（>0で赤表示）を出す', async () => {
    await renderFloors(USERS.leader)
    // 2F タブには清掃待ち系の部屋が存在するため (n) バッジが出る。
    const tab2f = screen.getByRole('button', { name: /2F/ })
    expect(tab2f.textContent).toMatch(/\(\d+\)/)
  })
})

describe('Floors — 担当フィルター', () => {
  it('cleaner は初期 mine 表示で、自分(結城)の担当室のみ表示される', async () => {
    seedStaff() // 結城/戸田/森山 を active に
    await renderFloors(USERS.cleaner) // name: 結城

    // 結城担当の部屋（例:202）は表示され、三浦担当の部屋（403）は表示されない。
    await waitFor(() => {
      expect(screen.getByLabelText(/202号室/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/403号室/)).not.toBeInTheDocument()
    })
  })

  it('cleaner がフィルターを「全室」にすると他スタッフの部屋も見える', async () => {
    const u = userEvent.setup()
    seedStaff()
    await renderFloors(USERS.cleaner)

    const select = screen.getByRole('combobox')
    await u.selectOptions(select, 'all')

    await waitFor(() => {
      // 三浦担当の403も表示される
      expect(screen.getByLabelText(/403号室/)).toBeInTheDocument()
    })
  })

  it('leader はフィルターで特定スタッフ名を選べ、その担当室だけ絞り込まれる', async () => {
    const u = userEvent.setup()
    seedStaff([
      { name: '三浦', target: 10, active: true, retired: false },
      { name: '結城', target: 11, active: true, retired: false },
    ])
    await renderFloors(USERS.leader) // name: 管理者

    const select = screen.getByRole('combobox')
    // 三浦オプションが存在する（leader はスタッフ名を選べる）
    await u.selectOptions(select, '三浦')

    await waitFor(() => {
      // 三浦担当の403は表示、結城担当の202は非表示
      expect(screen.getByLabelText(/403号室/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/202号室/)).not.toBeInTheDocument()
    })
  })

  it('意地悪: leader が「自分(管理者)」で絞ると担当0なので部屋が1つも出ない', async () => {
    const u = userEvent.setup()
    seedStaff()
    await renderFloors(USERS.leader) // 管理者は誰の担当でもない

    const select = screen.getByRole('combobox')
    await u.selectOptions(select, 'mine')

    await waitFor(() => {
      // どの号室カードも存在しない
      expect(screen.queryByLabelText(/号室/)).not.toBeInTheDocument()
    })
  })
})

describe('Floors — leader 操作（トースト）', () => {
  it('自動割り当てボタン押下で「N室をM名に自動割り当てしました」トーストが出る', async () => {
    const u = userEvent.setup()
    seedStaff() // 結城/戸田/森山 = 出勤3名
    await renderFloors(USERS.leader)

    await u.click(screen.getByRole('button', { name: '自動割り当て' }))

    // 「○室を3名に自動割り当てしました」（割り当て対象は未割当の checkout_pending/checkout）
    expect(await screen.findByText(/室を3名に自動割り当てしました/)).toBeInTheDocument()
  })

  it('意地悪: 出勤スタッフ0名のとき自動割り当ては「出勤スタッフがいません」を出す', async () => {
    const u = userEvent.setup()
    seedStaff([]) // 保存リスト空 → 既定スタッフは全て非アクティブ扱い → 出勤0名
    await renderFloors(USERS.leader)

    await u.click(screen.getByRole('button', { name: '自動割り当て' }))

    expect(await screen.findByText('出勤スタッフがいません')).toBeInTheDocument()
    // 割り当て成功トーストは出ない
    expect(screen.queryByText(/自動割り当てしました/)).not.toBeInTheDocument()
  })

  it('日次初期化ボタン→confirm(true)→「全室をCO待ちにリセットしました」トースト＆全室CO待ち', async () => {
    const u = userEvent.setup()
    // jsdom の window.confirm は未実装で例外を投げるため明示的に true へ差し替える。
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedStaff()
    await renderFloors(USERS.leader)

    await u.click(screen.getByRole('button', { name: '日次初期化' }))

    expect(await screen.findByText('全室をCO待ちにリセットしました')).toBeInTheDocument()

    // リセット後は在室中/清掃中/確認待ち/清掃済み/清掃待ちが全て0、CO待ちが全室。
    await waitFor(() => expect(statBadgeCount('在室中')).toBe(0))
    expect(statBadgeCount('清掃中')).toBe(0)
    expect(statBadgeCount('清掃済み')).toBe(0)
  })

  it('意地悪: confirm が false の場合はリセットされない（在室中の件数が維持）', async () => {
    const u = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    seedStaff()
    await renderFloors(USERS.leader)
    await u.click(screen.getByRole('button', { name: '日次初期化' }))

    // トーストは出ない（リセットされていない）
    expect(screen.queryByText('全室をCO待ちにリセットしました')).not.toBeInTheDocument()
    // 在室中は元の7のまま
    expect(statBadgeCount('在室中')).toBe(7)
  })
})

describe('Floors — ロール別 UI（leader 限定ボタン）', () => {
  it('cleaner には自動割り当て・日次初期化ボタンが出ない', async () => {
    seedStaff()
    await renderFloors(USERS.cleaner)
    expect(screen.queryByRole('button', { name: '自動割り当て' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '日次初期化' })).not.toBeInTheDocument()
  })

  it('front には担当フィルター（combobox）も leader 限定ボタンも出ない', async () => {
    await renderFloors(USERS.front)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '自動割り当て' })).not.toBeInTheDocument()
  })
})
