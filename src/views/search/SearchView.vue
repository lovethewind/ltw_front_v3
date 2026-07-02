<template>
  <div class="search-list-div">
    <!-- banner -->
    <div class="banner search-banner" :style="cover">
      <div class="search-hero-content">
        <span class="search-hero-eyebrow">SEARCH</span>
        <h1 class="banner-title">搜索结果</h1>
        <p v-if="lastSearchWords" class="search-total-align">
          关于「{{ lastSearchWords }}」的相关结果约 {{ total }} 个，耗时 {{ spentTime }} 秒
        </p>
        <p v-else class="search-total-align">输入关键词，找到文章和用户。</p>
      </div>
    </div>
    <el-card class="blog-container">
      <!-- 输入框 -->
      <div class="search-panel">
        <div class="search-panel-header">
          <div>
            <span class="search-panel-eyebrow">快速检索</span>
            <h2>今天想找点什么？</h2>
          </div>
          <span class="search-panel-badge">{{
            searchType === SearchTypeEnum.ARTICLE ? '文章' : '用户'
          }}</span>
        </div>
        <div class="search-input-wrapper">
          <div class="search-type-segment" aria-label="搜索类型">
            <button
              type="button"
              :class="['search-type-button', searchType === SearchTypeEnum.ARTICLE ? 'active' : '']"
              @click="searchType = SearchTypeEnum.ARTICLE"
            >
              文章
            </button>
            <button
              type="button"
              :class="['search-type-button', searchType === SearchTypeEnum.USER ? 'active' : '']"
              @click="searchType = SearchTypeEnum.USER"
            >
              用户
            </button>
          </div>
          <el-input
            v-model="searchDict.keyword"
            placeholder="输入内容，按回车键进行搜索..."
            class="input-hover"
            @keydown.enter="searchKeywordResultDebounce()"
          >
            <template #suffix>
              <Icon icon="mdi:magnify" class="font-18" />
            </template>
          </el-input>
        </div>
        <div v-if="searchType === SearchTypeEnum.ARTICLE" class="search-tools">
          <div class="hot-words-section">
            <span class="hot-words-title">每日热搜</span>
            <div class="hot-words-list">
              <button
                v-for="words in hotWordsList"
                :key="words"
                type="button"
                class="hot-words"
                @click="clickHotWord(words)"
              >
                {{ words }}
              </button>
            </div>
          </div>
          <div class="search-order-bar">
            <order-bar
              :use-card="false"
              :bar-list="searchOrderList"
              :show-icon="false"
              @item-click="orderTypeChange"
            />
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchType === SearchTypeEnum.ARTICLE" class="search-result-wrapper">
        <el-card v-for="item of searchDataList" :key="item.id" class="article-result-card">
          <!-- 文章封面图 -->
          <a :href="'/article/' + item.id" target="_blank" class="article-cover">
            <el-image class="on-hover cover-img" :src="item.coverThumb || item.cover" />
          </a>
          <!-- 文章信息 -->
          <div class="article-wrapper">
            <div class="article-meta-row">
              <a :href="'/user/' + item.user.id" class="username-avatar-info" target="_blank">
                <el-avatar :src="item.user.avatar" size="small" />
                <span class="ms-1 a-link ellipsis username-info">{{ item.user.nickname }}</span>
              </a>
              <span class="article-date">
                <Icon icon="solar:calendar-broken" class="font-14" />
                {{ date(item.createTime) }}
              </span>
            </div>
            <h3 class="article-title">
              <a :href="'/article/' + item.id" target="_blank">
                <el-tooltip placement="top" :content="deleteHTMLTag(item.title)" effect="light">
                  <span v-dompurify-html="item.title" />
                </el-tooltip>
              </a>
            </h3>
            <!-- 文章内容 -->
            <div class="article-content" v-dompurify-html="item.content" />
            <div class="article-info">
              <div class="article-taxonomy">
                <el-tag size="small" :type="item.isOriginal ? 'success' : 'warning'">
                  {{ item.isOriginal ? '原创' : '转载' }}
                </el-tag>
                <a
                  :href="'/category/' + item.categoryId"
                  class="article-category-link"
                  target="_blank"
                >
                  <Icon icon="tabler:category" class="font-14" />
                  {{ categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : '' }}
                </a>
                <span class="article-tags">
                  <a
                    v-for="tagId of item.tagList.slice(0, 2)"
                    :key="'searchArticleTag' + item.id + tagId"
                    :href="'/tag/' + tagId"
                    target="_blank"
                  >
                    <el-tag size="small" class="article-tag-pill">
                      {{ tagMap[tagId] ? tagMap[tagId].name : '' }}
                    </el-tag>
                  </a>
                </span>
              </div>
              <div class="article-stats">
                <span>
                  <Icon icon="ph:eye" class="font-14" />
                  {{ covertNumberDisplay(item.viewCount) }}
                </span>
                <span>
                  <Icon icon="iconamoon:comment-dots" class="font-14" />
                  {{ covertNumberDisplay(item.commentCount) }}
                </span>
                <span>
                  <Icon icon="tabler:thumb-up" class="font-14" />
                  {{ covertNumberDisplay(item.likeCount) }}
                </span>
              </div>
            </div>
          </div>
        </el-card>
        <!-- 无限加载 -->
        <LoadMore
          :total="total"
          :no-more="noMore"
          :loading-rows="20"
          :empty-height="600"
          @load="infiniteHandler"
        />
      </div>
      <div v-if="searchType === SearchTypeEnum.USER" class="search-result-wrapper">
        <div v-for="item of searchDataList" :key="item.id" class="search-user-card">
          <a :href="'/user/' + item.id" target="_blank" class="search-user-avatar-ring">
            <el-avatar :src="item.avatar" :size="62" class="search-user-avatar" />
          </a>
          <div class="search-user-content">
            <div class="search-user-name-row">
              <a :href="'/user/' + item.id" target="_blank" class="search-user-name">
                {{ item.nickname }}
              </a>
              <GenderBadge :gender="item.gender" />
            </div>
            <div class="search-user-meta">
              <span>
                <Icon icon="mdi:id-card" />
                UID {{ item.uid }}
              </span>
              <span>
                <Icon icon="tdesign:location" />
                {{ item.address || '未知' }}
              </span>
              <span>
                <Icon icon="mdi:leaf" />
                {{ formatRegisterTime(item.registerTime) }}
              </span>
            </div>
            <div class="search-user-stats">
              <span>
                <strong>{{ covertNumberDisplay(item.articleCount || 0) }}</strong>
                文章
              </span>
              <span>
                <strong>{{ covertNumberDisplay(item.fansCount || 0) }}</strong>
                粉丝
              </span>
            </div>
            <p class="search-user-summary">{{ item.summary || '这个人很神秘，还没有简介。' }}</p>
          </div>
          <a :href="'/user/' + item.id" target="_blank" class="search-user-action">
            查看主页
            <Icon icon="tabler:arrow-right" />
          </a>
        </div>
        <!-- 无限加载 -->
        <LoadMore
          :total="total"
          :no-more="noMore"
          :loading-rows="20"
          :empty-height="600"
          @load="infiniteHandler"
        />
      </div>
    </el-card>
  </div>
