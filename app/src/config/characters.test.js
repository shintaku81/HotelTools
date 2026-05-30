import { describe, it, expect, beforeEach } from 'vitest'
import {
  CHARACTERS, getCharacter, loadCharacterId, saveCharacterId, nextCharacterId, characterMood,
} from './characters.js'

beforeEach(() => localStorage.clear())

describe('characters — 選択と永続化', () => {
  it('複数キャラが定義され、idが一意', () => {
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(3)
    const ids = CHARACTERS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    CHARACTERS.forEach(c => { expect(c.emoji).toBeTruthy(); expect(c.name).toBeTruthy() })
  })

  it('デフォルトは先頭キャラ', () => {
    expect(loadCharacterId()).toBe(CHARACTERS[0].id)
  })

  it('save→load で往復', () => {
    saveCharacterId('usa')
    expect(loadCharacterId()).toBe('usa')
  })

  it('意地悪: 不正なidは保存されず、loadはデフォルトに戻る', () => {
    saveCharacterId('存在しない')
    expect(loadCharacterId()).toBe(CHARACTERS[0].id)
  })

  it('getCharacter: 不正idでも先頭にフォールバック', () => {
    expect(getCharacter('xxx').id).toBe(CHARACTERS[0].id)
  })

  it('nextCharacterId は巡回する', () => {
    const first = CHARACTERS[0].id
    const last = CHARACTERS[CHARACTERS.length - 1].id
    expect(nextCharacterId(last)).toBe(first) // 末尾→先頭
    expect(nextCharacterId(first)).toBe(CHARACTERS[1].id)
  })
})

describe('characterMood — 進捗に応じた気分', () => {
  it('境界値ごとに適切なメッセージ', () => {
    expect(characterMood(0).mood).toBe('idle')
    expect(characterMood(1).mood).toBe('start')
    expect(characterMood(40).mood).toBe('cheer')
    expect(characterMood(75).mood).toBe('happy')
    expect(characterMood(100).mood).toBe('celebrate')
  })

  it('意地悪: 範囲外/不正値はクランプされる', () => {
    expect(characterMood(-50).mood).toBe('idle')
    expect(characterMood(999).mood).toBe('celebrate')
    expect(characterMood(NaN).mood).toBe('idle')
    expect(characterMood('80').mood).toBe('happy')
  })

  it('全moodに face と message がある', () => {
    [0, 1, 40, 75, 100].forEach(r => {
      const m = characterMood(r)
      expect(m.face).toBeTruthy()
      expect(m.message).toBeTruthy()
    })
  })
})
