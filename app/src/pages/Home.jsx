import { FONT_SIZES, applyFontSize } from '../utils/fontSizeStorage.js'

export default function Home({ user, onNavigate, onLogout, fontSize = 'medium', onFontSize }) {
  const { name, role } = user
  const isLeaderOrFront = role === 'leader' || role === 'front'

  const menus = [
    {
      key: 'cleaning',
      icon: '🧹',
      label: '通常清掃',
      desc: 'フロア清掃の管理・進捗確認',
      color: 'bg-blue-600',
      available: true,
    },
    {
      key: 'plan',
      icon: '📋',
      label: '翌日計画',
      desc: 'Excelから清掃計画を生成・割り当て',
      color: 'bg-indigo-600',
      available: isLeaderOrFront,
    },
    {
      key: 'calendar',
      icon: '📅',
      label: '計画カレンダー',
      desc: '過去の計画確認・休館日設定',
      color: 'bg-teal-600',
      available: isLeaderOrFront,
    },
    {
      key: 'extra',
      icon: '➕',
      label: '当日追加',
      desc: 'イレギュラーな追加清掃を登録',
      color: 'bg-orange-500',
      available: true,
    },
    {
      key: 'staff',
      icon: '👥',
      label: 'スタッフ',
      desc: 'スタッフ設定と担当数の管理',
      color: 'bg-slate-600',
      available: isLeaderOrFront,
    },
    {
      key: 'roommaster',
      icon: '🏨',
      label: '部屋マスター',
      desc: '部屋タイプの変更と変更履歴',
      color: 'bg-rose-700',
      available: isLeaderOrFront,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
        <p className="text-xs text-slate-400">ホテルパコジュニア 北見</p>
        <div className="flex items-center justify-between mt-1">
          <div>
            <p className="text-lg font-bold text-slate-900">清掃管理システム</p>
            <p className="text-sm text-slate-500">{name}さん でログイン中</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Font size switcher */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {Object.entries(FONT_SIZES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => { applyFontSize(key); onFontSize?.(key) }}
                  className={`px-2.5 py-1.5 text-xs font-bold touch-manipulation transition-colors
                    ${fontSize === key
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-slate-500 active:bg-slate-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold active:bg-red-100 touch-manipulation border border-red-200"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start">
        {menus.filter(m => m.available).map(menu => (
          <button
            key={menu.key}
            onClick={() => onNavigate(menu.key)}
            className={`
              ${menu.color} text-white rounded-2xl p-5
              flex flex-col items-start gap-2
              active:scale-95 transition-transform duration-100
              touch-manipulation shadow-sm
            `}
          >
            <span className="text-3xl">{menu.icon}</span>
            <div>
              <p className="text-base font-bold leading-tight">{menu.label}</p>
              <p className="text-xs opacity-75 mt-0.5 leading-snug">{menu.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
