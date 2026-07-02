<template>
  <el-form
    ref="formRef"
    :model="postForm"
    :rules="rules"
    class="article-edit-page"
    label-position="top"
  >
    <div class="article-edit-shell">
      <main class="article-main-column">
        <el-form-item prop="title" class="article-title-item">
          <el-input v-model="postForm.title" :placeholder="tips" class="article-title-input" />
        </el-form-item>

        <div class="article-editor">
          <md-editor
            v-if="postForm.isMarkdown"
            ref="editorRef"
            :toolbar-exclude="articleMarkdownToolbarExclude"
            @change="contentChange"
            class="article-md-editor"
          />
          <rich-editor
            v-else
            ref="richEditorRef"
            @change="contentChange"
            class="article-rich-editor"
          />
        </div>
      </main>

      <aside class="article-side-panel">
        <section class="article-setting-section">
          <div class="article-setting-title">
            <Icon icon="material-symbols:tune-rounded" />
            发布设置
          </div>
          <el-form-item label="分类" prop="categoryId" class="article-category-item">
            <el-select v-model="postForm.categoryId" filterable placeholder="选择分类">
              <el-option v-for="item in categoryList" :key="item.id" :value="item.id" :label="item.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="文章类型" prop="isOriginal" class="article-original-item">
            <el-switch v-model="postForm.isOriginal" active-text="原创" inactive-text="转载" />
          </el-form-item>
          <el-form-item
            v-if="!postForm.isOriginal"
            :required="!postForm.isOriginal"
            label="原文链接"
            prop="originalUrl"
            class="article-original-url-item"
          >
            <el-input v-model="postForm.originalUrl" placeholder="粘贴原文链接" />
          </el-form-item>
        </section>

        <section class="article-setting-section">
          <div class="article-setting-title">
            <Icon icon="material-symbols:image-outline" />
            封面
          </div>
          <el-form-item prop="cover" class="article-cover-item">
            <el-upload
              v-if="!CoverPreviewUrl"
              class="avatar-uploader"
              action=""
              accept="image/*"
              :show-file-list="false"
              :before-upload="beforeCoverUpload"
            >
              <template #trigger>
                <el-tooltip v-if="postForm.cover" placement="top" effect="light" content="点击更改封面">
                  <el-image class="cover-preview" :src="postForm.cover" />
                </el-tooltip>
                <button v-else class="cover-empty" type="button">
                  <Icon icon="material-symbols:add-photo-alternate-outline" />
                  <span>选择封面</span>
                  <span class="cover-empty-tip">未选择封面后台会自动创建一个封面</span>
                </button>
              </template>
            </el-upload>
            <div v-if="CoverPreviewUrl" class="avatar-uploader">
              <el-image :src="CoverPreviewUrl" class="cover-preview" />
              <a class="cover-remove" @click="handleCoverRemove">取消更换</a>
            </div>
          </el-form-item>
        </section>

        <section class="article-setting-section">
          <div class="article-setting-title">
            <Icon icon="material-symbols:label-outline" />
            标签
          </div>
          <el-form-item prop="tagList" class="article-tag-item">
            <div class="article-tag-list">
              <el-tag
                v-for="tagId in postForm.tagList"
                :key="tagId +'_select'"
                closable
                size="small"
                effect="light"
                type="success"
                :disable-transitions="false"
                @close="handleCloseTag(tagId)"
              >
                {{ tagMap[tagId].name }}
              </el-tag>
              <el-popover
                v-model:visible="isTagPopoverVisible"
                placement="left"
                width="450"
                trigger="click"
                popper-class="article-tag-popover"
                :fallback-placements="['top', 'bottom', 'right']"
              >
                <div class="article-tag-picker">
                  <div class="article-tag-picker__header">
                    <div class="article-tag-picker__icon">
                      <Icon icon="material-symbols:label-outline" />
                    </div>
                    <div class="article-tag-picker__heading">
                      <strong>选择文章标签</strong>
                      <span>搜索或按分类快速选择</span>
                    </div>
                    <span class="article-tag-picker__count">{{ postForm.tagList.length }}/5</span>
                  </div>
                  <el-autocomplete
                    v-model="searchTagKeyword"
                    value-key="name"
                    :fetch-suggestions="searchTag"
                    :trigger-on-focus="false"
                    :teleported="false"
                    placeholder="搜索标签名称"
                    class="article-tag-picker__search"
                    @select="handleSelectTag"
                  >
                    <template #prefix>
                      <Icon icon="material-symbols:search-rounded" />
                    </template>
                    <template #default="{ item }">
                      <span class="name">{{ item.name }}</span>
                    </template>
                  </el-autocomplete>
                  <button
                    v-if="canCreateCustomTag"
                    class="article-tag-picker__create"
                    type="button"
                    :disabled="customTagCreating || postForm.tagList.length >= 5"
                    @click="createCustomTag"
                  >
                    <span class="article-tag-picker__create-icon">
                      <Icon icon="material-symbols:add-rounded" />
                    </span>
                    <span class="article-tag-picker__create-content">
                      <strong>创建"{{ customTagName }}"</strong>
                      <small>创建为未分组标签，并立即添加到文章</small>
                    </span>
                    <Icon
                      :icon="customTagCreating ? 'material-symbols:progress-activity' : 'material-symbols:arrow-forward-rounded'"
                      :class="{ 'is-loading': customTagCreating }"
                    />
                  </button>
                  <div v-else-if="customTagName.length > 20" class="article-tag-picker__create-tip is-error">
                    <Icon icon="material-symbols:error-outline-rounded" />
                    标签名称不能超过 20 个字符
                  </div>
                  <el-tabs
                    v-model="tabActiveName"
                    tab-position="left"
                    :stretch="true"
                    class="article-tag-picker__tabs"
                  >
                    <el-tab-pane v-for="(tags, index) in tagList" :key="tags.id" :label="tags.name" :name="'tag_' + index">
                      <div class="article-tag-picker__options">
                        <el-tag
                          v-for="tag in tags.children"
                          :key="tag.id"
                          size="small"
                          :disable-transitions="false"
                          effect="light"
                          :type="postForm.tagList.includes(tag.id) ? 'info' : 'success'"
                          :class="['article-tag-option', { 'is-selected': postForm.tagList.includes(tag.id) }]"
                          @click="handleAddTag(tag)"
                        >
                          <Icon v-if="postForm.tagList.includes(tag.id)" icon="material-symbols:check-rounded" />
                          {{ tag.name }}
                        </el-tag>
                      </div>
                    </el-tab-pane>
                  </el-tabs>
                  <div class="article-tag-picker__tip">
                    <Icon icon="material-symbols:info-outline-rounded" />
                    再次点击已选标签即可取消选择
                  </div>
                </div>
                <template #reference>
                  <el-button type="primary" plain size="small">
                    <Icon icon="material-symbols:add-rounded" />
                    添加标签
                  </el-button>
                </template>
              </el-popover>
              <span class="article-tag-tip">最多选择5个标签</span>
            </div>
          </el-form-item>
        </section>

        <section class="article-setting-section">
          <div class="article-setting-title">
            <Icon icon="material-symbols:attach-file" />
            附件
          </div>
          <el-form-item class="article-attach-item">
            <div class="article-attach-header">
              <el-button type="primary" plain size="small" @click="isShowAttachment = true">
                <Icon icon="material-symbols:add-rounded" />
                添加附件
              </el-button>
              <span v-if="postForm.attachList.length" class="article-attach-count">
                {{ postForm.attachList.length }} 个
              </span>
            </div>
            <div class="attachment-list">
              <div v-for="attach in postForm.attachList" :key="attach.uid" class="attachment-list__item">
                <a :href="attach.url" target="_blank" class="attachment-list__file-icon">
                  <Icon icon="material-symbols:draft-outline-rounded" />
                </a>
                <a :href="attach.url" target="_blank" class="attachment-list__content">
                  <span class="attachment-list__name">{{ attach.name }}</span>
                  <span class="attachment-list__size">{{ transformSize(attach.size) }}</span>
                </a>
                <button class="attachment-list__delete" type="button" @click="deleteAttach(attach)">
                  <Icon icon="material-symbols:delete-outline" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          </el-form-item>
        </section>

        <section class="article-setting-section article-publish-section">
          <div class="article-publish-meta">
            <span class="article-word-count">共 {{ count }} 字</span>
            <el-switch
              v-if="isAddArticle"
              v-model="postForm.isMarkdown"
              active-text="使用markdown"
              class="article-markdown-switch"
              @change="changeEditor"
            />
          </div>
          <div class="article-footer-actions">
            <el-button type="primary" :size="isMobile() ? 'small' : 'default'" :disabled="submitDisabled"
                       @click="saveOrUpdate(1)">保存草稿
            </el-button>
            <el-button type="success" :size="isMobile() ? 'small' : 'default'" :disabled="submitDisabled"
                       @click="saveOrUpdate(2)">发布
            </el-button>
          </div>
        </section>
      </aside>
    </div>
  </el-form>
  <!-- 上传附件 -->
  <el-dialog
    v-model="isShowAttachment"
    class="attachment-dialog app-form-dialog"
    width="560px"
    align-center
    :show-close="false"
  >
    <template #header>
      <div class="attachment-dialog__hero">
        <div class="attachment-dialog__icon">
          <Icon icon="material-symbols:attach-file" />
        </div>
        <div>
          <h2>上传附件</h2>
          <p>支持一次选择多个文件，最多 5 个</p>
        </div>
      </div>
    </template>
    <div class="attachment-dialog__content">
      <el-upload
        action=""
        accept="*"
        class="attach-upload"
        drag
        multiple
        :on-remove="removeAttachment"
        :on-change="beforeAttachmentUpload"
        :file-list="attachList"
        :auto-upload="false"
      >
        <div class="attach-upload__icon">
          <Icon icon="material-symbols:upload-rounded" />
        </div>
        <div class="el-upload__text">将文件拖到这里，或<em>点击选择文件</em></div>
        <div class="el-upload__tip">单个附件最大 1GB</div>
      </el-upload>
      <div class="attachment-dialog__hint">
        <Icon icon="material-symbols:shield-outline-rounded" />
        上传过程中请保持页面开启，完成后附件会自动加入文章
      </div>
    </div>
    <template #footer>
      <div class="attachment-dialog__footer app-dialog-footer">
        <el-button @click="cancelAttachmentUpload">取消</el-button>
        <el-button type="primary" :loading="uploadLoading" @click="uploadAttachment">
          <Icon icon="material-symbols:cloud-upload-outline-rounded" />
          确定并上传
        </el-button>
      </div>
    </template>
  </el-dialog>
  <!-- 悬浮显示正在上传的文件 -->
  <div v-if="attachList.length > 0 && !isShowAttachment" class="attachment-uploading">
    <div class="attachment-uploading__header">
      <div>
        <strong>正在上传附件</strong>
        <span>{{ attachList.length }} 个文件</span>
      </div>
      <Icon icon="material-symbols:cloud-upload-outline-rounded" />
    </div>
    <div class="attachment-uploading__list">
      <div v-for="attach in attachList" :key="attach.uid" class="attachment-uploading__item">
        <div class="attachment-uploading__file-icon">
          <Icon icon="material-symbols:draft-outline-rounded" />
        </div>
        <div class="attachment-uploading__body">
          <div class="attachment-uploading__meta">
            <el-tooltip :content="`${attach.name}(${transformSize(attach.size)})`" placement="top" effect="light">
              <span class="attachment-uploading__name">{{ attach.name }}</span>
            </el-tooltip>
            <span class="attachment-uploading__size">{{ transformSize(attach.size) }}</span>
          </div>
          <div class="attachment-uploading__progress">
            <el-progress
              :percentage="attach.progress"
              :color="customColors"
              :show-text="false"
            />
            <span>{{ attach.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="@/assets/css/article-edit.scss" lang="scss" scoped />

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import articleApi from '@/api/article'
import tagApi from '@/api/tag'
import ossApi from '@/api/oss-api'
import {
  checkFileSize,
  compressImageFile,
  getBase64,
  getThumbFileName,
  getObjKeyCount,
  isEqual,
  isMobile,
  removeSameValues,
  transformSize, uuid
} from '@/utils/common'
import { uploadFile } from '@/utils/oss-upload'
import MdEditor from '@/components/editor/MdEditor.vue'
import RichEditor from '@/components/editor/RichEditor.vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { ArticleStatusEnum, FileUploadStatusEnum, UploadFileTypeEnum } from '@/enums'
import { Icon } from '@iconify/vue'
import type { ITag } from '@/interface'

const route = useRoute()
const router = useRouter()
const commonStore = useCommonStore()
const formRef = ref<FormInstance | null>(null)
const editorRef = ref<InstanceType<typeof MdEditor> | null>(null)
const richEditorRef = ref<InstanceType<typeof RichEditor> | null>(null)

const baseInfo: { [key: string]: any } = {
  id: null,
  tempId: 'add_new',
  userId: null,
  title: '',
  cover: '',
  coverThumb: '',
  categoryId: null,
  tagList: [],
  attachList: [],
  content: '',
  isMarkdown: false,
  isOriginal: true,
  originalUrl: '',
  status: ArticleStatusEnum.DRAFT,
  user: null
}

const validateOriginalUrl = (rule: any, value: any, callback: any, postData: any) => {
  if (!postData.isOriginal && (!value || value.trim().length === 0)) {
    callback(new Error('不是原创文章请填写原文链接哈~'))
  } else {
    callback()
  }
}

const postForm = ref<any>(Object.assign({}, baseInfo))
const count = ref<number | undefined>(0)
const currentRow = ref<any>(null)
const CoverPreviewUrl = ref<string | null>(null)
const oldCover = ref('')
const tabActiveName = ref('tag_0')
const searchTagKeyword = ref('')
const isTagPopoverVisible = ref(false)
const customTagCreating = ref(false)
const isSuccess = ref(false)
const submitDisabled = ref(false)
const tips = ref('🍀 在这里填写标题，想写点什么呢~')
const cacheTimer = ref<any>(null)
const isShowAttachment = ref(false)
const uploadLoading = ref(false)
const attachList = ref<any[]>([])
const articleMarkdownToolbarExclude = [
  'save',
  'github',
  'fullscreen',
  'pageFullscreen'
]
const customColors = ref([
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 40 },
  { color: '#6f7ad3', percentage: 60 },
  { color: '#1989fa', percentage: 80 },
  { color: '#5cb87a', percentage: 100 }
])
const rules = ref({
  title: [
    { required: true, message: '标题不能为空', trigger: 'blur' },
    { min: 3, max: 100, message: '标题长度应在3-100个字符之间', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择一个分类吧~', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '内容不能为空', trigger: 'blur' },
    { min: 5, message: '内容长度不能小于5个字符', trigger: 'blur' }
  ],
  originalUrl: [
    {
      validator: (rule: any, value: any, callback: any) => validateOriginalUrl(rule, value, callback, postForm.value),
      trigger: 'blur'
    }
  ]
})

const categoryList = computed(() => {
  return commonStore.categoryList
})

const tagList = computed(() => {
  const groups = [...commonStore.tagList]
  const customTags = commonStore.choiceTagList.filter((item: any) => item.level === 2 && !item.parentId)
  if (customTags.length > 0) {
    groups.push({
      id: 'custom',
      name: '自定义',
      children: customTags
    })
  }
  return groups
})
const customTagName = computed<string>(() => searchTagKeyword.value.trim().replace(/\s+/g, ' '))
const canCreateCustomTag = computed<boolean>(() => {
  if (!customTagName.value || customTagName.value.length > 20) return false
  return !commonStore.choiceTagList.some((item: any) => {
    return item.name.trim().toLowerCase() === customTagName.value.toLowerCase()
  })
})
const tagMap = computed(() => {
  return commonStore.tagMap
})
const isAddArticle = computed(() => {
  return !route.params.articleId
})

onMounted(async () => {
  commonStore.setShowFooter(false)
  document.body.classList.add('article-editing-page')
  window.onbeforeunload = () => {
    return '关闭提示'
  }
  const articleId = route.params.articleId as string | undefined
  postForm.value.tempId = articleId || 'add_new'
  let cacheArticle: any = window.sessionStorage.getItem('articleContentCache_' + postForm.value.tempId)
  if (cacheArticle) {
    cacheArticle = JSON.parse(cacheArticle)
  }
  if (articleId) {
    await articleApi.getArticleEditInfo(articleId).then(res => {
      postForm.value = Object.assign(postForm.value, res.data)
      postForm.value.attachList = postForm.value.attachList || []
      currentRow.value = JSON.parse(JSON.stringify(res.data))
      setContent()
    })
  }
  if (contentChanged(postForm.value, cacheArticle)) {
    ElMessageBox.confirm('检测到您上次编辑的内容还未保存，是否恢复？', {
      confirmButtonText: '确定恢复',
      cancelButtonText: '不用了',
      showClose: false,
      type: 'warning'
    }).then(() => {
      postForm.value = Object.assign(postForm.value, cacheArticle)
      setContent()
    }).catch(() => {
      clearCacheContent()
    })
  }
  setContentLength()
  cacheTimer.value = setInterval(() => {
    cacheContent()
  }, 1500)
})

onUnmounted(() => {
  commonStore.setShowFooter(true)
  document.body.classList.remove('article-editing-page')
  window.onbeforeunload = null
  cacheTimer.value && clearInterval(cacheTimer.value)
})

onBeforeRouteLeave((to, from, next) => {
  if (!isSuccess.value && (postForm.value.title || postForm.value.content.trim() || postForm.value.attachList.length > 0)) {
    ElMessageBox.confirm('当前页面内容还尚未保存，是否离开？', {
      confirmButtonText: '确定离开',
      cancelButtonText: '我再想想',
      showClose: false,
      type: 'warning'
    }).then(() => {
      clearCacheContent()
      next()
    }).catch(() => {
    })
  } else {
    next()
  }
})

function contentChange(data: string) {
  postForm.value.content = data
  setContentLength()
}

function setContent() {
  nextTick(() => {
    if (postForm.value.isMarkdown) {
      editorRef.value?.setContent(postForm.value.content)
    } else {
      richEditorRef.value?.setContent(postForm.value.content)
    }
  })
}

function setContentLength() {
  nextTick(() => {
    if (postForm.value.isMarkdown) {
      count.value = editorRef.value?.getContentLength()
    } else {
      count.value = richEditorRef.value?.getContentLength()
    }
  })
}

function changeEditor() {
  nextTick(() => {
    if (postForm.value.isMarkdown) {
      editorRef.value?.setContent(postForm.value.content)
    } else {
      richEditorRef.value?.setContent(postForm.value.content)
    }
  })
}

function saveOrUpdate(status: number) {
  postForm.value.status = status
  formRef.value?.validate(valid => {
    if (valid) {
      ElMessageBox.confirm('确定要发布文章吗？', '提示').then(() => {
        if (!postForm.value.id) {
          save()
        } else {
          update()
        }
      }).catch(() => {
      })
    } else {
      ElMessage({
        message: '存在字段内容填写不正确，请检查后重试',
        type: 'error',
        plain: true
      })
    }
  })
}

async function save() {
  submitDisabled.value = true
  const isDraft = postForm.value.status === 1
  ElMessage({
    message: '正在' + (isDraft ? '保存' : '发布') + '文章，请稍候...',
    type: 'success',
    plain: true
  })
  if (typeof postForm.value.cover === 'object') {
    try {
      await uploadArticleCover(postForm.value)
    } catch (error) {
      submitDisabled.value = false
      ElMessage({
        message: '封面上传失败，请稍后重试',
        type: 'error',
        plain: true
      })
      return
    }
  }
  articleApi.save(postForm.value)
    .then(response => {
      ElMessage({
        message: isDraft ? '保存草稿成功' : '发布成功',
        type: 'success',
        plain: true
      })
      postForm.value = Object.assign({}, baseInfo)
      isSuccess.value = true
      clearCacheContent()
      if (isDraft) {
        router.push('/user')
      } else {
        router.push('/article/' + response.data)
      }
    }).catch(() => {
    submitDisabled.value = false
  })
}

async function update() {
  const newData: any = removeSameValues(postForm.value, currentRow.value)
  if (getObjKeyCount(newData) <= 1) {
    ElMessage({
      message: '该文章什么都没有改变呢，无需更新',
      type: 'warning'
    })
    return
  }
  const isDraft = postForm.value.status === ArticleStatusEnum.DRAFT
  ElMessage({
    message: '正在' + (isDraft ? '保存' : '发布') + '文章，请稍候...',
    type: 'info',
    plain: true
  })
  if (typeof newData.cover === 'object') {
    try {
      await uploadArticleCover(newData)
    } catch (error) {
      ElMessage({
        message: '封面上传失败，请稍后重试',
        type: 'error',
        plain: true
      })
      return
    }
  }
  articleApi.update(newData)
    .then(() => {
      // 提示
      ElMessage({
        message: '修改成功',
        type: 'success',
        plain: true
      })
      isSuccess.value = true
      clearCacheContent()
      if (isDraft) {
        router.push('/user')
      } else {
        router.push('/article/' + postForm.value.id)
      }
      postForm.value = Object.assign({}, baseInfo)
    })
}

function beforeCoverUpload(file: File) {
  // 验证文件类型和大小
  if (!checkFileSize(file, 5, '封面')) {
    return
  }
  oldCover.value = postForm.value.cover
  getBase64(file, (url: string) => {
    nextTick(() => {
      CoverPreviewUrl.value = url
      postForm.value.cover = file
    })
  })
  return false
}

/**
 * 上传文章封面原图和缩略图，并把返回地址写回表单数据。
 *
 * :param data: 待提交的文章表单数据。
 * :return: 无返回值。
 */
async function uploadArticleCover(data: any): Promise<void> {
  const coverFile = data.cover as File
  const thumbFile = await compressImageFile(coverFile)
  const coverRes = await ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.COVER,
    fileName: coverFile.name
  })
  const thumbRes = await ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.THUMB,
    fileName: getThumbFileName(coverFile.name)
  })
  data.cover = await uploadFile(coverRes.data, coverFile)
  data.coverThumb = await uploadFile(thumbRes.data, thumbFile)
}

