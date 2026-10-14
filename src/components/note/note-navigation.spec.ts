import { describe, expect, it } from 'vitest'

import { formatNoteCompactDate, formatNoteExcerpt, stripNoteMarkdown } from './note-navigation'

describe('stripNoteMarkdown（嵌入卡摘要口径，对齐桌面端）', () => {
  it('保留中文括号：括号是正文语义的一部分，剔除会把句子洗成病句', () => {
    expect(stripNoteMarkdown('手摸手 带你快速搭建Django Web后台四(admin搭建) 我们这里来')).toBe(
      '手摸手 带你快速搭建Django Web后台四(admin搭建) 我们这里来'
    )
  })

  it('去掉图片与链接标记，只留可读文本', () => {
    expect(stripNoteMarkdown('![封面](/a.png) 正文 [文档](https://x.dev)')).toBe('封面 正文 文档')
  })

  it('去掉 HTML 标签（含嵌入卡容器），不把标签当正文显示', () => {
    expect(stripNoteMarkdown('前<div data-xynote-embed="note:a" title="B"></div>后')).toBe('前 后')
  })

  it('去掉 Markdown 记号并合并空白', () => {
    expect(stripNoteMarkdown('## 标题\n\n> 引用 **粗体** `代码`')).toBe('标题 引用 粗体 代码')
  })

  it('与左侧栏用的 formatNoteExcerpt 刻意不同：后者会连括号一起洗掉', () => {
    const raw = '后台四(admin搭建)'

    expect(stripNoteMarkdown(raw)).toBe('后台四(admin搭建)')
    // 防回归：一旦有人把两者合并成一份实现，这条会红，提醒嵌入卡摘要会跟着变脏。
    expect(formatNoteExcerpt(raw)).toBe('后台四 admin搭建')
  })
})

describe('formatNoteCompactDate', () => {
  it('压成点分隔短日期，与桌面端嵌入卡同口径', () => {
    expect(formatNoteCompactDate('2026-07-26 10:00:00')).toBe('2026.07.26')
    expect(formatNoteCompactDate('2026-07-26T10:00:00Z')).toBe('2026.07.26')
  })

  it('解析不出日期时返回空串，调用方据此不渲染该行', () => {
    expect(formatNoteCompactDate('')).toBe('')
    expect(formatNoteCompactDate('刚刚')).toBe('')
  })
})
