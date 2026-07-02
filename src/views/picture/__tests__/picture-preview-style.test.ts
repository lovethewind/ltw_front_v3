import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取图库样式源码，用于验证图片详情弹窗的主题覆盖。
 *
 * :return: 图库样式源码。
 */
function readPictureStyleSource(): string {
  return readFileSync(new URL('../../../assets/css/picture.scss', import.meta.url), 'utf8')
}

describe('图片详情弹窗样式', () => {
  it('为夜间模式覆盖右侧详情和评论区域', () => {
    const source = readPictureStyleSource()

    expect(source).toContain('html.dark {')
    expect(source).toContain('.picture-preview-dialog')
    expect(source).toContain('.picture-preview-sidebar')
    expect(source).toContain('.picture-preview-comments :deep(.reply-input-wrapper)')
    expect(source).toContain('.picture-preview-comments :deep(.comment-content)')
    expect(source).toContain('.picture-preview-comments :deep(.comment-item)')
    expect(source).toMatch(/\.picture-preview-comments\s+:deep\(\.reply-input-wrapper\)\s*{[^}]*background:\s*#1d1e1f !important;/s)
    expect(source).toMatch(/\.picture-preview-comments\s+:deep\(\.comment-content\)\s*{[^}]*color:\s*#cfd3dc;/s)
    expect(source).toMatch(/\.picture-preview-sidebar\s*{[^}]*border-left-color:\s*#303030;/s)
  })
})
