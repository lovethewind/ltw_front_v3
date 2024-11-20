import request from '@/utils/request'

const apiName = '/website'

export default {

  getList() {
    return request({
      url: `${apiName}/common/list`,
      method: 'get'
    })
  },
  save(data: object) {
    return request({
      url: `${apiName}/add`,
      method: 'post',
      data: data
    })
  }
}
