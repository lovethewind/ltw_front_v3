import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 笔记模块夜间配色的守卫（源码正则，同 `NoteEditorLayout.spec.ts` 路数）。
 *
 * 定下的口径（与文章编辑页、页脚同源）：**页面底 = `$dark-main-color`，
 * 浮在上面的表面（编辑器 / 卡片 / 侧栏 / 弹窗）= `$dark-surface-color`，
 * 选中态与描边 = `$dark-hover-color` / `$dark-border-color`**；
 * 蓝只保留在**强调色**上（`--note-primary` 体系），那是链接 / 选中文字 / 图标的语义色。
 *
 * 原先笔记模块是独立的一套海军蓝（底 `#101425` / 表面 `#171b2d` / 选中 `#263653` /
 * 描边 `#303958`），与顶栏、页脚、文章编辑页的中性灰撞色 —— 整站两套色系。
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
 * 取某个「顶层选择器块」的内容（从 marker 起，到下一个行首 `}` 为止）。
 *
 * 不能用 `[^}]*` 之类正则圈块：SCSS 插值 `#{$var}` 自身就带 `}`，
 * 字符类会在那里提前收尾。
 *
 * @param source 源码内容。
 * @param marker 起始标记（含选择器与左花括号）。
 * @returns 块内容（找不到时为空串）。
 */
function blockAfter(source: string, marker: string): string {
  const start = source.indexOf(marker)
  if (start === -1) return ''
  const end = source.indexOf('\n}', start)
  return end === -1 ? source.slice(start) : source.slice(start, end)
}

const noteScss = read('../../assets/css/note.scss')

/** 笔记模块夜间区里不该再出现的那套海军蓝。 */
const NAVY = /#101425|#171b2d|#263653|#303958|rgb\(23 27 45/

describe('笔记模块夜间底色（与全站同源的中性灰）', () => {
  it('接入变量真源，不再各处硬编码色值', () => {
    expect(noteScss).toMatch(/@import\s+["']variables["']/)
  })

  it('工作区夜间变量组：底 / 表面 / 选中 / 描边四档全部改走真源', () => {
    const block = blockAfter(noteScss, 'html.dark .note-workspace {')

    expect(block).toContain('--note-surface: #{$dark-surface-color}')
    expect(block).toContain('--note-surface-subtle: #{$dark-main-color}')
    expect(block).toContain('--note-surface-active: #{$dark-hover-color}')
    expect(block).toContain('--note-border: #{$dark-border-color}')
    expect(block).not.toMatch(NAVY)
  })

  it('Cmd+K 快速打开弹窗（挂在 body 上，自带一套变量）同样中性化', () => {
    const block = blockAfter(noteScss, 'html.dark .note-quick-open-dialog {')

    expect(block).toContain('--qo-surface: #{$dark-surface-color}')
    expect(block).toContain('--qo-subtle: #{$dark-main-color}')
    expect(block).toContain('--qo-active: #{$dark-hover-color}')
    expect(block).toContain('--qo-border: #{$dark-border-color}')
    expect(block).not.toMatch(NAVY)
  })

  it('未登录访客页：底色回全站通用灰，日间那两团蓝 / 青光晕夜间不再保留', () => {
    const block = blockAfter(noteScss, 'html.dark .note-guest-page {')

    expect(block).toMatch(/background:\s*\$dark-main-color/)
    expect(block).not.toMatch(/radial-gradient/)

    const card = blockAfter(noteScss, 'html.dark .note-guest-card {')
    expect(card).toContain('background: $dark-surface-color')
    expect(card).toContain('border-color: $dark-border-color')
  })

  it('强调色仍是蓝（链接 / 选中文字 / 图标的语义色，不是背景）', () => {
    expect(blockAfter(noteScss, 'html.dark .note-workspace {')).toContain('--note-primary: #8ab8ff')
  })
})