</template>

<style src="@/assets/css/about.scss" lang="scss" scoped />
<style src="@/assets/css/search.scss" lang="scss" scoped />

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCommonStore } from '@/stores/common'
import searchApi from '@/api/search'
import { debounce } from 'throttle-debounce'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import { Icon } from '@iconify/vue'
import { date, formatRegisterTime } from '@/utils/date'
import { covertNumberDisplay, deleteHTMLTag } from '@/utils/common'
import { SearchTypeEnum } from '@/enums'
import GenderBadge from '@/components/base/GenderBadge.vue'

const baseSearchDict = {
  currentPage: 1,
  pageSize: 10,
  keyword: '',
  orderType: 2
}

const commonStore = useCommonStore()

const searchKeywordResultDebounce = debounce(600, () => searchKeywordResult())
const searchDataList = ref<any[]>([])
const hotWordsList = ref<any[]>([])
const total = ref(0)
const lastSearchWords = ref('')
const spentTime = ref(0)
const searchDict = ref(Object.assign({}, baseSearchDict))
const pageCache = ref<any>({})
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
  }
])

const cover = computed(() => {
  return (
    'background: url(' +
    commonStore.pageCoverMap['search'].pageCover +
    ') center center / cover no-repeat'
  )
})
const noMore = computed(() => {
  return total.value >= searchDataList.value.length
})
const tagMap = computed(() => {
  return commonStore.tagMap
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
})

function infiniteHandler() {
  if (pageCache.value[searchDict.value.currentPage]) {
    return
  }
  if (!searchDict.value.keyword.trim()) {
    return
  }
  pageCache.value[searchDict.value.currentPage] = true
  const startTime = new Date().getTime()
  let func
  if (searchType.value === SearchTypeEnum.ARTICLE) {
    func = searchApi.getArticlePageList
  } else if (searchType.value === SearchTypeEnum.USER) {
    func = searchApi.getUserPageList
  } else {
    return
  }
  func(searchDict.value)
    .then((res) => {
      if (res.data.records.length) {
        searchDict.value.currentPage++
        searchDataList.value.push(...res.data.records)
        total.value = res.data.total
      }
    })
    .finally(() => {
      lastSearchWords.value = searchDict.value.keyword
      spentTime.value = Number(((new Date().getTime() - startTime) / 100).toFixed(2))
    })
}

function fetchDailyHotWords() {
  searchApi.getDailyHotWords().then((res) => {
    hotWordsList.value = res.data
  })
}

function orderTypeChange(val: any) {
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

function clickHotWord(val: any) {
  searchDict.value.keyword = val.trim()
  searchKeywordResult()
}
</script>
