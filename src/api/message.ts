import request from '@/utils/request.js'

const apiName = '/message'

export default {

  getPageList(page: number, limit: number) {
    return request({
      url: `${apiName}/common/${page}/${limit}`,
      method: 'get'
    })
  },

  getChildrenMessageByMessageId(page: number, limit: number, messageId: string) {
    return request({
      url: `${apiName}/common/children/${messageId}/${page}/${limit}`,
      method: 'get'
    })
  },

  save(comment: object) {
    return request({
      url: `${apiName}/common/add`,
      method: 'post',
      data: comment
    })
  }
}
