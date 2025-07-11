<template>
  <!-- banner -->
  <div class="home-banner" :style="cover">
    <div class="banner-container">
      <!-- 一言 -->
      <div class="blog-intro ">
        {{ obj.output }} <span class="typed-cursor">|</span>
      </div>
      <!-- 联系方式 -->
      <div class="blog-author">
        一 {{ oneWorldsAuthor }}
      </div>
    </div>
    <!-- 向下滚动 -->
    <div class="scroll-down cursor" @click="scrollDown()">
      <Icon icon="oui:arrow-down" class="scroll-down-effects" />
    </div>
  </div>
  <!-- 主页文章 -->
  <el-row class="home-container">
    <el-col :md="16" :cols="24">
      <order-bar ref="anchorRef" @item-click="changeOrderField" />
      <el-card
        v-for="(item, index) of articleList"
        :key="item.id"
        class="article-card"
        style="border-radius: 12px 8px 8px 12px"
      >
        <!-- 文章封面图 -->
        <div :class="['article-cover', isRight(index) ? ' right-radius float-end' : 'left-radius float-start']">
          <el-image
            class="on-hover cover-img"
            :src="item.cover"
            @click="router.push('/article/' + item.id)"
          />
        </div>
        <!-- 文章信息 -->
        <div :class="['article-wrapper', !isRight(index) ? 'float-end' : 'float-start']">
          <div class="home-article-title">
            <router-link :to="'/article/' + item.id">
              <el-tooltip placement="top" :content="item.title" effect="light">
                {{ item.title }}
              </el-tooltip>
            </router-link>
          </div>
          <!-- 文章内容 -->
          <div class="article-content">
            {{ item.content }}
          </div>
          <div class="article-info">
            <div class="first-info">
              <!-- 用户信息 -->
              <router-link :to="'/user/' + item.user.id" class="username-avatar-info">
                <el-avatar :src="item.user.avatar" size="small">
                </el-avatar>
                <span class="ms-1 a-link ellipsis username-info">{{ item.user.nickname }}</span>
              </router-link>
              <!-- 是否置顶 -->
              <span v-if="false && item.isTop === true">
                  <span style="color:#ff7242">
                    <i class="iconfont icon_top" /> 顶
                  </span>
                </span>
              <!-- 是否推荐 -->
              <span v-if="false && item.isRecommend === true">
                  <span style="color:#ff7242">
                    <i class="iconfont icon_top" /> 荐
                  </span>
                </span>
              <span class="d-inline-flex float-end">
                <!-- 发表时间 -->
                <Icon icon="solar:calendar-broken" class="font-14" />
                <span class="me-3">{{ date(item.createTime) }}</span>
                <!-- 文章分类 -->
                <Icon icon="tabler:category" class="font-14" />
                <router-link :to="'/category/' + item.categoryId">
                  {{ categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : '' }}
                </router-link>
              </span>
            </div>
            <div class="second-info">
              <span class="me-2">
                <el-tag size="small" :type="item.isOriginal ? 'success' : 'warning'">
                  {{ item.isOriginal ? '原创' : '转载' }}
                </el-tag>
              </span>
              <span class="me-3">
                  <Icon icon="ph:eye" class="font-14" />
                  {{ covertNumberDisplay(item.viewCount) }}
                </span>
              <span class="me-3">
                  <Icon icon="iconamoon:comment-dots" class="font-14" />
                  {{ covertNumberDisplay(item.commentCount) }}
                </span>
              <span>
                  <Icon icon="tabler:thumb-up" class="font-14" />
                  {{ covertNumberDisplay(item.likeCount) }}
              </span>
              <span class="tag-span">
                  <!-- 文章标签 -->
                  <router-link
                    v-for="tagId of item.tagList.slice(0, (isMobile() ? 2 : 3))"
                    :key="'homeArticleTag' + tagId"
                    :to="'/tag/' + tagId"
                  >
                    <el-tag size="small"
                            :color="colors[tagId] || 'green'"
                            class="el-tag-btn-a"
                            :style="{'--tag-color': colors[tagId]}">
                      {{ tagMap[tagId] ? tagMap[tagId].name : '' }}</el-tag>
                  </router-link>
                </span>
            </div>
          </div>
        </div>
      </el-card>
      <!-- 加载更多 -->
      <el-skeleton v-if="loading" :loading="loading" :rows="50" class="mt-4 box-shadow" />
      <div v-if="articleList.length" class="mt-3">
        <el-pagination
          background
          v-model:current-page="params.pageNo"
          :total="total"
          :pager-count="7"
          color="orange"
          layout="prev, pager, next, jumper"
          @change="pageLoadHandler"
          class="d-flex justify-content-center"
        />
      </div>
    </el-col>
    <!-- 右侧栏信息 -->
    <el-col :md="8" :cols="24" class="d-md-block d-none">
      <div class="blog-wrapper">
        <el-card class="mb-2">
          <!-- 日历信息 -->
          <el-calendar />
          <!-- 社交信息 -->
        </el-card>
        <!-- 网站信息 -->
        <el-card class="blog-card mb-2">
          <div class="web-info-title">
            <Icon icon="icon-park-outline:speaker-one" class="font-18 color-orange" />
            公告
          </div>
          <div class="text-center"> {{ websiteInfo.notice }}</div>
        </el-card>
        <!--热搜-->
        <el-card class="blog-card mb-2">
          <div class="web-info-title">
            <Icon icon="hugeicons:news" class="font-18 color-red" />
            热搜
            <span class="ms-4">
                    <a :class="webHotType === 'weibo' ? 'active' : ''" @click="fetchWebHotArticle('weibo')">微博</a> |
                    <a :class="webHotType === 'zhihu' ? 'active' : ''" @click="fetchWebHotArticle('zhihu')">知乎</a> |
                    <a :class="webHotType === 'douyin' ? 'active' : ''" @click="fetchWebHotArticle('douyin')">抖音</a> |
                    <a :class="webHotType === 'it' ? 'active' : ''" @click="fetchWebHotArticle('it')">IT</a> |
                    <a :class="webHotType === 'baidu' ? 'active' : ''" @click="fetchWebHotArticle('baidu')">百度</a> |
                    <a :class="webHotType === 'bilibili' ? 'active' : ''"
                       @click="fetchWebHotArticle('bilibili')">哔哩哔哩</a>
                  </span>
          </div>
          <div class="hot-news-div mt-1">
            <div v-for="(item, index) in webHotList" :key="'webHotList' + index">
              <span class="font-weight-bold">{{ item.index }}.</span><a @click="toWeb(item.url)" target="_blank">{{ item.title
              }}</a>
            </div>
          </div>
        </el-card>
        <!-- 标签信息 -->
        <el-card class="blog-card  mb-2">
          <div class="web-info-title">
            <Icon icon="fluent:tag-multiple-16-regular" class="font-18" color="#f56c6c" />
            标签云
          </div>
          <div class="web-info">
            <a
              v-for="tag in randomTagList.slice(0, 20)"
              :key="'tagCloud' + tag.id"
              class="el-tag-a"
              :style="{background: colors[tag.id], '--tag-color': colors[tag.id]}"
              @click="router.push('/tag/' + tag.id)"
            >
              {{ tag.name }}
            </a>
          </div>
        </el-card>
        <!-- 网站信息 -->
        <el-card class="blog-card">
          <div class="web-info-title">
            <Icon icon="material-symbols:computer-outline" class="font-18" color="#72c23a" />
            网站信息
          </div>
          <div class="web-info">
            访问次数: {{ websiteViewCount }}<br/>
            已经运行: {{ hasRunTime }}
          </div>
        </el-card>
      </div>
    </el-col>
  </el-row>
