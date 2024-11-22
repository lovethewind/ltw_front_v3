<template>
  <div class="article-detail">
    <!-- 封面图 -->
    <div v-if="article" class="banner" :style="articleCover">
      <div class="article-info-container">
        <!-- 文章标题 -->
        <div class="article-title"><h1>{{ article.title }}</h1></div>
        <div class="article-info">
          <div class="first-line d-flex align-items-center">
            <Icon icon="bx:user" class="font-14" />
            <router-link :to="'/user/' + article.userId">{{ article.user.nickname }}</router-link>
            <span class="separator">|</span>
            <!-- 发表时间 -->
            <Icon icon="solar:calendar-broken" class="font-14" />
            <span title="发表时间">{{ minute(article.createTime) }}</span>
            <span class="separator">|</span>
            <!-- 更新时间 -->
            <Icon icon="mage:edit" class="font-14" />
            <el-tooltip placement="top" :content="'最后编辑时间:' + minute(article.editTime || article.createTime)"
                        effect="light">
              {{ minute(article.editTime || article.createTime) }}
            </el-tooltip>
            <span class="separator">|</span>
            <!-- 文章分类 -->
            <Icon icon="tabler:category" class="font-14" />
            <router-link :to="'/category/' + article.categoryId" class="a-link color-white">
              {{ categoryMap[article.categoryId] ? categoryMap[article.categoryId].name : '' }}
            </router-link>
          </div>
          <div class="second-line justify-content-center d-flex align-items-center">
            <!-- 字数统计 -->
            <Icon icon="fluent:text-word-count-20-filled" class="font-14" />
            <span>字数统计: {{ covertNumberDisplay(wordNum) }}</span>
            <span class="separator">|</span>
            <!-- 阅读时长 -->
            <Icon icon="mingcute:time-line" class="font-14" />
            <span>阅读时长: {{ readTime }}</span>
            <span class="separator">|</span>
            <!-- 阅读量 -->
            <Icon icon="ph:eye" class="font-14" />
            <span>阅读量: {{ article.viewCount }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="banner">
      <!-- 文章标题 -->
      <div class="article-info-container">
        <div class="article-title">内容加载中</div>
      </div>
    </div>
    <!--左侧悬浮-->
    <div v-if="article" class="left-div">
      <el-row>
        <el-col>
          <!-- 评论跳转按钮 -->
          <a @click="toCommentList">
            <div class="a-hover" title="跳转至评论">
              <el-badge :value="covertNumberDisplay(article.commentCount)" :offset="[-10, 5]" class="item">
                <Icon icon="mdi:comment-outline" class="font-20" color="#e91e63" />
              </el-badge>
            </div>
          </a>
        </el-col>
        <el-col>
          <!-- 点赞按钮 -->
          <a @click="like()">
            <div title="点赞" class="a-hover">
              <el-badge :value="covertNumberDisplay(article.likeCount)" :offset="[-10, 5]" :class="isLike">
                <Icon icon="tabler:thumb-up" class="font-20" color="#2196f3" />
              </el-badge>
            </div>
          </a>
        </el-col>
        <el-col>
          <!-- 收藏按钮 -->
          <a @click="collect()">
            <div title="收藏" class="a-hover">
              <el-badge :value="covertNumberDisplay(article.collectCount)" :offset="[-10, 5]" :class="isCollect">
                <Icon icon="ph:star" color="green" class="font-20" />
              </el-badge>
            </div>
          </a>
        </el-col>
      </el-row>
    </div>
    <!-- 内容 -->
    <el-row v-if="article" class="article-container">
      <el-col :xs="24" :md="17" class="me-2">
        <el-card class="article-wrapper">
          <el-row v-if="user && article.userId === user.id" align="top" justify="start" class="mb-2">
            <el-col class="text-right">
              <el-button size="small" type="primary" @click="router.push('/article/edit/' + article.id)">
                <Icon icon="mage:edit" class="font-14" />
                编辑
              </el-button>
            </el-col>
          </el-row>
          <div
            v-if="!isCheck"
            ref="articleRef"
            v-dompurify-html="article.content"
            :class="['article-content', article.isMarkdown ? 'markdown-body': 'rich-body']"
          />
          <div v-if="!isExpanded" class="blur-overlay" />
          <div
            v-if="!isExpanded"
            class="overlay-content"
          >
            <el-button type="danger" round @click="expandContent">查看更多</el-button>
          </div>
          <div v-show="isCheck" style="">该文章为私密文章，如需查看请点
            <a href="javascript:void(0);" style="color: red" @click="dialogVisible=true">
              <Icon icon="material-symbols:lock-outline" />
              此处
            </a>
            获取验证码
          </div>
          <!-- 附件列表 -->
          <div v-if="article.attachList && article.attachList.length > 0" class="article-attachment">
            <div class="article-attachment-title">
              <Icon icon="carbon:document-attachment" class="font-20" color="orange" />
              <span class="ms-2">附件列表({{ article.attachList.length }})</span>
            </div>
            <div class="article-attachment-list">
              <el-row
                v-for="item of article.attachList"
                :key="item.id"
                class="article-attachment-item"
              >
                <el-col :span="18">
                  <Icon icon="mage:file-3" class="font-16" color="green" />
                  <span class="article-attachment-name">{{ item.name }}</span>
                </el-col>
                <el-col :span="6" class="justify-content-end">
                  <el-button type="primary" size="small" @click="downloadFile(item.url)"
                             class="article-attachment-size">
                    <Icon icon="mage:download" class="font-16" />
                    下载({{ transformSize(item.size) }})
                  </el-button>
                </el-col>
              </el-row>
            </div>
          </div>
          <!-- 版权声明 -->
          <div :class="['article-copyright', !isExpanded ? 'mt--120': '']">
            <div>
              <span class="name"><Icon icon="ic:round-title" color="orange" class="font-16" />标题：</span>
              <span>
                {{ article.title }}
              <Icon icon="material-symbols:content-copy-outline" class="a-link font-16" @click="copy(article.title)" />
              </span>
            </div>
            <div>
              <span class="name"><Icon icon="bx:user" class="font-16" color="pink" />作者：</span>
              <span>
                <a :href="'/user/' + article.userId" target="_blank">
                {{ article.user.nickname }}
                </a>
                <Icon icon="material-symbols:content-copy-outline" class="a-link font-16"
                      @click="copy(article.user.nickname)" />
              </span>
            </div>
            <div>
              <span class="name"><Icon icon="ic:outline-link" color="red" class="font-16" /> 本文链接：</span>
              <span>
                <a :href="articleHref" target="_blank">{{ articleHref }} </a>
                <Icon icon="material-symbols:content-copy-outline" class="a-link font-16" @click="copy(articleHref)" />
              </span>
            </div>
            <div v-if="!article.isOriginal">
              <span class="name"><Icon icon="ic:outline-link" color="red" class="font-16" /> 原文链接：</span>
              <span>
                <a :href="article.originalUrl" target="_blank">{{ article.originalUrl }} </a>
                <Icon icon="material-symbols:content-copy-outline" class="a-link font-16"
                      @click="copy(article.originalUrl)" />
                </span>
            </div>
            <div>
              <span class="name"><Icon icon="ic:baseline-copyright" color="green" class="font-16" /> 版权声明：</span>本文章除特别声明外，均采用
              <a href="http://creativecommons.org/licenses/by-sa/4.0/" target="_blank">
                CC 4.0 BY-SA
              </a>
              遵循版权协议，转载请附上原文出处链接和本声明。
            </div>
          </div>
          <!-- 转发 -->
          <!-- 文章标签 -->
          <div class="article-operation">
            <div class="ms-2">
              <a
                v-for="(tagId, index) of article.tagList"
                :key="'tagId' + tagId"
                class="el-tag-a"
                :style="{background: colors[index], '--tag-color': colors[index]}"
                @click="router.push('/tag/' + tagId)"
              >
                {{ tagMap[tagId] ? tagMap[tagId].name : '' }}
              </a>
            </div>
          </div>
          <div class="pagination-post">
            <!-- 上一篇 -->
            <div :class="isFull(article.lastArticle)">
              <router-link v-if="article.lastArticle" :to="'/article/' + article.lastArticle.id">
                <img
                  class="post-cover"
                  :src="article.lastArticle.cover"
                  alt="">
                <div class="post-info">
                  <div class="label">上一篇</div>
                  <div class="post-title">
                    {{ article.lastArticle.title }}
                  </div>
                </div>
              </router-link>
              <div v-else class="post-info">
                <div class="label">上一篇</div>
                <div class="post-title">
                  没有了
                </div>
              </div>
            </div>
            <!-- 下一篇 -->
            <div :class="isFull(article.nextArticle)">
              <router-link v-if="article.nextArticle" :to="'/article/' + article.nextArticle.id">
                <img
                  class="post-cover"
                  :src="article.nextArticle.cover"
                  alt="">
                <div class="post-info" style="text-align: right">
                  <div class="label">下一篇</div>
                  <div class="post-title">
                    {{ article.nextArticle.title }}
                  </div>
                </div>
              </router-link>
            </div>
          </div>
          <!-- 分割线 -->
          <hr>
          <!-- 评论 -->
          <div class="comment-title mb-3">
            <Icon icon="mdi:comment-outline" class="me-1" />
            评论
          </div>
          <!-- 评论框 -->
          <div ref="emptyReplyRef" class="empty-reply-div" v-show="replyShouldFixed">
            正在评论中
          </div>
          <reply-view
            ref="replyRef"
            :show-header="false"
            :check-login="true"
            :is-fixed="replyShouldFixed"
            @reply="replyArticle"
            @cancel="cancelReply"
            :class="replyShouldFixed ? 'reply-fixed': ''"
          />
          <comment-view
            ref="commentRef"
            :obj-id="article.id"
            :obj-type="ObjectTypeEnum.ARTICLE"
            :obj-user-id="article.user.id"
            :login-user-id="user?.id"
            :check-login="true"
            @reply-comment="replyComment"
            style="scroll-margin-top: 70px"
          />
        </el-card>
      </el-col>
      <!-- 侧边功能 -->
      <el-col :xs="24" :md="6" class="d-md-block d-none">
        <div class="sticky-top-70">
          <!-- 本文作者信息 -->
          <el-card v-if="currentArticleUser" class="right-container">
            <div class="right-title">
              <Icon icon="bx:user" class="font-18" color="#0d6efd" />
              <span>作者信息</span>
            </div>
            <div class="mt-2">
              <el-row align="middle">
                <el-col :span="6">
                  <el-avatar :size="60" :src="currentArticleUser.avatar" @click="toUserCenter()" />
                </el-col>
                <el-col :span="18">
                  <el-row align="middle">
                    <el-col :span="24">
                      <span class="font-14 fw-bold">
                        <router-link :to="'/user/' + currentArticleUser.id"
                                     class="a-link">{{ currentArticleUser.nickname }}</router-link>
                        <Icon :icon="genderMap[currentArticleUser.gender].icon"
                              :color="genderMap[currentArticleUser.gender].color" />
                      </span>
                    </el-col>
                    <el-col :span="24">
                      <span class="font-12">
                        {{ currentArticleUser.summary }}
                      </span>
                    </el-col>
                  </el-row>
                </el-col>
              </el-row>
              <el-row align="middle" justify="center" class="text-left mt-2">
                <el-col class="d-flex align-items-center">
                  <Icon icon="mdi:leaf" class="font-16" color="green" />
                  站龄: {{ formatRegisterTime(currentArticleUser.registerTimestamp) }}
                </el-col>
              </el-row>
              <el-row align="middle" justify="center" class="text-left mt-2">
                <el-col class="d-flex align-items-center">
                  <Icon icon="tdesign:location" color="red" class="font-16" />
                  IP属地: {{ currentArticleUser.address }}
                </el-col>
              </el-row>
              <el-row align="middle" justify="center" class="text-center mt-4">
                <el-col :span="6">
                  <el-statistic :value="currentArticleUser.articleCount" />
                </el-col>
                <el-col :span="6">
                  <el-statistic :value="currentArticleUser.commentCount" />
                </el-col>
                <el-col :span="6">
                  <el-statistic :value="currentArticleUser.fansCount" />
                </el-col>
                <el-col :span="6">
                  <el-statistic :value="currentArticleUser.viewCount" />
                </el-col>
              </el-row>
              <el-row align="middle" justify="center" class="text-center">
                <el-col :span="6"> 文章</el-col>
                <el-col :span="6"> 评论</el-col>
                <el-col :span="6"> 粉丝</el-col>
                <el-col :span="6"> 访问量</el-col>
              </el-row>
              <el-row v-if="!user || currentArticleUser.id !== user.id" align="middle" justify="center"
                      class="text-center mt-4 mb-2">
                <el-col :span="12">
                  <el-button round :color="currentArticleUser.isFollowed ? 'green' : '#2196f3'" @click="followUser()">
                    <Icon icon="ph:star" class="font-16" />
                    {{ currentArticleUser.isFollowed && currentArticleUser.isMyFans ? '互相关注' : (currentArticleUser.isFollowed ? '已关注' : '关注')
                    }}
                  </el-button>
                </el-col>
                <el-col :span="12">
                  <el-button round color="#e91e63" @click="chat()">
                    <Icon icon="lets-icons:message" class="font-16" />
                    私信
                  </el-button>
                </el-col>
              </el-row>
            </div>
          </el-card>
          <!-- 文章目录 -->
          <el-card class="right-container">
            <div class="right-title">
              <Icon icon="carbon:catalog" color="#00c4b6" class="font-16" />
              <span>目录</span>
            </div>
            <div id="toc" @click="expandContent" />
          </el-card>
          <!-- 推荐文章 -->
          <el-card class="right-container">
            <div class="right-title">
              <Icon icon="tabler:thumb-up" class="font-16" color="pink" />
              <span>相关推荐</span>
            </div>
            <div class="article-list">
              <div
                v-for="item of recommendArticleList"
                :key="'recommendArticle' + item.id"
                class="article-item"
              >
                <router-link :to="'/article/' + item.id" class="content-cover">
                  <img :src="item.cover" alt="">
                </router-link>
                <div class="content">
                  <div class="content-title ellipsis">
                    <router-link :to="'/article/' + item.id" :title="item.title">
                      {{ item.title }}
                    </router-link>
                  </div>
                  <div class="content-time">{{ date(item.createTime) }}</div>
                </div>
              </div>
            </div>
          </el-card>
          <!-- 最新文章 -->
          <el-card class="right-container">
            <div class="right-title">
              <Icon icon="icon-park-outline:agreement" color="#e67e23" class="font-16" />
              <span>最新文章</span>
            </div>
            <div class="article-list">
              <div
                v-for="item of article.newestArticleList"
                :key="'newestArticle' + item.id"
                class="article-item"
              >
                <router-link :to="'/article/' + item.id" class="content-cover">
                  <img :src="item.cover" alt="">
                </router-link>
                <div class="content">
                  <div class="content-title ellipsis">
                    <router-link :to="'/article/' + item.id">
                      {{ item.title }}
                    </router-link>
                  </div>
                  <div class="content-time">{{ date(item.createTime) }}</div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>
    <div v-else class="article-loading">
      <el-row class="article-container">
        <el-col :xs="16" :md="24">
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="15" />
          </div>
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="5" />
          </div>
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="10" />
          </div>
        </el-col>
        <el-col :xs="6" :md="24" class="hidden-sm-and-down">
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="7" />
          </div>
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="7" />
          </div>
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="7" />
          </div>
          <div class="mb-4 box-shadow">
            <el-skeleton animated :rows="7" />
          </div>
        </el-col>
      </el-row>
    </div>
    <div v-if="article">
      <el-dialog
        title="加载校验"
        v-model="dialogVisible"
        width="30%"
      >
        <div style="display :flex;justify-content: center;">
          扫码关注公众号「<span style="color: #005cc5">心悦心享</span>」<br>
        </div>
        <div style="display :flex;justify-content: center;">
          回复 「<span style="color: red">验证码</span>」获取验证码
        </div>
        <div style="display :flex;justify-content: center;">
          <img style="width: 50%;height: 50%" :src="article.cover" alt="">
        </div>
        <el-input v-model="code" placeholder="请输入6位数的验证码"
                  style="display :flex;justify-content: center;width: 45%;margin: 0 auto;" />
        <span style="display :flex;justify-content: center;">
          <el-button style="width: 45%;margin-top: 5px" type="primary" @click="checkSecret">提 交</el-button>
        </span>
      </el-dialog>
      <el-dialog v-model="previewImgVisible"
                 @close="closePreviewImg"
                 :show-close="false"
                 width="70vw"
                 style="margin-top: 5vh"
      >
        <el-image :src="previewImgUrl" />
      </el-dialog>
    </div>
  </div>
</template>

<style src="@/assets/css/article.scss" lang="scss" scoped />

<script setup lang="ts">
import '@/assets/css/theme/github.scss'
import '@/assets/css/theme/github-dark.scss'
import '@/assets/css/article-rich.scss'
import '@/assets/css/github-markdown.scss'

import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import Clipboard from 'clipboard'
import tocbot from 'tocbot'
import CommentView from '@/components/comment/CommentView.vue'
import ReplyView from '@/components/comment/ReplyView.vue'
import { useCommonStore } from '@/stores/common'
import { useUserStore } from '@/stores/user'
import articleApi from '@/api/article'
import searchApi from '@/api/search'
import commentApi from '@/api/comment'
import userApi from '@/api/user'
import actionApi from '@/api/action'
import { genderMap } from '@/utils/constant'
import {
  deleteHTMLTag,
  downloadFile,
  genRandomColor,
  highlightCode,
  markdownToHtml,
  transformSize
} from '@/utils/common'
import { checkIsLogin, covertNumberDisplay, copy } from '@/utils/common'
import { date, formatRegisterTime, minute } from '@/utils/date'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { IUserDetail, IArticle, IBaseArticle, IReplyComment, IReply } from '@/interface'
import { EventName } from '@/event-server/event-name'
import { EventServer } from '@/event-server'

const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const articleRef = ref<HTMLElement | null>(null)
const replyRef = ref<InstanceType<typeof ReplyView> | null>(null)
const commentRef = ref<InstanceType<typeof CommentView> | null>(null)
const emptyReplyRef = ref<HTMLElement | null>(null)
const currentReplyComment = ref<IReplyComment>({})
const articleId = ref<string>(route.params.articleId)
const dialogVisible = ref(false)
const code = ref<string | null>(null)
const isCheck = ref(false)
const article = ref<IArticle>(null)
const currentArticleUser = ref<IUserDetail>(null)
const wordNum = ref(0)
const readTime = ref('')
const articleHref = window.location.href
const clipboard = ref<any>(null)
const colors = ref<string[]>([]) // 存储颜色
const isExpanded = ref(true)
const replyShouldFixed = ref(false)
const recommendArticleList = ref<IBaseArticle[]>([])
const previewImgVisible = ref(false)
const previewImgUrl = ref('')

onMounted(() => {
  getArticle()
})

onUnmounted(() => {
  clipboard.value?.destroy()
  tocbot.destroy()
})

const categoryMap = computed(() => {
  return commonStore.categoryMap
})

const tagMap = computed(() => {
  return commonStore.tagMap
})

const user = computed(() => {
  return userStore.user
})

const articleCover = computed(() => {
  return 'background: url(' + article.value?.cover + ') center center / cover no-repeat'
})

const isLike = computed(() => {
  return user.value && user.value.articleLikeSet.indexOf(article.value?.id) !== -1
    ? 'like-btn-active'
    : ''
})

const isCollect = computed(() => {
  return user.value && user.value.articleCollectSet.indexOf(article.value?.id) !== -1
    ? 'collect-btn-active'
    : ''
})

function isFull(id: string | null) {
  return id ? 'post full' : 'post-none'
}

function getArticle() {
  // 查询文章
  articleApi.getArticleInfo(articleId.value).then(res => {
    const articleData = res.data
    document.title = res.data.title
    // if (res.data.keywords != null) {
    //   document && document.querySelector('meta[name="keywords"]')?.setAttribute('content', res.data.keywords)
    // }
    // this.isCheck = res.data.isSecret !== 0
    isCheck.value = false
    // 将markdown转换为Html
    if (res.data.isMarkdown) {
      articleData.content = markdownToHtml(articleData.content)
    }
    article.value = articleData
    // 增加文章访问量
    addArticleViewCount()
    // 获取相关文章
    getRecommendArticleList()
    genTagColors(article.value.tagList.length)
    getArticleUser()
    nextTick(() => {
      if (!articleRef.value) return
      // 渲染代码块
      highlightCode(articleRef.value)
      // 添加图片预览功能
      parseImages()
      // 统计文章字数
      wordNum.value = deleteHTMLTag(article.value.content).length
      // 计算阅读时间
      readTime.value = Math.round(wordNum.value / 400) + '分钟'
      // 添加代码复制功能
      clipboard.value = new Clipboard('.copy-btn')
      clipboard.value.on('success', () => {
        ElMessage({
          message: '复制成功',
          type: 'success',
          plain: true
        })
      })
      // 添加文章生成目录功能
      let nodes: any = articleRef.value?.children
      if (nodes.length) {
        // 兼容csdn部分文章格式
        if (nodes[0].getAttribute('id') === 'article_content') {
          nodes = nodes[0].children[0].children
        }
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          const reg = /^H[1-5]$/
          if (reg.exec(node.tagName)) {
            node.id = i
          }
        }
      }
      tocbot.init({
        tocSelector: '#toc', // 要把目录添加元素位置，支持选择器
        contentSelector: '.article-content', // 获取html的元素
        headingSelector: 'h1, h2, h3, h4, h5', // 要显示的id的目录
        hasInnerContainers: true,
        headingsOffset: 70,
        scrollSmoothOffset: -70,
        onClick: function(e) {
          e.preventDefault()
        }
      })
      // 计算是否显示查看更多按钮
      const needHidden = articleRef.value?.clientHeight > 1200
      if (needHidden) {
        isExpanded.value = false
        articleRef.value.style.maxHeight = '1200px'
        articleRef.value.style.overflowY = 'hidden'
      }
    })
  })
}

