import type { AxiosRequestConfig } from 'axios'
import type { ApiId, ApiResponse, INoteFolder, NoteFolderPayload, NoteNamePayload } from '@/interface/note'
import request from '@/utils/request'

const apiName = '/note-folder'

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
   * 获取当前用户的全部文件夹。
   *
   * :return: 文件夹列表。
   */
  getAll(isDeleted = false): Promise<ApiResponse<INoteFolder[]>> {
    return requestApi<INoteFolder[]>({ url: `${apiName}/list`, method: 'get', params: { isDeleted } })
  },

  /**
   * 创建文件夹。
   *
   * :param data: 文件夹名称。
   * :return: 新建文件夹。
   */
  create(data: NoteFolderPayload): Promise<ApiResponse<INoteFolder>> {
    return requestApi<INoteFolder>({ url: apiName, method: 'post', data })
  },

  /**
   * 批量调整文件夹排序。
   *
   * :param folderIds: 按显示顺序排列的文件夹 ID。
   * :return: 操作结果。
   */
  sort(folderIds: ApiId[]): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/sort`, method: 'put', data: { folderIds } })
  },

  /**
   * 重命名文件夹。
   *
   * :param folderId: 文件夹 ID。
   * :param data: 文件夹名称。
   * :return: 操作结果。
   */
  rename(folderId: ApiId, data: NoteNamePayload): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${folderId}`, method: 'put', data })
  },

  /**
   * 将文件夹子树及其中笔记整体移入回收站。
   *
   * :param folderId: 文件夹 ID。
   * :return: 操作结果。
   */
  remove(folderId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${folderId}`, method: 'delete' })
  },

  /**
   * 恢复文件夹子树及随目录删除的笔记。
   *
   * :param folderId: 删除操作的根文件夹 ID。
   * :return: 操作结果。
   */
  restore(folderId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${folderId}/restore`, method: 'put' })
  },

  /**
   * 永久删除文件夹子树及随目录删除的笔记。
   *
   * :param folderId: 删除操作的根文件夹 ID。
   * :return: 操作结果。
   */
  permanentDelete(folderId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${folderId}/permanent`, method: 'delete' })
  }
}
