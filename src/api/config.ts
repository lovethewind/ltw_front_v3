import request from '@/utils/request'

const apiName = '/config'

export default {

  getConfigByKey(key) {
    return request({
      url: `${apiName}/common/detail/${key}`,
      method: 'get'
    })
  }
}
