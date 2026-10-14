import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 复制 / 下载是「文档级」动作，只跟整篇笔记有关，跟光标与选区无关。
 *
 * 它们曾经埋在工具栏的「更多」菜单里，后来移到工具栏右端常驻 —— 但那一排是**编辑操作**
 * （加粗、列表、插入……），再塞两个带文字的导出按钮就把工具栏撑得很长。
 * 现在统一由 `NoteEditor.vue` 的文档操作行承担，编辑器这边一点导出痕迹都不留。
 */
describe('网页版导出 Markdown 入口接线', () => {
  it('导出动作已整体移出编辑器工具栏', () => {
    const source = read('./MdEditor.vue')

    expect(source).not.toMatch(/copyMarkdown/)
    expect(source).not.toMatch(/downloadMarkdown/)
    expect(source).not.toMatch(/showExportActions/)
    expect(source).not.toMatch(/markdown-export-action/)
    // 更早的「更多」二级菜单也确认没有回来。
    expect(source).not.toMatch(/label: '更多'/)
    expect(source).not.toMatch(/markdown-tools-menu/)
  })

  it('视图与文档操作同处一行：模式切换在左、复制 / 下载在右，整行靠右', () => {
    const source = read('../note/NoteEditor.vue')

    expect(source).toMatch(/class="note-editor-doc-actions"/)

    // 整行靠右：模式切换与导出动作合成一簇，不做两端撑开。
    const styleStart = source.indexOf('.note-editor-doc-actions {')
    expect(source.slice(styleStart, source.indexOf('}', styleStart))).toMatch(
      /justify-content: flex-end/
    )

    // 截出这一行本体：从容器开标签到富文本编辑器的 class 之前。
    const row = source.slice(
      source.indexOf('<div class="note-editor-doc-actions">'),
      source.indexOf('class="note-milkdown-editor"')
    )
    // 三档模式切换已从标题行搬到这里（header 里不再有它）。
    expect(row).toMatch(
      /<el-radio-group[\s\S]*?value="rich"[\s\S]*?value="preview"[\s\S]*?value="source"/
    )
    // 导出动作在同一行的右槽位。
    expect(row).toMatch(/class="note-editor-doc-buttons"/)
    expect(row).toMatch(/<span>复制<\/span>/)
    expect(row).toMatch(/<span>下载<\/span>/)
    expect(row).not.toMatch(/<span>复制 Markdown<\/span>/)
    expect(row).not.toMatch(/<span>下载 Markdown<\/span>/)
    // 不要浮层提示：完整语义改由 aria-label 承载。
    expect(row).not.toMatch(/el-tooltip/)
    expect(row).toMatch(/aria-label="复制 Markdown 原文/)
    expect(row).toMatch(/aria-label="下载为纯净 Markdown/)

    // 🔴 「复制 / 下载」之间的间距：Element Plus 给相邻 el-button 默认挂 `margin-left: 12px`，
    // 特异性高于容器的 flex gap —— 不显式清零，gap 调成多少都不会生效（曾因此白调一轮）。
    expect(source).toMatch(
      /\.note-editor-doc-actions \.note-editor-doc-buttons \.el-button \+ \.el-button \{\s*margin-left: 0;/
    )

    // 落点：`</header>` 之后、富文本编辑器之前；模式切换也跟着离开 header 了。
    expect(source.indexOf('note-editor-doc-actions')).toBeGreaterThan(source.indexOf('</header>'))
    expect(source.indexOf('note-editor-mode')).toBeGreaterThan(source.indexOf('</header>'))
    expect(source.indexOf('class="note-milkdown-editor"')).toBeGreaterThan(
      source.indexOf('note-editor-doc-actions')
    )
  })

  it('复制走原文、下载走纯净导出模块，两条通道不合并', () => {
    const source = read('../note/NoteEditor.vue')

    expect(source).toMatch(/from '@\/utils\/note-markdown-export'/)
    // 复制：保留嵌入卡等本应用私有写法，便于粘回本应用。
    expect(source).toMatch(/navigator\.clipboard\.writeText\(props\.note\?\.content \?\? ''\)/)
    // 下载：降级成任何 Markdown 编辑器都能正常显示的纯净格式。
    expect(source).toMatch(/downloadTextFile\(\s*\n?\s*buildExportFileName\(title\)/)
    expect(source).toMatch(/buildExportMarkdown\(\{ title, content: props\.note\?\.content \?\? '' \}\)/)
    // 内容只认 `props.note.content` —— 三种模式都会把最新正文上抛到这里。
    expect(source).not.toMatch(/editor\.getMarkdown\(\)/)
  })

  it('导出动作的开关已随实现一并删除，文章编辑页不再需要它', () => {
    const editor = read('./MdEditor.vue')
    const article = read('../../views/article/ArticleEdit.vue')

    expect(editor).not.toMatch(/showExportActions/)
    expect(article).not.toMatch(/show-export-actions/)
  })

  it('编辑区把当前笔记标题传给编辑器', () => {
    const source = read('../note/NoteEditor.vue')

    expect(source).toMatch(/:title="note\?\.title \?\? ''"/)
  })

  it('文档预览能力已整体移除，等桌面端预览方案迁移过来', () => {
    const source = read('./MdEditor.vue')

    // 工具栏不再有预览按钮，也不再保留恒 false 的预览状态机。
    // 注意：Crepe 代码块自带的 previewToggleText 与本文档预览无关，不能一并断言掉。
    expect(source).not.toMatch(/markdown-preview-toggle/)
    expect(source).not.toMatch(/externalPreviewToggle/)
    expect(source).not.toMatch(/\bpreviewMode\b/)
    expect(source).not.toMatch(/'is-preview'/)
  })

  it('专注模式能力已整体移除', () => {
    const editor = read('./MdEditor.vue')
    const article = read('../../views/article/ArticleEdit.vue')

    expect(editor).not.toMatch(/focusMode/)
    expect(editor).not.toMatch(/is-focus-mode/)
    expect(editor).not.toMatch(/markdown-editor-focus-mode/)
    expect(editor).not.toMatch(/focus-mode-change/)
    expect(editor).not.toMatch(/label: '专注模式'/)
    // 文章页曾靠该事件联动收起发布设置，连同其记忆变量一并清掉。
    expect(article).not.toMatch(/focus-mode-change/)
    expect(article).not.toMatch(/handleEditorFocusModeChange/)
    expect(article).not.toMatch(/sidePanelCollapsedBeforeFocus/)
  })
})