</template>

<style src="@/assets/css/home.scss" scoped />

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import EasyTyper from 'easy-typer-js'
import OrderBar from '@/components/base/OrderBar.vue'
import articleApi from '@/api/article'
import { useCommonStore } from '@/stores/common'
import { covertNumberDisplay, deleteHTMLTag, genRandomColor, randomSortList, isMobile, toWeb } from '@/utils/common'
import { date, formatTimeToSecond } from '@/utils/date'
import { Icon } from '@iconify/vue'
import type { IArticle } from '@/interface'

const router = useRouter()
const commonStore = useCommonStore()

const anchorRef = ref<InstanceType<typeof OrderBar> | null>()
const colors = ref<any>({}) // 存储颜色
const oneWorldsAuthor = ref('')
const yiYanParams = ref('c=i')
const obj = ref({
  output: '',
  isEnd: false,
  speed: 80,
  singleBack: false,
  sleep: 1500,
  type: 'rollback',
  backSpeed: 80,
  sentencePause: false
})
const articleList = ref<IArticle[]>([])
const total = ref(0)
const printTimer = ref<any>(null)
const params = ref({
  pageNo: 1,
  pageSize: 10
})
const noMore = ref(false)
const loading = ref(false)
const queryParams = ref<{ [key: string]: any }>({
  orderType: null // 默认按时间倒序
})
const stopInterval = ref(false)
const randomTagList = ref<any[]>([])
const webHotList = ref<any[]>([])
const webHotListMap = ref<{ [key: string]: any } | null>(null)
const webHotType = ref('')
const webHotTypeMap = ref<{ [key: string]: string }>({
  'zhihu': '知乎热榜',
  'jinri': '今日头条',
  'weibo': '微博',
  'douyin': '抖音',
  'baidu': '百度热点',
  'bilibili': '哔哩哔哩',
  'it': 'IT之家'
})
const webHotUrl = ref('https://api.vvhan.com/api/hotlist/all')
const hasRunTime = ref('')
const hasRunTimer = ref<any>(null)

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['home'].pageCover + ') center center / cover no-repeat'
})

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})

