<template>
  <div class="article-editor">
    <md-editor
      v-if="postForm.isMarkdown"
      ref="editorRef"
      @change="contentChange"
      class="article-md-editor vw-100" />
    <rich-editor
      v-else
      @change="contentChange"
      class="article-rich-editor"
      ref="richEditorRef"
    />
  </div>
  <el-card class="article-edit">
    <el-form ref="formRef" :model="postForm" :rules="rules" class="article-form"
             :label-position="isMobile() ? 'top' : 'right'" label-width="100px">
      <el-form-item label="封面" prop="cover">
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
            <el-button v-else type="primary" size="small">选择封面</el-button>
          </template>
        </el-upload>
        <div v-if="CoverPreviewUrl" class="avatar-uploader">
          <el-image :src="CoverPreviewUrl" class="cover-preview" />
          <div><a @click="handleCoverRemove">取消</a></div>
        </div>
      </el-form-item>
      <el-form-item label="分类" prop="categoryId" style="width: 300px">
        <el-select v-model="postForm.categoryId" filterable>
          <el-option v-for="item in categoryList" :key="item.id" :value="item.id" :label="item.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="标签列表" prop="tagList">
        <el-tag
          v-for="tagId in postForm.tagList"
          :key="tagId +'_select'"
          closable
          size="small"
          effect="light"
          type="success"
          :disable-transitions="false"
          style="margin-right: 10px"
          @close="handleCloseTag(tagId)"
        >
          {{ tagMap[tagId].name }}
        </el-tag>
        <el-popover
          placement="bottom"
          width="450"
          trigger="click"
        >
          <el-autocomplete
            v-model="searchTagKeyword"
            :fetch-suggestions="searchTag"
            :trigger-on-focus="false"
            placeholder="请输入文字搜索"
            class="mb-2 w-100"
            @select="handleSelectTag"
          >
            <template #default="{ item }">
              <span class="name">{{ item.name }}</span>
            </template>
          </el-autocomplete>
          <el-tabs v-model="tabActiveName" tab-position="left" :stretch="true">
            <el-tab-pane v-for="(tags, index) in tagList" :key="tags.id" :label="tags.name" :name="'tag_' + index">
              <el-tag
                v-for="tag in tags.children"
                :key="tag.id"
                size="small"
                :disable-transitions="false"
                effect="light"
                :type="postForm.tagList.includes(tag.id) ? 'info' : 'success'"
                :style="{margin: '5px', cursor:(postForm.tagList.includes(tag.id) ? '' : 'pointer')}"
                @click="handleAddTag(tag)"
              >
                {{ tag.name }}
              </el-tag>&nbsp;
            </el-tab-pane>
          </el-tabs>
          <template #reference>
            <el-button type="primary" size="small">添加标签</el-button>
            <span class="ms-2">*最多选择5个标签</span>
          </template>
        </el-popover>
      </el-form-item>
      <el-form-item label="文章类型" prop="isOriginal">
        <el-switch v-model="postForm.isOriginal" active-text="原创" inactive-text="转载" />
      </el-form-item>
      <el-form-item v-if="!postForm.isOriginal" :required="!postForm.isOriginal" label="原文链接" prop="originalUrl">
        <el-input v-model="postForm.originalUrl" />
      </el-form-item>
      <el-form-item label="附件">
        <el-button type="primary" size="small" @click="isShowAttachment = true">添加附件</el-button>
        <div class="attachment-list">
          <el-row v-for="attach in postForm.attachList" :key="attach.uid">
            <el-col :span="18" class="ellipsis">
              <a :href="attach.url" target="_blank">{{ attach.name }}({{ transformSize(attach.size) }})</a>
            </el-col>
            <el-col :span="6">
              <a class="color-red" @click="deleteAttach(attach)">
                <Icon icon="material-symbols:delete-outline" />
                删除</a>
            </el-col>
          </el-row>
        </div>
      </el-form-item>
      <div class="article-edit-footer fixed-bottom" :style="{textAlign: (isMobile() ? 'left' : 'right')}">
        <div class="w-80 text-end">
          <el-form-item class="float-start">
            <span class="font-12">共 {{ count }} 字</span>
          </el-form-item>
          <el-form-item label="标题" prop="title" class="float-start w-50">
            <el-input v-model="postForm.title" :placeholder="tips" />
          </el-form-item>
          <el-form-item class="float-end">
            <a class="me-2 d-inline-flex align-items-center"
               @click="changeEditor()">
              <Icon icon="icon-park-outline:switch" />
              切换为{{ postForm.isMarkdown ? '富文本编辑器' : 'Markdown编辑器' }}
            </a>
            <el-button type="primary" :size="isMobile() ? 'small' : 'default'" :disabled="submitDisabled"
                       @click="saveOrUpdate(1)">保存草稿
            </el-button>
            <el-button type="success" :size="isMobile() ? 'small' : 'default'" :disabled="submitDisabled"
                       @click="saveOrUpdate(2)">发布
            </el-button>
          </el-form-item>
        </div>
      </div>
    </el-form>
  </el-card>
  <!-- 上传附件 -->
  <el-dialog title="上传附件" v-model="isShowAttachment" class="attachment-dialog" :show-close="false">
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
      <Icon icon="material-symbols:upload" />
      <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      <div class="el-upload__tip">附件大小不能超过1GB</div>
    </el-upload>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="uploadAttachment">确定并上传</el-button>
        <el-button @click="cancelAttachmentUpload">取消</el-button>
      </div>
    </template>
  </el-dialog>
  <!-- 悬浮显示正在上传的文件 -->
  <div v-if="attachList.length > 0 && !isShowAttachment" class="attachment-uploading">
    <div class="font-weight-bold mb-2">正在上传的附件</div>
    <el-row v-for="attach in attachList" :key="attach.uid" class="mb-2">
      <el-col :span="18" class="ellipsis">
        <el-tooltip :content="`${attach.name}(${transformSize(attach.size)})`" placement="top" effect="light">
          <span class="cursor">{{ attach.name }}({{ transformSize(attach.size) }})</span>
        </el-tooltip>
      </el-col>
      <el-col :span="6">
        <el-progress :percentage="attach.progress" :color="customColors" />
      </el-col>
    </el-row>
  </div>
