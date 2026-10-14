import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('网页版笔记编辑器紧凑布局', () => {
  it('将属性控件并入标题行', () => {
    const source = readFileSync(new URL('./NoteEditor.vue', import.meta.url), 'utf8')

    expect(source).toMatch(/class="note-editor-header"[\s\S]*class="note-editor-meta"/)
    expect(source).toMatch(/\.note-editor-header > \.note-editor-meta/)
  })

  it('压缩 Milkdown 工具栏高度（笔记页与文章页共用）', () => {
    const source = readFileSync(new URL('../editor/MdEditor.vue', import.meta.url), 'utf8')

    // 紧凑工具栏已从 `.note-milkdown-editor` 专属前缀改为 `.milkdown-editor-shell`，
    // 让文章页也吃到同一套（细则见 ../editor/md-editor-toolbar.spec.ts）。
    expect(source).toMatch(/\.milkdown-editor-shell[^{}]*\.milkdown-top-bar\s*\{[^}]*min-height:\s*48px/s)
    expect(source).toMatch(/\.milkdown-editor-shell[^{}]*\.top-bar-item\s*\{[^}]*height:\s*42px/s)
  })

  it('文件夹弹层复用左侧 Element Plus 滚动条；正文三档共用一套常驻细滚动条', () => {
    const noteStyleSource = readFileSync(
      new URL('../../assets/css/note.scss', import.meta.url),
      'utf8'
    )
    const editorSource = readFileSync(new URL('./NoteEditor.vue', import.meta.url), 'utf8')

    expect(noteStyleSource).toMatch(/\.note-workspace-scrollbar \.el-scrollbar__bar\.is-vertical\s*\{[^}]*width:\s*5px/s)
    expect(editorSource).toMatch(/<el-scrollbar[^>]*class="note-editor-popover-scroll"[^>]*always/)
    expect(editorSource).toMatch(/\.note-editor-popover-scroll\s+:deep\(\.el-scrollbar__bar\.is-vertical\)\s*\{[^}]*width:\s*5px/s)
    expect(editorSource).not.toMatch(/\.note-editor-popover-scroll::-webkit-scrollbar/)
    // 富文本 / 预览 / 源码三档的滚动容器必须成组出现：只给富文本设过样式时，另外两档在
    // macOS 上走的是 overlay 滚动条（不滚动就不显示、也没得拖），同一块区域观感分叉。
    // 源码档的滚动发生在 CodeMirror 自己的 `.cm-scroller` 上（外层 `__code` 是 hidden）。
    expect(noteStyleSource).toMatch(
      /\.note-workspace-editor \.milkdown-editor-scroll,[\s\S]*?\.note-workspace-editor \.note-markdown-preview,[\s\S]*?\.note-workspace-editor \.note-source-editor__code \.cm-scroller \{[\s\S]*?scrollbar-width:\s*thin/s
    )
    // WebKit 里正是这条把滚动条从浮层切成长驻（macOS 上肉眼可见的差别就在这）。
    expect(noteStyleSource).toMatch(
      /\.milkdown-editor-scroll::-webkit-scrollbar,[\s\S]*?\.note-markdown-preview::-webkit-scrollbar,[\s\S]*?\.cm-scroller::-webkit-scrollbar \{[\s\S]*?width:\s*6px/s
    )
  })

  it('大纲展开时正文在可用区内居中，不被单侧 auto margin 顶到右侧', () => {
    const source = readFileSync(new URL('../editor/MdEditor.vue', import.meta.url), 'utf8')

    // 大纲是绝对定位浮层，正文得自己让位：宽度与左右 margin 都由「可用区」推导出来。
    expect(source).toMatch(/--md-available-width:\s*calc\(100% - var\(--markdown-outline-width\) - 40px\)/)
    expect(source).toMatch(/--md-body-width:\s*min\(var\(--md-available-width\), var\(--markdown-content-width\)\)/)
    expect(source).toMatch(
      /margin-left:\s*max\(0px, calc\(\(var\(--md-available-width\) - var\(--md-body-width\)\) \/ 2\)\)/
    )
    // 只写 margin-right 会留下继承来的 margin-left: auto —— 它吃掉全部剩余空间把正文顶到
    // 大纲左边（1920px 下右移 232px），两边必须一起算。
    expect(source).toMatch(/margin-right:\s*max\(/)

    // 窄屏断点不能再把正文覆盖回「居中于全宽」，否则正文会被浮层大纲压住（1280px 下压住 99px）。
    const narrowBlock = source.match(/@media \(max-width: 1399px\) \{([\s\S]*?)\n\}/)
    expect(narrowBlock?.[1] ?? '').not.toMatch(/\.ProseMirror/)
  })
})
