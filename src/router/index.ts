import { createRouter, createWebHistory } from 'vue-router'
import { afterEach, routeGuard } from '@/permission'

const routers = [
  {
    path: '/',
    component: () => import('@/views/home/HomeView.vue')
  },
  {
    path: '/article/add',
    component: () => import('@/views/article/ArticleEdit.vue')
  },
  {
    path: '/article/edit/:articleId',
    component: () => import('@/views/article/ArticleEdit.vue')
  },
  {
    path: '/article/:articleId',
    component: () => import('@/views/article/ArticleDetail.vue')
  },
  // {
  //   path: '/archives',
  //   component: () => import('@/views/article/ArticleDetail.vue'),
  //   meta: {
  //     title: '归档'
  //   }
  // },
  {
    path: '/tag',
    component: () => import('@/views/category/TagView.vue'),
    meta: {
      title: '标签'
    }
  },
  {
    path: '/category',
    component: () => import('@/views/category/CategoryView.vue'),
    meta: {
      title: '分类'
    }
  },
  {
    path: '/category/:categoryId',
    component: () => import('@/views/article/ArticleList.vue')
  },
  {
    path: '/tag/:tagId',
    component: () => import('@/views/article/ArticleList.vue')
  },
  {
    path: '/link',
    component: () => import('@/views/link/LinkView.vue'),
    meta: {
      title: '友链'
    }
  },
  {
    path: '/search',
    component: () => import('@/views/search/SearchView.vue'),
    meta: {
      title: '搜索'
    }
  },
  {
    path: '/picture',
    component: () => import('@/views/picture/PictureView.vue'),
    meta: {
      title: '图库'
    }
  },
  {
    path: '/website',
    component: () => import('@/views/website/WebsiteList.vue'),
    meta: {
      title: '网站导航'
    }
  },
  {
    path: '/share',
    component: () => import('@/views/share/ShareView.vue'),
    meta: {
      title: '分享'
    }
  },
  {
    path: '/about',
    component: () => import('@/views/about/AboutView.vue'),
    meta: {
      title: '关于本站'
    }
  },
  {
    path: '/contact',
    component: () => import('@/views/about/ContactView.vue'),
    meta: {
      title: '联系我们'
    }
  },
  {
    path: '/message-board',
    component: () => import('@/views/message/MessageView.vue'),
    meta: {
      title: '留言板'
    }
  },
  {
    path: '/user-notice/:noticeType',
    component: () => import('@/views/user/NoticeCenter.vue'),
    name: 'userNotice',
    meta: {
      title: '消息'
    }
  },
  {
    path: '/user/:userId',
    component: () => import('@/views/user/UserCenter.vue'),
    meta: {
      title: '个人中心'
    }
  },
  {
    path: '/on-build',
    component: () => import('@/components/base/OnBuild.vue'),
    meta: {
      title: '开发中'
    }
  },
  {
    path: '/:pathMatch(.*)',
    component: () => import('@/components/base/404.vue')
  }

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routers
})

router.beforeEach(routeGuard)
router.afterEach(afterEach)

export default router