function handleCoverRemove() {
  CoverPreviewUrl.value = null
  postForm.value.cover = oldCover.value
}


/**
 * 切换文章标签的选中状态。
 *
 * :param tag: 待切换的标签。
 * :return: 无返回值。
 */
function handleAddTag(tag: ITag): void {
  const selectedIndex = postForm.value.tagList.indexOf(tag.id)
  if (selectedIndex > -1) {
    postForm.value.tagList.splice(selectedIndex, 1)
    return
  }
  if (postForm.value.tagList.length >= 5) {
    ElMessage({
      message: '最多只能添加5个标签',
      type: 'warning'
    })
    return
  }
  postForm.value.tagList.push(tag.id)
}

function handleCloseTag(tagId: string) {
  postForm.value.tagList.splice(postForm.value.tagList.indexOf(tagId), 1)
}

/**
 * 按名称搜索可选标签。
 *
 * :param queryString: 搜索关键词。
 * :param cb: 搜索结果回调。
 * :return: 无返回值。
 */
function searchTag(queryString: string, cb: (data: ITag[]) => void): void {
  const normalizedQuery = queryString.trim().toLowerCase()
  const results = commonStore.choiceTagList.filter((item: any) => {
    return item.name.toLowerCase().includes(normalizedQuery)
  })
  cb(results)
}

