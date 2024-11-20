import request from '@/utils/request'

const apiName = '/link'

export default {

  getList() {
    return request({
      url: `${apiName}/common/list`,
      method: 'get',
    })
  },
  save(link: object) {
    return request({
      url: `${apiName}/common/add`,
      method: 'post',
      data: link
    })
  }
}
