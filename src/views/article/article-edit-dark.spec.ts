import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 文章编辑页夜间配色的守卫（源码正则，同 `note-open-wiring.spec.ts` 路数）。
 *
 * 定下的口径：**页面底 = $dark-main-color（全站通用夜间底），浮在上面的表面
 * （标题卡 / 右侧面板 / 编辑器 / 弹层）= $dark-surface-color（与顶栏同值）**，
 * 夜间不再出现 slate 深蓝那套页面级渐变与光晕。
 *
 * ⚠️ 断言写成「不该出现某些色值」时，注释也算源码 —— 改动这个文件时别在注释里贴旧色值。
 *
 * @param relative 相对本文件的路径。
 * @returns 文件内容。
 */
function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8')
}

/**
 * 截取文件里 `html.dark` 起的夜间区，避免白天规则里的色值干扰断言。
 *
 * @param source 源码内容。
 * @returns 夜间区内容（找不到时为空串）。
 */
function darkRegion(source: string): string {
  const index = source.indexOf('html.dark')
  return index === -1 ? '' : source.slice(index)
}

const articleEditScss = read('../../assets/css/article-edit.scss')
const variablesScss = read('../../assets/css/variables.scss')
const richEditorVue = read('../../components/editor/RichEditor.vue')
const mdEditorVue = read('../../components/editor/MdEditor.vue')