function addArticleViewCount() {
  articleApi.addViewCount({
    articleId: article.value.id
  })
}

function parseImages() {
  const images = articleRef.value?.querySelectorAll('img')
  // 替换每个img标签为el-image组件
  images.forEach((img) => {
    img.addEventListener('click', () => {
      previewImgUrl.value = img.src
      previewImgVisible.value = true
    })
  })
}

function closePreviewImg() {
  previewImgVisible.value = false
  previewImgUrl.value = ''
}

function getRecommendArticleList() {
  searchApi.getRecommendArticleList({
    title: article.value.title,
    articleId: article.value.id,
    count: 5
  }).then(res => {
    recommendArticleList.value = res.data.records
  })
}

function expandContent() {
  if (articleRef.value) {
    articleRef.value.style.maxHeight = articleRef.value.scrollHeight + 100 + 'px'
    articleRef.value.style.height = 'auto'
    articleRef.value.style.overflowY = 'auto'
    isExpanded.value = true
  }
}

function followUser() {
  if (!checkIsLogin()) return
  actionApi.addOrUpdate({
    objId: article.value?.userId,
    objType: ObjectTypeEnum.USER,
    actionType: ActionTypeEnum.FOLLOW
  }).then(res => {
    if (!currentArticleUser.value) return
    currentArticleUser.value.isFollowed = res.data
    if (res.data) {
      currentArticleUser.value.fansCount++
    } else {
      currentArticleUser.value.fansCount--
    }
  })
}

