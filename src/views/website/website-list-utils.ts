export interface WebsiteItem {
  id?: string | number | null
  name?: string | null
  introduce?: string | null
  url?: string | null
  cover?: string | null
}

export interface WebsiteCategory {
  id?: string | number | null
  name?: string | null
  websiteList?: WebsiteItem[] | null
}

/**
 * 按关键词筛选网站分类和站点列表，不修改原始数据。
 *
 * :param list: 网站分类列表。
 * :param keyword: 搜索关键词。
 * :return: 筛选后仍保留分类结构的网站列表。
 */
export function filterWebsiteCategories<T extends WebsiteCategory>(list: T[], keyword: string): T[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return list
  }

  return list
    .map(category => {
      const matchedWebsiteList = (category.websiteList || []).filter(item => {
        return [
          item.name,
          item.introduce,
          item.url
        ].some(value => value?.toLowerCase().includes(normalizedKeyword))
      })

      return {
        ...category,
        websiteList: matchedWebsiteList
      }
    })
    .filter(category => (category.websiteList || []).length > 0)
}

/**
 * 按分类 ID 筛选网站分类列表。
 *
 * :param list: 网站分类列表。
 * :param categoryId: 当前选中的分类 ID，空值表示全部。
 * :return: 分类筛选后的网站分类列表。
 */
export function filterWebsiteCategoriesByCategory<T extends WebsiteCategory>(
  list: T[],
  categoryId: string | number | null
): T[] {
  if (categoryId === null || categoryId === '') {
    return list
  }
  return list.filter(category => category.id === categoryId)
}

/**
 * 统计分类内的网站数量。
 *
 * :param category: 网站分类。
 * :return: 当前分类下的网站数量。
 */
export function getWebsiteCategoryCount(category: WebsiteCategory): number {
  return category.websiteList?.length || 0
}

/**
 * 统计当前展示的网站总数。
 *
 * :param list: 当前展示的网站分类列表。
 * :return: 展示中的网站数量。
 */
export function getWebsiteDisplayCount(list: WebsiteCategory[]): number {
  return list.reduce((total, category) => total + getWebsiteCategoryCount(category), 0)
}

/**
 * 从网站地址中提取用于卡片展示的域名。
 *
 * :param url: 网站地址。
 * :return: 去掉 www 前缀后的域名，没有地址时返回兜底文案。
 */
export function getWebsiteHost(url?: string | null): string {
  if (!url) {
    return '未知网址'
  }
  const host = new URL(url, 'https://localhost').hostname
  return host.replace(/^www\./, '')
}

/**
 * 获取网站展示名称，没有名称时使用域名兜底。
 *
 * :param item: 网站信息。
 * :return: 网站展示名称。
 */
export function getWebsiteDisplayName(item: WebsiteItem): string {
  if (item.name?.trim()) {
    return item.name
  }
  const host = getWebsiteHost(item.url)
  return host === '未知网址' ? '未命名网站' : host
}