const websiteViewCount = computed(() => {
  return commonStore.websiteViewCount
})

const tagMap = computed(() => {
  return commonStore.tagMap
})

const tagList = computed(() => {
  return commonStore.choiceTagList
})

const categoryMap = computed(() => {
  return commonStore.categoryMap
})

// created
fetchWebHotArticle('weibo')

onBeforeMount(() => {
  setCommonValue()
  printTimer.value = setInterval(getYiYanPrint, 10000)
  oneWorldsAuthor.value = commonStore.websiteInfo.name
  initTyped(commonStore.websiteInfo.summary)
  pageLoadHandler()
})

onMounted(() => {
  document.addEventListener('visibilitychange', () => { // 浏览器tab标签切换事件
    // 当页面切换或者最小化时，停止本页定时调用
    stopInterval.value = document.visibilityState === 'hidden'
  })
  hasRunTimer.value = setInterval(setHasRunTime, 1000)
})

onUnmounted(() => {
  clearInterval(printTimer.value)
  document.removeEventListener('visibilitychange', () => {})
  clearInterval(hasRunTimer.value)
})

function setHasRunTime() {
  const startDate = new Date("2023-04-25 00:00:00")
  hasRunTime.value = formatTimeToSecond(startDate.getTime())
}

function isRight(index: number) {
  return index % 2 !== 0

}

function setCommonValue() {
  const mList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
  let tempStr = ''
  mList.forEach(item => {
    tempStr += ('c=' + item + '&')
  })
  yiYanParams.value = tempStr
  randomTagList.value = JSON.parse(JSON.stringify(tagList.value))
  randomSortList(randomTagList.value)
  changeColors(randomTagList.value)
}

function pageLoadHandler() {
  loading.value = true
  articleApi.getPageList(params.value.pageNo, params.value.pageSize, queryParams.value).then(res => {
    if (res.data.records.length) {
      // 去除html标签
      res.data.records.forEach((item: any) => {
        item.content = deleteHTMLTag(item.content)
      })
      articleList.value = res.data.records
      total.value = res.data.total
    }
    noMore.value = params.value.pageSize > res.data.records.length
  }).finally(() => {
    loading.value = false
  })
}

function fetchWebHotArticle(val: string) {
  if (val === webHotType.value) return
  webHotType.value = val
  if (webHotListMap.value) {
    webHotList.value = webHotListMap.value[webHotTypeMap.value[webHotType.value]]
    return
  }
  webHotListMap.value = {}
  let cacheData = window.sessionStorage.getItem('webHotListData')
  if (cacheData) {
    cacheData = JSON.parse(cacheData)
    setWebHotArticle(cacheData)
    return
  }
  axios.get(webHotUrl.value).then(res => {
    setWebHotArticle(res.data.data)
    window.sessionStorage.setItem('webHotListData', JSON.stringify(res.data.data))
  })
}

function setWebHotArticle(data: any) {
  data.forEach((item: any) => {
    if (webHotListMap.value) {
      webHotListMap.value[item.name] = item.data
    }
  })
  if (webHotListMap.value) {
    webHotList.value = webHotListMap.value[webHotTypeMap.value[webHotType.value]]
  }
}

function getYiYanPrint() {
  if (stopInterval.value) {
    return
  }
  // 一言Api进行打字机循环输出效果
  // axios.get('https://v1.hitokoto.cn?' + yiYanParams.value)
  //   .then(res => {
  //     const { hitokoto, from_who, from, created_at } = res.data
  //     oneWorldsAuthor.value = from_who || from || created_at
  //     initTyped(hitokoto)
  //   })
}

function initTyped(input: string, fn: Function = () => {
}, hooks: Function = () => {
}) {
  new EasyTyper(obj.value, input, fn, hooks)
}

function changeColors(tagList: any[]) { // 随机变色
  const colorList = genRandomColor(tagList.length)
  for (const i in tagList) {
    colors.value[tagList[i].id] = 'rgb(' + colorList[i] + ')'
  }
}

function scrollDown() {
  let top = 0
  if (anchorRef.value) {
    top = anchorRef.value.$el.getBoundingClientRect().top
  }
  window.scrollTo({
    behavior: 'smooth',
    top: top
  })
}

function changeOrderField(val: number) {
  // 按指定顺序排序
  queryParams.value.orderType = val
  params.value.pageSize = 10
  params.value.pageNo = 1
  articleList.value = []
  total.value = 0
  pageLoadHandler()
}
</script>
