<template>
  <div v-if="viewUser">
    <el-card class="user-container">
      <el-row v-if="user?.id === viewUser.id" class="search-bar" :gutter="12" justify="center" align="middle">
        <el-col :xs="24" :sm="11" class="hidden-xs-only">
          <el-date-picker
            v-model="searchDates"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            placeholder="请选择收藏时间"
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
          <el-button type="primary" @click=" resetAndFetchArticleList">搜索</el-button>
        </el-col>
      </el-row>
      <el-row v-if="user?.id === viewUser.id" class="search-bar" :gutter="12" justify="start" align="middle">
        <el-col :xs="24" :sm="9">
          <order-bar :use-card="false" :bar-list="searchOrderList" @item-click="orderTypeChange" />
        </el-col>
      </el-row>
      <el-divider v-if="user?.id === viewUser.id" />
      <div v-if="collectList.length > 0">
        <div v-for="article in collectList" :key="article.id" class="user-article-div article-item">
          <el-row justify="center" align="middle">
            <el-col :xs="24" :sm="6" class="article-cover-col">
              <div class="article-cover"
                   :style="'background: url(' + article.cover + ') center center / cover no-repeat'"
                   @click="toArticleDetail(article)" />
            </el-col>
            <el-col :xs="24" :sm="18" class="ps-4">
              <el-row>
                <el-col class="article-title">
                  <router-link :to="'/article/' + article.id" class="a-link">{{ article.title }}</router-link>
                </el-col>
              </el-row>
              <el-row>
                <el-col class="article-content">{{ deleteHTMLTag(article.content) }}</el-col>
              </el-row>
              <el-row class="bottom-bar">
                <el-col :xs="24" :sm="8">
                  <Icon icon="mingcute:user-4-line" />
                  <router-link :to="'/user/' + article.userId" class="a-link">{{ article.user.nickname }}</router-link>
                </el-col>
                <el-col :xs="24" :sm="8">
                  <Icon icon="solar:calendar-broken" />
                  <el-tooltip effect="light" :content="'收藏时间:' + minute(article.createTime)">
                    <span>{{ minute(article.createTime) }}</span>
                  </el-tooltip>
                </el-col>
                <el-col :xs="12" :sm="8" class="hidden-xs-only">
                  <span class="article-origin">
                    <el-tag size="small"
                            :type="article.isOriginal ? 'success' : 'warning'">{{ article.isOriginal ? '原创' : '转载'
                      }}</el-tag>
                  </span>
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
import actionApi from '@/api/action'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import { deleteHTMLTag, removeEmptyValues } from '@/utils/common'
import { minute } from '@/utils/date'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { Icon } from '@iconify/vue'

const router = useRouter()
const userStore = useUserStore()

const props = defineProps<{
  viewUser: any
}>()
const { viewUser } = toRefs(props)

const searchOrderList = ref([
  {
    type: 1,
    name: '按收藏时间倒序'
  },
  {
    type: 4,
    name: '按收藏时间正序'
  }])

const searchDates = ref<any>(null)
const loading = ref(false)
const collectList = ref<any>([])
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
  const queryParams = Object.assign({}, removeEmptyValues(queryDict.value))
  const func = viewUser.value.id === user.value?.id ? actionApi.getUserActionList : actionApi.getActionList
  func(currentPage.value, pageSize.value, {
    userId: viewUser.value?.id,
    objType: ObjectTypeEnum.ARTICLE,
    actionType: ActionTypeEnum.COLLECT,
  }, queryParams).then(res => {
    if (res.data.records.length) {
      currentPage.value++
      collectList.value.push(...res.data.records)
      total.value = res.data.total
    }
  }).finally(() => {
    loading.value = false
  })
}

function orderTypeChange(val) {
  queryDict.value.orderType = val
  resetAndFetchArticleList()
}

function toArticleDetail(article) {
  router.push('/article/' + article.id)
}

function resetAndFetchArticleList() {
  currentPage.value = 1
  collectList.value = []
  total.value = 0
  infiniteHandler()
}
</script>

<style src="@/assets/css/user-center.scss" scoped />
