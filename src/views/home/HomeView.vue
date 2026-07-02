<template>
  <!-- 主页文章 -->
  <el-row class="home-container">
    <!-- 左侧栏信息 -->
    <el-col :md="6" :cols="24" class="d-md-block d-none home-sidebar-col">
      <aside class="blog-wrapper">
        <!-- 网站公告 -->
        <el-card class="blog-card mb-2">
          <h2 class="web-info-title">
            <Icon icon="icon-park-outline:speaker-one" class="font-18" color="#2f80ed" />
            公告
          </h2>
          <div class="text-center">{{ websiteInfo.notice }}</div>
        </el-card>
        <!-- 分类信息 -->
        <el-card class="blog-card mb-2">
          <h2 class="web-info-title">
            <Icon icon="tabler:category" class="font-18" color="#2f80ed" />
            分类
          </h2>
          <div class="category-nav-list">
            <router-link
              to="/"
              :class="['category-nav-item', !activeCategoryId ? 'active' : '']"
              @click.prevent="changeCategory(null)"
            >
              <span>全部文章</span>
              <span class="category-count">{{ allArticleCount }}</span>
            </router-link>
            <router-link
              v-for="category in categoryList"
              :key="'homeCategory' + category.id"
              :to="{ path: '/', query: { categoryId: category.id } }"
              :class="[
                'category-nav-item',
                activeCategoryId === String(category.id) ? 'active' : ''
              ]"
              @click.prevent="changeCategory(String(category.id))"
            >
              <span>{{ category.name }}</span>
              <span class="category-count">{{ category.articleCount || 0 }}</span>
            </router-link>
          </div>
        </el-card>
        <!-- 标签信息 -->
        <el-card class="blog-card mb-2">
          <h2 class="web-info-title">
            <Icon icon="fluent:tag-multiple-16-regular" class="font-18" color="#2f80ed" />
            标签
          </h2>
          <div class="tag-cloud">
            <router-link
              v-for="tag in randomTagList.slice(0, 12)"
              :key="'tagCloud' + tag.id"
              class="tag-cloud-link"
              :style="tagCloudStyles[tag.id]"
              :to="'/tag/' + tag.id"
            >
              {{ tag.name }}
            </router-link>
          </div>
        </el-card>
        <!-- 访问统计 -->
        <el-card class="blog-card mb-2">
          <h2 class="web-info-title">
            <Icon icon="tabler:chart-bar" class="font-18" color="#2f80ed" />
            访问统计
          </h2>
          <div class="visit-counter">
            <img
              src="https://count.getloli.com/@lovethewind?name=lovethewind&theme=miku&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto"
              alt="网站访问次数"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          </div>
        </el-card>
      </aside>
    </el-col>
    <el-col :md="18" :cols="24">
      <div ref="articleListTopRef" class="article-list-anchor"></div>
      <div class="mobile-category-strip d-md-none">
        <button
          type="button"
          :class="['mobile-category-item', !activeCategoryId ? 'active' : '']"
          @click="changeCategory(null)"
        >
          全部
        </button>
        <button
          v-for="category in categoryList"
          :key="'mobileHomeCategory' + category.id"
          type="button"
          :class="[
            'mobile-category-item',
            activeCategoryId === String(category.id) ? 'active' : ''
          ]"
          @click="changeCategory(String(category.id))"
        >
          {{ category.name }}
        </button>
      </div>
      <div class="article-list-header">
        <div>
          <div class="article-list-eyebrow">文章列表</div>
          <h1>{{ activeCategoryName }}</h1>
        </div>
        <div class="article-list-count">{{ total }} 篇文章</div>
      </div>
      <order-bar @item-click="changeOrderField" />
      <div
        ref="articleResultPanelRef"
        class="article-result-panel"
        :style="articleResultMinHeight ? { minHeight: articleResultMinHeight + 'px' } : {}"
      >
        <ArticleListItem
          v-for="(item, index) of articleList"
          :key="item.id"
          :article="item"
          :index="index"
          :category-map="categoryMap"
          :tag-map="tagMap"
          @category-click="changeCategory"
        />
        <div v-if="!loading && !articleList.length" class="article-empty-state">
          <Icon icon="tabler:notes-off" />
          <h2>暂时没有文章</h2>
          <p>换个分类看看，或者回到全部文章继续逛逛。</p>
          <el-button type="primary" plain @click="changeCategory(null)">查看全部文章</el-button>
        </div>
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
            @change="pageLoadHandler(true)"
            class="d-flex justify-content-center"
          />
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<style src="@/assets/css/home.scss" scoped />

