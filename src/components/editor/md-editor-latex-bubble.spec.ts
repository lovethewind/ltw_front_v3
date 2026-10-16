import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 *
 * @param relativePath 相对本 spec 的路径。
 * @returns 源码字符串。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 行内公式编辑气泡的几何守卫 —— Crepe 会在气泡里内嵌**第二个 EditorView**。
 *
 * 主编辑器那几条 `.milkdown .ProseMirror` 规则都是「视口级」尺寸。写成**后代选择器**时
 * 它们会一起套到气泡里那个一行的输入框上：2026-10-16 用户报「这个弹窗」，
 * 截图标定后气泡是 **221×503**，与 `min-height: 500px` 逐像素吻合（实测 504）。
 * 桌面端 2026-10-08 踩过同款坑（`calc(100vh - 250px)` → 674px），修法是
 * 「主规则改直接子代 + 末尾一条高特异性兜底」，这里保持同口径。
 *
 * ⚠️ 这是**布局结果**，正则匹配只能钉接线事实；真几何由桌面端 e2e
 * `tests/e2e/inline-formula-tooltip.e2e.test.cjs` 与「导出样式块 + 最小 HTML 量 computed style」
 * 的探针守住（网页端没有编辑器 e2e，见 2026-10-16 记忆）。
 */
describe('行内公式编辑气泡的几何', () => {
  const source = read('./MdEditor.vue')

  it('主编辑器用直接子代 `>` 选中', () => {
    expect(source).toMatch(/\.milkdown-editor-root \.milkdown > \.ProseMirror \{/)
    // 反面：主编辑器那条基础规则不得退回后代写法（DOM 里 `.ProseMirror` 就是 `.milkdown` 的直接子元素）。
    expect(source).not.toMatch(/\n\.milkdown-editor-root \.milkdown \.ProseMirror \{\n {2}box-sizing/)
  })

  it('样式表末尾有兜底：气泡里的内层编辑器复位成「一行输入框」', () => {
    expect(source).toMatch(
      /\.milkdown-editor-shell \.milkdown-editor-root \.milkdown \.milkdown-latex-inline-edit \.ProseMirror \{\n {2}width: auto;\n {2}min-height: 0;\n {2}margin: 0;\n {2}padding: 0;/
    )
  })

  it('兜底写在主编辑器最后一条规则之后（靠「更靠后」压住同为 5 层的 .has-outline）', () => {
    const noteRule = source.indexOf(
      '.note-milkdown-editor .milkdown-editor-root .milkdown .ProseMirror'
    )
    const fallback = source.indexOf(
      '.milkdown-latex-inline-edit .ProseMirror {\n  width: auto;'
    )
    expect(noteRule).toBeGreaterThan(-1)
    expect(fallback).toBeGreaterThan(-1)
    expect(fallback).toBeGreaterThan(noteRule)
  })

  it('抬到顶栏之上（顶栏 sticky + z-index 20 + 95% 白底 + blur，Crepe 不给气泡 z-index）', () => {
    expect(source).toMatch(
      /\.milkdown-editor-root \.milkdown \.milkdown-latex-inline-edit \{\n {2}z-index: 30;\n\}/
    )
  })

  it('气泡打开时块手柄让位（两者都挤在正文左侧）', () => {
    expect(source).toMatch(
      /\.milkdown-editor-shell \.milkdown-editor-root \.milkdown:has\(\.milkdown-latex-inline-edit\[data-show='true'\]\) \.milkdown-block-handle \{\n {2}opacity: 0;\n {2}pointer-events: none;\n\}/
    )
  })
})
