const PLANS_KEY    = 'hotel_cleaning_plans'
const HOLIDAYS_KEY = 'hotel_holidays'

export function savePlan(dateStr, { rooms, assignments, staffList }) {
  const all = loadAllPlans()
  all[dateStr] = { rooms, assignments, staffList, savedAt: new Date().toISOString() }
  localStorage.setItem(PLANS_KEY, JSON.stringify(all))
}

export function loadPlan(dateStr) {
  return loadAllPlans()[dateStr] ?? null
}

export function loadAllPlans() {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) ?? '{}') } catch { return {} }
}

export function deletePlan(dateStr) {
  const all = loadAllPlans()
  delete all[dateStr]
  localStorage.setItem(PLANS_KEY, JSON.stringify(all))
}

export function toggleHoliday(dateStr) {
  const h = loadHolidays()
  if (h.has(dateStr)) h.delete(dateStr)
  else h.add(dateStr)
  localStorage.setItem(HOLIDAYS_KEY, JSON.stringify([...h]))
  return h
}

export function loadHolidays() {
  try { return new Set(JSON.parse(localStorage.getItem(HOLIDAYS_KEY) ?? '[]')) }
  catch { return new Set() }
}
