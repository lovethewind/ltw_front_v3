<template>
  <div class="search-list-div">
    <!-- banner -->
    <div class="banner" :style="cover">
      <h1 class="banner-title">搜索结果</h1>
      <span v-if="lastSearchWords" class="search-total-align">
        关于【{{ lastSearchWords }}】的相关结果约{{ total }}个，耗时{{ spentTime }}秒
      </span>
    </div>
    <el-card class="blog-container">
      <!-- 输入框 -->
      <div class="search-input-wrapper">
        <el-input
          v-model="searchDict.keyword"
          placeholder="输入内容，按回车键进行搜索..."
          class="input-hover"
          @keydown.enter="searchKeywordResultDebounce()"
        >
          <template #prepend>
            <el-select v-model="searchType" placeholder="请选择" style="width: 80px">
              <el-option label="文章" :value="SearchTypeEnum.ARTICLE" />
              <el-option label="用户" :value="SearchTypeEnum.USER" />
            </el-select>
          </template>
          <template #suffix>
            <Icon icon="mdi:magnify" class="font-18" />
          </template>
        </el-input>
      </div>
      <div v-if="searchType === SearchTypeEnum.ARTICLE" class="mt-2">
        <span class="font-bold">每日热搜</span>
        <div class="mt-3">
          <a v-for="words in hotWordsList" :key="words" class="hot-words cursor-pointer" @click="clickHotWord(words)">
            {{ words }} </a>
        </div>
        <hr class="divider">
        <div class="height-40">
          <el-row class="font-size-14" align="middle" justify="center">
            <el-col :xs="24" :sm="24">
              <order-bar
                :use-card="false"
                :bar-list="searchOrderList"
                :show-icon="false"
                @item-click="orderTypeChange"
              />
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchType === SearchTypeEnum.ARTICLE" class="search-result-wrapper">
        <el-card v-for="item of searchDataList" :key="item.id" class="article-card">
          <!-- 文章封面图 -->
          <div class="article-cover float-start">
            <el-image
              class="on-hover cover-img"
              :src="item.cover"
              @click="router.push('/article/' + item.id)"
            />
          </div>
          <!-- 文章信息 -->
          <div class="article-wrapper float-start">
            <div class="home-article-title">
              <a :href="'/article/' + item.id" target="_blank">
                <el-tooltip placement="top" :content="deleteHTMLTag(item.title)" effect="light">
                  <span v-dompurify-html="item.title" />
                </el-tooltip>
              </a>
            </div>
            <!-- 文章内容 -->
            <div class="article-content" v-dompurify-html="item.content" />
            <div class="article-info">
              <div class="first-info">
                <!-- 用户信息 -->
                <a :href="'/user/' + item.user.id" class="username-avatar-info" target="_blank">
                  <el-avatar :src="item.user.avatar" size="small">
                  </el-avatar>
                  <span class="ms-1 a-link ellipsis username-info">{{ item.user.nickname }}</span>
                </a>
                <span class="d-inline-flex float-end">
                <!-- 发表时间 -->
                <Icon icon="solar:calendar-broken" class="font-14" />
                <span class="me-3">{{ date(item.createTime) }}</span>
                  <!-- 文章分类 -->
                <Icon icon="tabler:category" class="font-14" />
                <a :href="'/category/' + item.categoryId" target="_blank">
                  {{ categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : '' }}
                </a>
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
                  <a v-for="tagId of item.tagList.slice(0, (isMobile() ? 2 : 3))"
                     :key="'homeArticleTag' + tagId"
                     :href="'/tag/' + tagId"
                     target="_blank">
                    <el-tag size="small"
                            :color="colors[tagId] || 'green'"
                            class="el-tag-btn-a"
                            :style="{'--tag-color': colors[tagId]}">
                      {{ tagMap[tagId] ? tagMap[tagId].name : '' }}</el-tag>
                  </a>
                </span>
              </div>
            </div>
          </div>
        </el-card>
        <!-- 无限加载 -->
        <LoadMore :total="total" :no-more="noMore" :loading-rows="20" :empty-height="600" @load="infiniteHandler" />
      </div>
      <div v-if="searchType === SearchTypeEnum.USER" class="search-result-wrapper">
        <div v-for="item of searchDataList" :key="item.id" class="search-user-div">
          <el-row justify="start" align="bottom">
            <el-col :xs="4" :sm="2" class="text-center">
              <el-avatar :src="item.avatar" />
            </el-col>
            <el-col :xs="20" :sm="22">
              <el-row justify="center" align="bottom">
                <el-col class="d-flex align-items-center">
                  <a :href="'/user/' + item.id" target="_blank" class="font-bold font-14 me-1">
                    {{ item.nickname }}
                  </a>
                  <Icon :icon="genderMap[item.gender].icon" :color="genderMap[item.gender].color" />
                </el-col>
              </el-row>
              <el-row justify="center" align="bottom">
                <el-col class="font-12">{{ item.summary }}</el-col>
              </el-row>
            </el-col>
          </el-row>
        </div>
        <!-- 无限加载 -->
        <LoadMore :total="total" :no-more="noMore" :loading-rows="20" :empty-height="600" @load="infiniteHandler" />
      </div>
    </el-card>
  </div>
