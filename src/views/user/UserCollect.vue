<template>
  <div v-if="viewUser">
    <el-card class="collect-panel user-container">
      <div class="collect-hero">
        <div class="collect-hero__liquid"></div>
        <div class="collect-hero__content">
          <span class="collect-hero__icon">
            <Icon icon="ph:star" />
          </span>
          <div>
            <div class="collect-hero__label">收藏书架</div>
            <h3>{{ collectTitle }}</h3>
            <p>{{ collectSubtitle }}</p>
          </div>
        </div>
        <div class="collect-hero__meta">
          <strong>{{ total }}</strong>
          <span>篇收藏</span>
        </div>
      </div>

      <div v-if="isSelfProfile" class="collect-toolbar">
        <div class="collect-filter-row">
          <el-date-picker
            v-model="searchDates"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            placeholder="请选择收藏时间"
          />
          <el-select v-model="queryDict.isOriginal" placeholder="文章类型">
            <el-option label="全部类型" value="" />
            <el-option label="原创" :value="true" />
            <el-option label="转载" :value="false" />
          </el-select>
          <el-input v-model="queryDict.keyword" placeholder="请输入关键字" clearable />
          <el-button type="primary" @click="resetAndFetchArticleList()">
            <Icon icon="material-symbols:search-rounded" />
            搜索
          </el-button>
        </div>
        <div class="collect-toolbar__footer">
          <order-bar :use-card="false" :bar-list="searchOrderList" @item-click="orderTypeChange" />
        </div>
      </div>

      <div v-if="collectList.length > 0" class="collect-list">
        <ArticleListItem
          v-for="(article, index) in collectList"
          :key="article.id"
          class="collect-card profile-article-card"
          :article="normalizeArticleForCard(article)"
          :index="index"
          :tag-map="tagMap"
          mode="manage"
        >
          <template #actions>
            <div class="collect-card-badges">
              <span class="collect-time-chip">
                <Icon icon="solar:calendar-broken" />
                收藏于 {{ minute(article.collectTime) }}
              </span>
              <button
                v-if="isSelfProfile"
                type="button"
                class="collect-cancel-button"
                @click="cancelCollect(article)"
              >
                <Icon icon="tabler:bookmark-minus" />
                取消收藏
              </button>
            </div>
          </template>
        </ArticleListItem>
      </div>
      <div v-else-if="!loading" class="collect-empty">
        <Icon icon="tabler:bookmark-off" />
        <strong>{{ emptyTitle }}</strong>
        <span>{{ emptyDescription }}</span>
      </div>
      <load-more
        v-if="collectList.length > 0 || loading"
        :loading="loading"
        :no-more="noMore"
        :total="total"
        :show-no-more="false"
        :loading-rows="8"
        @load="infiniteHandler"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import { useCommonStore } from '@/stores/common'
import actionApi from '@/api/action'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import ArticleListItem from '@/components/article/ArticleListItem.vue'
import { deleteHTMLTag, removeEmptyValues } from '@/utils/common'
import { minute } from '@/utils/date'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import type { IArticle, IUserDetail } from '@/interface'

const userStore = useUserStore()
const commonStore = useCommonStore()

const props = defineProps<{
  viewUser: IUserDetail
}>()
const { viewUser } = toRefs(props)

const searchOrderList = [
  {
    type: 1,
    name: '按收藏时间倒序'
  },
  {
    type: 4,
    name: '按收藏时间正序'
  }
]

const searchDates = ref<any>(null)
const loading = ref(false)
const collectList = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const queryDict = ref<any>({})

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return collectList.value.length >= total.value
})
const tagMap = computed(() => {
  return commonStore.tagMap
})
const isSelfProfile = computed(() => {
  return !!user.value?.id && user.value.id === viewUser.value.id
})
const collectTitle = computed(() => {
  return isSelfProfile.value ? '我的收藏灵感库' : viewUser.value.nickname + ' 的收藏'
})
const collectSubtitle = computed(() => {
  return isSelfProfile.value
    ? '把值得回看的文章收进这里，慢慢整理成自己的知识书架。'
    : '这些是 ' + viewUser.value.nickname + ' 留下的阅读线索。'
})
const emptyTitle = computed(() => {
  return isSelfProfile.value ? '还没有收藏文章' : '暂时没有公开收藏'
})
const emptyDescription = computed(() => {
  return isSelfProfile.value
    ? '遇到值得回看的文章时，可以先收藏起来。'
    : '等有新的收藏时，这里会亮起来。'
})

onMounted(() => {
  infiniteHandler()
})

/**
 * 分页加载当前用户的收藏文章列表。
 *
 * :return: 无返回值。
 */
function infiniteHandler(): void {
  loading.value = true
  if (searchDates.value) {
    queryDict.value.dateFrom = searchDates.value[0]
    queryDict.value.dateTo = searchDates.value[1]
  } else {
    queryDict.value.dateFrom = ''
    queryDict.value.dateTo = ''
  }
  const queryParams = Object.assign({}, removeEmptyValues(queryDict.value))
  const func =
    viewUser.value.id === user.value?.id ? actionApi.getUserActionList : actionApi.getActionList
  func(
    currentPage.value,
    pageSize.value,
    {
      userId: viewUser.value?.id,
      objType: ObjectTypeEnum.ARTICLE,
      actionType: ActionTypeEnum.COLLECT
    },
    queryParams
  )
    .then((res) => {
      total.value = res.data.total
      if (res.data.records.length) {
        currentPage.value++
        collectList.value.push(...res.data.records)
      }
    })
    .finally(() => {
      loading.value = false
    })
}

/**
 * 切换收藏列表排序并重新加载数据。
 *
 * :param val: 当前选择的排序类型。
 * :return: 无返回值。
 */
function orderTypeChange(val: number): void {
  queryDict.value.orderType = val
  resetAndFetchArticleList()
}

/**
 * 重置收藏列表分页，并重新请求第一页数据。
 *
 * :return: 无返回值。
 */
function resetAndFetchArticleList(): void {
  currentPage.value = 1
  collectList.value = []
  total.value = 0
  infiniteHandler()
}

/**
 * 取消收藏指定文章，并从当前收藏列表中移除。
 *
 * :param article: 当前操作的收藏文章。
 * :return: 无返回值。
 */
function cancelCollect(article: any): void {
  ElMessageBox.confirm('确定取消收藏这篇文章吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      actionApi
        .addOrUpdate({
          objId: article.id,
          objType: ObjectTypeEnum.ARTICLE,
          actionType: ActionTypeEnum.COLLECT
        })
        .then((res) => {
          if (!res.data) {
            collectList.value.splice(collectList.value.indexOf(article), 1)
            total.value = Math.max(total.value - 1, 0)
            ElMessage({
              message: '已取消收藏',
              type: 'success',
              plain: true
            })
          }
        })
    })
    .catch(() => {})
}

/**
 * 将收藏文章数据适配为公共文章卡片需要的展示结构。
 *
 * :param article: 原始收藏文章数据。
 * :return: 适配后的文章展示数据。
 */
function normalizeArticleForCard(article: any): IArticle {
  return {
    ...article,
    content: deleteHTMLTag(article.content || ''),
    user: article.user
      ? { ...article.user, id: article.user.id || article.userId }
      : viewUser.value,
    tagList: article.tagList || []
  }
}
</script>

<style src="@/assets/css/user-center.scss" scoped />
