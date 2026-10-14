import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 历史版本抽屉的两处问题（2026-10-14 用户报「内容离左侧没有边距 / 恢复按钮加个图标」）：
 *
 * 1. 🔴 **图标名写错 = 静默不显示**。项目用 `@iconify/vue`，图标按需向 Iconify API 取；
 *    名字在该集合里不存在时组件不报错、只渲染成空 —— 肉眼就是「这个按钮没图标」。
 *    `material-symbols:restore-rounded` 就是这种（API 404），已换成 `restore-page-rounded`。
 *    同名失效的还有 `mage:alert-circle`（同在本次体检里发现，见 AppFormDialog.vue / WebsiteList.vue）。
 * 2. ⚠️ **只读预览的正文挂在编辑器面板里**，`.ProseMirror` 的 left padding 为 0 时正文贴死
 *    面板左沿，被读成「内容离左侧没有边距」→ 左右各留 12px。
 *
 * ⚠️ 断言会读源码文本，注释也算 —— 下面只解析 `padding:` 声明本身，注释里不要贴同样的写法。
 *
 * @param relative 相对本文件的路径。
 * @returns 文件内容。
 */
function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8')
}

const source = read('./NoteHistoryDrawer.vue')

/**
 * 取 `note-history-actions` 区块的源码片段（只到该容器闭合为止）。
 *
 * @returns 两个版本操作按钮所在的源码片段。
 */
function actionBlock(): string {
  const start = source.indexOf('<div class="note-history-actions">')
  expect(start).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('</div>', start))
}

/**
 * 解析只读预览里 `.ProseMirror` 的 padding 简写。
 *
 * @returns 四边像素值。
 */
function proseMirrorPadding(): { top: number; right: number; bottom: number; left: number } {
  const selector = String.raw`\.note-history-viewer :deep\(\.milkdown-editor-root \.milkdown \.ProseMirror\)\s*\{([\s\S]*?)\n\}`
  const block = new RegExp(selector).exec(source)?.[1] ?? ''
  const raw = /padding:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? ''
  expect(raw).not.toBe('')

  const parts = raw.split(/\s+/).map((value) => Number.parseFloat(value))
  expect(parts.every((value) => Number.isFinite(value))).toBe(true)

  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] }
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
}

describe('历史版本抽屉（测试守卫）', () => {
  it('删除 / 恢复两个按钮各带一个图标', () => {
    const icons = actionBlock().match(/<Icon icon="[^"]+" \/>/g) ?? []
    expect(icons).toHaveLength(2)
  })

  it('图标名不得是 Iconify 上不存在的名字（写错只会静默渲染成空）', () => {
    const block = actionBlock()
    // material-symbols 集合里没有 restore 的 -rounded 直系变体（API 404）。
    expect(block).not.toMatch(/"material-symbols:restore-rounded"/)
    expect(block).toMatch(/"material-symbols:restore-page-rounded"/)
    expect(block).toMatch(/"material-symbols:delete-outline-rounded"/)
  })

  it('只读预览正文左右都不贴编辑器面板（各留出边距）', () => {
    const padding = proseMirrorPadding()
    expect(padding.left).toBeGreaterThanOrEqual(8)
    expect(padding.right).toBeGreaterThanOrEqual(8)
    // 上下保持原有节奏：顶部贴 header 分隔线、底部留出滚动余量。
    expect(padding.top).toBeLessThanOrEqual(8)
    expect(padding.bottom).toBeGreaterThanOrEqual(16)
  })
})
