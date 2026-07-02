import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取图库页面源代码，用于验证图片详情交互语义。
 *
 * :return: 图库页面单文件组件源码。
 */
function readPictureViewSource(): string {
  return readFileSync(new URL('../PictureView.vue', import.meta.url), 'utf8')
}

describe('PictureView 图片详情交互', () => {
  it('未登录点赞时先触发登录弹窗而不是直接请求点赞接口', () => {
    const source = readPictureViewSource()
    const thumbPictureBody = source.match(/function thumbPicture\(_id\?: any\): void \{([\s\S]*?)\n\}/)?.[1] || ''

    expect(thumbPictureBody).toContain('if (!checkIsLogin()) return')
    expect(thumbPictureBody.indexOf('if (!checkIsLogin()) return')).toBeLessThan(
      thumbPictureBody.indexOf('pictureActionDisabled.value = true')
    )
    expect(thumbPictureBody.indexOf('if (!checkIsLogin()) return')).toBeLessThan(
      thumbPictureBody.indexOf('actionApi.addOrUpdate')
    )
  })
})
