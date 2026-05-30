import { useState } from 'react'
import { getCharacter, loadCharacterId, saveCharacterId, nextCharacterId, characterMood } from '../config/characters.js'

const ACCENT_BG = {
  violet: 'bg-violet-50 border-violet-200',
  amber:  'bg-amber-50 border-amber-200',
  pink:   'bg-pink-50 border-pink-200',
  sky:    'bg-sky-50 border-sky-200',
  orange: 'bg-orange-50 border-orange-200',
  yellow: 'bg-yellow-50 border-yellow-200',
}

// 進捗に反応するマスコット。タップでキャラ切替（永続化）。
export default function Mascot({ rate = 0 }) {
  const [charId, setCharId] = useState(loadCharacterId)
  const char = getCharacter(charId)
  const mood = characterMood(rate)
  const bg = ACCENT_BG[char.accent] ?? ACCENT_BG.violet

  function cycle() {
    const next = nextCharacterId(charId)
    setCharId(next)
    saveCharacterId(next)
  }

  return (
    <button
      onClick={cycle}
      aria-label={`マスコット ${char.name}（タップで切替）`}
      className={`w-full flex items-center gap-3 rounded-xl border ${bg} px-4 py-3 text-left active:scale-[0.99] transition-transform touch-manipulation`}
    >
      <span className="text-3xl leading-none" aria-hidden="true">{char.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 leading-tight">{char.name} <span aria-hidden="true">{mood.face}</span></p>
        <p className="text-sm font-bold text-slate-700 leading-snug truncate">{mood.message}</p>
      </div>
      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{Math.round(rate)}%</span>
    </button>
  )
}
