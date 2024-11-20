import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import NProgress from 'nprogress' // 水平进度条提示: 在跳转路由时使用
import { ElMessage } from 'element-plus'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { getPageTitle } from '@/utils/get-page-title'

NProgress.configure({ showSpinner: false }) // NProgress 配置

const needLoginList = ['userNotice'] // redirect needLoginList

export async function routeGuard(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) {
  const userStore = useUserStore()
  NProgress.start()
  document.title = getPageTitle(to.meta.title)
  const hasToken = getToken()
  if (hasToken) {
    if (to.path === '/login') {
      next({ path: '/' })
      return
    }
    const hasGetUserInfo = userStore.user
    if (hasGetUserInfo) {
      next()
      return
    }
    try {
      // get user info
      await userStore.getInfo()
      next({ ...to, replace: true })
      // next()
    } catch (error) {
      // remove token and go to login page to re-login
      await userStore.logout()
      ElMessage({
        message: error || 'Has Error',
        type: 'error',
        plain: true
      })
      next(`/404`)
    }
  } else { /* has no token*/
    if (needLoginList.indexOf(to.name) === -1) {
      // in the free needLoginList need, go directly
      next()
    } else {
      // other pages that do not have permission to access are redirected to the login page.
      next(`/404`)
    }
  }
}

export function afterEach() {
  NProgress.done()
}
