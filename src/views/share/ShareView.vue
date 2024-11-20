<template>
  <div class="share-container">
    <el-row>
      <el-col :span="4" class="share-left">
        <!-- 分享类型列表 -->
        <el-card class="share-card sticky-top-70">
          <div :class="['share-type-list-item', currentActive === null ? 'active' : '']">
            <a @click="changeShareType(null)">
              <Icon icon="mdi:wall" />
              全部
            </a>
          </div>
          <div v-for="item in shareTypeList" :key="'shareTypeDiv' + item.value"
               :class="['share-type-list-item', currentActive === item.value ? 'active' : '']">
            <a @click="changeShareType(item.value)">
              <Icon :icon="item.icon" :color="item.color" />
              {{ item.name }}
            </a>
          </div>
        </el-card>
      </el-col>
      <el-col :span="20" class="share-right" ref="shareCardRef">
        <!-- 分享列表 -->
        <reply-view
          ref="replyRef"
          :check-login="true"
          :is-fixed="true"
          @reply="replyShare"
          @cancel="cancelReply"
          :class="showReply ? 'reply-fixed': 'd-none'"
        />
        <div class="share-card">
          <el-card class="sticky-top-60">
            <el-row type="flex" align="middle">
              <el-col :span="5" class="font-size-12">
                共{{ count }}条数据
              </el-col>
              <el-col :span="5">
                <div class="share-type-header">
                  <el-checkbox :disabled="!user" @change="changeViewType">仅查看我的</el-checkbox>
                </div>
              </el-col>
              <el-col :span="10" class="text-right">
                <el-input v-model="searchKeyword" placeholder="输入内容/标签进行搜索" clearable
                          @keydown.enter="getSharePageList()"
                          class="input-with-select">
                  <template #prepend>
                    <el-select v-model="searchContentType" placeholder="请选择">
                      <el-option label="---" value="" />
                      <el-option label="内容" :value="ShareSearchContentTypeEnum.CONTENT" />
                      <el-option label="标签" :value="ShareSearchContentTypeEnum.TAG" />
                    </el-select>
                  </template>
                  <template #append>
                    <el-button @click="getSharePageList()">
                      <template #icon>
                        <Icon icon="material-symbols:search" />
                      </template>
                    </el-button>
                  </template>
                </el-input>
              </el-col>
              <el-col :span="4" class="text-right">
                <el-button type="primary" @click="openAddShare()">
                  <Icon icon="ic:baseline-add" />
                  添加分享
                </el-button>
              </el-col>
            </el-row>
          </el-card>
          <el-card v-for="(item, index) in shareList" :key="item.id" class="share-list-item">
            <el-row align="middle">
              <el-col :span="2" class="d-flex justify-content-center">
                <el-avatar :src="item.user.avatar" size="default" />
              </el-col>
              <el-col :span="22">
                <el-row align="middle">
                  <el-col :span="8">
                    <el-row>
                      <el-col :span="24" class="share-list-item-info">
                        <a :href="'user/' + item.user.id" target="_blank" class="d- inline-flex align-items-center">
                          <span>{{ item.user.nickname }}</span>
                        </a>
                      </el-col>
                      <el-col :span="24" class="share-list-item-info">
                        <span><el-tag size="small" type="success" class="me-1">{{ shareTypeMap[item.shareType]
                          }}</el-tag></span>
                        <span class="me-1 font-12">{{ covertTimeHowLongAgo(item.createTime) }}</span>
                        <!-- ip属地 -->
                        <span class="me-1 font-12">IP属地: {{ item.user.address }}</span>
                      </el-col>
                    </el-row>
                  </el-col>
                  <el-col :span="8" class="text-right">
                    <el-tag
                      v-for="(name, index) in item.tag"
                      :key="'shareTag' + item.id + name"
                      size="small"
                      :type="tagColor[index % 6]"
                      :disable-transitions="true"
                      class="me-2 mb-2 cursor-pointer"
                      @click="tagSearch(name)"
                    >
                      {{ name }}
                    </el-tag>
                  </el-col>
                  <el-col :span="8" class="share-op-col">
                    <a v-if="item.userId === user?.id" class="me-2" title="编辑" @click="openEditShare(item)">
                      <Icon icon="lucide:edit"></Icon>
                      编辑
                    </a>
                    <a v-if="item.userId === user?.id" class="me-2" title="删除" @click="deleteShare(item)">
                      <Icon icon="material-symbols:delete-outline" class="font-14"></Icon>
                      删除
                    </a>
                    <a :class="['me-2', {'like-active': item.hasLike}]" title="点赞" @click="thumbShare(item)">
                      <Icon :icon="item.hasLike ? 'tabler:thumb-up-filled' : 'tabler:thumb-up'" :class="{'like-active-icon': item.hasLike}" />
                      ({{ item.likeCount || 0 }})
                    </a>
                    <!-- 回复 -->
                    <a @click="openReplyShare(item, index)">
                      <Icon icon="iconamoon:comment-dots" />
                      回复
                    </a>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
            <el-row class="mt-4">
              <el-col :span="2"></el-col>
              <el-col :span="22">
                <el-row class="share-list-item-content">
                  {{ item.content }}
                </el-row>
                <!-- 评论 -->
                <el-row>
                  <comment-view
                    :ref="(el) => setCommentRef(el, index)"
                    :obj-id="item.id"
                    :login-user-id="user?.id"
                    :obj-type="ObjectTypeEnum.SHARE"
                    :check-login="true"
                    :obj-user-id="item.userId"
                    :not-show-no-comment="true"
                    :component-index="index"
                    :manual-show-comment="true"
                    @reply-comment="replyComment"
                    class="w-100"
                  />
                </el-row>
              </el-col>
            </el-row>
          </el-card>
          <div class="pagination-container text-center mt-2">
            <el-pagination
              v-if="isShowMe && shareList.length > 0"
              background
              layout="prev, pager, next, jumper"
              :total="count"
              :pager-count="isMobile() ? 5 : 7"
              v-model:current-page="userShareQueryParams.currentPage"
              @change="getUserSharePageList()"
            />
            <el-pagination
              v-if="!isShowMe && shareList.length > 0"
              background
              layout="prev, pager, next, jumper"
              :total="count"
              :pager-count="isMobile() ? 5 : 7"
              v-model:current-page="shareQueryParams.currentPage"
              @change="getSharePageList()"
            />
          </div>
          <el-empty v-if="shareList.length === 0" />
        </div>
      </el-col>
    </el-row>
    <!--添加分享-->
    <el-dialog :title="(shareForm.isEdit ? '修改' : '添加') + '分享'" v-model="addShareDialogVisible"
               :close-on-click-modal="false">
      <el-form ref="addShareFormRef" :model="shareForm" :rules="shareRules" size="default" label-width="80px">
        <el-form-item label="分享类型" prop="shareType">
          <el-select v-model="shareForm.shareType" placeholder="请选择分享类型">
            <el-option v-for="item in shareTypeList" :key="'shareType' + item.value" :label="item.name"
                       :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="分享内容" prop="content">
          <el-input v-model="shareForm.content" type="textarea" :rows="15" maxlength="200" show-word-limit
                    placeholder="请输入分享描述" />
        </el-form-item>
        <el-form-item label="标签" prop="tag">
          <el-input v-model="shareForm.tag" maxlength="100" show-word-limit
                    placeholder="标签格式为: #标签1#标签2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelAddShare()">取消</el-button>
        <el-button type="primary" @click="saveOrUpdateShare()">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style src="@/assets/css/share.scss" scoped />

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import shareApi from '@/api/share'
import actionApi from '@/api/action'
import ossApi from '@/api/oss-api'
import { checkIsLogin, isMobile, removeSameValues } from '@/utils/common'
import { covertTimeHowLongAgo } from '@/utils/date'
import { uploadFile } from '@/utils/oss-upload'
import { ActionTypeEnum, ObjectTypeEnum, ShareSearchContentTypeEnum, ShareTypeEnum, UploadFileTypeEnum } from '@/enums'
import { shareTypeList, shareTypeMap } from '@/utils/constant'
import { Icon } from '@iconify/vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import CommentView from '@/components/comment/CommentView.vue'
import ReplyView from '@/components/comment/ReplyView.vue'
import commentApi from '@/api/comment'

