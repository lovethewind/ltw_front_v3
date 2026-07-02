import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取留言板页面源代码，用于验证访客墙页面的关键展示语义。
 *
 * :return: 留言板页面单文件组件源码。
 */
function readMessageViewSource(): string {
  return readFileSync(new URL('../MessageView.vue', import.meta.url), 'utf8')
}

describe('MessageView 页面语义', () => {
  it('以访客墙形式呈现留言板的互动定位', () => {
    const source = readMessageViewSource()

    expect(source).toContain('class="message-board-page"')
    expect(source).toContain('访客墙')
    expect(source).toContain('有什么想说的、建议、打个招呼，都可以留在这里。')
  })

  it('展示留言场景统计和输入区域标题', () => {
    const source = readMessageViewSource()

    expect(source.match(/class="message-stat-card"/g)).toHaveLength(3)
    expect(source).toContain('class="message-composer-title"')
    expect(source).toContain('留下你的想法')
    expect(source).toContain('class="message-list-title"')
  })

  it('移除留言内容内部的重复底部分隔线', () => {
    const source = readMessageViewSource()

    expect(source).toMatch(/:deep\(\.comment-content\)\s*{[^}]*border-bottom:\s*0;/s)
  })

  it('提供留言板夜间模式样式覆盖', () => {
    const source = readMessageViewSource()

    expect(source).toContain('html.dark .message-board-page')
    expect(source).toContain('html.dark .message-intro')
    expect(source).toContain('html.dark .message-stat-card')
    expect(source).toContain(':global(html.dark .message-board-page .comment-item)')
    expect(source).toContain(':global(html.dark .message-board-page .comment-content)')
    expect(source).toContain(':global(html.dark .message-board-page .comment-div .count)')
    expect(source).toContain(':global(html.dark .message-board-page .reply-input-wrapper)')
  })
})
