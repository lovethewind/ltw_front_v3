<template>
  <el-card class="article-manager-card user-container">
    <div class="article-toolbar">
      <div class="article-filter-row">
        <el-date-picker
          v-if="viewUser && user?.id === viewUser.id"
          v-model="searchDates"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          placeholder="请选择发布时间"
        />
        <el-select
          v-if="viewUser && user?.id === viewUser.id"
          v-model="queryDict.isOriginal"
          placeholder="文章类型"
        >
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
      <div v-if="viewUser && user?.id === viewUser.id" class="article-toolbar__footer">
        <div class="article-order-wrap">
          <order-bar :use-card="false" :bar-list="searchOrderList" @item-click="orderTypeChange" />
        </div>
        <div class="article-status-tabs">
          <button
            type="button"
            class="article-status-tab"
            :class="{ 'is-active': !queryDict.status }"
            @click="changeArticleStatus()"
          >
            全部 <strong>{{ countAll(articleInfo) }}</strong>
          </button>
          <button
            type="button"
            class="article-status-tab"
            :class="{ 'is-active': queryDict.status === ArticleStatusEnum.PUBLISHED }"
            @click="changeArticleStatus(ArticleStatusEnum.PUBLISHED)"
          >
            已发布 <strong>{{ articleInfo[ArticleStatusEnum.PUBLISHED] || 0 }}</strong>
          </button>
          <button
            type="button"
            class="article-status-tab"
            :class="{ 'is-active': queryDict.status === ArticleStatusEnum.DRAFT }"
            @click="changeArticleStatus(ArticleStatusEnum.DRAFT)"
          >
            草稿箱 <strong>{{ articleInfo[ArticleStatusEnum.DRAFT] || 0 }}</strong>
          </button>
          <button
            type="button"
            class="article-status-tab"
            :class="{ 'is-active': queryDict.status === ArticleStatusEnum.CHECKING }"
            @click="changeArticleStatus(ArticleStatusEnum.CHECKING)"
          >
            审核中 <strong>{{ articleInfo[ArticleStatusEnum.CHECKING] || 0 }}</strong>
          </button>
          <button
            type="button"
            class="article-status-tab"
            :class="{ 'is-active': queryDict.status === ArticleStatusEnum.DELETED }"
            @click="changeArticleStatus(ArticleStatusEnum.DELETED)"
          >
            回收站 <strong>{{ articleInfo[ArticleStatusEnum.DELETED] || 0 }}</strong>
          </button>
        </div>
      </div>
    </div>

    <div v-if="articleList.length > 0" class="article-list">
      <ArticleListItem
        v-for="(article, index) in articleList"
        :key="article.id"
        class="profile-article-card"
        :article="normalizeArticleForCard(article)"
        :index="index"
        :tag-map="tagMap"
        :show-avatar="false"
        mode="manage"
        :clickable="article.status === ArticleStatusEnum.PUBLISHED"
      >
        <template #badges>
          <el-tag
            v-if="article.status !== ArticleStatusEnum.PUBLISHED"
            size="small"
            :color="(articleStatusTypeMap as any)[article.status]"
          >
            {{ (articleStatusMap as any)[article.status] }}
          </el-tag>
        </template>
        <template #actions>
          <div
            v-if="user?.id === viewUser.id && article.status !== ArticleStatusEnum.DELETED"
            class="article-card__actions"
          >
            <router-link :to="'/article/edit/' + article.id" class="article-action-link">
              <Icon icon="mage:edit" />
              编辑
            </router-link>
            <button type="button" class="article-danger-button" @click="removeToRecycle(article)">
              <Icon icon="material-symbols:delete-outline" />
              删除
            </button>
          </div>
          <div
            v-if="user?.id === viewUser.id && article.status === ArticleStatusEnum.DELETED"
            class="article-card__actions"
          >
            <button type="button" class="article-restore-button" @click="recoveryRecycleArticle(article)">
              <Icon icon="la:trash-restore" />
              恢复至草稿
            </button>
            <button type="button" class="article-danger-button" @click="deleteRecycleArticle(article)">
              <Icon icon="material-symbols:delete-outline" />
              从回收站删除
            </button>
          </div>
        </template>
      </ArticleListItem>
    </div>
    <!-- 加载更多 -->
    <load-more
      :loading="loading"
      :no-more="noMore"
      :total="total"
      :loadingRows="20"
      @load="infiniteHandler"
    />
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import { useCommonStore } from '@/stores/common'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import ArticleListItem from '@/components/article/ArticleListItem.vue'
import articleApi from '@/api/article'
import { deleteHTMLTag, removeEmptyValues } from '@/utils/common'
import { articleStatusMap, articleStatusTypeMap } from '@/utils/constant'
import { ArticleStatusEnum } from '@/enums'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'