const userStore = useUserStore()

const defaultShareForm = {
  isEdit: false,
  content: '',
  tag: '',
  shareType: ShareTypeEnum.NOTE,
  detail: []
}
const tagRegex = /#[^#\s]+/g

const addShareFormRef = ref<FormInstance | null>(null)
const shareCardRef = ref<HTMLElement | null>(null)
const replyRef = ref<InstanceType<typeof ReplyView> | null>(null)
const commentRefs = ref<InstanceType<typeof CommentView>[]>([])
const isShowMe = ref(false)
const showReply = ref(false)
const addShareDialogVisible = ref(false)
const previewShareItem = ref<any>({})
const shareList = ref<any>([])
const currentActive = ref<any>(null) // 当前选择的哪个分类
const currentReplyShareItem = ref<any>({})
const currentReplyComment = ref<any>({})
const currentReplyIndex = ref(-1)  // 当前回复的分享索引
const count = ref(0)
const shareQueryParams = ref({
  pageNum: 1,
  pageSize: 10,
  keywords: null
})
const userShareQueryParams = ref({
  pageNum: 1,
  pageSize: 10,
  keywords: null
})
const searchKeyword = ref<string | null>(null)
const searchContentType = ref<ShareSearchContentTypeEnum>()
const shareForm = ref(Object.assign({}, defaultShareForm))
const shareRules = ref({
  content: [
    { required: true, message: '请写点什么吧~', trigger: 'blur' }
  ]
})
const tagColor = ref(['primary', 'success', 'info', 'danger', 'warning'])