describe('文章编辑页夜间底色（整页中性灰）', () => {
  it('页面底走全站通用夜间色，不再带 slate 深蓝渐变与光晕', () => {
    const dark = darkRegion(articleEditScss)

    expect(dark).toMatch(/\.article-edit-page\s*\{[^}]*background:\s*\$dark-main-color/s)
    expect(dark).not.toMatch(/#101620|#111827|#0f172a|rgb\(31 41 55|rgb\(15 23 42/)
  })

  it('卡片 / 面板 / 编辑器共用同一档「抬升表面」，不各自开色', () => {
    const dark = darkRegion(articleEditScss)

    for (const selector of [
      '.article-title-item',
      '.article-side-panel',
      '.article-rich-editor',
      '.attachment-uploading'
    ]) {
      expect(dark).toMatch(new RegExp(`\\${selector}\\s*\\{[^}]*background:\\s*\\$dark-surface-color`, 's'))
    }

    expect(dark).toMatch(/--w-e-textarea-bg-color:\s*#\{\$dark-surface-color\}/)
  })

  it('面板的表面色只写一次（上一次的 bug 就是在后面又补了一条，把渐变整条盖成死代码）', () => {
    // 从行首锚定选择器：否则注释里提到「给 .article-side-panel 补 background」也会被算成一次写入。
    const writes = darkRegion(articleEditScss).match(/(?:^|\n)\s*\.article-side-panel\s*\{[^}]*background:/gs) ?? []

    expect(writes).toHaveLength(1)
  })

  it('Markdown 模式（Crepe）的夜间配色不再由文章页自己压 —— 真源统一在 MdEditor.vue', () => {
    const dark = darkRegion(articleEditScss)

    // 这一条守的是「不要出现第二份真源」：两端要的就是同一套灰，
    // 页面级再覆盖一层只会多一个要同步维护的地方。
    // 从行首锚定选择器：注释里提到这个复合选择器（给后人留的路标）不算覆盖。
    expect(dark).not.toMatch(/(?:^|\n)\s*\.article-md-editor\.milkdown-editor-shell\s*\{/)
  })

  it('右侧面板的折叠 / 展开按钮有夜间覆盖，不再顶着日间的浅灰白底', () => {
    const dark = darkRegion(articleEditScss)

    expect(dark).toMatch(/\.article-side-panel-toggle\s*\{[^}]*background:\s*rgb\(255 255 255 \/ 6%\)/s)
    expect(dark).toMatch(/\.article-side-panel-toggle\s*\{[^}]*color:\s*#94a3b8/s)
    // 日间那套亮色值不该在夜间区出现（覆盖链必须落到按钮上）。
    expect(dark).not.toMatch(/\.article-side-panel-toggle\s*\{[^}]*background:\s*rgb\(241 245 249/s)
    expect(dark).not.toMatch(/\.article-side-panel-toggle\s*\{[^}]*color:\s*#64748b/s)
  })

  it('弹层与对话框的表面也是中性灰', () => {
    const dark = darkRegion(articleEditScss)

    expect(dark).toMatch(
      /:global\(html\.dark \.article-tag-popover\)[^{]*\{[^}]*background:\s*\$dark-surface-color !important/s
    )
    expect(dark).toMatch(
      /:global\(html\.dark \.attachment-dialog\.app-form-dialog\)[^{]*\{[^}]*background:\s*\$dark-surface-color !important/s
    )
  })

  it('富文本组件内部的 wangEditor 内容区跟着同一档灰', () => {
    expect(richEditorVue).toMatch(/\.editor-content\s*\{[^}]*background:\s*\$dark-surface-color/s)
  })

  it('编辑器夜间配色真源（MdEditor.vue，非 scoped、两端共用）是中性灰，蓝只在强调色上', () => {
    const shell = mdEditorVue.slice(mdEditorVue.indexOf('html.dark .milkdown-editor-shell'))
    const crepe = shell.slice(shell.indexOf('html.dark .milkdown-editor-root .milkdown'))

    expect(shell).toMatch(/background:\s*#24262b/)
    expect(shell).toMatch(/--markdown-outline-background:\s*#24262b/)
    expect(crepe).toMatch(/--crepe-color-background:\s*#24262b/)
    expect(crepe).toMatch(/--crepe-color-surface:\s*#2e2e2e/)
    expect(crepe).toMatch(/--crepe-color-hover:\s*#454545/)
    expect(crepe).toMatch(/--crepe-color-selected:\s*#30456f/)
    // 蓝紫色族（原海军蓝）不该再出现在编辑器壳与调色板里。
    expect(crepe).not.toMatch(/#171b2d|#20263a|#28314a|#252e45|#252c42/)
    expect(shell).not.toMatch(/#171b2d|#303958/)
    // 强调色仍是蓝：链接 / 图标，以及**选中态**本身（正文 ::selection、气泡 :active、
    // 表格行列选中、顶栏与块选中）—— 选中态属交互反馈，不并入中性灰。
    expect(crepe).toMatch(/--crepe-color-primary:\s*#8ab8ff/)
  })

  it('选中高亮与 hover 反馈不许被中性灰吃掉（Crepe 同一变量服务多处选中 / hover 语义）', () => {
    const shell = mdEditorVue.slice(mdEditorVue.indexOf('html.dark .milkdown-editor-shell'))
    const crepe = shell.slice(shell.indexOf('html.dark .milkdown-editor-root .milkdown'))
    const value = (name: string): string =>
      new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`).exec(crepe)?.[1] ?? ''

    const surface = value('crepe-color-surface')
    const hover = value('crepe-color-hover')
    const selected = value('crepe-color-selected')

    expect(surface).not.toBe('')
    // 与面同值 → 气泡 / 链接气泡 / 表格行 / 代码块语言选择器的 hover 没有任何反馈。
    expect(hover).not.toBe(surface)
    // 选中态既不许等于面、也不许等于 hover，更不许落回纯灰（#2e2e2e 与壳底 #24262b
    // 只差 1.11:1，正文选区看不出范围 —— 2026-10-14 用户报「选中的文字看不清」）。
    expect(selected).not.toBe(surface)
    expect(selected).not.toBe(hover)
    expect(selected).not.toMatch(/^#([0-9a-f]{2})\1\1$/)
  })

  it('变量真源：$dark-surface-color 与顶栏同值，上一版的 $editor-dark-surface 已撤', () => {
    expect(variablesScss).toMatch(/\$dark-surface-color:\s*#24262b/)
    expect(variablesScss).not.toContain('$editor-dark-surface')
    expect(articleEditScss).not.toContain('$editor-dark-surface')
    expect(richEditorVue).not.toContain('$editor-dark-surface')
  })
})
