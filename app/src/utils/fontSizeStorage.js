const KEY = 'hotel_font_size'

export const FONT_SIZES = {
  small:  { label: '小', px: '14px' },
  medium: { label: '中', px: '16px' },
  large:  { label: '大', px: '20px' },
}

export function loadFontSize() {
  return localStorage.getItem(KEY) ?? 'medium'
}

export function applyFontSize(size) {
  const px = FONT_SIZES[size]?.px ?? FONT_SIZES.medium.px
  document.documentElement.style.fontSize = px
  localStorage.setItem(KEY, size)
}
