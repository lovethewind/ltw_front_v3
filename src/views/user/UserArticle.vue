<template>
  <div v-if="viewUser">
    <el-card class="user-container">
      <el-row v-if="user?.id === viewUser.id" class="search-bar" justify="center" align="middle">
        <el-col :xs="24" :sm="11" class="hidden-xs-only">
          <el-date-picker
            v-model="searchDates"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            placeholder="请选择发布时间"
          />
        </el-col>
        <el-col :xs="8" :sm="4">
          <el-select v-model="queryDict.isOriginal" placeholder="文章类型">
            <el-option label="---" value="" />
            <el-option label="原创" :value="true" />
            <el-option label="转载" :value="false" />
          </el-select>
        </el-col>
        <el-col :xs="11" :sm="7">
          <el-input v-model="queryDict.keyword" placeholder="请输入关键字" clearable />
        </el-col>
        <el-col :xs="5" :sm="2">
          <el-button type="primary" @click="resetAndFetchArticleList()">搜索</el-button>
        </el-col>
      </el-row>
      <el-row v-if="user?.id === viewUser.id" class="search-bar" :gutter="12" justify="center" align="middle">
        <el-col :xs="24" :sm="9">
          <order-bar :use-card="false" :bar-list="searchOrderList" @item-click="orderTypeChange" />
        </el-col>
        <el-col :xs="24" :sm="15" class="text-end">
          <a :class="!queryDict.status ? 'active': ''" @click="changeArticleStatus()">全部({{ countAll(articleInfo)
            }})</a>
          <el-divider direction="vertical" />
          <a :class="queryDict.status === ArticleStatusEnum.PUBLISHED ? 'active': ''"
             @click="changeArticleStatus(ArticleStatusEnum.PUBLISHED)">已发布({{ articleInfo[ArticleStatusEnum.PUBLISHED] || 0
            }})</a>
          <el-divider direction="vertical" />
          <a :class="queryDict.status === ArticleStatusEnum.DRAFT ? 'active': ''"
             @click="changeArticleStatus(ArticleStatusEnum.DRAFT)">草稿箱({{ articleInfo[ArticleStatusEnum.DRAFT] || 0
            }})</a>
          <el-divider direction="vertical" />
          <a :class="queryDict.status === ArticleStatusEnum.CHECKING ? 'active': ''"
             @click="changeArticleStatus(ArticleStatusEnum.CHECKING)">审核中({{ articleInfo[ArticleStatusEnum.CHECKING] || 0
            }})</a>
          <el-divider direction="vertical" />
          <a :class="queryDict.status === ArticleStatusEnum.DELETED ? 'active': ''"
             @click="changeArticleStatus(ArticleStatusEnum.DELETED)">回收站({{ articleInfo[ArticleStatusEnum.DELETED] || 0
            }})</a>
        </el-col>
      </el-row>
      <el-divider v-if="user?.id === viewUser.id" />
      <div v-if="articleList.length > 0">
        <div v-for="article in articleList" :key="article.id" class="user-article-div article-item">
          <el-row justify="center" align="middle">
            <el-col :xs="24" :sm="6" class="article-cover-col">
              <div class="article-cover"
                   :style="'background: url(' + article.cover + ') center center / cover no-repeat'"
                   @click="toArticleDetail(article)" />
            </el-col>
            <el-col :xs="24" :sm="18" class="ps-4">
              <el-row>
                <el-col class="article-title">
                  <router-link v-if="!article.status || article.status === ArticleStatusEnum.PUBLISHED"
                               :to="'/article/' + article.id" class="a-link">{{ article.title }}
                  </router-link>
                  <span v-else>{{ article.title }}</span>
                </el-col>
              </el-row>
              <el-row>
                <el-col class="article-content">{{ deleteHTMLTag(article.content) }}</el-col>
              </el-row>
              <el-row class="bottom-bar">
                <el-col :xs="24" :sm="6">
                  <Icon icon="solar:calendar-broken" />
                  {{ minute(article.createTime) }}
                </el-col>
                <el-col :xs="12" :sm="6" class="justify-content-center">
                  <span class="count-span">
                    <Icon icon="ph:eye" />
                    {{ article.viewCount }}
                  </span>
                  <span class="count-span">
                    <Icon icon="tabler:thumb-up" />
                    {{ article.likeCount }}
                  </span>
                  <span class="count-span">
                    <Icon icon="iconamoon:comment-dots" />
                    {{ article.commentCount }}
                  </span>
                </el-col>
                <el-col :xs="12" :sm="6" class="hidden-xs-only">
                  <span class="article-origin">
                    <el-tag size="small" :type="article.isOriginal ? 'success' : 'warning'">
                      {{ article.isOriginal ? '原创' : '转载' }}
                    </el-tag>
                  </span>
                  <span v-if="article.status !== ArticleStatusEnum.PUBLISHED" class="article-status">
                    <el-tag size="small" :color="articleStatusTypeMap[article.status]">
                      {{ articleStatusMap[article.status] }}
                    </el-tag>
                  </span>
                </el-col>
                <el-col v-if="user?.id === viewUser.id && article.status !== ArticleStatusEnum.DELETED" :xs="12" :sm="6"
                        class="justify-content-end">
                  <router-link :to="'/article/edit/' + article.id" class="me-2">
                    <Icon icon="mage:edit" />
                    编辑
                  </router-link>
                  <el-dropdown>
                    <span class="el-dropdown-link cursor-pointer">
                      <Icon icon="mingcute:more-1-line" />
                    </span>
                    <template #dropdown>
                      <el-dropdown-menu class="user-article-more">
                        <el-dropdown-item>
                          <a @click="removeToRecycle(article)">
                            <Icon icon="material-symbols:delete-outline" />
                            删除</a>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-col>
                <el-col v-if="user?.id === viewUser.id && article.status === ArticleStatusEnum.DELETED" :xs="12"
                        :sm="6" class="justify-content-end cursor-pointer">
                  <el-dropdown>
                    <span class="el-dropdown-link">
                      <Icon icon="mingcute:more-1-line" />
                    </span>
                    <template #dropdown>
                      <el-dropdown-menu class="user-article-more">
                        <el-dropdown-item>
                          <a @click="recoveryRecycleArticle(article)">
                            <Icon icon="la:trash-restore" />
                            恢复至草稿</a>
                        </el-dropdown-item>
                        <el-dropdown-item>
                          <a @click="deleteRecycleArticle(article)">
                            <Icon icon="material-symbols:delete-outline" />
                            从回收站删除</a>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-col>
              </el-row>
            </el-col>
          </el-row>
        </div>
      </div>
      <!-- 加载更多 -->
      <load-more :loading="loading" :no-more="noMore" :total="total" @load="infiniteHandler" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import articleApi from '@/api/article'
