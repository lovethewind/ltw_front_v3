import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AppFormDialog', () => {
  /**
   * 验证通用表单弹窗默认按视口居中展示。
   *
   * :return: 无返回值。
   */
  it('默认启用视口居中', () => {
    const componentPath = fileURLToPath(new URL('../AppFormDialog.vue', import.meta.url))
    const componentSource = readFileSync(componentPath, 'utf8')

    expect(componentSource).toMatch(/<el-dialog\b[^>]*\balign-center\b/)
  })

  /**
   * 验证移动端相邻按钮不会继承组件库的左外边距。
   *
   * :return: 无返回值。
   */
  it('移动端清除相邻按钮左外边距', () => {
    const stylePath = fileURLToPath(new URL('../../../assets/css/dialog.scss', import.meta.url))
    const styleSource = readFileSync(stylePath, 'utf8')

    expect(styleSource).toMatch(
      /\.app-dialog-footer\s+\.el-button\s*\+\s*\.el-button\s*{[^}]*margin-left:\s*0;/s
    )
  })
})
