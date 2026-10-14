import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 标题体系契约：网页端编辑器标题必须与桌面端同一套比例。
 *
 * 背景：Crepe 默认标题是 42/36/32/28/24/18px + 字重 400（Georgia 时代的设计），
 * 桌面端在 `src/style.css` 里收紧为 24/20/17/15.5/15/14px 并统一加粗；网页端原先
 * 没有任何覆盖，直接吃默认值 —— 同一个 `# 标题` 在网页端比桌面端大 75%。
 *
 * 两端现在共用同一套「正文字号 × 倍数」公式，改动时两处必须一起改。
 */
describe('网页版编辑器标题体系', () => {
  const source = readFileSync(new URL('./MdEditor.vue', import.meta.url), 'utf8')

  it('正文字号抽成基数变量，标题由它派生', () => {
    // 基数必须与桌面端 src/style.css 的 --markdown-body-font-size 同值（15px），
    // 否则标题会整体偏大一圈 —— 这正是本次修复的问题。
    expect(source).toMatch(/--markdown-body-font-size: 15px;/)
    const body = source.match(
      /\.milkdown-editor-root \.milkdown \.ProseMirror \{([\s\S]*?)\n\}/
    )
    expect(body?.[1]).toMatch(/font-size: var\(--markdown-body-font-size\)/)
    // 不得再写死像素值，否则标题的 calc 基数与实际正文脱节。
    expect(body?.[1]).not.toMatch(/font-size: \d+px/)
  })

  it('h1~h6 用与桌面端相同的倍数（1.6 / 1.333 / 1.133 / 1.033 / 1 / 0.933）', () => {
    const scaled: Array<[string, string]> = [
      ['h1', '1\\.6'],
      ['h2', '1\\.333'],
      ['h3', '1\\.133'],
      ['h4', '1\\.033'],
      ['h6', '0\\.933']
    ]
    scaled.forEach(([tag, factor]) => {
      expect(source).toMatch(
        new RegExp(
          `\\.ProseMirror ${tag} \\{[^}]*font-size: calc\\(var\\(--markdown-body-font-size\\) \\* ${factor}\\)`
        )
      )
    })
    // h5 与正文同级，直接用基数。
    expect(source).toMatch(
      /\.ProseMirror h5 \{[^}]*font-size: var\(--markdown-body-font-size\)/
    )
  })

  it('标题统一加粗并收紧行高（Crepe 默认字重 400）', () => {
    const shared = source.match(
      /\.ProseMirror :is\(h1, h2, h3, h4, h5, h6\) \{([\s\S]*?)\n\}/
    )
    expect(shared?.[1]).toMatch(/font-weight: 700/)
    expect(shared?.[1]).toMatch(/line-height: 1\.4/)
    // 颜色走继承，避免把亮色硬编码进暗色主题。
    expect(shared?.[1]).not.toMatch(/color:/)
  })
})
