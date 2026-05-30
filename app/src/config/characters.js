// ─── キャラクター/マスコット ────────────────────────────────────────────────────
// 清掃の進捗に応じて応援してくれるマスコット。複数キャラから選べる。
// 依存を増やさないよう絵文字ベース。非エンジニアでも楽しく使えるUXのため。

export const CHARACTERS = [
  { id: 'robo',    name: 'マグロボくん', emoji: '🤖', accent: 'violet' },
  { id: 'kuma',    name: 'クマじい',     emoji: '🐻', accent: 'amber'  },
  { id: 'usa',     name: 'ウサ子',       emoji: '🐰', accent: 'pink'   },
  { id: 'pen',     name: 'ペンちゃん',   emoji: '🐧', accent: 'sky'    },
  { id: 'neko',    name: 'ニャン太',     emoji: '🐱', accent: 'orange' },
  { id: 'tori',    name: 'コトリ',       emoji: '🐤', accent: 'yellow' },
]

const STORAGE_KEY = 'hotel_character'

export function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0]
}

export function loadCharacterId() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return CHARACTERS.some(c => c.id === saved) ? saved : CHARACTERS[0].id
}

export function saveCharacterId(id) {
  if (CHARACTERS.some(c => c.id === id)) localStorage.setItem(STORAGE_KEY, id)
}

// 次のキャラへ巡回（タップで切替用）
export function nextCharacterId(id) {
  const idx = CHARACTERS.findIndex(c => c.id === id)
  return CHARACTERS[(idx + 1 + CHARACTERS.length) % CHARACTERS.length].id
}

// 進捗率(0..100) → 気分と応援メッセージ
export function characterMood(rate) {
  const r = Math.max(0, Math.min(100, Number(rate) || 0))
  if (r >= 100) return { mood: 'celebrate', face: '🎉', message: '全部おわった！おつかれさま！' }
  if (r >= 75)  return { mood: 'happy',     face: '✨', message: 'あと少し！その調子！' }
  if (r >= 40)  return { mood: 'cheer',     face: '💪', message: 'いい感じ！がんばろう！' }
  if (r > 0)    return { mood: 'start',     face: '🧹', message: 'スタート！ぼちぼちいこう！' }
  return { mood: 'idle', face: '☀️', message: '今日もよろしくね！' }
}