/**
 * 处理搜索建议中的标签选择。
 *
 * :param item: 被选择的标签。
 * :return: 无返回值。
 */
function handleSelectTag(item: ITag): void {
  handleAddTag(item)
  nextTick(() => {
    isTagPopoverVisible.value = true
  })
}

/**
 * 创建未分组的自定义标签并立即选中。
 *
 * :return: 无返回值。
 */
async function createCustomTag(): Promise<void> {
  if (!canCreateCustomTag.value || customTagCreating.value) return
  if (postForm.value.tagList.length >= 5) {
    ElMessage({
      message: '最多只能添加5个标签',
      type: 'warning'
    })
    return
  }
  customTagCreating.value = true
  try {
    const response = await tagApi.createCustomTag({ name: customTagName.value })
    const tag = response.data as ITag
    commonStore.addChoiceTag(tag)
    handleAddTag(tag)
    searchTagKeyword.value = ''
    const customGroupIndex = tagList.value.findIndex(group => group.id === 'custom')
    if (customGroupIndex > -1) {
      tabActiveName.value = 'tag_' + customGroupIndex
    }
    ElMessage({
      message: '自定义标签创建成功',
      type: 'success',
      plain: true
    })
  } finally {
    customTagCreating.value = false
  }
}

function beforeAttachmentUpload(file: any) {
  if (attachList.value.length >= 5) {
    ElMessage({
      message: '一次性最多上传5个附件',
      type: 'warning'
    })
    return false
  }
  // 验证文件类型和大小
  if (!checkFileSize(file, 1024, '附件')) {
    return
  }
  attachList.value.push({
    uid: uuid(),
    name: file.name,
    file: file.raw || file,
    status: FileUploadStatusEnum.READY,
    size: file.size,
    progress: 0
  })
}

