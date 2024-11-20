import request from '@/utils/request'
import { NoticeTypeEnum } from '@/enums'

const apiName = '/notice'

export default {

  getUnreadCount() {
    return request({
      url: `${apiName}/getUnreadCount`,
      method: 'get'
    })
  },

  getNoticeList(noticeType, page, limit) {
    return request({
      url: `${apiName}/list/${noticeType}/${page}/${limit}`,
      method: 'get'
    })
  },

  updateNoticeReadStatus(data: object) {
    return request({
      url: `${apiName}/update`,
      method: 'put',
      data
    })
  },

  deleteNotice(data: object) {
    return request({
      url: `${apiName}/delete`,
      method: 'delete',
      data
    })
  },
  clearNotice(noticeType: NoticeTypeEnum) {
    return request({
      url: `${apiName}/clear/${noticeType}`,
      method: 'get'
    })
  }
}
