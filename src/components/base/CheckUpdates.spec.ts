import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compileStyle, parse } from '@vue/compiler-sfc'

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
 * 真跑一遍 `@vue/compiler-sfc`，把该组件的样式编译成最终 CSS。
 *
 * 这里**必须真编译**，不能用字符串匹配 —— 本文件要守的那个 bug 恰恰是
 * 「源码看着对、编译后选择器塌掉」，字符串匹配看不见编译结果。
 *
 * @param relativePath 组件路径。
 * @returns 编译后的 CSS。
 */
function compileCss(relativePath: string): string {
  const { descriptor } = parse(read(relativePath), { filename: relativePath })
  return descriptor.styles
    .map((style) =>
      compileStyle({
        filename: relativePath,
        source: style.content,
        id: 'data-v-test',
        scoped: style.scoped
      }).code
    )
    .join('\n')
}

describe('网页版本更新提示', () => {
  it('使用更新图标、说明卡片和双按钮操作区', () => {
    const source = read('./CheckUpdates.vue')

    expect(source).toContain('class="version-update-dialog"')
    expect(source).toContain('solar:refresh-circle-bold-duotone')
    expect(source).toContain('页面已有新内容，刷新后即可继续使用最新版本。')
    expect(source).toContain('建议现在刷新，避免继续使用旧页面。')
    expect(source).toContain('立即刷新')
    expect(source).toContain('稍后再说')
  })
})

/**
 * 暗色模式可读性。
 *
 * 🔴 这组断言来自一次真实回归（10-15 用户报「夜间模式更新弹窗不清晰」）：
 * 样式里写的是 `:global(html.dark) :deep(.version-update-dialog)`，
 * 看起来完全正常，但 **SFC 编译器会把 `:global(html.dark)` 之后的整截选择器丢掉**，
 * 五条暗色规则全部塌成裸 `html.dark { }` —— 既没约束到任何元素，
 * 又把背景 / 边框 / 投影 / 颜色写到了 `html` 元素上，污染全页。
 *
 * 所以这里断言的是**编译产物**，不是源码字符串。
 */
describe('版本更新弹窗的暗色样式（断言编译产物）', () => {
  it('不允许出现塌成裸 `html.dark` 的规则', () => {
    const css = compileCss('./CheckUpdates.vue')

    // 塌掉的形式：选择器恰好就是 `html.dark`（后面什么都没跟）。
    expect(css).not.toMatch(/(^|})\s*html\.dark\s*\{/m)
    // 一旦出现，多半就是 `:global()` 只包了前缀、后半截被丢弃。
    expect(css).toMatch(/html\.dark \.version-update-dialog \{/)
  })

  it('正文相关颜色走 --el-* 变量，随 html.dark 自动切换', () => {
    const css = compileCss('./CheckUpdates.vue')

    // 标题 / 正文 / 提示条都不许再写死浅色系（暗色下会糊成一团）
    expect(css).not.toMatch(/color: #20242a/)
    expect(css).not.toMatch(/color: #4b5565/)
    expect(css).not.toMatch(/background: rgb\(239 246 255/)
    expect(css).toMatch(/color: var\(--el-text-color-primary\)/)
    expect(css).toMatch(/color: var\(--el-text-color-regular\)/)
    expect(css).toMatch(/background: var\(--el-fill-color-light\)/)
  })

  it('暗色下换掉亮色渐变底色（整条选择器必须在 :global 内）', () => {
    const source = read('./CheckUpdates.vue')
    // ⚠️ 先剥注释：本文件下面的说明注释里**故意引用了那个错误写法**，
    // 不剥的话 `not.toMatch` 会被自己的注释绊倒（项目里已有先例）。
    const cssSource = source.replace(/\/\*[\s\S]*?\*\//g, '')

    // 亮色保留品牌渐变
    expect(cssSource).toContain('linear-gradient(180deg, #f5f9ff 0%, #ffffff 48%)')
    // ⚠️ 写法必须是 `:global(html.dark .xxx)`，不能是 `:global(html.dark) .xxx`
    expect(cssSource).toMatch(/:global\(html\.dark \.version-update-dialog\)/)
    expect(cssSource).not.toMatch(/:global\(html\.dark\)\s+[:.]/)
  })

  /**
   * 🔴 底色不许比页面主体还暗。
   *
   * 10-15 截图核对时发现的第二个问题：弹窗底色原本取 `--el-bg-color`（`#141414`），
   * 而页面主底色是 `--el-bg-color-overlay`（`#1d1e1f`）—— 弹窗浮在页面上像个「黑洞」。
   * 而且本项目 Element Plus **没有定义** `--el-dialog-bg-color`（实测为空串），
   * 所以写成 `var(--el-dialog-bg-color, var(--el-bg-color))` 必然落到那个更暗的值上。
   */
  it('暗色底色与页面主底色一致，不用 --el-bg-color', () => {
    // ⚠️ 同样要先剥注释：样式块里的说明注释**恰好引用了这两个变量名**，
    // 不剥的话这两条否定断言会被自己的注释绊倒。
    const css = compileCss('./CheckUpdates.vue').replace(/\/\*[\s\S]*?\*\//g, '')

    // 页面主底色变量（body / el-main 都是它）
    expect(css).toMatch(/background: var\(--el-bg-color-overlay/)
    // 页面卡片底色是 rgba(31,35,41,.94) 一档，弹窗不该退回更暗的 --el-bg-color
    expect(css).not.toMatch(/background: var\(--el-bg-color\)/)
    // 更不该依赖本项目根本没定义的 --el-dialog-bg-color
    expect(css).not.toMatch(/--el-dialog-bg-color/)
  })
})