const user = computed(() => {
  return userStore.user
})

getUserOrShareList()

function setCommentRef(el: any, index: number) {
  commentRefs.value[index] = el
}

function getSharePageList() {
  const searchData = {
    shareType: currentActive.value
  }
  if (searchContentType.value === ShareSearchContentTypeEnum.CONTENT) {
    searchData.content = searchKeyword.value
  } else if (searchContentType.value === ShareSearchContentTypeEnum.TAG) {
    searchData.tag = searchKeyword.value
  } else {
    searchData.keyword = searchKeyword.value
  }
  shareApi.getSharePageList(shareQueryParams.value.pageNum, shareQueryParams.value.pageSize, searchData).then(res => {
    shareList.value = res.data.records
    count.value = res.data.total
  })
}

function getUserSharePageList() {
  const searchData = {
    shareType: currentActive.value
  }
  if (searchContentType.value === ShareSearchContentTypeEnum.CONTENT) {
    searchData.content = searchKeyword.value
  } else if (searchContentType.value === ShareSearchContentTypeEnum.TAG) {
    searchData.tag = searchKeyword.value
  } else {
    searchData.keyword = searchKeyword.value
  }
  shareApi.getUserSharePageList(userShareQueryParams.value.pageNum, userShareQueryParams.value.pageSize, searchData).then(res => {
    shareList.value = res.data.records
    count.value = res.data.total
  })
}

function changeShareType(val: any) {
  currentActive.value = val
  getUserOrShareList()
}

function changeViewType(value: any) {
  isShowMe.value = value
  getUserOrShareList()
}

function getUserOrShareList() {
  isShowMe.value ? getUserSharePageList() : getSharePageList()
}

function openAddShare() {
  if (!checkIsLogin()) return
  shareForm.value.isEdit = false
  addShareDialogVisible.value = true
}

function openEditShare(item) {
  if (!checkIsLogin()) return
  previewShareItem.value = item
  shareForm.value = Object.assign({}, previewShareItem.value)
  shareForm.value.tag = shareForm.value.tag.join('')
  shareForm.value.isEdit = true
  addShareDialogVisible.value = true
}