function removeAttachment(attach: any) {
  attachList.value.splice(attachList.value.indexOf(attach), 1)
}

function cancelAttachmentUpload() {
  isShowAttachment.value = false
  attachList.value = []
}

const onProgress = (item: any) => (progressEvent: any) => {
  const total = progressEvent.total || 1
  console.log('progress', item.name, Math.round((progressEvent.loaded * 100) / total))
  item.progress = Math.round((progressEvent.loaded * 100) / total)
}

function uploadAttachment() {
  const uploadAttachList = Object.assign([], attachList.value)
  if (uploadAttachList.length === 0) {
    ElMessage({
      message: '请先选择要上传的附件',
      type: 'warning'
    })
    return
  }
  uploadLoading.value = true
  isShowAttachment.value = false
  ElMessage({
    message: '附件上传中，请不要关闭或刷新该页面...',
    type: 'info',
    plain: true
  })
  uploadAttachList.forEach((item: any) => {
    item.status = FileUploadStatusEnum.UPLOADING
    ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.ATTACH,
      fileName: item.name
    }).then(res => {
      uploadFile(res.data, item.file, onProgress(item)).then(async url => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        // 移除已上传的附件
        item.status = FileUploadStatusEnum.SUCCESS
        attachList.value = attachList.value.filter((it: any) => it.uid !== item.uid)
        postForm.value.attachList.push({
          uid: item.uid,
          name: item.name,
          url: url,
          size: item.size
        })
      }).catch(() => {
        item.status = FileUploadStatusEnum.ERROR
      })
    })
  })
  uploadLoading.value = false
}

