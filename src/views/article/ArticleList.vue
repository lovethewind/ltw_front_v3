<template>
  <div class="article-list">
    <!-- 标签或分类名 -->
    <div :style="cover" class="banner">
      <h1 class="banner-title animated fadeInDown">{{ title }} - {{ nameObj.name }}({{ total }})</h1>
      <div class="tag-category-description animated fadeInDown">
        {{ nameObj.description }}
      </div>
    </div>
    <div class="article-list-wrapper">
      <div ref="articleListTopRef" class="article-list-anchor"></div>
      <order-bar @item-click="orderTypeChange" />
      <div
        ref="articleResultPanelRef"
        :style="articleResultMinHeight ? { minHeight: articleResultMinHeight + 'px' } : {}"
      >
        <ArticleListItem
          v-for="(item, index) of articleList"
          :key="item.id"
          :article="item"
          :index="index"
          :category-map="categoryMap"
          :tag-map="tagMap"
          @category-click="goHomeCategory"
        />
        <el-skeleton v-if="loading" :loading="loading" :rows="40" class="mt-4 box-shadow" />
        <div v-if="articleList.length" class="mt-3">
          <el-pagination
            background
            v-model:current-page="params.pageNo"
            :total="total"
            :pager-count="7"
            layout="prev, pager, next, jumper"
            class="d-flex justify-content-center"
            @change="fetchData(true)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrderBar from '@/components/base/OrderBar.vue'
import ArticleListItem from '@/components/article/ArticleListItem.vue'
import articleApi from '@/api/article'
import { useCommonStore } from '@/stores/common'
import { sanitizeArticleSummary } from '@/utils/common'
import { OrderTypeEnum } from '@/enums'
import type { IArticle } from '@/interface'

const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()

const params = ref({
  pageNo: 1,
  pageSize: 10
})
const articleList = ref<IArticle[]>([])
const total = ref(0)
const title = ref('')
const nameObj = ref<any>({})
const isTag = ref(true)
const categoryId = ref<string | null>(null)
const tagId = ref<string | null>(null)
const loading = ref(false)
const orderType = ref(OrderTypeEnum.NEWEST)
const articleListTopRef = ref<HTMLElement | null>(null)
const articleResultPanelRef = ref<HTMLElement | null>(null)
const articleResultMinHeight = ref(0)

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['articleList'].pageCover + ') center center / cover no-repeat'
})

const tagMap = computed(() => {
  return commonStore.tagMap
})

const categoryMap = computed(() => {
  return commonStore.categoryMap
})

onMounted(() => {
  const path = route.path
  if (path.indexOf('/category') !== -1) {
    title.value = '分类'
    isTag.value = false
    categoryId.value = typeof route.params.categoryId === 'string' ? route.params.categoryId : route.params.categoryId[0]
  } else {
    title.value = '标签'
    tagId.value = typeof route.params.tagId === 'string' ? route.params.tagId : route.params.tagId[0]
  }
  if (isTag.value && tagId.value) {
    nameObj.value = tagMap.value[tagId.value]
  } else if (!isTag.value && categoryId.value) {
    nameObj.value = categoryMap.value[categoryId.value]
  }
  document.title = title.value + ' - ' + nameObj.value.name
  fetchData()
})

/**
 * 加载标签或分类文章分页数据。
 *
 * :param shouldJumpTop: 是否在加载前跳转到文章列表顶部。
 * :return: 无返回值。
 */
async function fetchData(shouldJumpTop = false): Promise<void> {
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
  const queryParams = {
    categoryId: categoryId.value,
    tagId: tagId.value,
    orderType: orderType.value
  }
  articleApi.getPageList(params.value.pageNo, params.value.pageSize, queryParams).then(res => {
    if (res.data.records.length) {
      res.data.records.forEach((item: IArticle) => {
        item.content = sanitizeArticleSummary(item.content)
      })
      articleList.value = res.data.records
    } else {
      articleList.value = []
    }
    total.value = res.data.total
  }).finally(() => {
    loading.value = false
    articleResultMinHeight.value = 0
  })
}

function orderTypeChange(val: OrderTypeEnum) {
  orderType.value = val
  params.value.pageNo = 1
  params.value.pageSize = 10
  loading.value = true
  articleList.value = []
  total.value = 0
  fetchData(true)
}

/**
 * 跳转到首页并按分类筛选文章。
 *
 * :param categoryId: 分类 ID。
 * :return: 无返回值。
 */
function goHomeCategory(categoryId: string): void {
  router.push({
    path: '/',
    query: {
      categoryId
    }
  })
}

/**
 * 跳转到文章列表第一条数据附近。
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

<style src="@/assets/css/about.scss" />

<style scoped>
.tag-category-description {
  position: relative;
  top: 68%;
  width: calc(100% - 48px);
  max-width: 1100px;
  margin: 0 auto;
  font-size: 1.525rem;
  text-align: center;
  color: #eee;
  line-height: 1.7;
  animation: title-scale 1s;
}

@media (min-width: 760px) {
  .article-list-wrapper {
    max-width: 980px;
    margin: 14px auto 1rem auto;
    padding: 0 12px;
  }
}

.article-list-anchor {
  scroll-margin-top: 74px;
}

@media (max-width: 759px) {
  .article-list-wrapper {
    margin-top: 18px;
    padding: 0 12px;
  }

  .tag-category-description {
    width: calc(100% - 32px);
    font-size: 14px;
  }
}
</style>