import { deleteHTMLTag, removeEmptyValues } from '@/utils/common'
import { articleStatusMap, articleStatusTypeMap } from '@/utils/constant'
import { ArticleStatusEnum } from '@/enums'
import { minute } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'

const router = useRouter()
const userStore = useUserStore()

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
  }]
const searchDates = ref<any>(null)
const loading = ref(false)
const articleList = ref<any>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const queryDict = ref({})
const articleInfo = ref({})

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return articleList.value.length >= total.value
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
  const queryParams = Object.assign({ userId: viewUser.value.id }, removeEmptyValues(queryDict.value))
  articleApi.getPageList(currentPage.value, pageSize.value, queryParams).then(res => {
    if (res.data.records.length) {
      currentPage.value++
      articleList.value.push(...res.data.records)
      total.value = res.data.total
      loading.value = false
    }
  }).finally(() => {
    loading.value = false
  })
  fetchUserArticleInfo(queryParams)
}

function fetchUserArticleInfo(query: object) {
  if (user.value?.id !== viewUser.value.id) return
  articleApi.getUserArticleCountInfo(query).then(res => {
    articleInfo.value = res.data
  })
}

function orderTypeChange(val) {
  queryDict.value.orderType = val
  resetAndFetchArticleList()
}

function removeToRecycle(article) {
  ElMessageBox.confirm('正在删除该文章, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    articleApi.removeToRecycle({
      ids: [article.id]
    }).then(() => {
      ElMessage({
        message: '删除成功，可在回收站查看和恢复',
        type: 'success',
        plain: true
      })
      articleList.value.splice(articleList.value.indexOf(article), 1)
      articleInfo.value[article.status]--
      articleInfo.value[ArticleStatusEnum.DELETED]++
    }).catch(() => {
    })
  })
}

function recoveryRecycleArticle(article) {
  articleApi.moveToDraft({
    ids: [article.id]
  }).then(() => {
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

function deleteRecycleArticle(article) {
  ElMessageBox.confirm('您确定要从回收站删除该文章吗，删除后不可恢复?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    articleApi.removeFromRecycle({
      ids: [article.id]
    }).then(() => {
      ElMessage({
        message: '删除成功',
        type: 'success',
        plain: true
      })
      articleList.value.splice(articleList.value.indexOf(article), 1)
      articleInfo.value[ArticleStatusEnum.DELETED]--
    }).catch(() => {
    })
  })
}

function toArticleDetail(article) {
  if (article.status !== ArticleStatusEnum.PUBLISHED) {
    return
  }
  router.push('/article/' + article.id)
}

function changeArticleStatus(val) {
  queryDict.value.status = val
  resetAndFetchArticleList()
}

function resetAndFetchArticleList() {
  currentPage.value = 1
  articleList.value = []
  total.value = 0
  infiniteHandler()
}

function countAll(obj) {
  let count = 0
  Object.keys(obj).forEach((key) => {
    count += obj[key]
  })
  return count
}

</script>

<style src="@/assets/css/user-center.scss" scoped />
<style lang="scss">
.user-article-more {
  a {
    display: inline-flex;
    align-items: center;
  }
}
</style>