import { defineStore } from 'pinia'
import { ref } from 'vue'
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
  isDark?: boolean
  loginTypeList: number[]
  wechatQrCode: string
  showFooter: boolean,
  footerStyle: string
  notice: string
  aboutMe: string
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

export type ThemeMode = 'light' | 'dark' | 'system'

export const useCommonStore = defineStore('common', () => {
  const configLoaded = ref(false)
  const storedTheme = window.localStorage.getItem('theme') || window.sessionStorage.getItem('theme')
  const theme = ref<ThemeMode>(['light', 'dark', 'system'].includes(storedTheme || '') ? storedTheme as ThemeMode : 'light')
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
    logo: 'https://source.lovethewind.cn/media/logo/default.png',
    webUrl: 'https://lovethewind.cn',
    name: '恋、晨风',
    loginTypeList: [1],
    wechatQrCode: 'https://source.lovethewind.cn/media/logo/qrcode_for_gh.jpg',
    footerStyle:
      'background:linear-gradient(-45deg, #ee7752, #ce3e75, #23a6d5, #23d5ab);animation: Gradient 22s ease infinite;background-size: 400% 400%;',
    showFooter: true,
    notice: '网站正在快马加鞭地建设中~',
    aboutMe: '正在撰写中，请稍后~',
    metaInfo: {
      meta: [
        {
          name: 'keyWords',
          content: '心悦心享,乐学,开源博客,资源分享,lovethewind.cn'
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

  /**
   * 保存用户选择的主题模式。
   *
   * :param val: 主题模式。
   * :return: 无返回值。
   */
  function setTheme(val: ThemeMode): void {
    theme.value = val
    window.localStorage.setItem('theme', val)
    window.sessionStorage.removeItem('theme')
  }

  function resetState() {
    configLoaded.value = false
    categoryList.value = []
    categoryMap.value = {}
    tagList.value = []
    choiceTagList.value = []
    tagMap.value = {}
    saveLoginUrl.value = null
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

  /**
   * 将新建或复用的展示标签加入前端标签缓存。
   *
   * :param tag: 标签详情。
   * :return: 无返回值。
   */
  function addChoiceTag(tag: any): void {
    tagMap.value[tag.id] = tag
    if (tag.level === 2 && !choiceTagList.value.some(item => item.id === tag.id)) {
      choiceTagList.value.push(tag)
    }
  }

  /**
   * 获取并缓存前台公共信息。
   *
   * :return: 无返回值。
   */
  async function setCommonInfoCache(): Promise<void> {
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
        if (item.level === 2 || item.parentId) {
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
    const promiseConfig5 = commonApi.getWebsiteViewCount().then(res => {
      websiteViewCount.value = res.data
    })
    await Promise.all([promiseCategory, promiseTag, promiseConfig1, promiseConfig2, promiseConfig3, promiseConfig5])
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
    theme,
    resetState,
    addChoiceTag,
    setShowFooter,
    setCommonInfoCache,
    setTheme
  }
})