function checkSecret() {
  if (code.value == null || code.value.length !== 6) {
    ElMessage({ type: 'error', message: '请输入有效的验证码', plain: true })
    return false
  }
  new Promise(() => {
  }).then(() => {
    isCheck.value = false
    dialogVisible.value = false
    code.value = null
  }).catch(err => {
    ElMessage({ type: 'error', message: err.message, plain: true })
  })
}

function genTagColors(n: number) { // 随机变色
  const colorList = genRandomColor(n)
  for (let i = 0; i < n; i++) {
    colors.value[i] = 'rgb(' + colorList[i] + ')'
  }
}

function getArticleUser() {
  userApi.getUserById(article.value?.userId).then(res => {
    currentArticleUser.value = res.data
  })
}

function like() {
  // 判断登录
  if (!checkIsLogin()) return
  // 发送请求
  actionApi.addOrUpdate({
    objId: article.value.id,
    objType: ObjectTypeEnum.ARTICLE,
    actionType: ActionTypeEnum.LIKE
  }).then(res => {
    // 判断是否点赞
    if (res.data) {
      article.value.likeCount++
      userStore.addUserArticleLike(article.value.id)
    } else {
      article.value.likeCount--
      userStore.reduceUserArticleLike(article.value.id)
    }
  })
}