const userStore = useUserStore()
const commonStore = useCommonStore()

const props = defineProps<{
  viewUser: any
}>()
const { viewUser } = toRefs(props)

const searchOrderList = [
  {
    type: 1,
    name: '按时间倒序'
  },
  {
    type: 4,
    name: '按时间正序'
  },
  {
    type: 3,
    name: '按阅读量'
  }
]
const searchDates = ref<any>(null)
const loading = ref(false)
const articleList = ref<any>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const queryDict = ref<any>({})
const articleInfo = ref<any>({})

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return articleList.value.length >= total.value
})
const tagMap = computed(() => {
  return commonStore.tagMap
})

onMounted(() => {
  infiniteHandler()
})

function infiniteHandler() {
  loading.value = true
  if (searchDates.value) {
    queryDict.value.dateFrom = searchDates.value[0]
    queryDict.value.dateTo = searchDates.value[1]
  } else {
    queryDict.value.dateFrom = ''
    queryDict.value.dateTo = ''
  }
  const queryParams = Object.assign(
    { userId: viewUser.value.id },
    removeEmptyValues(queryDict.value)
  )
  articleApi
    .getPageList(currentPage.value, pageSize.value, queryParams)
    .then((res) => {
      if (res.data.records.length) {
        currentPage.value++
        articleList.value.push(...res.data.records)
        total.value = res.data.total
        loading.value = false
      }
    })
    .finally(() => {
      loading.value = false
    })
  fetchUserArticleInfo(queryParams)
}

function fetchUserArticleInfo(query: object) {
  if (user.value?.id !== viewUser.value.id) return
  articleApi.getUserArticleCountInfo(query).then((res) => {
    articleInfo.value = res.data
  })
}

function orderTypeChange(val: any) {
  queryDict.value.orderType = val
  resetAndFetchArticleList()
}

function removeToRecycle(article: any) {
  ElMessageBox.confirm('正在删除该文章, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    articleApi
      .removeToRecycle({
        ids: [article.id]
      })
      .then(() => {
        ElMessage({
          message: '删除成功，可在回收站查看和恢复',
          type: 'success',
          plain: true
        })
        articleList.value.splice(articleList.value.indexOf(article), 1)
        articleInfo.value[article.status]--
        articleInfo.value[ArticleStatusEnum.DELETED]++
      })
      .catch(() => {})
  })
}

function recoveryRecycleArticle(article: any) {
  articleApi
    .moveToDraft({
      ids: [article.id]
    })
    .then(() => {
      ElMessage({
        message: '已恢复至草稿',
        type: 'success',
        plain: true
      })
      articleList.value.splice(articleList.value.indexOf(article), 1)
      articleInfo.value[ArticleStatusEnum.DELETED]--
      articleInfo.value[ArticleStatusEnum.DRAFT]++
    })
}

function deleteRecycleArticle(article: any) {
  ElMessageBox.confirm('您确定要从回收站删除该文章吗，删除后不可恢复?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    articleApi
      .removeFromRecycle({
        ids: [article.id]
      })
      .then(() => {
        ElMessage({
          message: '删除成功',
          type: 'success',
          plain: true
        })
        articleList.value.splice(articleList.value.indexOf(article), 1)
        articleInfo.value[ArticleStatusEnum.DELETED]--
      })
      .catch(() => {})
  })
}

function changeArticleStatus(val?: any) {
  queryDict.value.status = val
  resetAndFetchArticleList()
}

function resetAndFetchArticleList() {
  currentPage.value = 1
  articleList.value = []
  total.value = 0
  infiniteHandler()
}

function countAll(obj: any) {
  let count = 0
  Object.keys(obj).forEach((key) => {
    count += obj[key]
  })
  return count
}

/**
 * 将个人中心文章数据适配为公共文章卡片需要的展示结构。
 *
 * :param article: 原始文章数据。
 * :return: 适配后的文章展示数据。
 */
function normalizeArticleForCard(article: any): any {
  return {
    ...article,
    content: deleteHTMLTag(article.content || ''),
    user: article.user || viewUser.value,
    tagList: article.tagList || []
  }
}
</script>

<style src="@/assets/css/user-center.scss" scoped />
