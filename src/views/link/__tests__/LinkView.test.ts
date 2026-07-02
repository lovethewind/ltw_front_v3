import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取友链页面源代码，用于验证模板的关键交互语义。
 *
 * :return: 友链页面单文件组件源码。
 */
function readLinkViewSource(): string {
  return readFileSync(new URL('../LinkView.vue', import.meta.url), 'utf8')
}

describe('LinkView 模板语义', () => {
  it('将友链渲染为安全的新窗口外链', () => {
    const source = readLinkViewSource()

    expect(source).toContain('class="link-card"')
    expect(source).toContain(':href="item.url"')
    expect(source).toContain('target="_blank"')
    expect(source).toContain('rel="noopener noreferrer"')
    expect(source).not.toContain('@click="toWeb(item.url)"')
  })

  it('为本站信息提供有可读名称的复制按钮', () => {
    const source = readLinkViewSource()

    expect(source.match(/class="site-info-copy-button"/g)).toHaveLength(4)
    expect(source).toContain('aria-label="复制网站名称"')
    expect(source).toContain('aria-label="复制网站简介"')
    expect(source).toContain('aria-label="复制网站地址"')
    expect(source).toContain('aria-label="复制网站 Logo"')
  })

  it('使用明确按钮打开申请弹窗并展示邮箱填写提示', () => {
    const source = readLinkViewSource()

    expect(source).toContain('class="link-apply-button"')
    expect(source).toMatch(/class="link-apply-button"[\s\S]*?>\s*申请友链\s*<\/el-button\s*>/)
    expect(source).toContain('placeholder="成功或有疑问时，可通过此邮箱联系你"')
  })
})
