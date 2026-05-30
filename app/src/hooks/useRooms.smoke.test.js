import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRooms } from './useRooms.js'

describe('useRooms (fallback/in-memory mode)', () => {
  it('Supabase未設定時はフォールバック部屋データを生成する', async () => {
    const { result } = renderHook(() => useRooms())
    await waitFor(() => expect(result.current.loading).toBe(false))
    // 99室前後（2F:9 + 3-7F:各18 = 9+90 = 99）
    expect(result.current.rooms.length).toBeGreaterThan(90)
    expect(result.current.rooms.every(r => r.room_number)).toBe(true)
  })

  it('updateRoom でローカル状態が更新される', async () => {
    const { result } = renderHook(() => useRooms())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const target = result.current.rooms[0]
    await act(async () => {
      await result.current.updateRoom(target.id, { status: 'cleaning' })
    })
    expect(result.current.rooms.find(r => r.id === target.id).status).toBe('cleaning')
  })

  it('resetAllRooms で全室 checkout_pending になる', async () => {
    const { result } = renderHook(() => useRooms())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.resetAllRooms() })
    expect(result.current.rooms.every(r => r.status === 'checkout_pending')).toBe(true)
  })
})
