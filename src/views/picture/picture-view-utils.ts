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

export interface PictureAlbumItem {
  id?: string | number | null
}

export interface PictureCommentItem extends PicturePreviewItem {
  commentCount?: number | null
}

export type PictureSortType = 'default' | 'latest' | 'like' | 'comment' | 'resolution'

export type PictureServerSortType = Exclude<PictureSortType, 'default'>

export type PictureFilterType = 'all' | 'landscape' | 'portrait' | 'square' | 'withDescription' | 'withoutDescription'

export interface PictureQueryParams {
  albumId?: string | number | null
  sortType?: PictureServerSortType
}

export interface PictureDisplayItem extends PictureCommentItem {
  url?: string | null
  thumbUrl?: string | null
  createTime?: string | Date | null
  likeCount?: number | null
  width?: number | null
  height?: number | null
  description?: string | null
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
 * 根据评论成功结果计算下一次评论数。
 *
 * :param currentCount: 当前评论数。
 * :return: 计算后的评论数。
 */
export function getNextCommentCount(currentCount: number | null | undefined): number {
  return (currentCount || 0) + 1
}

/**
 * 同步当前页图片列表中指定图片的评论数。
 *
 * :param list: 当前页图片列表。
 * :param pictureId: 要同步评论数的图片 ID。
 * :param commentCount: 最新评论数。
 * :return: 无返回值。
 */
export function syncPictureCommentCount<T extends PictureCommentItem>(
  list: T[],
  pictureId: string | number | null | undefined,
  commentCount: number
): void {
  const picture = list.find(item => item.id === pictureId)
  if (picture) {
    picture.commentCount = commentCount
  }
}

/**
 * 构建图片列表查询参数，只在非默认排序时透传排序类型。
 *
 * :param albumId: 当前图库 ID。
 * :param sortType: 当前排序类型。
 * :return: 图片列表查询参数。
 */
export function buildPictureQueryParams(
  albumId: string | number | null | undefined,
  sortType: PictureSortType
): PictureQueryParams {
  const params: PictureQueryParams = {
    albumId
  }
  if (sortType !== 'default') {
    params.sortType = sortType
  }
  return params
}

/**
 * 根据当前图库分类获取添加图片弹窗默认图库 ID。
 *
 * :param albumCategory: 当前图库分类。
 * :param currentAlbum: 当前选中的公开图库。
 * :param userCurrentAlbum: 当前选中的用户图库。
 * :return: 添加图片弹窗默认选中的图库 ID，未选中具体图库时返回空字符串。
 */
export function getSelectedAlbumId(
  albumCategory: number,
  currentAlbum: PictureAlbumItem | null | undefined,
  userCurrentAlbum: PictureAlbumItem | null | undefined
): string | number {
  const selectedAlbum = albumCategory === 1 ? currentAlbum : userCurrentAlbum
  return selectedAlbum?.id || ''
}

/**
 * 按当前页图片指标排序，不修改原数组。
 *
 * :param list: 当前页图片列表。
 * :param sortType: 排序类型。
 * :return: 排序后的图片列表。
 */
export function sortPictureList<T extends PictureDisplayItem>(list: T[], sortType: PictureSortType): T[] {
  const sortedList = [...list]
  switch (sortType) {
    case 'latest':
      return sortedList.sort((a, b) => getDateTime(b.createTime) - getDateTime(a.createTime))
    case 'like':
      return sortedList.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    case 'comment':
      return sortedList.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0))
    case 'resolution':
      return sortedList.sort((a, b) => getResolution(b) - getResolution(a))
    default:
      return list
  }
}

/**
 * 按当前页图片类型筛选。
 *
 * :param list: 当前页图片列表。
 * :param filterType: 筛选类型。
 * :return: 筛选后的图片列表。
 */
export function filterPictureList<T extends PictureDisplayItem>(list: T[], filterType: PictureFilterType): T[] {
  switch (filterType) {
    case 'landscape':
      return list.filter(item => !!item.width && !!item.height && item.width > item.height)
    case 'portrait':
      return list.filter(item => !!item.width && !!item.height && item.width < item.height)
    case 'square':
      return list.filter(item => !!item.width && !!item.height && item.width === item.height)
    case 'withDescription':
      return list.filter(item => !!item.description?.trim())
    case 'withoutDescription':
      return list.filter(item => !item.description?.trim())
    default:
      return list
  }
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

/**
 * 获取图片创建时间戳。
 *
 * :param value: 创建时间。
 * :return: 时间戳。
 */
function getDateTime(value?: string | Date | null): number {
  if (!value) {
    return 0
  }
  return new Date(value).getTime() || 0
}

/**
 * 获取图片分辨率面积。
 *
 * :param item: 图片信息。
 * :return: 分辨率面积。
 */
function getResolution(item: PictureDisplayItem): number {
  return (item.width || 0) * (item.height || 0)
}
