import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Mascot from './Mascot.jsx'
import { CHARACTERS, loadCharacterId } from '../config/characters.js'

beforeEach(() => localStorage.clear())

describe('Mascot', () => {
  it('進捗率と応援メッセージを表示する', () => {
    render(<Mascot rate={100} />)
    expect(screen.getByText('全部おわった！おつかれさま！')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('進捗0%ではアイドルメッセージ', () => {
    render(<Mascot rate={0} />)
    expect(screen.getByText('今日もよろしくね！')).toBeInTheDocument()
  })

  it('タップでキャラが切り替わり永続化される', async () => {
    const user = userEvent.setup()
    render(<Mascot rate={50} />)
    // 初期は先頭キャラ
    expect(screen.getByText(new RegExp(CHARACTERS[0].name))).toBeInTheDocument()
    await user.click(screen.getByRole('button'))
    // 次のキャラに切替＋localStorageに保存
    expect(screen.getByText(new RegExp(CHARACTERS[1].name))).toBeInTheDocument()
    expect(loadCharacterId()).toBe(CHARACTERS[1].id)
  })

  it('意地悪: rate未指定でも0%扱いで落ちない', () => {
    expect(() => render(<Mascot />)).not.toThrow()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
