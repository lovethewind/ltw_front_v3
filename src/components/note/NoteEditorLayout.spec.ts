import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('网页版笔记编辑器紧凑布局', () => {
  it('将属性控件并入标题行', () => {
    const source = readFileSync(new URL('./NoteEditor.vue', import.meta.url), 'utf8')

    expect(source).toMatch(/class="note-editor-header"[\s\S]*class="note-editor-meta"/)
    expect(source).toMatch(/\.note-editor-header > \.note-editor-meta/)
  })

  it('压缩 Milkdown 工具栏高度', () => {
    const source = readFileSync(new URL('../editor/MdEditor.vue', import.meta.url), 'utf8')

    expect(source).toMatch(/\.note-milkdown-editor[^{}]*\.milkdown-top-bar\s*\{[^}]*min-height:\s*48px/s)
    expect(source).toMatch(/\.note-milkdown-editor[^{}]*\.top-bar-item\s*\{[^}]*height:\s*42px/s)
  })

  it('文件夹弹层复用左侧 Element Plus 滚动条且正文主滚动条不变', () => {
    const noteStyleSource = readFileSync(
      new URL('../../assets/css/note.scss', import.meta.url),
      'utf8'
    )
    const editorSource = readFileSync(new URL('./NoteEditor.vue', import.meta.url), 'utf8')

    expect(noteStyleSource).toMatch(/\.note-workspace-scrollbar \.el-scrollbar__bar\.is-vertical\s*\{[^}]*width:\s*5px/s)
    expect(editorSource).toMatch(/<el-scrollbar[^>]*class="note-editor-popover-scroll"[^>]*always/)
    expect(editorSource).toMatch(/\.note-editor-popover-scroll\s+:deep\(\.el-scrollbar__bar\.is-vertical\)\s*\{[^}]*width:\s*5px/s)
    expect(editorSource).not.toMatch(/\.note-editor-popover-scroll::-webkit-scrollbar/)
    expect(noteStyleSource).toMatch(/\.note-workspace-editor[^{}]*\.milkdown-editor-scroll\s*\{[^}]*scrollbar-width:\s*thin/s)
  })
})