function saveOrUpdateShare() {
  if (shareForm.value.isEdit) {
    updateShare()
  } else {
    addShare()
  }
}

function addShare() {
  addShareFormRef.value?.validate(async (valid) => {
    if (!valid) {
      return false
    }
    ElMessage({
      message: '正在添加分享, 请稍等...',
      type: 'info',
      plain: true
    })
    const saveData = Object.assign({}, shareForm.value)
    saveData.tag = saveData.tag ? saveData.tag.match(tagRegex) : []
    if (typeof shareForm.value.url === 'object') {
      // 上传分享
      const res = await ossApi.getUploadSignatureUrl({
        dirType: UploadFileTypeEnum.IMAGE,
        fileName: shareForm.value.url.name
      })
      saveData.url = await uploadFile(res.data, shareForm.value.url)
    }
    shareApi.saveShare(saveData).then(() => {
      ElMessage({
        message: '添加成功',
        type: 'success',
        plain: true
      })
      getUserOrShareList()
      cancelAddShare()
    })
  })
}

function updateShare() {
  const newData: any = removeSameValues(shareForm.value, previewShareItem.value)
  newData.tag ? newData.tag = newData.tag.match(tagRegex) : null
  shareApi.updateShare(newData).then(() => {
    ElMessage({
      message: '更新成功',
      type: 'success',
      plain: true
    })
    previewShareItem.value = Object.assign({}, shareForm.value)
    cancelAddShare()
    getUserOrShareList()
  })
}

function cancelAddShare() {
  addShareDialogVisible.value = false
  shareForm.value = Object.assign({}, defaultShareForm)
}

function thumbShare(item) {
  if (!checkIsLogin()) return
  actionApi.addOrUpdate({
    objId: item.id,
    objType: ObjectTypeEnum.SHARE,
    actionType: ActionTypeEnum.LIKE
  }).then(res => {
    item.hasLike = res.data
    if (res.data) {
      item.likeCount++
    } else {
      item.likeCount--
    }
  })
}

function deleteShare(item) {
  ElMessageBox.confirm('确定删除该分享吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    shareApi.deleteShare({
      ids: [item.id]
    }).then(() => {
      ElMessage({
        message: '删除成功',
        type: 'success',
        plain: true
      })
      getUserOrShareList()
    })
  })
}

function tagSearch(name) {
  searchContentType.value = 2
  searchKeyword.value = name
  getUserOrShareList()
}

function openReplyShare(item: any, index: number) {
  currentReplyShareItem.value = Object.assign({}, item)
  currentReplyIndex.value = index
  const width = shareCardRef.value.$el.offsetWidth
  replyRef.value.$el.style.width = width + 'px'
  showReply.value = true
  replyRef.value?.setReplyComment({ replyComment: null })
}

function replyShare(val: any) {
  const { replyUserId, parentId, firstLevelId, index, replyUser } = currentReplyComment.value
  const comment = {
    objId: currentReplyComment.value.objId || currentReplyShareItem.value.id,
    objType: ObjectTypeEnum.SHARE,
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
    const add = res.data
    add.user = Object.assign({}, user.value)
    add.index = index
    add.replyUser = replyUser
    commentRefs.value[currentReplyIndex.value]?.reloadComment(add)
    replyRef.value?.reset()
    currentReplyComment.value = {}
  }).finally(() => {
    replyRef.value?.enableBtn()
  })
}

function replyComment(val: any) {
  if (!replyRef.value) return
  currentReplyComment.value = val
  currentReplyIndex.value = val.componentIndex
  currentReplyShareItem.value = Object.assign({}, shareList.value[currentReplyIndex.value])
  const width = shareCardRef.value.$el.offsetWidth
  showReply.value = true
  replyRef.value.$el.style.width = width + 'px'
  nextTick(() => {
    replyRef.value?.setReplyComment({ replyComment: val })
  })
}

function cancelReply() {
  currentReplyComment.value = {}
  currentReplyShareItem.value = {}
  currentReplyIndex.value = -1
  showReply.value = false
}
</script>
