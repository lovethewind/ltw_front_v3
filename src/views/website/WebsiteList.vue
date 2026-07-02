<template>
  <!-- 链接列表 -->
  <main class="website-page">
    <section class="website-hero">
      <div>
        <div class="website-eyebrow">Website Navigation</div>
        <h1>网站导航</h1>
        <p>收藏常用工具、灵感站点和好玩的角落，也欢迎你把私藏网站投递进来。</p>
      </div>
      <el-button type="primary" class="hero-action" @click="openSubmitDialog()">
        <Icon icon="mage:plus" />
        投稿网站
      </el-button>
    </section>

    <section class="website-toolbar">
      <el-input
        v-model="searchKeyword"
        clearable
        class="website-search"
        placeholder="搜索站名、简介或网址"
      >
        <template #prefix>
          <Icon icon="mage:search" />
        </template>
      </el-input>
      <span class="website-total">{{ websiteCountText }}</span>
    </section>

    <section class="category-filter" aria-label="网站分类筛选">
      <button
        type="button"
        :class="['category-filter-item', activeCategoryId === null ? 'active' : '']"
        @click="activeCategoryId = null"
      >
        全部
      </button>
      <button
        v-for="row of websiteList"
        :key="row.id || row.name || 'category-filter'"
        type="button"
        :class="['category-filter-item', activeCategoryId === row.id ? 'active' : '']"
        @click="activeCategoryId = row.id || null"
      >
        <span>{{ row.name }}</span>
        <span>{{ getWebsiteCategoryCount(row) }}</span>
      </button>
    </section>

    <section class="content-container">
      <div v-for="row of displayWebsiteList" :key="row.id || row.name || 'website-category'" class="website-section">
        <div class="website-title">
          <div>
            <span class="title-mark"></span>
            <span>{{ row.name }}</span>
            <span class="website-count">{{ getWebsiteCategoryCount(row) }}</span>
          </div>
          <el-tooltip content="向该分类投稿网站" placement="top" effect="light">
            <button class="submit-category-btn" type="button" @click="openSubmitDialog(row.id)">
              <Icon icon="mage:plus" />
            </button>
          </el-tooltip>
        </div>

        <div class="link-container">
          <article
            v-for="item of row.websiteList"
            :key="item.id || item.url || item.name || 'website-item'"
            class="link-wrapper cursor-pointer"
            @click="openVisitDialog(item, row)"
          >
            <div class="website-card-content">
              <el-avatar :src="item.cover" shape="square" :size="56" class="website-avatar">
                {{ item.name?.slice(0, 1) }}
              </el-avatar>
              <div class="title-desc">
                <div class="link-card-head">
                  <div class="link-name ellipsis">{{ item.name }}</div>
                  <Icon icon="mage:external-link" class="external-icon" />
                </div>
                <div class="link-intro ellipsis-2l">{{ item.introduce }}</div>
                <div class="link-meta">
                  <span class="link-host ellipsis">{{ getWebsiteHost(item.url) }}</span>
                  <span class="link-action">点击访问</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
      <div v-if="displayWebsiteList.length === 0" class="website-empty">
        <Icon icon="mage:search" class="empty-icon" />
        <h3>没找到相关站点</h3>
        <p>换个关键词试试，或者把你知道的好网站投递进来。</p>
        <el-button type="primary" @click="openSubmitDialog(activeCategoryId)">
          <Icon icon="mage:plus" />
          投稿补充
        </el-button>
      </div>
    </section>

    <!-- 说明 -->
    <div>
      <el-dialog
        v-model="visitDialogVisible"
        class="visit-dialog"
        width="520px"
        top="12vh"
        title="网站详情"
        center
      >
        <div v-if="selectedWebsite" class="visit-preview">
          <div class="visit-header">
            <el-avatar :src="selectedWebsite.cover || undefined" shape="square" :size="64" class="visit-avatar">
              {{ getWebsiteDisplayName(selectedWebsite).slice(0, 1) }}
            </el-avatar>
            <div class="visit-title-wrap">
              <h3>{{ getWebsiteDisplayName(selectedWebsite) }}</h3>
              <div class="visit-host">{{ getWebsiteHost(selectedWebsite.url) }}</div>
            </div>
          </div>
          <div class="visit-info">
            <div class="visit-info-item">
              <span>分类</span>
              <strong>{{ selectedWebsiteCategory?.name || '未分类' }}</strong>
            </div>
            <div class="visit-info-item">
              <span>网址</span>
              <strong class="visit-url">{{ selectedWebsite.url || '暂无网址' }}</strong>
            </div>
          </div>
          <div class="visit-description">
            <span>简介</span>
            <p>{{ selectedWebsite.introduce || '这个网站还没有简介。' }}</p>
          </div>
          <div class="visit-warning">
            <Icon icon="mage:alert-circle" />
            即将打开外部网站，请注意甄别链接内容。
          </div>
        </div>
        <template #footer>
          <el-button type="primary" :disabled="!selectedWebsite?.url" @click="confirmVisitWebsite">
            <Icon icon="mage:external-link" />
            打开网站
          </el-button>
        </template>
      </el-dialog>

      <AppFormDialog
        v-model="dialogFormVisible"
        class="website-dialog"
        width="560px"
        center
        title="投稿网站"
        :close-on-click-modal="false"
        hero-icon="mage:plus"
        hero-title="推荐一个值得收藏的网站"
        hero-description="填好基础信息后会进入审核，审核通过后将通过通知告知。"
        tip="已经申请过的或正在审核的网站无法重复申请。"
        @close="closeModal()"
      >
        <el-form ref="postFormRef" :rules="rules" :model="postForm" label-width="92" class="app-dialog-form">
          <el-form-item label="网站分类" prop="categoryId">
            <el-select v-model="postForm.categoryId" placeholder="请选择网站分类" class="website-category-select">
              <el-option
                v-for="row of websiteList"
                :key="row.id || row.name || 'category-option'"
                :label="row.name || '未命名分类'"
                :value="row.id || ''"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="网站名称" prop="name">
            <el-input v-model="postForm.name" placeholder="请输入网站名称" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站图标" prop="cover">
            <el-input v-model="postForm.cover" placeholder="这里贴上网站的图标链接" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站地址" prop="url">
            <el-input v-model.trim="postForm.url" placeholder="请输入网站地址，以http://或https://开头"
                      autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站简介" prop="introduce">
            <el-input v-model="postForm.introduce" type="textarea" placeholder="可复制原网站介绍"
                      :autosize="{minRows: 6}" autocomplete="off" />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="app-dialog-footer">
            <el-button @click="closeModal()">取 消</el-button>
            <el-button type="primary" :loading="btnDisabled" @click="submit">
              提交申请
            </el-button>
          </div>
        </template>
      </AppFormDialog>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import websiteApi from '@/api/website'
