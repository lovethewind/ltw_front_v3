import request from '@/utils/request'

const apiName = '/share'

export default {

  getSharePageList(page: number, limit: number, params: object) {
    return request({
      url: `${apiName}/common/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getUserSharePageList(page: number, limit: number, params: object) {
    return request({
      url: `${apiName}/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  saveShare(data: object) {
    return request({
      url: `${apiName}/add`,
      method: 'post',
      data: data
    })
  },

  updateShare(data: object) {
    return request({
      url: `${apiName}/update`,
      method: 'put',
      data: data
    })
  },

  thumbShare(id: string) {
    return request({
      url: `${apiName}/thumbUp/${id}`,
      method: 'post'
    })
  },

  deleteShare(data: any) {
    return request({
      url: `${apiName}/delete`,
      method: 'delete',
      data
    })
  }
}
