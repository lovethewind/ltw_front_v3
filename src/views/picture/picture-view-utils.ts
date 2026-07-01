export interface PaginationParams {
  pageNum: number
  pageSize: number
}

export interface PictureDownloadItem {
  name?: string | null
  id?: string | number | null
  url?: string | null
}

export type PreviewDirection = 'prev' | 'next'

export interface PicturePreviewItem {
  id?: string | number | null
}

export interface PreviewPicturePosition {
  current: number
  total: number
}

/**
 * 重置分页到第一页。
 *
 * :param params: 分页参数对象。
 * :return: 无返回值。
 */
export function resetPaginationPage(params: PaginationParams): void {
  params.pageNum = 1
}

/**
 * 根据点赞结果计算下一次点赞数，避免出现负数。
 *
 * :param currentCount: 当前点赞数。
 * :param hasLike: 接口返回的最新点赞状态。
 * :return: 计算后的点赞数。
 */
export function getNextLikeCount(currentCount: number | null | undefined, hasLike: boolean): number {
  const count = currentCount || 0
  return hasLike ? count + 1 : Math.max(0, count - 1)
}

/**
 * 获取图片下载文件名，没有名称时根据图片 ID 和链接后缀生成兜底名称。
 *
 * :param item: 图片下载信息。
 * :return: 下载文件名。
 */
export function getPictureDownloadName(item: PictureDownloadItem): string {
  if (item.name) {
    return item.name
  }
  const id = item.id || 'download'
  const extension = getUrlExtension(item.url)
  return `picture-${id}${extension}`
}

/**
 * 根据当前图片获取相邻预览图片。
 *
 * :param list: 当前页图片列表。
 * :param currentId: 当前图片 ID。
 * :param direction: 切换方向。
 * :return: 相邻图片，不存在时返回空。
 */
export function getAdjacentPictureItem<T extends PicturePreviewItem>(
  list: T[],
  currentId: string | number | null | undefined,
  direction: PreviewDirection
): T | null {
  const currentIndex = list.findIndex(item => item.id === currentId)
  if (currentIndex < 0) {
    return null
  }
  const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
  return list[nextIndex] || null
}

/**
 * 获取当前预览图片在列表中的位置。
 *
 * :param list: 当前页图片列表。
 * :param currentId: 当前图片 ID。
 * :return: 当前图片位置和图片总数。
 */
export function getPreviewPicturePosition<T extends PicturePreviewItem>(
  list: T[],
  currentId: string | number | null | undefined
): PreviewPicturePosition {
  const currentIndex = list.findIndex(item => item.id === currentId)
  return {
    current: currentIndex < 0 ? 0 : currentIndex + 1,
    total: list.length
  }
}

/**
 * 从图片地址中提取文件后缀。
 *
 * :param url: 图片地址。
 * :return: 文件后缀，包含点号。
 */
function getUrlExtension(url?: string | null): string {
  if (!url) {
    return ''
  }
  const pathname = new URL(url, 'https://localhost').pathname
  const match = pathname.match(/\.[a-zA-Z0-9]+$/)
  return match ? match[0] : ''
}
