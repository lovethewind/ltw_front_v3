import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('网页版大笔记切换性能', () => {
  it('使用已维护的正文快照判断内容变化，不重复序列化当前大文档', () => {
    const source = readFileSync(new URL('../editor/MdEditor.vue', import.meta.url), 'utf8')
    const setContent = source.match(/function setContent\([\s\S]*?\n}/)?.[0]

    expect(setContent).toBeTruthy()
    expect(setContent).toMatch(/const contentChanged = contentValue\.value !== value/)
    expect(setContent).toMatch(/if \(contentChanged\) updateOutline\(value\)/)
    expect(setContent).not.toMatch(/editor\.getMarkdown\(\)/)
  })
})
