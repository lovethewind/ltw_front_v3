import request from '@/utils/request'

const apiName = '/oss'

export default {
  getUploadSignatureUrl(data: object) {
    return request({
      url: `${apiName}/getSignatureUrl`,
      method: 'post',
      data
    })
  }
}

