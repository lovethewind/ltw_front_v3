import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatRegisterTime } from '@/utils/date'

describe('formatRegisterTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('支持后端返回的注册时间字符串', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02 12:00:00'))

    expect(formatRegisterTime('2026-07-01 13:00:00')).toBe('23个小时')
  })
})