</template>

<style src="@/assets/css/article-edit.scss" lang="scss" scoped />

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import articleApi from '@/api/article'
import ossApi from '@/api/oss-api'
import {
  checkFileSize,
  getBase64,
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
import { IArticle, IAttach, ITag } from '@/interface'

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

const postForm = ref(Object.assign({}, baseInfo))
const count = ref<number | undefined>(0)
const currentRow = ref<IArticle>(null)
const CoverPreviewUrl = ref<string | null>(null)
const oldCover = ref('')
const tabActiveName = ref('tag_0')
const searchTagKeyword = ref('')
const isSuccess = ref(false)
const submitDisabled = ref(false)
const tips = ref('🍀 在这里填写标题，想写点什么呢~')
const cacheTimer = ref<any>(null)
const isShowAttachment = ref(false)
const uploadLoading = ref(false)
const attachList = ref<IAttach[]>([])
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
  return commonStore.tagList
})
const tagMap = computed(() => {
  return commonStore.tagMap
})

onMounted(async () => {
  commonStore.setShowFooter(false)
  window.onbeforeunload = () => {
    return '关闭提示'
  }
  const articleId = route.params.articleId
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
  ElMessageBox.confirm('切换编辑器可能会导致内容丢失，是否切换？', '提示').then(() => {
    postForm.value.isMarkdown = !postForm.value.isMarkdown
    nextTick(() => {
      if (postForm.value.isMarkdown) {
        editorRef.value?.setContent(postForm.value.content)
      } else {
        richEditorRef.value?.setContent(postForm.value.content)
      }
    })
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
    // 上传图片
    const res = await ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.COVER,
      fileName: postForm.value.cover.name
    })
    postForm.value.cover = await uploadFile(res.data, postForm.value.cover)
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
    // 上传图片
    const res = await ossApi.getUploadSignatureUrl({
      type: UploadFileTypeEnum.COVER,
      fileName: newData.cover.name
    })
    newData.cover = await uploadFile(res.data, newData.cover)
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

function handleCoverRemove() {
  CoverPreviewUrl.value = null
  postForm.value.cover = oldCover.value
}


function handleAddTag(tag: ITag) {
  if (postForm.value.tagList.length >= 5) {
    ElMessage({
      message: '最多只能添加5个标签',
      type: 'warning'
    })
    return
  }
  if (postForm.value.tagList.includes(tag.id)) {
    return
  }
  postForm.value.tagList.push(tag.id)
}

function handleCloseTag(tagId: string) {
  postForm.value.tagList.splice(postForm.value.tagList.indexOf(tagId), 1)
}

function searchTag(queryString: string, cb: (data: any) => void) {
  const results = commonStore.choiceTagList.filter(item => {
    return item.name.toLowerCase().indexOf(queryString.toLowerCase()) > -1
  })
  cb(results)
}

function handleSelectTag(item: ITag) {
  if (postForm.value.tagList.length >= 5) {
    ElMessage({
      message: '最多只能添加5个标签',
      type: 'warning'
    })
    return
  }
  if (postForm.value.tagList.includes(item.id)) {
    return
  }
  postForm.value.tagList.push(item.id)
}

function beforeAttachmentUpload(file: File) {
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
    file: file.raw,
    status: FileUploadStatusEnum.READY,
    size: file.size,
    progress: 0
  })
}

function removeAttachment(attach: IAttach) {
  attachList.value.splice(attachList.value.indexOf(attach), 1)
}

function cancelAttachmentUpload() {
  isShowAttachment.value = false
  attachList.value = []
}

const onProgress = (item: IAttach) => (progressEvent: ProgressEvent) => {
  console.log('progress', item.name, Math.round((progressEvent.loaded * 100) / progressEvent.total))
  item.progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
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
  uploadAttachList.forEach((item: IAttach) => {
    item.status = FileUploadStatusEnum.UPLOADING
    ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.ATTACH,
      fileName: item.name
    }).then(res => {
      uploadFile(res.data, item.file, onProgress(item)).then(async url => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        // 移除已上传的附件
        item.status = FileUploadStatusEnum.SUCCESS
        attachList.value = attachList.value.filter((it) => it.uid !== item.uid)
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

function deleteAttach(attach: IAttach) {
  ElMessageBox.confirm('确定要删除该附件吗，删除后不可恢复？', '提示').then(() => {
    postForm.value.attachList = postForm.value.attachList.filter((item) => item.uid !== attach.uid)
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
  window.sessionStorage.setItem('articleContentCache_' + postForm.value.tempId, JSON.stringify(cacheObj))
}


function clearCacheContent() {
  window.sessionStorage.removeItem('articleContentCache_' + postForm.value.tempId)
}
</script>
