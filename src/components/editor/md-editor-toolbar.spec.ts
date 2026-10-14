import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 工具栏观感契约：文章页与笔记页共用同一套紧凑工具栏。
 *
 * 背景：紧凑工具栏原先只挂在 `.note-milkdown-editor` 前缀上，文章页吃默认样式
 * （顶部栏 88px、按钮 56px、gap 2px、无圆角），比笔记页松一大圈。
 * 现改用 `.milkdown-editor-shell` 前缀，两端共用。
 */
describe('网页版编辑器工具栏观感', () => {
  const source = readFileSync(new URL('./MdEditor.vue', import.meta.url), 'utf8')

  it('紧凑工具栏规则对两种页面共用，不再退回笔记页专属前缀', () => {
    // 一旦有人把前缀改回 `.note-milkdown-editor`，文章页会悄悄退回旧观感。
    // 注意只钉工具栏：`.note-milkdown-editor .milkdown-editor-root … .ProseMirror`
    // 是笔记页专属的正文上边距，应当保留。
    expect(source).not.toMatch(/\.note-milkdown-editor \.milkdown-editor-root \.milkdown \.milkdown-top-bar/)
    expect(source).toMatch(/\.milkdown-editor-shell \.milkdown-editor-root \.milkdown \.milkdown-top-bar \{/)
    expect(source).toMatch(/\.milkdown-editor-shell \.milkdown-editor-root \.milkdown \.milkdown-top-bar \.top-bar-item \{/)
  })

  it('紧凑工具栏以笔记页数值为准', () => {
    const block = source.match(
      /\.milkdown-editor-shell \.milkdown-editor-root \.milkdown \.milkdown-top-bar \{([\s\S]*?)\}/
    )
    expect(block?.[1]).toMatch(/height: 48px/)
    const itemBlock = source.match(
      /\.milkdown-editor-shell \.milkdown-editor-root \.milkdown \.milkdown-top-bar \.top-bar-item \{([\s\S]*?)\}/
    )
    expect(itemBlock?.[1]).toMatch(/height: 42px/)
    expect(itemBlock?.[1]).toMatch(/gap: 0/)
  })

  it('大纲面板顶部跟随统一后的 48px 工具栏高度', () => {
    expect(source).toMatch(/\.milkdown-editor-shell \.markdown-outline \{\s*\n\s*top: 48px;/)
    // 该定位不能再被塞回笔记页专属块里（否则文章页会顶到旧的 63px 位置）。
    const noteOutline = source.match(/\.note-milkdown-editor \.markdown-outline \{([\s\S]*?)\}/)
    expect(noteOutline?.[1]).not.toMatch(/top:/)
  })
})
