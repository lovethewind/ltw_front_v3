import request from '@/utils/request'

const apiName = '/article'

export default {

  getPageList(page: number, limit: number, params: any) {
    return request({
      url: `${apiName}/common/list/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getArticleInfo(id: string | string[]) {
    return request({
      url: `${apiName}/common/find/${id}`,
      method: 'get'
    })
  },

  addViewCount(data: object) {
    return request({
      url: `${apiName}/common/addViewCount`,
      method: 'post',
      data
    })
  },

  getUserArticleCountInfo(params: object) {
    return request({
      url: `${apiName}/articleCountInfo`,
      method: 'get',
      params: params
    })
  },
  getArticleEditInfo(id: string | string[]) {
    return request({
      url: `${apiName}/editFind/${id}`,
      method: 'get'
    })
  },
  removeToRecycle(data: object) {
    return request({
      url: `${apiName}/removeToRecycle`,
      method: 'delete',
      data: data
    })
  },
  removeFromRecycle(data: object) {
    return request({
      url: `${apiName}/removeFromRecycle`,
      method: 'delete',
      data: data
    })
  },
  moveToDraft(data: object) {
    return request({
      url: `${apiName}/moveToDraft`,
      method: 'put',
      data: data
    })
  },
  save(article: object) {
    return request({
      url: `${apiName}/add`,
      method: 'post',
      data: article
    })
  },
  update(article: object) {
    return request({
      url: `${apiName}/update`,
      method: 'put',
      data: article
    })
  },
  batchUpdate(data: object) {
    return request({
      url: `${apiName}/batchUpdate`,
      method: 'put',
      data: data
    })
  }
}