import { checkIsLogin } from '@/utils/common'
import { ElMessage, type FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import AppFormDialog from '@/components/base/AppFormDialog.vue'
import {
  filterWebsiteCategories,
  filterWebsiteCategoriesByCategory,
  getWebsiteCategoryCount,
  getWebsiteDisplayCount,
  getWebsiteDisplayName,
  getWebsiteHost,
  type WebsiteItem,
  type WebsiteCategory
} from './website-list-utils'

interface WebsitePostForm {
  url: string | null
  name: string | null
  cover: string | null
  introduce: string | null
  categoryId: string | number | null
}

const baseInfo: WebsitePostForm = {
  url: null,
  name: null,
  cover: null,
  introduce: null,
  categoryId: ''
}

const postFormRef = ref<FormInstance | null>(null)
const websiteList = ref<WebsiteCategory[]>([])
const searchKeyword = ref('')
const activeCategoryId = ref<string | number | null>(null)
const dialogFormVisible = ref(false)
const visitDialogVisible = ref(false)
const btnDisabled = ref(false)
const postForm = ref<WebsitePostForm>(Object.assign({}, baseInfo))
const selectedWebsite = ref<WebsiteItem | null>(null)
const selectedWebsiteCategory = ref<WebsiteCategory | null>(null)
const rules = {
  'name': [{ required: true, message: '网站名称不能为空', trigger: 'blur' },
    { max: 100, message: '网站名称不能超过100个字符', trigger: 'blur' }
  ],
  'introduce': [{ required: true, message: '简单介绍一下该网站吧', trigger: 'blur' }],
  'url': [
    { required: true, message: '网站地址不能为空', trigger: 'blur' },
    {
      pattern: /^((https|http|ftp|rtsp|mms)?(:\/\/)?)(www\.)?(([A-Za-z0-9-]+)\.)+([A-Za-z0-9])+([A-Za-z0-9-~.\/])+$/,
      message: '请填写正确的网址'
    }
  ],
  'cover': [{ required: true, message: '网站图标url不能为空', trigger: 'blur' }],
  'categoryId': [{ required: true, message: '请选择网站分类', trigger: 'change' }]
}

fetchData()

const categoryWebsiteList = computed(() => {
  return filterWebsiteCategoriesByCategory(websiteList.value, activeCategoryId.value)
})
const displayWebsiteList = computed(() => filterWebsiteCategories(categoryWebsiteList.value, searchKeyword.value))
const totalWebsiteCount = computed(() => getWebsiteDisplayCount(websiteList.value))
const displayWebsiteCount = computed(() => getWebsiteDisplayCount(displayWebsiteList.value))
const websiteCountText = computed(() => {
  if (searchKeyword.value.trim()) {
    return `找到 ${displayWebsiteCount.value} 个站点`
  }
  if (activeCategoryId.value !== null) {
    return `当前分类 ${displayWebsiteCount.value} 个站点`
  }
  return `共 ${totalWebsiteCount.value} 个站点`
})

function fetchData() {
  websiteApi.getList().then(res => {
    websiteList.value = res.data
  })
}

function openSubmitDialog(val?: string | number | null) {
  if (!checkIsLogin()) return
  postForm.value.categoryId = val || null
  dialogFormVisible.value = true
}

function openVisitDialog(item: WebsiteItem, category: WebsiteCategory) {
  selectedWebsite.value = item
  selectedWebsiteCategory.value = category
  visitDialogVisible.value = true
}

function confirmVisitWebsite() {
  if (!selectedWebsite.value?.url) return
  window.open(selectedWebsite.value.url)
  visitDialogVisible.value = false
}

function submit() {
  btnDisabled.value = true
  postFormRef.value?.validate((valid) => {
    if (valid) {
      websiteApi.save(postForm.value).then(() => {
        ElMessage({
          message: '申请成功,通过申请后将通过通知告知您',
          type: 'success',
          plain: true
        })
        dialogFormVisible.value = false
      }).finally(() => {
        btnDisabled.value = false
      })
    } else {
      btnDisabled.value = false
      ElMessage({
        message: '填写信息不正确，请确认',
        type: 'error',
        plain: true
      })
    }
  })
}

function closeModal() {
  postForm.value = Object.assign({}, baseInfo)
  postFormRef.value?.resetFields()
  btnDisabled.value = false
  dialogFormVisible.value = false
}
</script>

<style lang="scss" scoped>
.website-page {
  width: min(1120px, 92vw);
  margin: 24px auto 40px;
  animation: main 0.8s;
}

.website-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  h1 {
    margin: 4px 0 8px;
    color: #20242a;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
  }

  p {
    max-width: 620px;
    margin: 0;
    color: #667085;
    font-size: 14px;
    line-height: 1.7;
  }
}