<script setup lang="ts">
import { computed, nextTick, onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import OrderBar from '@/components/base/OrderBar.vue'
import ArticleListItem from '@/components/article/ArticleListItem.vue'
import articleApi from '@/api/article'
import { useCommonStore } from '@/stores/common'
import { randomSortList, sanitizeArticleSummary } from '@/utils/common'
import type { IArticle } from '@/interface'
import { Icon } from '@iconify/vue'

const router = useRouter()
const route = useRoute()
const commonStore = useCommonStore()

const tagCloudStyles = ref<Record<string, { fontSize: string; color: string }>>({})
const tagCloudPalette = [
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#c2410c',
  '#be123c',
  '#047857',
  '#4f46e5',
  '#b45309',
  '#0891b2'
]
const articleList = ref<IArticle[]>([])
const total = ref(0)
const params = ref({
  pageNo: 1,
  pageSize: 10
})
const noMore = ref(false)
const loading = ref(false)
const queryParams = ref<{ [key: string]: any }>({
  orderType: null // 默认按时间倒序
})
const activeCategoryId = ref<string | null>(null)
const randomTagList = ref<any[]>([])
const articleListTopRef = ref<HTMLElement | null>(null)
const articleResultPanelRef = ref<HTMLElement | null>(null)
const articleResultMinHeight = ref(0)

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
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

const categoryList = computed(() => {
  return commonStore.categoryList
})

const allArticleCount = computed(() => {
  return categoryList.value.reduce((sum, category) => sum + (category.articleCount || 0), 0)
})

const activeCategoryName = computed(() => {
  if (!activeCategoryId.value) {
    return '全部文章'
  }
  return categoryMap.value[activeCategoryId.value]?.name || '全部文章'
})

onBeforeMount(() => {
  activeCategoryId.value = getRouteCategoryId()
  queryParams.value.categoryId = activeCategoryId.value
  setCommonValue()
  pageLoadHandler()
})

function getRouteCategoryId(): string | null {
  const categoryId = route.query.categoryId
  if (Array.isArray(categoryId)) {
    return categoryId[0] || null
  }
  return categoryId || null
}

/**
 * 初始化首页侧栏展示所需的公共数据。
 *
 * :return: 无返回值。
 */
function setCommonValue(): void {
  randomTagList.value = JSON.parse(JSON.stringify(tagList.value))
  randomSortList(randomTagList.value)
  setTagCloudStyles(randomTagList.value)
}

/**
 * 加载文章分页数据，并按需立即回到列表顶部。
 *
 * :param shouldJumpTop: 是否在加载前跳转到文章列表顶部。
 * :return: 无返回值。
 */
async function pageLoadHandler(shouldJumpTop = false): Promise<void> {
  loading.value = true
  if (shouldJumpTop) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    articleResultMinHeight.value = articleResultPanelRef.value?.offsetHeight || 0
    articleList.value = []
    await nextTick()
    jumpArticleListTop()
  }
  articleApi
    .getPageList(params.value.pageNo, params.value.pageSize, queryParams.value)
    .then((res) => {
      // 去除html标签
      articleList.value = res.data.records.map((item: any) => ({
        ...item,
        content: sanitizeArticleSummary(item.content)
      }))
      total.value = res.data.total
      noMore.value = params.value.pageSize > res.data.records.length
    })
    .finally(() => {
      loading.value = false
      articleResultMinHeight.value = 0
    })
}

/**
 * 生成侧栏标签云的随机字号和颜色。
 *
 * :param tagList: 参与展示的标签列表。
 * :return: 无返回值。
 */
function setTagCloudStyles(tagList: any[]): void {
  const nextStyles: Record<string, { fontSize: string; color: string }> = {}
  tagList.forEach((tag) => {
    const paletteIndex = Math.floor(Math.random() * tagCloudPalette.length)
    nextStyles[tag.id] = {
      fontSize: Math.floor(Math.random() * 7) + 14 + 'px',
      color: tagCloudPalette[paletteIndex]
    }
  })
  tagCloudStyles.value = nextStyles
}

/**
 * 切换文章排序并刷新列表。
 *
 * :param val: 排序类型。
 * :return: 无返回值。
 */
function changeOrderField(val: number): void {
  // 按指定顺序排序
  queryParams.value.orderType = val
  params.value.pageSize = 10
  params.value.pageNo = 1
  articleList.value = []
  total.value = 0
  pageLoadHandler(true)
}

/**
 * 切换首页分类筛选并刷新列表。
 *
 * :param categoryId: 分类 ID，为空时展示全部文章。
 * :return: 无返回值。
 */
function changeCategory(categoryId: string | null): void {
  if (activeCategoryId.value === categoryId) return
  activeCategoryId.value = categoryId
  queryParams.value.categoryId = categoryId
  params.value.pageSize = 10
  params.value.pageNo = 1
  articleList.value = []
  total.value = 0
  router.replace({
    path: '/',
    query: categoryId ? { categoryId } : {}
  })
  pageLoadHandler(true)
}

/**
 * 滚动到文章列表第一条数据附近。
 *
 * :return: 无返回值。
 */
function jumpArticleListTop(): void {
  if (!articleListTopRef.value) return
  const headerOffset = 74
  const top = articleListTopRef.value.getBoundingClientRect().top + window.scrollY - headerOffset
  const targetTop = Math.max(top, 0)
  window.scrollTo({
    top: targetTop,
    behavior: 'auto'
  })
  document.documentElement.scrollTop = targetTop
  document.body.scrollTop = targetTop
}
</script>
