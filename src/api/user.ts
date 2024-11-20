import request from '@/utils/request'

const apiName = '/user'

export default {

  login(data: object) {
    return request({
      url: `${apiName}/common/login`,
      method: 'post',
      data
    })
  },

  getInfo() {
    return request({
      url: `${apiName}/info`,
      method: 'get'
    })
  },

  emailRegister(user: object) {
    return request({
      url: `${apiName}/common/emailRegister`,
      method: 'post',
      data: user
    })
  },

  mobileRegister(user: object) {
    return request({
      url: `${apiName}/common/mobileRegister`,
      method: 'post',
      data: user
    })
  },

  wechatRegister(user: object) {
    return request({
      url: `${apiName}/common/wechatRegister`,
      method: 'post',
      data: user
    })
  },

  changePasswordByFind(user: object) {
    return request({
      url: `${apiName}/common/changePasswordByFind`,
      method: 'put',
      data: user
    })
  },

  changePasswordByLogin(data: object) {
    return request({
      url: `${apiName}/changePasswordByLogin`,
      method: 'put',
      data: data
    })
  },

  changeEmailBind(user: object) {
    return request({
      url: `${apiName}/changeEmailBind`,
      method: 'put',
      data: user
    })
  },

  changeMobileBind(user: object) {
    return request({
      url: `${apiName}/changeMobileBind`,
      method: 'put',
      data: user
    })
  },

  getWechatAppletCode(type: number) {
    return request({
      url: `${apiName}/common/wechat/getWechatAppletCode/${type}`,
      method: 'get'
    })
  },

  checkScan(data: object) {
    return request({
      url: `${apiName}/common/wechat/checkScan`,
      method: 'post',
      data
    })
  },

  checkOldScan(data: object) {
    return request({
      url: `${apiName}/wechat/checkOldScan`,
      method: 'post',
      data
    })
  },

  checkChangePasswordScan(data: object) {
    return request({
      url: `${apiName}/wechat/checkChangePasswordScan`,
      method: 'post',
      data
    })
  },

  bindWeChat(data: object) {
    return request({
      url: `${apiName}/wechat/bind`,
      method: 'post',
      data
    })
  },

  logout() {
    return request({
      url: `${apiName}/common/logout`,
      method: 'post'
    })
  },

  getUserById(id: string) {
    return request({
      url: `${apiName}/common/find/${id}`,
      method: 'get'
    })
  },

  getUserByUid(uid: string) {
    return request({
      url: `${apiName}/common/findByUid/${uid}`,
      method: 'get'
    })
  },

  addViewCount(data: object) {
    return request({
      url: `${apiName}/common/addViewCount`,
      method: 'post',
      data
    })
  },

  update(user: object) {
    return request({
      url: `${apiName}/update`,
      method: 'put',
      data: user
    })
  },
  saveUserSettings(data: object) {
    return request({
      url: `${apiName}/saveUserSettings`,
      method: 'post',
      data
    })
  }
}