.website-eyebrow {
  color: #2c7a7b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.hero-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 108px;
}

.website-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.website-search {
  max-width: 380px;

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #d7dde8 inset;
  }
}

.website-category-select {
  width: 100%;
}

.website-total {
  color: #667085;
  font-size: 13px;
  white-space: nowrap;
}

.category-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.category-filter-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d7dde8;
  border-radius: 999px;
  background: #fff;
  color: #536471;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s, background 0.2s;

  span + span {
    color: #8a94a6;
    font-size: 12px;
  }

  &:hover,
  &.active {
    border-color: #2c7a7b;
    background: #edf7f5;
    color: #2c7a7b;
  }
}

.content-container {
  padding: 22px;
  min-height: 70vh;
  border: 1px solid #e7ebf2;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 34px rgba(31, 45, 61, 0.08);
}

.website-section + .website-section {
  margin-top: 26px;
}

.website-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #20242a;
  font-size: 18px;
  font-weight: 700;

  > div {
    display: inline-flex;
    align-items: center;
    min-width: 0;
  }
}

.title-mark {
  width: 4px;
  height: 18px;
  margin-right: 10px;
  border-radius: 999px;
  background: #2c7a7b;
}

.website-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  margin-left: 8px;
  padding: 0 8px;
  border-radius: 999px;
  background: #edf7f5;
  color: #2c7a7b;
  font-size: 12px;
  font-weight: 700;
}

.submit-category-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #d7dde8;
  border-radius: 8px;
  background: #fff;
  color: #536471;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;

  &:hover {
    border-color: #2c7a7b;
    background: #f1faf8;
    color: #2c7a7b;
  }
}

.link-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.link-wrapper {
  position: relative;
  min-width: 0;
  min-height: 116px;
  padding: 16px;
  border: 1px solid #e6eaf0;
  border-radius: 8px;
  background: #fff;
  color: #20242a;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-2px);
    border-color: #81b29a;
    box-shadow: 0 12px 26px rgba(44, 122, 123, 0.14);
  }
}

.website-card-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.website-avatar {
  flex: 0 0 auto;
  border: 1px solid #edf0f5;
  background: #f3f6fa;
  color: #667085;
  font-weight: 700;
  transition: transform 0.2s;
}

.link-wrapper:hover .website-avatar {
  transform: scale(1.03);
}

.link-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 7px;
}

