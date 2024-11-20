import request from '@/utils/request'

const apiName = '/search'

export default {

  getArticlePageList(data: object) {
    return request({
      url: `${apiName}/common/article/list`,
      method: 'post',
      data: data
    })
  },
  getUserPageList(data: object) {
    return request({
      url: `${apiName}/common/user/list`,
      method: 'post',
      data: data
    })
  },

  getDailyHotWords() {
    return request({
      url: `${apiName}/common/hotWords`,
      method: 'get'
    })
  },

  getRecommendArticleList(data: object) {
    return request({
      url: `${apiName}/common/article/recommend`,
      method: 'post',
      data: data
    })
  }
}
