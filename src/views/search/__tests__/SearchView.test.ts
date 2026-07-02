import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取搜索结果页源码，用于验证页面关键结构语义。
 *
 * :return: 搜索结果页单文件组件源码。
 */
function readSearchViewSource(): string {
  return readFileSync(new URL('../SearchView.vue', import.meta.url), 'utf8')
}

/**
 * 读取搜索结果页样式源码，用于验证视觉结构覆盖。
 *
 * :return: 搜索结果页样式源码。
 */
function readSearchStyleSource(): string {
  return readFileSync(new URL('../../../assets/css/search.scss', import.meta.url), 'utf8')
}

describe('SearchView 搜索结果页语义', () => {
  it('提供玻璃感搜索控制区和热搜入口', () => {
    const source = readSearchViewSource()
    const style = readSearchStyleSource()

    expect(style).toContain('margin-top: -60px;')
    expect(source).toContain('class="search-hero-content"')
    expect(source).toContain('class="search-panel"')
    expect(source).toContain('class="search-panel-header"')
    expect(source).toContain('class="search-type-segment"')
    expect(source).toContain('search-type-button')
    expect(source).not.toContain('<template #prepend>')
    expect(source).not.toContain('<el-select v-model="searchType"')
    expect(source).toContain('class="hot-words-list"')
    expect(source).toContain('class="hot-words"')
    expect(style).toContain('.search-panel')
    expect(style).toContain('.search-type-segment')
    expect(style).toContain('backdrop-filter: blur(18px);')
  })

  it('文章和用户结果使用统一的卡片结构', () => {
    const source = readSearchViewSource()
    const style = readSearchStyleSource()

    expect(source).toContain('class="article-result-card"')
    expect(source).toContain('class="article-meta-row"')
    expect(source).toContain('class="article-stats"')
    expect(source).toContain('class="search-user-card"')
    expect(source).toContain('class="search-user-avatar-ring"')
    expect(source).toContain('class="search-user-avatar"')
    expect(source).toContain('class="search-user-meta"')
    expect(source).toContain('UID {{ item.uid }}')
    expect(source).toContain("{{ item.address || '未知' }}")
    expect(source).toContain('formatRegisterTime(item.registerTime)')
    expect(source).toContain("import { date, formatRegisterTime } from '@/utils/date'")
    expect(source).not.toContain('IP属地')
    expect(source).toContain('class="search-user-stats"')
    expect(source).toContain('{{ covertNumberDisplay(item.articleCount || 0) }}')
    expect(source).toContain('{{ covertNumberDisplay(item.fansCount || 0) }}')
    expect(source).not.toContain('用户主页')
    expect(source).not.toContain('搜索匹配')
    expect(source).toContain('class="search-user-summary"')
    expect(source).toContain('class="search-user-action"')
    expect(style).toContain('.article-result-card')
    expect(style).toContain('.search-user-card')
    expect(style).toContain('.search-user-stats')
    expect(style).toContain('.search-user-action')
  })

  it('补齐移动端和暗色模式样式覆盖', () => {
    const style = readSearchStyleSource()

    expect(style).toContain('@media (max-width: 759px)')
    expect(style).toContain('html.dark')
    expect(style).toContain('.search-panel')
    expect(style).toContain('.article-result-card')
    expect(style).toContain('.search-user-card')
  })
})
