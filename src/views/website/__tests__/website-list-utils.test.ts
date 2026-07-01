import { describe, expect, it } from 'vitest'
import {
  filterWebsiteCategories,
  filterWebsiteCategoriesByCategory,
  getWebsiteCategoryCount,
  getWebsiteDisplayCount,
  getWebsiteDisplayName,
  getWebsiteHost
} from '../website-list-utils'

describe('website-list-utils', () => {
  it('按站名、简介和地址筛选网站列表并保留分类结构', () => {
    const list = [
      {
        id: 1,
        name: '接口工具',
        websiteList: [
          { id: 'api', name: '开放 API', introduce: '接口测试工具', url: 'https://api.example.com' },
          { id: 'draw', name: '画图工具', introduce: '流程图', url: 'https://draw.example.com' }
        ]
      },
      {
        id: 2,
        name: 'AI 工具',
        websiteList: [
          { id: 'chat', name: 'Chat 工具', introduce: 'AI 写作', url: 'https://chat.example.com' }
        ]
      }
    ]

    expect(filterWebsiteCategories(list, 'api')).toEqual([
      {
        id: 1,
        name: '接口工具',
        websiteList: [
          { id: 'api', name: '开放 API', introduce: '接口测试工具', url: 'https://api.example.com' }
        ]
      }
    ])
    expect(filterWebsiteCategories(list, '写作').map(item => item.id)).toEqual([2])
    expect(filterWebsiteCategories(list, 'draw').map(item => item.id)).toEqual([1])
  })

  it('关键词为空时返回原列表', () => {
    const list = [
      {
        id: 1,
        name: '接口工具',
        websiteList: []
      }
    ]

    expect(filterWebsiteCategories(list, '   ')).toBe(list)
  })

  it('按分类筛选网站列表', () => {
    const list = [
      { id: 1, name: '接口工具', websiteList: [{ id: 'api' }] },
      { id: 2, name: 'AI 工具', websiteList: [{ id: 'chat' }] }
    ]

    expect(filterWebsiteCategoriesByCategory(list, 2)).toEqual([
      { id: 2, name: 'AI 工具', websiteList: [{ id: 'chat' }] }
    ])
    expect(filterWebsiteCategoriesByCategory(list, null)).toBe(list)
    expect(filterWebsiteCategoriesByCategory(list, 'missing')).toEqual([])
  })

  it('统计分类下的网站数量', () => {
    expect(getWebsiteCategoryCount({ websiteList: [{ id: 1 }, { id: 2 }] })).toBe(2)
    expect(getWebsiteCategoryCount({ websiteList: null })).toBe(0)
    expect(getWebsiteCategoryCount({})).toBe(0)
  })

  it('统计当前展示的网站数量', () => {
    expect(getWebsiteDisplayCount([
      { websiteList: [{ id: 1 }, { id: 2 }] },
      { websiteList: [{ id: 3 }] },
      { websiteList: null }
    ])).toBe(3)
  })

  it('从网址中提取展示域名', () => {
    expect(getWebsiteHost('https://www.codepen.io/path?a=1')).toBe('codepen.io')
    expect(getWebsiteHost('http://api.example.com')).toBe('api.example.com')
    expect(getWebsiteHost('')).toBe('未知网址')
    expect(getWebsiteHost(null)).toBe('未知网址')
  })

  it('获取网站展示名称', () => {
    expect(getWebsiteDisplayName({ name: 'CodePen', url: 'https://codepen.io' })).toBe('CodePen')
    expect(getWebsiteDisplayName({ name: '', url: 'https://www.example.com/path' })).toBe('example.com')
    expect(getWebsiteDisplayName({})).toBe('未命名网站')
  })
})
