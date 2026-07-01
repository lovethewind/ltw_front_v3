import { describe, expect, it } from 'vitest'
import {
  getAdjacentPictureItem,
  getNextLikeCount,
  getPictureDownloadName,
  getPreviewPicturePosition,
  resetPaginationPage
} from '../picture-view-utils'

describe('picture-view-utils', () => {
  it('切换图库时重置分页到第一页', () => {
    const params = {
      pageNum: 3,
      pageSize: 18
    }

    resetPaginationPage(params)

    expect(params).toEqual({
      pageNum: 1,
      pageSize: 18
    })
  })

  it('取消点赞时点赞数不会小于 0', () => {
    expect(getNextLikeCount(0, false)).toBe(0)
    expect(getNextLikeCount(undefined, false)).toBe(0)
    expect(getNextLikeCount(2, false)).toBe(1)
  })

  it('下载图片时优先使用名称，没有名称时使用图片 id 和后缀兜底', () => {
    expect(getPictureDownloadName({
      name: '封面.png',
      id: 'abc',
      url: 'https://example.com/image.jpg'
    })).toBe('封面.png')

    expect(getPictureDownloadName({
      id: 'abc',
      url: 'https://example.com/path/image.jpg?x=1'
    })).toBe('picture-abc.jpg')

    expect(getPictureDownloadName({})).toBe('picture-download')
  })

  it('根据当前图片获取相邻预览图片', () => {
    const list = [
      { id: 'first' },
      { id: 'current' },
      { id: 'last' }
    ]

    expect(getAdjacentPictureItem(list, 'current', 'prev')).toEqual({ id: 'first' })
    expect(getAdjacentPictureItem(list, 'current', 'next')).toEqual({ id: 'last' })
    expect(getAdjacentPictureItem(list, 'first', 'prev')).toBeNull()
    expect(getAdjacentPictureItem(list, 'last', 'next')).toBeNull()
    expect(getAdjacentPictureItem(list, 'missing', 'next')).toBeNull()
  })

  it('获取当前预览图片在列表中的位置', () => {
    const list = [
      { id: 'first' },
      { id: 'current' },
      { id: 'last' }
    ]

    expect(getPreviewPicturePosition(list, 'current')).toEqual({
      current: 2,
      total: 3
    })
    expect(getPreviewPicturePosition(list, 'missing')).toEqual({
      current: 0,
      total: 3
    })
  })
})
