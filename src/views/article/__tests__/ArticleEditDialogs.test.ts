import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ArticleEdit 弹层视觉结构', () => {
  /**
   * 验证标签选择器保留 Popover 交互并提供独立的视觉样式入口。
   *
   * :return: 无返回值。
   */
  it('标签选择器使用专属弹层结构', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')

    expect(componentSource).toContain('popper-class="article-tag-popover"')
    expect(componentSource).toContain('placement="left"')
    expect(componentSource).toContain(':fallback-placements="[\'top\', \'bottom\', \'right\']"')
    expect(componentSource).toContain('class="article-tag-picker"')
    expect(componentSource).toContain('class="article-tag-picker__header"')
    expect(componentSource).toContain('class="article-tag-picker__tabs"')
  })

  /**
   * 验证搜索建议选中标签后，标签弹层仍由组件显式保持打开。
   *
   * :return: 无返回值。
   */
  it('搜索选择标签后保持标签弹层打开', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')
    const selectHandlerBody = componentSource.match(/function handleSelectTag\(item: ITag\): void \{([\s\S]*?)\n\}/)?.[1] || ''

    expect(componentSource).toContain('v-model:visible="isTagPopoverVisible"')
    expect(componentSource).toContain(':teleported="false"')
    expect(componentSource).toContain('value-key="name"')
    expect(selectHandlerBody).toContain('isTagPopoverVisible.value = true')
  })

  /**
   * 验证已选标签再次点击时优先取消选择，不受最多五个标签限制影响。
   *
   * :return: 无返回值。
   */
  it('再次点击已选标签会取消选择', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')
    const handlerBody = componentSource.match(/function handleAddTag\(tag: ITag\): void \{([\s\S]*?)\n\}/)?.[1] || ''

    expect(handlerBody).toContain('const selectedIndex = postForm.value.tagList.indexOf(tag.id)')
    expect(handlerBody).toContain('postForm.value.tagList.splice(selectedIndex, 1)')
    expect(handlerBody.indexOf('selectedIndex > -1')).toBeLessThan(
      handlerBody.indexOf('postForm.value.tagList.length >= 5')
    )
  })

  /**
   * 验证搜索不到标签时提供创建入口，并把创建结果加入当前选择。
   *
   * :return: 无返回值。
   */
  it('支持创建未分组的自定义标签', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')
    const apiSource = readFileSync(new URL('../../../api/tag.ts', import.meta.url), 'utf8')
    const storeSource = readFileSync(new URL('../../../stores/common.ts', import.meta.url), 'utf8')

    expect(componentSource).toContain('class="article-tag-picker__create"')
    expect(componentSource).toContain('@click="createCustomTag"')
    expect(componentSource).toContain('tagApi.createCustomTag({ name: customTagName.value })')
    expect(componentSource).toContain("name: '自定义'")
    expect(apiSource).toContain('createCustomTag(data: { name: string }): Promise<any>')
    expect(apiSource).toContain('url: `${apiName}/add`')
    expect(storeSource).toContain('function addChoiceTag(tag: any): void')
    expect(storeSource).toContain('item.level === 2')
  })

  /**
   * 验证附件上传继续使用 Dialog，并复用项目的玻璃弹窗视觉结构。
   *
   * :return: 无返回值。
   */
  it('附件上传使用玻璃弹窗结构', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')

    expect(componentSource).toMatch(/<el-dialog\b[^>]*class="attachment-dialog app-form-dialog"/)
    expect(componentSource).toMatch(/<el-dialog\b[^>]*\balign-center\b/)
    expect(componentSource).toContain('class="attachment-dialog__hero"')
    expect(componentSource).toContain('class="attachment-dialog__footer app-dialog-footer"')
  })

  /**
   * 验证已上传附件列表使用文件卡片结构展示。
   *
   * :return: 无返回值。
   */
  it('已上传附件列表使用文件卡片结构', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')
    const styleSource = readFileSync(new URL('../../../assets/css/article-edit.scss', import.meta.url), 'utf8')

    expect(componentSource).toContain('class="article-attach-header"')
    expect(componentSource).toContain('class="attachment-list__item"')
    expect(componentSource).toContain('class="attachment-list__file-icon"')
    expect(componentSource).toContain('class="attachment-list__name"')
    expect(componentSource).toContain('class="attachment-list__delete"')
    expect(styleSource).toContain('.attachment-list__item')
    expect(styleSource).toContain('grid-template-columns: 34px minmax(0, 1fr) auto;')
  })

  /**
   * 验证附件上传进度浮层使用文件卡片和独立进度信息。
   *
   * :return: 无返回值。
   */
  it('附件上传进度使用文件卡片结构', () => {
    const componentSource = readFileSync(new URL('../ArticleEdit.vue', import.meta.url), 'utf8')
    const styleSource = readFileSync(new URL('../../../assets/css/article-edit.scss', import.meta.url), 'utf8')

    expect(componentSource).toContain('class="attachment-uploading__header"')
    expect(componentSource).toContain('class="attachment-uploading__item"')
    expect(componentSource).toContain('class="attachment-uploading__progress"')
    expect(componentSource).toContain(':show-text="false"')
    expect(styleSource).toContain('.attachment-uploading__progress')
    expect(styleSource).toContain('grid-template-columns: 38px minmax(0, 1fr);')
  })

  /**
   * 验证标签和附件弹层覆盖亮色、暗色、移动端及减弱动效场景。
   *
   * :return: 无返回值。
   */
  it('弹层样式覆盖完整显示场景', () => {
    const styleSource = readFileSync(new URL('../../../assets/css/article-edit.scss', import.meta.url), 'utf8')

    expect(styleSource).toContain(':global(.article-tag-popover)')
    expect(styleSource).toContain(':global(html.dark .article-tag-popover)')
    expect(styleSource).toContain(':global(html.dark .attachment-dialog.app-form-dialog)')
    expect(styleSource).toMatch(/article-tag-picker__tabs\)\s*\{\s*height:\s*324px;/)
    expect(styleSource).toMatch(/el-tabs__nav-prev\),[\s\S]*el-tabs__nav-next\)\s*\{\s*display:\s*none;/)
    expect(styleSource).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styleSource).toMatch(/@media screen and \(max-width: 759px\)[\s\S]*article-tag-popover/)
  })
})
