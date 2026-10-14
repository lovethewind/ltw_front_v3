// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import {
  OPEN_NOTE_EVENT,
  dispatchOpenNote,
  resolveNoteIdFromHref,
  type OpenNoteEventDetail
} from './note-open-events'

const ORIGIN = 'https://lovethewind.cn'
const PAGE = `${ORIGIN}/notes/self-note`

describe('resolveNoteIdFromHref（认站内笔记链接）', () => {
  it('认相对路径，取出去掉前导斜杠的笔记 ID', () => {
    expect(resolveNoteIdFromHref('/notes/2081338922006073344', PAGE)).toBe('2081338922006073344')
  })

  it('认桌面端写进正文的绝对地址（同源）', () => {
    expect(resolveNoteIdFromHref(`${ORIGIN}/notes/abc123`, PAGE)).toBe('abc123')
  })

  it('容忍结尾多余的斜杠', () => {
    expect(resolveNoteIdFromHref('/notes/abc123/', PAGE)).toBe('abc123')
  })

  it('取出的是解码后的 ID：地址里可能是 encodeURIComponent 过的', () => {
    expect(resolveNoteIdFromHref('/notes/a%20b', PAGE)).toBe('a b')
  })

  it('外链一律不认，交给浏览器默认行为', () => {
    expect(resolveNoteIdFromHref('https://github.com/lovethewind/ltw_notes_desktop', PAGE)).toBe(null)
    expect(resolveNoteIdFromHref('https://example.com/notes/abc', PAGE)).toBe(null)
  })

  it('站内其他页面不认：只有 /notes/<id> 这一种形状算笔记链接', () => {
    expect(resolveNoteIdFromHref('/notes', PAGE)).toBe(null)
    expect(resolveNoteIdFromHref('/notes/abc/extra', PAGE)).toBe(null)
    expect(resolveNoteIdFromHref('/article/123', PAGE)).toBe(null)
    expect(resolveNoteIdFromHref('', PAGE)).toBe(null)
  })

  it('无法解析的地址不抛异常，按「不是笔记链接」处理', () => {
    expect(resolveNoteIdFromHref('http://[::1', PAGE)).toBe(null)
    expect(resolveNoteIdFromHref('/notes/abc', 'not-a-url')).toBe(null)
  })

  it('不因地址里带 query / hash 而漏判', () => {
    // pathname 之外的部分不参与匹配，ID 仍取正。
    expect(resolveNoteIdFromHref('/notes/abc123?from=embed', PAGE)).toBe('abc123')
    expect(resolveNoteIdFromHref('/notes/abc123#section', PAGE)).toBe('abc123')
  })
})

describe('dispatchOpenNote（谁接管用 preventDefault 回传）', () => {
  it('没有人监听时返回 false —— 调用方据此退回路由跳转', () => {
    expect(dispatchOpenNote('abc123', true)).toBe(false)
  })

  it('监听器接管（preventDefault）时返回 true，并拿到完整载荷', () => {
    const seen: OpenNoteEventDetail[] = []
    const listener = (event: Event): void => {
      seen.push((event as CustomEvent<OpenNoteEventDetail>).detail)
      event.preventDefault()
    }
    window.addEventListener(OPEN_NOTE_EVENT, listener)
    try {
      expect(dispatchOpenNote('abc123', true)).toBe(true)
      expect(seen).toEqual([{ noteId: 'abc123', newTab: true }])
    } finally {
      window.removeEventListener(OPEN_NOTE_EVENT, listener)
    }
  })

  it('监听器不 preventDefault（例如只旁听）时视为未接管', () => {
    const listener = vi.fn()
    window.addEventListener(OPEN_NOTE_EVENT, listener)
    try {
      expect(dispatchOpenNote('abc123', false)).toBe(false)
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener(OPEN_NOTE_EVENT, listener)
    }
  })

  it('空 ID 不发事件，直接按未接管返回', () => {
    const listener = vi.fn()
    window.addEventListener(OPEN_NOTE_EVENT, listener)
    try {
      expect(dispatchOpenNote('', true)).toBe(false)
      expect(listener).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener(OPEN_NOTE_EVENT, listener)
    }
  })
})
