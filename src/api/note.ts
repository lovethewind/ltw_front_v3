import type { AxiosRequestConfig } from 'axios'
import type { ApiId, ApiResponse, INote, INoteListItem, NoteQuery, NoteSavePayload, PageResult } from '@/interface/note'
import request from '@/utils/request'

const apiName = '/note'

/**
 * 调用已由响应拦截器解包的后端接口。
 *
 * :param config: Axios 请求配置。
 * :return: 统一响应体。
 */
function requestApi<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request(config) as unknown as Promise<ApiResponse<T>>
}

export default {
  /**
   * 获取笔记分页列表。
   *
   * :param current: 当前页码。
   * :param size: 每页数量。
   * :param params: 查询条件。
   * :return: 笔记分页数据。
   */
  getPageList(current: number, size: number, params: NoteQuery): Promise<ApiResponse<PageResult<INoteListItem>>> {
    return requestApi<PageResult<INoteListItem>>({
      url: `${apiName}/list/${current}/${size}`,
      method: 'get',
      params
    })
  },

  /**
   * 创建一篇默认笔记。
   *
   * :return: 新建笔记 ID。
   */
  create(folderId: ApiId | null = null): Promise<ApiResponse<ApiId>> {
    return requestApi<ApiId>({ url: apiName, method: 'post', data: { folderId } })
  },

  /**
   * 获取笔记详情。
   *
   * :param noteId: 笔记 ID。
   * :return: 笔记详情。
   */
  getDetail(noteId: ApiId): Promise<ApiResponse<INote>> {
    return requestApi<INote>({ url: `${apiName}/${noteId}`, method: 'get' })
  },

  /**
   * 更新笔记内容与归属。
   *
   * :param noteId: 笔记 ID。
   * :param data: 待保存的笔记快照。
   * :return: 操作结果。
   */
  update(noteId: ApiId, data: NoteSavePayload): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${noteId}`, method: 'put', data })
  },

  /**
   * 设置笔记置顶状态。
   *
   * :param noteId: 笔记 ID。
   * :param isPinned: 是否置顶。
   * :return: 操作结果。
   */
  setPinned(noteId: ApiId, isPinned: boolean): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${noteId}/pin`, method: 'put', data: { isPinned } })
  },

  /**
   * 将笔记移入回收站。
   *
   * :param noteId: 笔记 ID。
   * :return: 操作结果。
   */
  remove(noteId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${noteId}`, method: 'delete' })
  },

  /**
   * 从回收站恢复笔记。
   *
   * :param noteId: 笔记 ID。
   * :return: 操作结果。
   */
  restore(noteId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${noteId}/restore`, method: 'put' })
  },

  /**
   * 永久删除笔记。
   *
   * :param noteId: 笔记 ID。
   * :return: 操作结果。
   */
  permanentDelete(noteId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${noteId}/permanent`, method: 'delete' })
  }
}