</template>

<style src="@/assets/css/about.scss" lang="scss" scoped />
<style src="@/assets/css/search.scss" lang="scss" scoped />

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import searchApi from '@/api/search'
import { debounce } from 'throttle-debounce'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import { Icon } from '@iconify/vue'
import { date } from '@/utils/date'
import { covertNumberDisplay, deleteHTMLTag, genRandomColor, isMobile } from '@/utils/common'
import { ISearchArticle } from '@/interface'
import { SearchTypeEnum } from '@/enums'
import { genderMap } from '@/utils/constant'

const baseSearchDict = {
  currentPage: 1,
  pageSize: 10,
  keyword: '',
  orderType: 2
}

const router = useRouter()
const commonStore = useCommonStore()

const searchKeywordResultDebounce = debounce(600, (value) => searchKeywordResult(value))
const colors = ref<any>({}) // 存储颜色
const searchDataList = ref<ISearchArticle[]>([])
const hotWordsList = ref([])
const total = ref(0)
const lastSearchWords = ref('')
const spentTime = ref(0)
const searchDict = ref(Object.assign({}, baseSearchDict))
const pageCache = ref({})
const searchType = ref(SearchTypeEnum.ARTICLE)
const searchOrderList = ref([
  {
    type: 2,
    name: '按时间倒序'
  },
  {
    type: 1,
    name: '按时间正序'
  },
  {
    type: 3,
    name: '按阅读量'
  }])

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['search'].pageCover + ') center center / cover no-repeat'
})
const noMore = computed(() => {
  return total.value >= searchDataList.value.length
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

watch(searchType, () => {
  searchDataList.value = []
  searchDict.value.currentPage = 1
  pageCache.value = {}
  total.value = 0
  infiniteHandler()

})

onMounted(() => {
  fetchDailyHotWords()
  infiniteHandler()
  changeColors(tagList.value)
})

function infiniteHandler() {
  if (pageCache.value[searchDict.value.currentPage]) {
    return
  }
  if (!searchDict.value.keyword.trim()) {
    return
  }
  pageCache[searchDict.value.currentPage] = true
  const startTime = new Date().getTime()
  let func
  if (searchType.value === SearchTypeEnum.ARTICLE) {
    func = searchApi.getArticlePageList
  } else if (searchType.value === SearchTypeEnum.USER) {
    func = searchApi.getUserPageList
  } else {
    return
  }
  func(searchDict.value).then(res => {
    if (res.data.records.length) {
      searchDict.value.currentPage++
      searchDataList.value.push(...res.data.records)
      total.value = res.data.total
    }
  }).finally(() => {
    lastSearchWords.value = searchDict.value.keyword
    spentTime.value = ((new Date().getTime() - startTime) / 100).toFixed(2)
  })
}

function changeColors(tagList: any[]) { // 随机变色
  const colorList = genRandomColor(tagList.length)
  for (const i in tagList) {
    colors.value[tagList[i].id] = 'rgb(' + colorList[i] + ')'
  }
}

function fetchDailyHotWords() {
  searchApi.getDailyHotWords().then(res => {
    hotWordsList.value = res.data
  })
}

function orderTypeChange(val) {
  searchDict.value.orderType = val
  searchKeywordResult()
}

function searchKeywordResult() {
  searchDict.value.currentPage = 1
  searchDataList.value = []
  total.value = 0
  pageCache.value = {}
  infiniteHandler()
}

function clickHotWord(val) {
  searchDict.value.keyword = val.trim()
  searchKeywordResult()
}
</script>
