import request from '@/utils/request'

const apiName = '/tag'

export default {

  /**
   * 创建或复用同名的自定义标签。
   *
   * :param data: 标签名称。
   * :return: 标签详情。
   */
  createCustomTag(data: { name: string }): Promise<any> {
    return request({
      url: `${apiName}/add`,
      method: 'post',
      data
    })
  },

  getAllTag() {
    return request({
      url: `${apiName}/common/findAll`,
      method: 'get'
    })
  }
}
