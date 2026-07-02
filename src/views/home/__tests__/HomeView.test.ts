import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取首页源码，用于验证文章展示首页的关键结构语义。
 *
 * :return: 首页单文件组件源码。
 */
function readHomeViewSource(): string {
  return readFileSync(new URL('../HomeView.vue', import.meta.url), 'utf8')
}

/**
 * 读取文章列表项源码，用于验证文章卡片的关键结构语义。
 *
 * :return: 文章列表项单文件组件源码。
 */
function readArticleListItemSource(): string {
  return readFileSync(new URL('../../../components/article/ArticleListItem.vue', import.meta.url), 'utf8')
}

describe('HomeView 文章首页语义', () => {
  it('在列表顶部展示当前分类和文章总数', () => {
    const source = readHomeViewSource()

    expect(source).toContain('class="article-list-header"')
    expect(source).toContain('class="article-list-eyebrow"')
    expect(source).toContain('{{ activeCategoryName }}')
    expect(source).toContain('{{ total }} 篇文章')
  })

  it('移动端提供分类快捷筛选入口', () => {
    const source = readHomeViewSource()

    expect(source).toMatch(/class="[^"]*mobile-category-strip[^"]*"/)
    expect(source).toContain('mobile-category-item')
    expect(source).toContain('v-for="category in categoryList"')
    expect(source).toContain('@click="changeCategory(String(category.id))"')
  })

  it('文章列表无数据时展示空状态和查看全部文章入口', () => {
    const source = readHomeViewSource()

    expect(source).toContain('class="article-empty-state"')
    expect(source).toContain('暂时没有文章')
    expect(source).toContain('查看全部文章')
    expect(source).toContain('@click="changeCategory(null)"')
  })

  it('侧栏标签云使用文字云样式并绑定随机字号颜色', () => {
    const source = readHomeViewSource()
    const style = readFileSync(new URL('../../../assets/css/home.scss', import.meta.url), 'utf8')

    expect(source).toContain('class="tag-cloud"')
    expect(source).toContain('class="tag-cloud-link"')
    expect(source).toContain(':style="tagCloudStyles[tag.id]"')
    expect(source).toContain('setTagCloudStyles(randomTagList.value)')
    expect(source).toContain('const tagCloudPalette')
    expect(source).toContain("fontSize: Math.floor(Math.random() * 7) + 14 + 'px'")
    expect(source).not.toContain("Math.floor(Math.random() * 10) + 18 + 'px'")
    expect(style).toContain('.tag-cloud')
    expect(style).toContain('.tag-cloud-link')
    expect(style).toContain('line-height: 1.8;')
    expect(style).not.toContain('.web-info .el-tag-a')
  })

  it('首页新增结构提供夜间模式样式覆盖', () => {
    const style = readFileSync(new URL('../../../assets/css/home.scss', import.meta.url), 'utf8')

    expect(style).toContain('html.dark {')
    expect(style).toContain('.blog-card,')
    expect(style).toContain('.article-list-header,')
    expect(style).toContain('.article-empty-state')
    expect(style).toContain('.category-nav-item')
    expect(style).toContain('.mobile-category-item')
    expect(style).toContain('.article-list-count')
  })
})

describe('ArticleListItem 首页文章卡片语义', () => {
  it('使用统一封面和内容结构承载文章扫读信息', () => {
    const source = readArticleListItemSource()

    expect(source).toContain('class="article-cover-link"')
    expect(source).toContain('class="article-meta-row"')
    expect(source).toContain('class="article-stats"')
    expect(source).toContain('class="article-tags"')
    expect(source).toContain('class="article-tag-pill"')
    expect(source).toContain('article.tagList.slice(0, 2)')
    expect(source).not.toContain('colors: Record<string, string>')
    expect(source).not.toContain('isMobile() ? 2 : 3')
    expect(source).not.toContain(':color="colors[tagId] || \'green\'"')
    expect(source).not.toContain(':style="{ \'--tag-color\': colors[tagId] }"')
    expect(source).toMatch(/:deep\(\.el-card__body\)[\s\S]*display:\s*flex;/)
    expect(source).toMatch(/\.article-meta-row\s*{[\s\S]*justify-content:\s*space-between;/)
    expect(source).toContain('class="article-date"')
    expect(source).not.toContain('max-width: 58%')
    expect(source).toContain('height: 196px;')
    expect(source).not.toContain('height: 214px;')
    expect(source).not.toContain('min-height: 248px;')
    expect(source).not.toContain('isRight(index)')
  })

  it('文章卡片提供夜间模式样式覆盖', () => {
    const source = readArticleListItemSource()

    expect(source).toContain('html.dark {')
    expect(source).toContain('.article-list-item-card')
    expect(source).toContain('.article-list-item-title')
    expect(source).toContain('.article-content')
    expect(source).toContain('.article-tag-pill')
  })
})