function deleteAttach(attach: any) {
  ElMessageBox.confirm('确定要删除该附件吗，删除后不可恢复？', '提示').then(() => {
    postForm.value.attachList = postForm.value.attachList.filter((item: any) => item.uid !== attach.uid)
  }).catch(() => {
  })
}

function contentChanged(oldVal: any, newVal: any) {
  return (oldVal !== null && newVal !== null && (oldVal.content !== newVal.content ||
    oldVal.title !== newVal.title ||
    oldVal.categoryId !== newVal.categoryId ||
    oldVal.isOriginal !== newVal.isOriginal ||
    oldVal.originalUrl !== newVal.originalUrl ||
    oldVal.isMarkdown !== newVal.isMarkdown ||
    !isEqual(oldVal.tagList, newVal.tagList) ||
    !isEqual(oldVal.attachList, newVal.attachList)))
}

function hasContent() {
  return !isEqual(postForm.value, baseInfo)
}

function cacheContent() {
  if (!hasContent()) return
  const cacheObj = Object.assign({}, postForm.value)
  delete cacheObj.cover
  delete cacheObj.coverThumb
  window.sessionStorage.setItem('articleContentCache_' + postForm.value.tempId, JSON.stringify(cacheObj))
}


function clearCacheContent() {
  window.sessionStorage.removeItem('articleContentCache_' + postForm.value.tempId)
}
</script>