.link-name {
  flex: 1;
  min-width: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.external-icon {
  flex: 0 0 auto;
  color: #98a2b3;
  font-size: 15px;
  opacity: 0;
  transition: color 0.2s, opacity 0.2s, transform 0.2s;
}

.link-wrapper:hover .external-icon {
  color: #2c7a7b;
  opacity: 1;
  transform: translate(1px, -1px);
}

.link-intro {
  font-size: 12px;
  color: #667085;
  width: 100%;
  line-height: 1.55;
}

.link-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-top: 10px;
  color: #8a94a6;
  font-size: 12px;
}

.link-host {
  min-width: 0;
}

.link-action {
  flex: 0 0 auto;
  color: #2c7a7b;
  font-weight: 700;
  opacity: 0;
  transition: opacity 0.2s;
}

.link-wrapper:hover .link-action {
  opacity: 1;
}

.title-desc {
  position: relative;
  flex: 1;
  min-width: 0;
}

.website-empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 320px;
  text-align: center;

  h3 {
    margin: 12px 0 8px;
    color: #20242a;
    font-size: 20px;
    font-weight: 700;
  }

  p {
    margin: 0 0 18px;
    color: #667085;
    font-size: 14px;
  }

  .el-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.empty-icon {
  color: #2c7a7b;
  font-size: 34px;
}

.visit-preview {
  color: #20242a;
}

.visit-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.visit-avatar {
  flex: 0 0 auto;
  border: 1px solid #edf0f5;
  background: #f3f6fa;
  color: #667085;
  font-weight: 700;
}

.visit-title-wrap {
  min-width: 0;

  h3 {
    margin: 0 0 6px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.35;
  }
}

.visit-host {
  color: #667085;
  font-size: 13px;
  word-break: break-all;
}

.visit-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.visit-info-item,
.visit-description {
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafcff;

  span {
    display: block;
    margin-bottom: 6px;
    color: #8a94a6;
    font-size: 12px;
  }

  strong {
    color: #20242a;
    font-size: 14px;
    font-weight: 600;
  }
}

.visit-url {
  display: block;
  word-break: break-all;
}

.visit-description {
  p {
    max-height: 180px;
    margin: 0;
    overflow-y: auto;
    color: #344054;
    font-size: 14px;
    line-height: 1.75;
    white-space: pre-wrap;
  }
}

.visit-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0;
  color: #d92d20;
  font-size: 13px;
  line-height: 1.5;
}

:global(.visit-dialog .el-dialog__footer) {
  padding-top: 0;
  text-align: center;
}

:global(.visit-dialog .el-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
}

.tip-div {
  border-top: 1px dashed orange;
  padding-top: 10px;
  margin: 20px 0 0 0;
}

html.dark {
  .website-hero {
    h1 {
      color: #f5f7fb;
    }

    p {
      color: #b9c0cc;
    }
  }

  .content-container,
  .visit-info-item,
  .visit-description,
  .link-wrapper,
  .category-filter-item,
  .submit-category-btn {
    border-color: #343941;
    background: #1f2329;
  }

  .website-title,
  .website-empty h3,
  .visit-preview,
  .visit-title-wrap h3,
  .visit-info-item strong,
  .link-name {
    color: #f5f7fb;
  }

  .website-total,
  .website-empty p,
  .visit-host,
  .visit-description p,
  .link-meta,
  .link-intro {
    color: #b9c0cc;
  }

  .category-filter-item {
    color: #b9c0cc;

    &:hover,
    &.active {
      border-color: #5aa4a5;
      background: #203637;
      color: #75c6c7;
    }
  }

  .external-icon {
    color: #8e98a8;
  }

  .link-wrapper {
    &:hover {
      border-color: #5aa4a5;
      box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
    }
  }
}

@media (max-width: 759px) {
  .website-page {
    width: calc(100vw - 20px);
    margin: 16px auto 28px;
  }

  .website-hero {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;

    h1 {
      font-size: 28px;
    }
  }

  .hero-action {
    width: 100%;
  }

  .website-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .website-search {
    max-width: none;
  }

  .content-container {
    padding: 16px;
  }

  .link-container {
    grid-template-columns: 1fr;
  }

  .link-wrapper {
    padding: 14px;
  }

  .website-card-content {
    gap: 10px;
  }

  .link-name {
    font-size: 15px;
  }

  .external-icon,
  .link-action {
    opacity: 1;
  }

  .website-avatar {
    --el-avatar-size: 52px;
  }

  :global(.visit-dialog) {
    margin-top: 3vh !important;
    max-height: 94vh;
    overflow-y: auto;
    width: calc(100vw - 32px) !important;
  }
}
</style>
