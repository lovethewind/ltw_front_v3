import request from '@/utils/request'

const apiName = '/comment'

export default {

  getCommentByArticleId(page: number, limit: number, params: any) {
    return request({
      url: `${apiName}/common/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getCommentByCommentId(page: number, limit: number, commentId: string) {
    return request({
      url: `${apiName}/common/children/${commentId}/${page}/${limit}`,
      method: 'get'
    })
  },

  deleteById(id: string) {
    return request({
      url: `${apiName}/delete/${id}`,
      method: 'delete'
    })
  },
  save(comment: object) {
    return request({
      url: `${apiName}/add`,
      method: 'post',
      data: comment
    })
  }
}
