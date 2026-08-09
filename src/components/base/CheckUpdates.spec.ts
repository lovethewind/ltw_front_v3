import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('网页版本更新提示', () => {
  it('使用更新图标、说明卡片和双按钮操作区', () => {
    const source = readFileSync(new URL('./CheckUpdates.vue', import.meta.url), 'utf8')

    expect(source).toContain('class="version-update-dialog"')
    expect(source).toContain('solar:refresh-circle-bold-duotone')
    expect(source).toContain('页面已有新内容，刷新后即可继续使用最新版本。')
    expect(source).toContain('建议现在刷新，避免继续使用旧页面。')
    expect(source).toContain('立即刷新')
    expect(source).toContain('稍后再说')
  })
})
