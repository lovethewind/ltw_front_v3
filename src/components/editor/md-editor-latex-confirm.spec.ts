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
 * 行内公式气泡「确认按钮」的行为守卫。
 *
 * 2026-10-16 用户报：气泡里**点了勾不关闭**。根因在 Crepe 的 `LatexInlineTooltip` ——
 * 那个按钮只挂了 `pointerdown → updateValue`（把输入框文字写回 `math_inline` 的 `value`），
 * **一个字都不动选区**；而气泡显隐判据是
 * `selection instanceof NodeSelection && node.type.name === math_inline`，
 * 光标还赖在公式节点上，判据继续成立 → 值写完了气泡还杵在原地。
 *
 * 修法（实测有效）：确认后把光标挪到公式节点**后面**，`data-show` 由 `true` 转 `false`。
 * 这里钉住四个接线事实，其中「冒泡阶段」与「选择器精确到 button」最容易在重构中丢掉。
 */
describe('行内公式气泡的确认按钮', () => {
  const source = read('./MdEditor.vue')

  it('确认后把光标挪出公式节点（气泡才会收起）', () => {
    expect(source).toMatch(/function handleLatexBubbleConfirm\(event: PointerEvent\): void \{/)
    expect(source).toMatch(/state\.selection instanceof NodeSelection/)
    expect(source).toMatch(/TextSelection\.near\(state\.doc\.resolve\(pos\), 1\)/)
  })

  it('只认确认按钮，不能只判断「点的是气泡里的东西」', () => {
    expect(source).toMatch(/target\?\.closest\?\.\('\.milkdown-latex-inline-edit button'\)/)
    // 反面：若放宽到整个气泡容器，点输入框 / 预览区也会把气泡收掉。
    expect(source).not.toMatch(/closest\?\.\('\.milkdown-latex-inline-edit'\)/)
  })

  it('监听必须注册在冒泡阶段（要排在 Crepe 挂在 button 上的 handler 之后）', () => {
    expect(source).toMatch(/document\.addEventListener\('pointerdown', handleLatexBubbleConfirm\)/)
    // 反面：捕获阶段会**早于** button 自己的 handler 跑，那时选区还是旧的。
    expect(source).not.toMatch(/addEventListener\('pointerdown', handleLatexBubbleConfirm, true\)/)
  })

  it('注册与移除成对', () => {
    expect(source).toMatch(/document\.removeEventListener\('pointerdown', handleLatexBubbleConfirm\)/)
  })
})
