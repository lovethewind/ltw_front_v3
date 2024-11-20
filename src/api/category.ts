import request from '@/utils/request'

const apiName = '/category'

export default {

  getAllCategory() {
    return request({
      url: `${apiName}/common/findAll`,
      method: 'get'
    })
  }
}
