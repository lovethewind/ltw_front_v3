import { describe, expect, it } from 'vitest'
import {
  buildPictureQueryParams,
  filterPictureList,
  getAdjacentPictureItem,
  getNextCommentCount,
  getNextLikeCount,
  getPictureDownloadName,
  getPreviewPicturePosition,
  resetPaginationPage,
  sortPictureList,
  syncPictureCommentCount
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

  it('评论成功后评论数递增', () => {
    expect(getNextCommentCount(0)).toBe(1)
    expect(getNextCommentCount(undefined)).toBe(1)
    expect(getNextCommentCount(2)).toBe(3)
  })

  it('评论成功后同步列表里对应图片的评论数', () => {
    const list = [
      { id: 'first', commentCount: 0 },
      { id: 'current', commentCount: 2 }
    ]

    syncPictureCommentCount(list, 'current', 3)

    expect(list).toEqual([
      { id: 'first', commentCount: 0 },
      { id: 'current', commentCount: 3 }
    ])
  })

  it('构建图片列表查询参数时只把服务端支持的排序传给后端', () => {
    expect(buildPictureQueryParams(12, 'latest')).toEqual({
      albumId: 12,
      sortType: 'latest'
    })
    expect(buildPictureQueryParams(null, 'resolution')).toEqual({
      albumId: null,
      sortType: 'resolution'
    })
    expect(buildPictureQueryParams(undefined, 'default')).toEqual({
      albumId: undefined
    })
    expect(buildPictureQueryParams(12, 'like')).toEqual({
      albumId: 12,
      sortType: 'like'
    })
  })

  it('按当前页图片指标排序', () => {
    const list = [
      { id: 'old', createTime: '2024-01-01 00:00:00', likeCount: 1, commentCount: 3, width: 800, height: 600 },
      { id: 'hot', createTime: '2024-01-03 00:00:00', likeCount: 9, commentCount: 1, width: 1200, height: 600 },
      { id: 'talk', createTime: '2024-01-02 00:00:00', likeCount: 2, commentCount: 8, width: 500, height: 500 }
    ]

    expect(sortPictureList(list, 'latest').map(item => item.id)).toEqual(['hot', 'talk', 'old'])
    expect(sortPictureList(list, 'like').map(item => item.id)).toEqual(['hot', 'talk', 'old'])
    expect(sortPictureList(list, 'comment').map(item => item.id)).toEqual(['talk', 'old', 'hot'])
    expect(sortPictureList(list, 'resolution').map(item => item.id)).toEqual(['hot', 'old', 'talk'])
    expect(sortPictureList(list, 'default')).toEqual(list)
  })

  it('按当前页图片类型筛选', () => {
    const list = [
      { id: 'landscape', width: 1200, height: 600, description: '横图' },
      { id: 'portrait', width: 600, height: 1200, description: '' },
      { id: 'square', width: 600, height: 600, description: '方图' }
    ]

    expect(filterPictureList(list, 'landscape').map(item => item.id)).toEqual(['landscape'])
    expect(filterPictureList(list, 'portrait').map(item => item.id)).toEqual(['portrait'])
    expect(filterPictureList(list, 'square').map(item => item.id)).toEqual(['square'])
    expect(filterPictureList(list, 'withDescription').map(item => item.id)).toEqual(['landscape', 'square'])
    expect(filterPictureList(list, 'withoutDescription').map(item => item.id)).toEqual(['portrait'])
    expect(filterPictureList(list, 'all')).toEqual(list)
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
