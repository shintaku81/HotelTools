import { test, expect } from '@playwright/test'

// レスポンシブ・スモーク: スマホ/PC 両方でログイン画面が表示・操作できること。
// projects(mobile/desktop)で2回走る。

test.describe('ログイン画面スモーク', () => {
  test('スタッフ用ログイン画面が表示される (/)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホテルパコジュニア 北見' })).toBeVisible()
    await expect(page.getByText('清掃管理システム')).toBeVisible()
    // ID/PW 入力欄
    await expect(page.getByPlaceholder('例: staff')).toBeVisible()
    await expect(page.getByPlaceholder('パスワードを入力')).toBeVisible()
    // 未入力時はログインボタンが無効
    const loginBtn = page.getByRole('button', { name: 'ログイン' })
    await expect(loginBtn).toBeDisabled()
  })

  test('管理者用ログイン画面が表示される (/admin)', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('管理者:', { exact: false })).toBeVisible()
  })

  test('スタッフがログインして名前選択まで到達できる', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('例: staff').fill('staff')
    await page.getByPlaceholder('パスワードを入力').fill('1234')
    await page.getByRole('button', { name: 'ログイン' }).click()
    // 名前選択画面
    await expect(page.getByText('あなたの名前を選んでください')).toBeVisible()
    await page.getByRole('button', { name: '結城', exact: true }).click()
    await page.getByRole('button', { name: 'この名前で入室する' }).click()
    // ホーム画面
    await expect(page.getByText('結城さん')).toBeVisible()
    await expect(page.getByText('通常清掃')).toBeVisible()
  })

  test('誤パスワードでエラーが表示される', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('例: staff').fill('staff')
    await page.getByPlaceholder('パスワードを入力').fill('wrong')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page.getByText('IDまたはパスワードが違います')).toBeVisible()
  })

  test('スーパーアドミン(マグロボ)がホテル管理コンソールに入れる (/superadmin)', async ({ page }) => {
    await page.goto('/superadmin')
    await expect(page.getByText('マグロボ:', { exact: false })).toBeVisible()
    await page.getByPlaceholder('例: staff').fill('magurobo')
    await page.getByPlaceholder('パスワードを入力').fill('magurobo')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page.getByText('ホテル管理コンソール')).toBeVisible()
    await expect(page.getByText('ホテルパコジュニア 北見')).toBeVisible()
  })
})
