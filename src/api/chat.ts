import request from '@/utils/request'
import { ContactTypeEnum } from '@/enums/ws'

const apiName = '/chat'

export default {

  getConversationPageList(page: number, limit: number, params: object) {
    return request({
      url: `${apiName}/conversation/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getConversationDetail(params) {
    return request({
      url: `${apiName}/conversationDetail`,
      method: 'get',
      params: params
    })
  },

  updateConversation(data: object) {
    return request({
      url: `${apiName}/conversation`,
      method: 'put',
      data: data
    })
  },

  getHistoryMessageList(params: object) {
    return request({
      url: `${apiName}/message`,
      method: 'get',
      params
    })
  },

  getContactPageList(contactType: ContactTypeEnum, page: number, limit: number) {
    return request({
      url: `${apiName}/contact/${contactType}/${page}/${limit}`,
      method: 'get'
    })
  },

  getContactApplyList() {
    return request({
      url: `${apiName}/listContactApply`,
      method: 'get'
    })
  },

  postContactApply(data: object) {
    return request({
      url: `${apiName}/contactApply`,
      method: 'post',
      data: data
    })
  },

  updateContactApply(data: object) {
    return request({
      url: `${apiName}/contactApply`,
      method: 'put',
      data: data
    })
  },

  deleteContact(data: object) {
    return request({
      url: `${apiName}/contact`,
      method: 'delete',
      data: data
    })
  }
}
