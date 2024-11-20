import request from '@/utils/request'

const apiName = '/action'

export default {

  getActionList(currentPage: number, pageSize: number, params: object, data: object) {
    return request({
      url: `${apiName}/common/list/${currentPage}/${pageSize}`,
      method: 'post',
      params: params,
      data: data || {}
    })
  },
  getUserActionList(currentPage: number, pageSize: number, params: object, data: object) {
    return request({
      url: `${apiName}/list/${currentPage}/${pageSize}`,
      method: 'post',
      params: params,
      data: data || {}
    })
  },
  addOrUpdate(data: object) {
    return request({
      url: `${apiName}/addOrUpdate`,
      method: 'post',
      data: data
    })
  }
}
