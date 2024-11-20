import request from '@/utils/request'

const apiName = '/tag'

export default {

  getAllTag() {
    return request({
      url: `${apiName}/common/findAll`,
      method: 'get'
    })
  }
}
