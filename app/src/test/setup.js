import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// ─── jsdom shims ──────────────────────────────────────────────────────────────
// jsdom lacks a few browser APIs the app touches. Provide harmless stubs so
// component tests don't blow up on environment gaps (black-box friendly).

if (typeof window !== 'undefined') {
  // window.confirm defaults to "OK" so destructive-flow tests can opt in/out.
  if (!window.confirm) window.confirm = () => true
  if (!window.alert) window.alert = () => {}
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })
  }
  if (!window.scrollTo) window.scrollTo = () => {}
}

// Each test starts from a clean DOM + storage so adversarial state from one
// test can never leak into the next.
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})
