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
      <order-bar @item-click="orderTypeChange" />
      <el-row class="mt-2">
        <el-col v-for="item of articleList" :key="item.id" :md="8" :span="24">
          <!-- 文章 -->
          <el-card class="animated zoomIn article-item-card">
            <div class="article-item-cover">
              <router-link :to="'/article/' + item.id">
                <!-- 缩略图 -->
                <el-image
                  class="on-hover"
                  width="100%"
                  height="100%"
                  :src="item.cover"
                />
              </router-link>
            </div>
            <div class="article-item-info">
              <!-- 文章标题 -->
              <div class="ms-1 me-1 ellipsis">
                <router-link :to="'/article/' + item.id">
                  <el-tooltip :content="item.title" placement="top" effect="light">
                    {{ item.title }}
                  </el-tooltip>
                </router-link>
              </div>
              <div class="author-div">
                <el-row>
                  <el-col :span="12" class="ellipsis">
                    <!-- 作者 -->
                    <router-link :to="'/user/' + item.userId" class="article-nickname"
                                 :title="item.user.nickname">
                      <Icon icon="bx:user" class="font-20" />
                      <el-tooltip :content="item.user.nickname" effect="light">
                        {{ item.user.nickname }}
                      </el-tooltip>
                    </router-link>
                  </el-col>
                  <el-col :span="12" class="justify-content-end">
                    <!-- 发表时间 -->
                    <Icon icon="ph:clock" class="font-20" />
                    {{ minute(item.createTime) }}
                  </el-col>
                  <el-col :span="12" class="mt-2">
                    <!-- 点赞等信息 -->
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
                  </el-col>
                  <el-col :span="12" class="mt-2 justify-content-end">
                    <!-- 文章分类 -->
                    <router-link :to="'/category/' + item.categoryId">
                      <Icon icon="tabler:category" class="font-20" />
                      {{ categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : '' }}
                    </router-link>
                  </el-col>
                </el-row>
              </div>
            </div>
            <!-- 分割线 -->
            <el-divider class="m-1" />
            <!-- 文章标签 -->
            <div class="tag-wrapper">
              <a
                v-for="(tid, index) of item.tagList"
                :key="tid"
                class="el-tag-a"
                :style="{background: colors[index], '--tag-color': colors[index]}"
                @click="router.push('/tag/' + tid)"
              >
                {{ tagMap[tid] ? tagMap[tid].name : '' }}
              </a>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <!-- 加载更多 -->
      <LoadMore :loading="loading" :no-more="noMore" :total="total" :loading-rows="12" :show-box-shadow="true" @load="fetchData()" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import articleApi from '@/api/article'
import { useCommonStore } from '@/stores/common'
import { covertNumberDisplay, genRandomColor, getObjKeyCount } from '@/utils/common'
import { minute } from '@/utils/date'
import { Icon } from '@iconify/vue'
import { OrderTypeEnum } from '@/enums'

const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()

const currentPage = ref(1)
const pageSize = ref(6)
const articleList = ref<any>([])
const total = ref(0)
const title = ref('')
const nameObj = ref<any>({})
const isTag = ref(true)
const categoryId = ref<string | null>(null)
const tagId = ref<string | null>(null)
const loading = ref(false)
const noMore = ref(false)
const orderType = ref(OrderTypeEnum.NEWEST)
const colors = ref<{ [key: number]: string }>([])

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
  changeColors(getObjKeyCount(tagMap.value))
})

function fetchData() {
  loading.value = true
  const queryParams = {
    categoryId: categoryId.value,
    tagId: tagId.value,
    orderType: orderType.value
  }
  articleApi.getPageList(currentPage.value, pageSize.value, queryParams).then(res => {
    if (res.data.records.length) {
      currentPage.value++
      articleList.value.push(...res.data.records)
      total.value = res.data.total
    }
    noMore.value = pageSize.value > res.data.records.length
  }).finally(() => {
    loading.value = false
  })
}

function changeColors(n: number) { // 随机变色
  const colorList = genRandomColor(n)
  for (let i = 0; i < n; i++) {
    colors.value[i] = 'rgb(' + colorList[i] + ')'
  }
}

function orderTypeChange(val: OrderTypeEnum) {
  orderType.value = val
  currentPage.value = 1
  pageSize.value = 6
  loading.value = true
  articleList.value = []
  total.value = 0
  fetchData()
}
</script>

<style src="@/assets/css/about.scss" />

<style scoped>
:deep(.el-card), :deep(.el-card__body) {
  --el-card-padding: 0;
}

.tag-category-description {
  position: relative;
  top: 70%;
  width: 100%;
  font-size: 1.525rem;
  text-align: center;
  color: #eee;
  animation: title-scale 1s;
}

.author-div {
  margin-top: 0.375rem;
  display: flex;
  align-items: center;

  .el-row {
    width: 100%;

    .el-col, a, span {
      display: flex;
      align-items: center;
    }

    :deep(svg) {
      margin-right: 5px;
    }
  }
}

.article-item-card {
  border-radius: 8px !important;
  margin: 10px;
  box-shadow: 0 4px 8px 6px rgba(7, 17, 27, 0.06);
}

.article-item-card a {
  transition: all 0.3s;
}

.article-item-cover {
  height: 220px;
  overflow: hidden;
}

.article-item-card a:hover {
  color: #8e8cd8;
}

.tag-wrapper {
  padding: 10px 15px 10px 18px;
  min-height: 45px;
}

.tag-wrapper a {
  color: #fff !important;
}

.tag-btn {
  display: inline-block;
  font-size: 0.725rem;
  line-height: 22px;
  height: 22px;
  border-radius: 10px;
  padding: 0 12px !important;
  background: linear-gradient(to right, #bf4643 0%, #6c9d8f 100%);
  opacity: 0.6;
  margin-right: 0.5rem;
}

.article-nickname {
  display: inline-block;
}

.skeleton-card :deep(.v-skeleton-loader__image) {
  height: 220px;
}

.skeleton-card :deep(.v-skeleton-loader__card-heading) {
  min-height: 130px;
}

@media (min-width: 760px) {
  .article-list-wrapper {
    max-width: 1200px;
    margin: 10px auto 1rem auto;
  }

  .article-item-card:hover {
    transition: all 0.3s;
    box-shadow: 0 4px 12px 12px rgba(7, 17, 27, 0.15);
  }

  .article-item-card:not(:hover) {
    transition: all 0.3s;
  }

  .article-item-card:hover .on-hover {
    transition: all 0.6s;
    transform: scale(1.1);
  }

  .article-item-card:not(:hover) .on-hover {
    transition: all 0.6s;
  }

  .article-item-info {
    line-height: 1.7;
    padding: 15px 10px 12px 10px;
    font-size: 15px;
  }
}

@media (max-width: 759px) {
  .article-list-wrapper {
    margin-top: 230px;
    padding: 0 12px;
  }

  .article-item-info {
    line-height: 1.7;
    padding: 15px 15px 12px 10px;
  }

  .tag-category-description {
    position: relative;
    top: 70%;
    width: 100%;
    font-size: 14px;
    text-align: center;
    color: #eee;
    animation: title-scale 1s;
  }
}
</style>
