import userApi from '@/api/user'
import { getToken, removeToken, setToken } from '@/utils/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { IUserSelfInfo } from '@/interface'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'


const eventServer = EventServer.getInstance()

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const user = ref<IUserSelfInfo>(null)
  const network = ref(true)
  const ssoHost = ref(import.meta.env.VUE_APP_DOMAIN_SSO_URL)

  function resetState() {
    token.value = getToken()
    user.value = null
    network.value = true
    ssoHost.value = import.meta.env.VUE_APP_DOMAIN_SSO_URL
  }

  function setUserToken(val: string) {
    setToken(val)
    token.value = val
  }

  function removeUserToken() {
    removeToken()
  }

  function addUserArticleLike(articleId) {
    user.value.articleLikeSet.push(articleId)
  }

  function reduceUserArticleLike(articleId) {
    user.value.articleLikeSet.splice(user.value.articleLikeSet.indexOf(articleId), 1)
  }

  function addUserArticleCollect(articleId) {
    user.value.articleCollectSet.push(articleId)
  }

  function reduceUserArticleCollect(articleId) {
    user.value.articleCollectSet.splice(user.value.articleCollectSet.indexOf(articleId), 1)
  }

  function setNetwork(val) {
    network.value = val
  }

  function login(userInfo) {
    return new Promise((resolve, reject) => {
      userApi.login(userInfo).then(response => {
        const { data } = response
        setUserToken(data.token)
        return resolve()
      }).catch(error => {
        return reject(error)
      })
    })
  }

  function logout() {
    return new Promise((resolve, reject) => {
      removeUserToken()
      resetState()
      resolve()
    })
  }

  function getInfo() {
    return new Promise((resolve, reject) => {
      userApi.getInfo().then(response => {
        const { data } = response
        if (!data) {
          return reject('Verification failed, please Login again.')
        }
        user.value = data
        if (user.value.userRestriction.userForbidden) {
          logout().then()
          return reject('该账号已被封禁，暂时无法使用')
        }
        eventServer.emit(EventName.CONNECT_WS_SYSTEM)
        eventServer.emit(EventName.FLUSH_NOTICE_UNREAD_COUNT)
        resolve(data)
      }).catch(error => {
        reject(error)
      })
    })
  }

  return {
    token,
    user,
    network,
    ssoHost,
    resetState,
    setUserToken,
    removeUserToken,
    addUserArticleLike,
    reduceUserArticleLike,
    addUserArticleCollect,
    reduceUserArticleCollect,
    setNetwork,
    login,
    logout,
    getInfo
  }
})