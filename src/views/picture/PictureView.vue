<template>
  <div class="picture_div">
    <!-- 图库分类 -->
    <el-card class="picture-container" shadow="always">
      <template #header>
        <div class="picture-album-title">
          <el-row>
            <el-col :sm="15" :xs="12" class="d-flex align-items-center">
              <Icon icon="ic:outline-image" color="#409eff" class="me-2" />
              <a :class="[albumCategory === AlbumCategoryTypeEnum.ALL ? 'active' : '']"
                 @click="changePictureAlbumCategory(AlbumCategoryTypeEnum.ALL)">
                图库分类
              </a>
              <el-divider direction="vertical" />
              <a :class="[albumCategory === AlbumCategoryTypeEnum.MY ? 'active' : '']"
                 @click="changePictureAlbumCategory(AlbumCategoryTypeEnum.MY)">
                我的图库
              </a>
            </el-col>
            <el-col :sm="9" :xs="12" :class="[isMobile() ? '' : 'float-right text-right']">
              <el-button type="primary" size="small" @click="openAddPictureAlbum()">
                <Icon icon="ic:baseline-add" />
                添加图库
              </el-button>
              <el-button v-if="albumCategory === AlbumCategoryTypeEnum.MY" type="success" size="small"
                         @click="openEditPictureAlbum()">
                <Icon icon="lucide:edit" />
                编辑图库
              </el-button>
              <el-button v-if="albumCategory === AlbumCategoryTypeEnum.MY" type="danger" size="small"
                         @click="deletePictureAlbum()">
                <Icon icon="material-symbols:delete-outline" />
                删除图库
              </el-button>
            </el-col>
          </el-row>
        </div>
      </template>
      <!-- 全部图库 -->
      <div v-if="albumCategory === AlbumCategoryTypeEnum.ALL">
        <el-row>
          <el-col :span="3" class="picture-album-list-item">
            <div class="picture-album-list-item-div" @click="changePictureAlbum(null)">
              <img :src="defaultAlbumCover" alt="" class="picture-album-list-item-img">
              <a :class="['ellipsis', currentActive === null ? 'active' : 'name']"
                 @click="changePictureAlbum(null)">全部</a>
            </div>
          </el-col>
          <el-col v-for="item in pictureAlbumList" :key="item.id" :span="3" class="picture-album-list-item">
            <div class="picture-album-list-item-div" @click="changePictureAlbum(item)">
              <img :src="item.cover" alt="" class="picture-album-list-item-img">
              <a :class="['ellipsis', currentActive && currentActive.id === item.id ? 'active' : 'name']"
                 @click="changePictureAlbum(item)">
                <el-tooltip :content="item.name" placement="bottom-start" effect="light">
                  <span>{{ item.name }}</span>
                </el-tooltip>
              </a>
            </div>
          </el-col>
        </el-row>
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pictureAlbumQueryParams.pageNum"
            background
            layout="prev, pager, next, jumper"
            :total="albumCount"
            :pager-count="isMobile() ? 5 : 7"
            @change="getPictureAlbumPageList()"
          />
        </div>
      </div>
      <!-- 我的图库 -->
      <div v-else>
        <el-row>
          <el-col :span="3" class="picture-album-list-item text-center">
            <div class="picture-album-list-item-div" @click="changeUserPictureAlbum(null)">
              <img :src="defaultAlbumCover" alt="" class="picture-album-list-item-img">
              <a :class="['ellipsis', userCurrentActive === null ? 'active' : 'name']"
                 @click="changeUserPictureAlbum(null)">全部</a>
            </div>
          </el-col>
          <el-col v-for="item in pictureAlbumList" :key="item.id" :span="3" class="picture-album-list-item text-center">
            <div class="picture-album-list-item-div" @click="changeUserPictureAlbum(item)">
              <img :src="item.cover" alt="" class="picture-album-list-item-img">
              <a :class="['ellipsis', userCurrentActive && userCurrentActive.id === item.id ? 'active' : 'name']"
                 @click="changeUserPictureAlbum(item)">
                <el-tooltip :content="item.name" placement="bottom-start" effect="light">
                  <span>
                    <span v-if="item.albumType === AlbumTypeEnum.PRIVATE" class="color-red">[私]</span>
                    {{ item.name }}
                  </span>
                </el-tooltip>
              </a>
            </div>
          </el-col>
        </el-row>
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="userPictureAlbumQueryParams.pageNum"
            background
            layout="prev, pager, next, jumper"
            :total="albumCount"
            :pager-count="isMobile() ? 5 : 7"
            @change="getUserPictureAlbumPageList()"
          />
        </div>
      </div>
    </el-card>
    <!-- 图片列表 -->
    <el-card class="picture-container">
      <template #header>
        <div class="picture-list-header">
          <span v-if="albumCategory === AlbumCategoryTypeEnum.ALL">{{ currentActive ? currentActive.name : '全部' }} > 共{{ count
            }}张图片</span>
          <span v-if="albumCategory === AlbumCategoryTypeEnum.MY">{{ userCurrentActive ? userCurrentActive.name : '全部'
            }} > 共{{ count }}张图片</span>
          <el-button type="primary" size="small" class="float-right" @click="openAddPicture()">
            <Icon icon="ic:baseline-add" />
            添加图片
          </el-button>
          <div class="color-gray-light mt-1">
            <span
              v-if="albumCategory === AlbumCategoryTypeEnum.ALL">{{ currentActive ? currentActive.description : '所有分类下的图片'
              }}</span>
            <span v-if="albumCategory === AlbumCategoryTypeEnum.MY"
                  class="color-gray-light">{{ userCurrentActive ? userCurrentActive.description : '所有分类下的图片'
              }}</span>
          </div>
        </div>
      </template>
      <el-row>
        <el-col v-for="item in pictureList" :key="item.id" :span="4" class="picture-list-item">
          <img :src="item.url" alt="" class="picture-list-item-img" @click="openPreviewPicture(item)">
        </el-col>
      </el-row>
      <el-empty v-if="pictureList.length === 0" />
      <div v-if="albumCategory === AlbumCategoryTypeEnum.ALL" class="pagination-container mt-2">
        <el-pagination
          v-model:current-page="pictureQueryParams.pageNum"
          background
          layout="prev, pager, next, jumper"
          :total="count"
          :pager-count="isMobile() ? 5 : 7"
          @change="getAlbumPicturePageList()"
        />
      </div>
      <div v-if="albumCategory === AlbumCategoryTypeEnum.MY" class="pagination-container mt-2">
        <el-pagination
          v-model:current-page="userPictureQueryParams.pageNum"
          background
          layout="prev, pager, next, jumper"
          :total="count"
          :pager-count="isMobile() ? 5 : 7"
          @change="getUserAlbumPicturePageList()"
        />
      </div>
    </el-card>
    <!--添加图库-->
    <el-dialog :title="(pictureAlbumForm.isEdit ? '修改' : '添加') + '图库'"
               v-model="addPictureAlbumDialogVisible" width="30%" :close-on-click-modal="false">
      <el-form ref="addPictureAlbumFormRef" :model="pictureAlbumForm" :rules="pictureAlbumRules" label-width="80px">
        <el-form-item label="图库封面" prop="cover">
          <el-upload
            class="avatar-uploader"
            action=""
            accept="image/*"
            :show-file-list="false"
            :before-upload="beforePictureAlbumCoverUpload"
          >
            <img v-if="pictureAlbumPreviewCover" :src="pictureAlbumPreviewCover" class="picture-album-add-cover" alt="">
            <span v-else><Icon icon="ic:baseline-add" />添加</span>
          </el-upload>
          <div v-if="pictureAlbumPreviewCover"><a @click="handlePictureAlbumCoverRemove">取消</a></div>
        </el-form-item>
        <el-form-item label="图库名称" prop="name">
          <el-input v-model.trim="pictureAlbumForm.name" placeholder="请输入图库名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="图库类别" prop="albumType">
          <el-switch v-model="pictureAlbumForm.albumType"
                     :disabled="pictureAlbumForm.isEdit && userCurrentActive && userCurrentActive.albumType === AlbumTypeEnum.PUBLIC"
                     :active-value="1" :inactive-value="2" active-text="公开" inactive-text="私密" />
          <el-tooltip class="item ms-2 green-popper" effect="light"
                      content="公开的图库可以被其他用户查看和上传图片，但无法转为私密和自行删除" placement="top">
            <Icon icon="ph:question" />
          </el-tooltip>
          <span
            v-if="(!pictureAlbumForm.isEdit && pictureAlbumForm.albumType === AlbumTypeEnum.PUBLIC) ||
            (pictureAlbumForm.isEdit && pictureAlbumForm.albumType === AlbumTypeEnum.PUBLIC && userCurrentActive?.albumType !== pictureAlbumForm.albumType)"
            class="ms-2 color-red">图库公开后将无法转为私密和自行删除, 请谨慎操作</span>
        </el-form-item>
        <el-form-item label="图库描述" prop="description">
          <el-input v-model="pictureAlbumForm.description" type="textarea" :rows="5" maxlength="200" show-word-limit
                    placeholder="请输入图库描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelAddPictureAlbum()">取消</el-button>
        <el-button type="primary" :disabled="pictureAlbumAddDisabled" @click="saveOrUpdatePictureAlbum()">提交
        </el-button>
      </template>
    </el-dialog>
    <!--添加图片-->
    <el-dialog :title="(pictureForm.isEdit ? '修改' : '添加') + '图片'" v-model="addPictureDialogVisible" width="30%"
               :close-on-click-modal="false">
      <el-form ref="addPictureFormRef" :model="pictureForm" :rules="pictureRules" label-width="80px">
        <el-form-item v-if="!pictureForm.isEdit" label="图片" prop="url">
          <el-upload
            class="avatar-uploader"
            action=""
            accept="image/*"
            :show-file-list="false"
            :before-upload="beforePictureUpload"
          >
            <img v-if="pictureFormPreviewUrl" :src="pictureFormPreviewUrl" class="picture-album-add-cover" alt="">
            <span v-else>添加</span>
          </el-upload>
          <div v-if="pictureFormPreviewUrl"><a @click="handlePictureRemove()">取消</a></div>
        </el-form-item>
        <el-form-item label="图片描述" prop="description">
          <el-input v-model="pictureForm.description" type="textarea" :rows="5" maxlength="200" show-word-limit
                    placeholder="请输入图片描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelAddPicture()">取消</el-button>
        <el-button type="primary" @click="saveOrUpdatePicture()">提交</el-button>
      </template>
    </el-dialog>
    <!-- 图片预览 -->
    <el-dialog title="图片详情" v-model="previewPictureDialogVisible" destroy-on-close
               width="95%" top="5vh">
      <el-row>
        <el-col :span="16">
          <el-row align="middle">
            <el-col :span="24">
              <div class="display-image-div">
                <img ref="displayImageRef" :src="previewPictureItem.url" alt="" class="display-image">
              </div>
            </el-col>
          </el-row>
          <el-row align="middle" class="picture-preview-detail">
            <el-col :sm="6" :xs="12">
              <a :href="'user/' + previewPictureItem.userId" target="_blank" class="ellipsis">
                <el-avatar :src="previewPictureItem.user.avatar" size="small" />
                {{ previewPictureItem.user.nickname }}
              </a>
            </el-col>
            <el-col :sm="4" :xs="12">
              <Icon icon="mingcute:time-line" />
              {{ minute(previewPictureItem.createTime) }}
            </el-col>
            <el-col :sm="3" :xs="12">
              <Icon icon="clarity:picture-line" />
              {{ previewPictureItem.width }}x{{ previewPictureItem.height }}
            </el-col>
            <el-col :sm="11" :xs="24" :class="['picture-op-button-col', isMobile() ? '' : 'text-right']">
              <el-button :type="previewPictureItem.hasLike ? 'primary' : ''" size="small"
                         @click="thumbPicture(previewPictureItem.id)">
                <Icon icon="tabler:thumb-up" />
                赞({{ previewPictureItem.likeCount || 0 }})
              </el-button>
              <el-button type="success" size="small" @click="downloadPicture()">
                <Icon icon="mage:download" />
                下载({{ transformSize(previewPictureItem.size) }})
              </el-button>
              <el-button v-if="user && previewPictureItem.userId === user.id" type="primary" size="small"
                         @click="openEditPicture">
                <Icon icon="lucide:edit" />
                修改图片描述
              </el-button>
              <el-button v-if="user && previewPictureItem.userId === user.id" type="danger" size="small"
                         @click="deletePicture(previewPictureItem.id)">
                <Icon icon="material-symbols:delete-outline" />
                删除
              </el-button>
            </el-col>
          </el-row>
          <el-row class="mt-2 text-break">
            {{ previewPictureItem.description }}
          </el-row>
        </el-col>
        <el-col :span="8" class="ps-2">
          <reply-view
            ref="replyRef"
            :show-header="false"
            :check-login="true"
            :is-fixed="false"
            @reply="replyPicture"
            @cancel="cancelReply"
          />
          <comment-view
            ref="commentRef"
            :obj-id="previewPictureItem.id"
            :login-user-id="user?.id"
            :obj-type="ObjectTypeEnum.PICTURE"
            :check-login="true"
            :obj-user-id="previewPictureItem.userId"
            :max-height="420"
            @reply-comment="replyComment"
          />
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import defaultAlbumCover from '@/assets/images/default_album_cover.jpg'
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import pictureApi from '@/api/picture'
import actionApi from '@/api/action'
import ossApi from '@/api/oss-api'
import { checkIsLogin, getBase64, isMobile, removeSameValues, transformSize } from '@/utils/common'
import { uploadFile } from '@/utils/oss-upload'
import { minute } from '@/utils/date'
import { ActionTypeEnum, AlbumCategoryTypeEnum, AlbumTypeEnum, ObjectTypeEnum, UploadFileTypeEnum } from '@/enums'
import CommentView from '@/components/comment/CommentView.vue'
import ReplyView from '@/components/comment/ReplyView.vue'
import commentApi from '@/api/comment'