function collect() {
  // 判断登录
  if (!checkIsLogin()) return
  // 发送请求
  actionApi.addOrUpdate({
    objId: article.value.id,
    objType: ObjectTypeEnum.ARTICLE,
    actionType: ActionTypeEnum.COLLECT
  }).then(res => {
    // 判断是否收藏
    if (res.data) {
      ElMessage({
        message: '收藏成功',
        type: 'success',
        plain: true
      })
      article.value.collectCount++
      userStore.addUserArticleCollect(article.value.id)
    } else {
      article.value.collectCount--
      userStore.reduceUserArticleCollect(article.value.id)
    }
  })
}

function previewImg(img: string) {
  // imagePreview({
  //   images: imgList.value,
  //   index: imgList.value.indexOf(img)
  // })
}

function toUserCenter() {
  router.push('/user/' + currentArticleUser.value.id)
}

function toCommentList() {
  commentRef.value?.$el.scrollIntoView({ behavior: 'smooth' })
}

function replyArticle(val: IReply) {
  const { replyUserId, parentId, firstLevelId, index, replyUser } = currentReplyComment.value
  const comment = {
    objId: article.value.id,
    objType: ObjectTypeEnum.ARTICLE,
    content: val.content,
    replyUserId: replyUserId || 0,
    parentId: parentId || 0,
    firstLevelId: firstLevelId || 0
  }
  commentApi.save(comment).then(res => {
    ElMessage({
      message: '评论成功',
      type: 'success',
      plain: true
    })
    article.value.commentCount++
    const add = res.data
    add.user = Object.assign({}, user.value)
    add.index = index
    add.replyUser = replyUser
    replyRef.value?.reset()
    commentRef.value?.reloadComment(add)
    currentReplyComment.value = {}
  }).finally(() => {
    replyRef.value?.enableBtn()
  })
}

function replyComment(val: any) {
  if (!replyRef.value || !emptyReplyRef.value) return
  currentReplyComment.value = val
  const width = replyRef.value.$el.offsetWidth
  const height = replyRef.value.$el.offsetHeight
  replyShouldFixed.value = true
  replyRef.value.$el.style.width = width + 'px'
  emptyReplyRef.value.style.height = height + 'px'
  nextTick(() => {
    replyRef.value?.setReplyComment({ replyComment: val })
  })
}

function cancelReply() {
  currentReplyComment.value = {}
  replyShouldFixed.value = false
}

function chat() {
  eventServer.emit(EventName.START_CHAT_WITH_USER, article.value?.userId)
}

</script>