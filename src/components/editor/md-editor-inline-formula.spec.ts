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
 * 「插入」菜单里的行内公式按钮 —— 两个已踩过的坑（2026-10-16 用户报）。
 *
 * | 坑 | 现象 | 守卫 |
 * |---|---|---|
 * | 无选区时直接调 `ToggleLatex` | 插进一个**空公式节点**：屏幕看不见（「点了没反应」），Markdown 里留下孤零零的 `$$`；落在行首时重新打开会被当成**块级公式**开头，把后面所有正文吞掉 | 断言命令前先判「有文字可包 / 本来就是公式」 |
 * | 摘公式节点也要过同一道判定 | 公式是原子节点、`textBetween` 是空串，一刀切会把「拆掉」也挡回去 | 断言 `selectionHasInlineFormula` 参与判定 |
 * | 面板里的原生按钮没摘 `top-bar-item` | 被 5 层特异性的紧凑工具栏规则接管（10px 字 / 18px 图标 / gap 0），与自研按钮的 13px 字 / 19px 图标同框不同款（「格格不入」） | 断言搬进面板前先 `classList.remove('top-bar-item')` |
 */
describe('「插入」菜单的行内公式按钮', () => {
  it('无选区时不落空公式节点，只给提示', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(
      /if \(!hasFormula && doc\.textBetween\(selection\.from, selection\.to, '\\n'\)\.trim\(\) === ''\) return false/
    )
    expect(source).toMatch(/请先选中要转成公式的文字/)
    // 反面：不能再出现「不作任何判定、直接 call」的裸调用（它就是那次数据损坏的入口）。
    expect(source).not.toMatch(/editor\?\.editor\.action\(\(ctx\) => ctx\.get\(commandsCtx\)\.call\('ToggleLatex'\)\)/)
  })

  it('选中的本来就是公式节点时仍能拆掉', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/function selectionHasInlineFormula\(view: ProseMirrorView\): boolean \{/)
    expect(source).toMatch(/const mathType = view\.state\.schema\.nodes\.math_inline/)
    expect(source).toMatch(/view\.state\.doc\.nodesBetween\(from, to,/)
  })

  it('二级菜单项搬进面板前摘掉 top-bar-item', () => {
    const source = read('./MdEditor.vue')

    // 只在「把按钮塞进 panel」的那段里找，避免匹配到别处的 remove。
    expect(source).toMatch(
      /items\.forEach\(\(button\) => \{[\s\S]{0,600}?button\.classList\.remove\('top-bar-item'\)/
    )
  })
})