const userStore = useUserStore()

const defaultPictureAlbumForm = {
  isEdit: false,
  cover: null,
  name: null,
  albumType: AlbumTypeEnum.PRIVATE,
  description: ''
}

const addPictureFormRef = ref<FormInstance | null>(null)
const addPictureAlbumFormRef = ref<FormInstance | null>(null)
const displayImageRef = ref<FormInstance | null>(null)
const replyRef = ref<InstanceType<typeof ReplyView> | null>(null)
const commentRef = ref<InstanceType<typeof CommentView> | null>(null)
const currentReplyComment = ref<any>({})
const addPictureAlbumDialogVisible = ref(false)
const addPictureDialogVisible = ref(false)
const previewPictureDialogVisible = ref(false)
const previewPictureItem = ref<any>({})
const pictureAlbumList = ref<any>([])
const pictureList = ref<any>([])
const currentActive = ref<any>(null)
const userCurrentActive = ref<any>(null)
const albumCategory = ref(AlbumCategoryTypeEnum.ALL)
const count = ref(0)
const albumCount = ref(0)
const pictureAlbumQueryParams = ref({
  pageNum: 1,
  pageSize: 12
})
const userPictureAlbumQueryParams = ref({
  pageNum: 1,
  pageSize: 12
})
const pictureQueryParams = ref({
  pageNum: 1,
  pageSize: 18
})
const userPictureQueryParams = ref({
  pageNum: 1,
  pageSize: 18
})
const pictureAlbumAddDisabled = ref(false)
const pictureAlbumPreviewCover = ref('')
const pictureAlbumForm = ref(Object.assign({}, defaultPictureAlbumForm))
const pictureAlbumRules = ref({
  name: [
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { min: 2, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ]
})
const pictureFormPreviewUrl = ref('')
const pictureForm = ref({
  isEdit: false,
  albumId: '',
  url: null,
  size: 0,
  description: '',
  width: 0,
  height: 0
})
const pictureRules = ref({
  url: [
    { required: true, message: '请上传图片', trigger: 'change' }
  ],
  description: [
    { min: 2, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ]
})

const user = computed(() => {
  return userStore.user
})

onMounted(() => {
  if (isMobile()) {
    pictureQueryParams.value.pageSize = 10
    userPictureQueryParams.value.pageSize = 10
    pictureAlbumQueryParams.value.pageSize = 5
    userPictureAlbumQueryParams.value.pageSize = 5
  }
  getPictureAlbumPageList()
  changePictureAlbum(currentActive.value)
})


function getPictureAlbumPageList() {
  pictureApi.getPictureAlbumPageList(pictureAlbumQueryParams.value.pageNum, pictureAlbumQueryParams.value.pageSize).then(res => {
    pictureAlbumList.value = res.data.records
    albumCount.value = res.data.total
  })
}

function changePictureAlbum(item: any) {
  currentActive.value = item
  pictureForm.value.albumId = item ? item.id : null
  getAlbumPicturePageList()
}

function getUserPictureAlbumPageList() {
  pictureApi.getUserPictureAlbumPageList(
    userPictureAlbumQueryParams.value.pageNum,
    userPictureAlbumQueryParams.value.pageSize).then(res => {
    pictureAlbumList.value = res.data.records
    albumCount.value = res.data.total
  })
}

function changeUserPictureAlbum(item) {
  userCurrentActive.value = item
  pictureForm.value.albumId = item ? item.id : null
  getUserAlbumPicturePageList()
}

function getAlbumPicturePageList() {
  pictureApi.getAlbumPicturePageList(
    pictureQueryParams.value.pageNum,
    pictureQueryParams.value.pageSize,
    { albumId: pictureForm.value.albumId }
  ).then(res => {
    pictureList.value = res.data.records
    count.value = res.data.total
  })
}

function getUserAlbumPicturePageList() {
  pictureApi.getUserAlbumPicturePageList(
    userPictureQueryParams.value.pageNum,
    userPictureQueryParams.value.pageSize,
    { albumId: pictureForm.value.albumId }
  ).then(res => {
    pictureList.value = res.data.records
    count.value = res.data.total
  })
}

function changePictureAlbumCategory(type: AlbumCategoryTypeEnum) {
  if (albumCategory.value === type) {
    return
  }
  if (type === AlbumCategoryTypeEnum.ALL) { // 所有公开的
    getPictureAlbumPageList()
    changePictureAlbum(currentActive.value)
  } else { // 自己所有的
    if (!checkIsLogin()) return
    getUserPictureAlbumPageList()
    changeUserPictureAlbum(userCurrentActive.value)
  }
  albumCategory.value = type
}

function openAddPictureAlbum() {
  if (!checkIsLogin()) return
  pictureAlbumForm.value = Object.assign({}, defaultPictureAlbumForm)
  pictureAlbumPreviewCover.value = ''
  pictureAlbumForm.value.isEdit = false
  addPictureAlbumDialogVisible.value = true
}

function openEditPictureAlbum() {
  if (!userCurrentActive.value) {
    ElMessage({
      message: '请选择要编辑的图库',
      type: 'warning',
      plain: true
    })
    return
  }
  pictureAlbumForm.value = Object.assign({}, userCurrentActive.value)
  pictureAlbumPreviewCover.value = pictureAlbumForm.value.cover
  pictureAlbumForm.value.isEdit = true
  addPictureAlbumDialogVisible.value = true
}

function deletePictureAlbum() {
  if (!userCurrentActive.value) {
    ElMessage({
      message: '请选择要删除的图库',
      type: 'warning',
      plain: true
    })
    return
  }
  if (userCurrentActive.value.albumType === AlbumTypeEnum.PUBLIC) {
    ElMessage({
      message: '该图库已公开, 无法自行删除, 请联系管理员删除',
      type: 'warning',
      plain: true
    })
    return
  }
  ElMessageBox.confirm(`此操作将永久删除该【${userCurrentActive.value.name}】图库和其下图片, 是否继续?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await pictureApi.deletePictureAlbum(userCurrentActive.value.id)
    ElMessage({
      message: '删除成功',
      type: 'success',
      plain: true
    })
    userCurrentActive.value = null
    userPictureAlbumQueryParams.value.pageNum = 1
    getUserPictureAlbumPageList()
  })
}

function beforePictureAlbumCoverUpload(file) {
  // 验证文件类型和大小
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage({
      message: '上传的图片大小不能超过10M',
      type: 'error',
      plain: true
    })
    return false
  }
  getBase64(file, url => {
    nextTick(() => {
      pictureAlbumPreviewCover.value = url
      pictureAlbumForm.value.cover = file
    })
  })
  return false
}

function saveOrUpdatePictureAlbum() {
  pictureAlbumAddDisabled.value = true
  if (pictureAlbumForm.value.isEdit) {
    updatePictureAlbum()
  } else {
    addPictureAlbum()
  }
}

function addPictureAlbum() {
  addPictureAlbumFormRef.value?.validate(async (valid) => {
    if (!valid) {
      pictureAlbumAddDisabled.value = false
      return false
    }
    ElMessage({
      message: '正在添加图库, 请稍等...',
      type: 'info',
      plain: true
    })
    const saveData = Object.assign({}, pictureAlbumForm.value)
    if (pictureAlbumForm.value.cover && typeof pictureAlbumForm.value.cover === 'object') {
      // 上传图片
      const res = await ossApi.getUploadSignatureUrl({
        dirType: UploadFileTypeEnum.COVER,
        fileName: pictureAlbumForm.value.cover.name
      })
      saveData.cover = await uploadFile(res.data, pictureAlbumForm.value.cover)
    }
    pictureApi.savePictureAlbum(saveData).then(() => {
      ElMessage({
        message: '添加成功',
        type: 'success',
        plain: true
      })
      cancelAddPictureAlbum()
      getUserOrPictureAlbumPageList()
    }).finally(() => {
      pictureAlbumAddDisabled.value = false
    })
  })
}

function getUserOrPictureAlbumPageList() {
  albumCategory.value === AlbumCategoryTypeEnum.ALL ? getPictureAlbumPageList() : getUserPictureAlbumPageList()
}

function changeUserOrPictureAlbum() {
  albumCategory.value === AlbumCategoryTypeEnum.ALL ? changePictureAlbum(currentActive.value) : changeUserPictureAlbum(userCurrentActive.value)
}

function updatePictureAlbum() {
  addPictureAlbumFormRef.value?.validate(async (valid) => { // 验证表单
    if (!valid) {
      pictureAlbumAddDisabled.value = false
      return false
    }
    if (pictureAlbumForm.value.type === AlbumTypeEnum.PUBLIC && userCurrentActive.value.type !== pictureAlbumForm.value.type) {
      await ElMessageBox.confirm('该图库将会公开, 图库公开后将无法转为私密和自行删除, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    }
    ElMessage({
      message: '正在更新图库, 请稍等...',
      type: 'info',
      plain: true
    })
    const saveData = removeSameValues(pictureAlbumForm.value, userCurrentActive.value)
    if (pictureAlbumForm.value.cover && typeof pictureAlbumForm.value.cover === 'object') {
      // 上传图片
      const res = await ossApi.getUploadSignatureUrl({
        dirType: UploadFileTypeEnum.COVER,
        fileName: pictureAlbumForm.value.cover.name
      })
      saveData.cover = await uploadFile(res.data, saveData.cover)
    }
    pictureApi.updatePictureAlbum(saveData).then(() => {
      ElMessage({
        message: '更新成功',
        type: 'success',
        plain: true
      })
      userCurrentActive.value = Object.assign(userCurrentActive.value, saveData)
      cancelAddPictureAlbum()
      getUserOrPictureAlbumPageList()
    }).finally(() => {
      pictureAlbumAddDisabled.value = false
    })
  })
}

function cancelAddPictureAlbum() {
  addPictureAlbumDialogVisible.value = false
}

function handlePictureAlbumCoverRemove() {
  pictureAlbumPreviewCover.value = pictureAlbumForm.value.isEdit ? userCurrentActive.value.cover : null
  pictureAlbumForm.value.cover = pictureAlbumForm.value.isEdit ? userCurrentActive.value.cover : null
}

// 图片相关

function openAddPicture() {
  if (!checkIsLogin()) return
  pictureForm.value.isEdit = false
  if ((albumCategory.value === AlbumCategoryTypeEnum.ALL && !currentActive.value)
    || (albumCategory.value === AlbumCategoryTypeEnum.MY && !userCurrentActive.value)) {
    ElMessage({
      message: '请先选择一个图库分类(【全部】除外)',
      type: 'info',
      plain: true
    })
    return
  }
  addPictureDialogVisible.value = true
}

function openEditPicture() {
  if (!checkIsLogin()) return
  pictureForm.value = Object.assign({}, previewPictureItem.value)
  pictureForm.value.isEdit = true
  addPictureDialogVisible.value = true
}

function beforePictureUpload(file) {
  // 验证文件类型和大小
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage({
      message: '上传的图片大小不能超过10M',
      type: 'error',
      plain: true
    })
    return false
  }
  // 获取图片宽高
  const reader = new FileReader()
  reader.onload = e => {
    const imgData = e.target.result
    const image = new Image()
    image.onload = () => {
      pictureForm.value.width = image.width
      pictureForm.value.height = image.height
      console.log('图片宽度:', image.width);
      console.log('图片高度:', image.height);
    }
    image.src = imgData
  }
  reader.readAsDataURL(file)
  getBase64(file, url => {
    nextTick(() => {
      pictureFormPreviewUrl.value = url
      pictureForm.value.size = file.size
      pictureForm.value.url = file
    })
  })
  return false
}

function saveOrUpdatePicture() {
  if (pictureForm.value.isEdit) {
    updatePicture()
  } else {
    addPicture()
  }
}

function addPicture() {
  addPictureFormRef.value.validate(async (valid) => {
    if (!valid) {
      return false
    }
    ElMessage({
      message: '正在添加图片, 请稍等...',
      type: 'info',
      plain: true
    })
    const saveData = Object.assign({}, pictureForm.value)
    if (typeof pictureForm.value.url === 'object') {
      // 上传图片
      const res = await ossApi.getUploadSignatureUrl({
        dirType: UploadFileTypeEnum.IMAGE,
        fileName: pictureForm.value.url.name
      })
      saveData.url = await uploadFile(res.data, pictureForm.value.url)
    }
    pictureApi.savePicture(saveData).then(() => {
      ElMessage({
        message: '添加成功',
        type: 'success',
        plain: true
      })
      cancelAddPicture()
      changeUserOrPictureAlbum()
    })
  })
}

function updatePicture() {
  pictureApi.updatePicture({
    id: pictureForm.value.id,
    description: pictureForm.value.description
  }).then(() => {
    ElMessage({
      message: '更新成功',
      type: 'success',
      plain: true
    })
    previewPictureItem.value.description = pictureForm.value.description
    cancelAddPicture()
    changeUserOrPictureAlbum()
  })
}

function cancelAddPicture() {
  addPictureDialogVisible.value = false
  pictureForm.value.url = null
  pictureFormPreviewUrl.value = null
}

function handlePictureRemove() {
  pictureFormPreviewUrl.value = null
  pictureForm.value.url = null
}

function openPreviewPicture(item) {
  previewPictureDialogVisible.value = true
  previewPictureItem.value = item
}

function downloadPicture() {
  const a = document.createElement('a')
  a.href = previewPictureItem.value.url
  a.download = previewPictureItem.value.name
  a.click()
}

function thumbPicture() {
  actionApi.addOrUpdate({
    actionType: ActionTypeEnum.LIKE,
    objType: ObjectTypeEnum.PICTURE,
    objId: previewPictureItem.value.id
  }).then(res => {
    previewPictureItem.value.hasLike = res.data
    if (res.data) {
      previewPictureItem.value.likeCount++
    } else {
      previewPictureItem.value.likeCount--
    }
  })
}

function deletePicture() {
  ElMessageBox.confirm('确定删除该图片吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    pictureApi.deletePicture({
      ids: [previewPictureItem.value.id]
    }).then(() => {
      ElMessage({
        message: '删除成功',
        type: 'success',
        plain: true
      })
      previewPictureDialogVisible.value = false
      changeUserOrPictureAlbum()
    })
  })
}

function replyPicture(val: any) {
  const { replyUserId, parentId, firstLevelId, index, replyUser } = currentReplyComment.value
  const comment = {
    objId: previewPictureItem.value.id,
    objType: ObjectTypeEnum.PICTURE,
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
    previewPictureItem.value.commentCount++
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
  if (!replyRef.value) return
  currentReplyComment.value = val
  replyRef.value?.setReplyComment({ replyComment: val })
}

function cancelReply() {
  currentReplyComment.value = {}
}
</script>

<style src="@/assets/css/picture.scss" lang="scss" scoped />
