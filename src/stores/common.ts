import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import categoryApi from '@/api/category'
import tagApi from '@/api/tag'
import configApi from '@/api/config'
import commonApi from '@/api/common'
import Cookies from 'js-cookie'

interface WebSite {
  home: string
  recordNum: string
  author: string
  bulletin: string
  summary: string
  logo: string
  webUrl: string
  name: string
  isMusicPlayer: boolean
  showMusicBar: boolean
  showSpecial: boolean
  loginTypeList: number[]
  wechatQrCode: string
  showFooter: boolean,
  footerStyle: string
  notice: string
  aboutMe: string
  contactMe: string
  metaInfo: {
    meta: Array<{
      name: string
      content: string
    }>
  }
}

interface PageCoverMap {
  [key: string]: {
    pageCover: string
  }
}

export const useCommonStore = defineStore('common', () => {
  const configLoaded = ref(false)
  const theme = ref('light')
  const categoryList = ref<any[]>([])
  const categoryMap = ref<{ [key: string]: any }>({})
  const tagList = ref<any[]>([])
  const choiceTagList = ref<any[]>([])
  const tagMap = ref<{ [key: string]: any }>({})
  const saveLoginUrl = ref<string | null>(null)
  const websiteViewCount = ref(0)
  const websiteInfo = ref<WebSite>({
    home: '心悦心享',
    recordNum: '蜀ICP备2023005583号-1',
    author: 'frank',
    bulletin: '欢迎来到心悦心享小站~',
    summary: '生活不止眼前的苟且，还有诗和远方~',
    logo: 'https://img.lovethewind.com.cn/media/logo/default.png',
    webUrl: 'https://lovethewind.cn',
    name: '恋、晨风',
    isMusicPlayer: false,
    showMusicBar: false,
    showSpecial: false,
    loginTypeList: [1],
    wechatQrCode: 'https://img.lovethewind.com.cn/media/logo/qrcode_for_gh.jpg',
    footerStyle: 'background:linear-gradient(-45deg, #ee7752, #ce3e75, #23a6d5, #23d5ab);animation: Gradient 10s ease infinite;background-size: 400% 400%;',
    showFooter: true,
    notice: '网站正在快马加鞭地建设中~',
    aboutMe: '正在撰写中，请稍后~',
    contactMe: '<p>此网站是基于学习过程记录、经验分享和心得交流</p><br>' +
      '<p>部分资源来源于网络，如若发现侵权，请联系我们立即删除</p><br>' +
      '<p>联系方式: 1720045474@qq.com</p>',
    metaInfo: {
      meta: [
        {
          name: 'keyWords',
          content: '心悦心享,乐学,开源博客,资源分享,www.lovethewind.cn'
        },
        {
          name: 'description',
          content: '一个学习心得记录，技术交流，优秀资源分享的平台,欢迎大家加入，让其变得越来越好~'
        }
      ]
    }
  })
  const pageCoverMap = ref<PageCoverMap>({
    home: {
      pageCover: ''
    },
    category: {
      pageCover: ''
    },
    tag: {
      pageCover: ''
    },
    articleList: {
      pageCover: ''
    },
    about: {
      pageCover: ''
    },
    contact: {
      pageCover: ''
    },
    link: {
      pageCover: ''
    },
    recommend: {
      pageCover: ''
    },
    search: {
      pageCover: ''
    },
    onBuild: {
      pageCover: ''
    }
  })

  const showSpecial = computed(() => {
    return JSON.parse(window.localStorage.getItem('showSpecial') || 'false')
  })

  onMounted(() => {
    const cacheTheme = window.sessionStorage.getItem('theme')
    if (cacheTheme) {
      setTheme(cacheTheme)
    }
  })

  function setTheme(val: string) {
    theme.value = val
    window.sessionStorage.setItem('theme', val)
  }

  function resetState() {
    configLoaded.value = false
    categoryList.value = []
    categoryMap.value = {}
    tagList.value = []
    choiceTagList.value = []
    tagMap.value = {}
    saveLoginUrl.value = null
    websiteInfo.value.isMusicPlayer = false
    websiteInfo.value.showSpecial = true
    websiteInfo.value.isDark = false
  }

  function setShowFooter(val: boolean) {
    websiteInfo.value.showFooter = val
  }

  function setCategoryList(val: any[]) {
    categoryList.value = val
    const categoryMapValue: any = {}
    for (const item of val) {
      categoryMapValue[item.id] = item
    }
    categoryMap.value = categoryMapValue
  }

  function setWebInfo(val: Partial<WebSite>) {
    Object.assign(websiteInfo.value, val)
  }

  function setPageCoverMap(val: Partial<PageCoverMap>) {
    Object.assign(pageCoverMap.value, val)
  }

  function setShowSpecial(showSpecial: boolean) {
    window.localStorage.setItem('showSpecial', showSpecial.toString())
    websiteInfo.value.showSpecial = showSpecial
  }

  async function setCommonInfoCache() {
    commonApi.addWebsiteViewCount().catch(() => {
    })
    // 获取分类信息并缓存
    const promiseCategory = categoryApi.getAllCategory().then(res => {
      setCategoryList(res.data)
    })
    // 获取标签信息并缓存
    const promiseTag = tagApi.getAllTag().then(res => {
      const { nodes, records } = res.data
      tagList.value = nodes
      const tagMapValue: any = {}
      const choiceTagListValue = []
      for (const item of records) {
        tagMapValue[item.id] = item
        if (item.parentId) {
          choiceTagListValue.push(item)
        }
      }
      tagMap.value = tagMapValue
      choiceTagList.value = choiceTagListValue
    })
    // 获取网站配置
    const promiseConfig1 = configApi.getConfigByKey('web_info').then(res => {
      const info = JSON.parse(res.data)
      setWebInfo(info)
      configLoaded.value = true // 配置加载完毕
      Cookies.set('title', websiteInfo.value.home)
    })
    const promiseConfig2 = configApi.getConfigByKey('default_cover').then(res => {
      const info = JSON.parse(res.data)
      setPageCoverMap(info)
    })
    const promiseConfig3 = configApi.getConfigByKey('aboutMe').then(res => {
      const info = { aboutMe: res.data }
      setWebInfo(info)
    })
    const promiseConfig4 = configApi.getConfigByKey('contactMe').then(res => {
      const info = { contactMe: res.data }
      setWebInfo(info)
    })
    const promiseConfig5 = commonApi.getWebsiteViewCount().then(res => {
      websiteViewCount.value = res.data
    })
    await Promise.all([promiseCategory, promiseTag, promiseConfig1, promiseConfig2, promiseConfig3, promiseConfig4, promiseConfig5])
  }

  return {
    configLoaded,
    categoryList,
    categoryMap,
    tagList,
    choiceTagList,
    tagMap,
    saveLoginUrl,
    websiteInfo,
    websiteViewCount,
    pageCoverMap,
    showSpecial,
    theme,
    resetState,
    setShowFooter,
    setShowSpecial,
    setCommonInfoCache,
    setTheme
  }
})

