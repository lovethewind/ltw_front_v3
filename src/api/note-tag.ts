import type { AxiosRequestConfig } from 'axios'
import type { ApiId, ApiResponse, INoteTag, NoteNamePayload } from '@/interface/note'
import request from '@/utils/request'

const apiName = '/note-tag'

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
   * 获取当前用户的全部标签。
   *
   * :return: 标签列表。
   */
  getAll(): Promise<ApiResponse<INoteTag[]>> {
    return requestApi<INoteTag[]>({ url: `${apiName}/list`, method: 'get' })
  },

  /**
   * 创建标签。
   *
   * :param data: 标签名称。
   * :return: 新建标签。
   */
  create(data: NoteNamePayload): Promise<ApiResponse<INoteTag>> {
    return requestApi<INoteTag>({ url: apiName, method: 'post', data })
  },

  /**
   * 重命名标签。
   *
   * :param tagId: 标签 ID。
   * :param data: 标签名称。
   * :return: 操作结果。
   */
  rename(tagId: ApiId, data: NoteNamePayload): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${tagId}`, method: 'put', data })
  },

  /**
   * 删除标签及其关联。
   *
   * :param tagId: 标签 ID。
   * :return: 操作结果。
   */
  remove(tagId: ApiId): Promise<ApiResponse<null>> {
    return requestApi<null>({ url: `${apiName}/${tagId}`, method: 'delete' })
  }
}
