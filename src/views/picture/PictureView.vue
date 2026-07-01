<template>
  <div class="picture_div">
    <!-- 图库分类 -->
    <el-card v-loading="pictureAlbumLoading" class="picture-container" shadow="always">
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
            <el-col :sm="9" :xs="12" class="picture-album-actions">
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
              <el-dropdown class="picture-album-actions-more" trigger="click">
                <el-button type="primary" size="small">
                  <Icon icon="ic:round-more-horiz" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="openAddPictureAlbum()">
                      <Icon icon="ic:baseline-add" />
                      添加图库
                    </el-dropdown-item>
                    <el-dropdown-item v-if="albumCategory === AlbumCategoryTypeEnum.MY" @click="openEditPictureAlbum()">
                      <Icon icon="lucide:edit" />
                      编辑图库
                    </el-dropdown-item>
                    <el-dropdown-item v-if="albumCategory === AlbumCategoryTypeEnum.MY" @click="deletePictureAlbum()">
                      <Icon icon="material-symbols:delete-outline" />
                      删除图库
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-col>
          </el-row>
        </div>
      </template>
      <!-- 全部图库 -->
      <div v-if="albumCategory === AlbumCategoryTypeEnum.ALL">
        <el-row :gutter="8" class="picture-album-grid">
          <el-col :xs="8" :sm="6" :md="4" :lg="3" class="picture-album-list-item">
            <div :class="['picture-album-list-item-div', {'is-active': currentActive === null}]" @click="changePictureAlbum(null)">
              <img :src="defaultAlbumCover" alt="" class="picture-album-list-item-img">
              <a :class="['ellipsis', currentActive === null ? 'active' : 'name']"
                 @click="changePictureAlbum(null)">全部</a>
            </div>
          </el-col>
          <el-col v-for="item in pictureAlbumList" :key="item.id" :xs="8" :sm="6" :md="4" :lg="3" class="picture-album-list-item">
            <div :class="['picture-album-list-item-div', {'is-active': currentActive && currentActive.id === item.id}]" @click="changePictureAlbum(item)">
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
            :layout="isMobile() ? 'prev, pager, next' : 'prev, pager, next, jumper'"
            :total="albumCount"
            :page-size="pictureAlbumQueryParams.pageSize"
            :pager-count="isMobile() ? 5 : 7"
            @change="getPictureAlbumPageList()"
          />
        </div>
      </div>
      <!-- 我的图库 -->
      <div v-else>
        <el-row :gutter="8" class="picture-album-grid">
          <el-col :xs="8" :sm="6" :md="4" :lg="3" class="picture-album-list-item text-center">
            <div :class="['picture-album-list-item-div', {'is-active': userCurrentActive === null}]" @click="changeUserPictureAlbum(null)">
              <img :src="defaultAlbumCover" alt="" class="picture-album-list-item-img">
              <a :class="['ellipsis', userCurrentActive === null ? 'active' : 'name']"
                 @click="changeUserPictureAlbum(null)">全部</a>
            </div>
          </el-col>
          <el-col v-for="item in pictureAlbumList" :key="item.id" :xs="8" :sm="6" :md="4" :lg="3" class="picture-album-list-item text-center">
            <div :class="['picture-album-list-item-div', {'is-active': userCurrentActive && userCurrentActive.id === item.id}]" @click="changeUserPictureAlbum(item)">
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
            :layout="isMobile() ? 'prev, pager, next' : 'prev, pager, next, jumper'"
            :total="albumCount"
            :page-size="userPictureAlbumQueryParams.pageSize"
            :pager-count="isMobile() ? 5 : 7"
            @change="getUserPictureAlbumPageList()"
          />
        </div>
      </div>
    </el-card>
    <!-- 图片列表 -->
    <el-card v-loading="pictureLoading" class="picture-container">
      <template #header>
        <div class="picture-list-header">
          <div class="picture-list-heading">
            <div class="picture-list-title-row">
              <span class="picture-list-title" v-if="albumCategory === AlbumCategoryTypeEnum.ALL">
                {{ currentActive ? currentActive.name : '全部' }}
              </span>
              <span class="picture-list-title" v-if="albumCategory === AlbumCategoryTypeEnum.MY">
                {{ userCurrentActive ? userCurrentActive.name : '全部' }}
              </span>
              <span class="picture-list-count">{{ count }} 张图片</span>
            </div>
            <div class="picture-list-desc">
              <span v-if="albumCategory === AlbumCategoryTypeEnum.ALL">
                {{ currentActive ? currentActive.description : '所有分类下的图片' }}
              </span>
              <span v-if="albumCategory === AlbumCategoryTypeEnum.MY">
                {{ userCurrentActive ? userCurrentActive.description : '所有分类下的图片' }}
              </span>
            </div>
          </div>
          <el-button type="primary" size="small" class="picture-list-add-button" @click="openAddPicture()">
            <Icon icon="ic:baseline-add" />
            添加图片
          </el-button>
        </div>
      </template>
      <el-row :gutter="12" class="picture-grid">
        <el-col v-for="item in pictureList" :key="item.id" :xs="12" :sm="8" :md="6" :lg="6" class="picture-list-item">
          <div class="picture-list-item-frame" @click="openPreviewPicture(item)">
            <img :src="item.thumbUrl || item.url" alt="" class="picture-list-item-img">
            <div class="picture-list-item-overlay">
              <span>
                <Icon icon="tabler:thumb-up" />
                {{ item.likeCount || 0 }}
              </span>
              <span>
                <Icon icon="iconamoon:comment-dots" />
                {{ item.commentCount || 0 }}
              </span>
              <span v-if="item.width && item.height" class="picture-list-item-size">{{ item.width }}x{{ item.height }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-empty v-if="pictureList.length === 0" :description="pictureEmptyDescription">
        <el-button v-if="canAddPictureToCurrentAlbum" type="primary" size="small" @click="openAddPicture()">
          <Icon icon="ic:baseline-add" />
          添加图片
        </el-button>
      </el-empty>
      <div v-if="albumCategory === AlbumCategoryTypeEnum.ALL" class="pagination-container mt-2">
        <el-pagination
          v-model:current-page="pictureQueryParams.pageNum"
          background
          :layout="isMobile() ? 'prev, pager, next' : 'prev, pager, next, jumper'"
          :total="count"
          :page-size="pictureQueryParams.pageSize"
          :pager-count="isMobile() ? 5 : 7"
          @change="getAlbumPicturePageList()"
        />
      </div>
      <div v-if="albumCategory === AlbumCategoryTypeEnum.MY" class="pagination-container mt-2">
        <el-pagination
          v-model:current-page="userPictureQueryParams.pageNum"
          background
          :layout="isMobile() ? 'prev, pager, next' : 'prev, pager, next, jumper'"
          :total="count"
          :page-size="userPictureQueryParams.pageSize"
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
        <el-button type="primary" :disabled="pictureAddDisabled" @click="saveOrUpdatePicture()">提交</el-button>
      </template>
    </el-dialog>
    <!-- 图片预览 -->
    <el-dialog v-model="previewPictureDialogVisible" destroy-on-close
               class="picture-preview-dialog" width="95%" top="20px">
      <div class="picture-preview-layout">
        <section class="picture-preview-stage">
          <div v-if="previewPicturePosition.total" class="picture-preview-counter">
            {{ previewPicturePosition.current }} / {{ previewPicturePosition.total }}
          </div>
          <button
            class="picture-preview-nav picture-preview-nav-prev"
            type="button"
            :disabled="!previousPreviewPicture"
            aria-label="上一张图片"
            @click="switchPreviewPicture('prev')"
          >
            <Icon icon="mdi:chevron-left" />
          </button>
          <div class="display-image-div">
            <img ref="displayImageRef" :src="previewPictureItem.url" alt="" class="display-image">
          </div>
          <button
            class="picture-preview-nav picture-preview-nav-next"
            type="button"
            :disabled="!nextPreviewPicture"
            aria-label="下一张图片"
            @click="switchPreviewPicture('next')"
          >
            <Icon icon="mdi:chevron-right" />
          </button>
        </section>
        <aside class="picture-preview-sidebar">
          <div class="picture-preview-info">
            <div class="picture-preview-author">
              <a :href="'user/' + previewPictureItem.userId" target="_blank" class="ellipsis">
                <el-avatar :src="previewPictureItem.user.avatar" size="small" />
                <span>{{ previewPictureItem.user.nickname }}</span>
              </a>
              <span class="picture-preview-time">
                <Icon icon="mingcute:time-line" />
                {{ minute(previewPictureItem.createTime) }}
              </span>
            </div>
            <div class="picture-preview-meta">
              <span>
                <Icon icon="clarity:picture-line" />
                {{ previewPictureItem.width }}x{{ previewPictureItem.height }}
              </span>
              <span>
                <Icon icon="mage:download" />
                {{ transformSize(previewPictureItem.size) }}
              </span>
            </div>
            <div v-if="previewPictureItem.description" class="picture-preview-description text-break">
              {{ previewPictureItem.description }}
            </div>
            <div class="picture-preview-actions">
              <el-button :type="previewPictureItem.hasLike ? 'primary' : ''" size="small"
                         :disabled="pictureActionDisabled"
                         @click="thumbPicture(previewPictureItem.id)">
                <Icon icon="tabler:thumb-up" />
                赞({{ previewPictureItem.likeCount || 0 }})
              </el-button>
              <el-button type="success" size="small" @click="downloadPicture()">
                <Icon icon="mage:download" />
                下载
              </el-button>
              <el-button v-if="user && previewPictureItem.userId === user.id" type="primary" size="small"
                         @click="openEditPicture">
                <Icon icon="lucide:edit" />
                编辑
              </el-button>
              <el-button v-if="user && previewPictureItem.userId === user.id" type="danger" size="small"
                         @click="deletePicture(previewPictureItem.id)">
                <Icon icon="material-symbols:delete-outline" />
                删除
              </el-button>
            </div>
          </div>
          <div class="picture-preview-comments">
            <div ref="emptyReplyRef" class="empty-reply-div" v-show="replyShouldFixed">
              正在评论中
            </div>
            <div class="picture-preview-reply">
              <reply-view
                ref="replyRef"
                :show-header="false"
                :check-login="true"
                :is-fixed="replyShouldFixed"
                @reply="replyPicture"
                @cancel="cancelReply"
                :class="replyShouldFixed ? 'reply-fixed': ''"
              />
            </div>
            <comment-view
              ref="commentRef"
              :obj-id="previewPictureItem.id"
              :login-user-id="user?.id"
              :obj-type="ObjectTypeEnum.PICTURE"
              :check-login="true"
              :obj-user-id="previewPictureItem.userId"
              @reply-comment="replyComment"
            />
          </div>
        </aside>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import defaultAlbumCover from '@/assets/images/default_album_cover.jpg'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import pictureApi from '@/api/picture'
import actionApi from '@/api/action'
import ossApi from '@/api/oss-api'
import {
  checkIsLogin,
  compressImageFile,
  getBase64,
  getThumbFileName,
  isMobile,
  removeSameValues,
  transformSize
} from '@/utils/common'
import { uploadFile } from '@/utils/oss-upload'
import { minute } from '@/utils/date'
import { ActionTypeEnum, AlbumCategoryTypeEnum, AlbumTypeEnum, ObjectTypeEnum, UploadFileTypeEnum } from '@/enums'
import CommentView from '@/components/comment/CommentView.vue'
import ReplyView from '@/components/comment/ReplyView.vue'
import commentApi from '@/api/comment'
import {
  getAdjacentPictureItem,
  getNextLikeCount,
  getPictureDownloadName,
  getPreviewPicturePosition,
  type PreviewDirection,
  resetPaginationPage
} from '@/views/picture/picture-view-utils'

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
const displayImageRef = ref<HTMLElement | null>(null)
const emptyReplyRef = ref<HTMLElement | null>(null)
const replyRef = ref<InstanceType<typeof ReplyView> | null>(null)
const commentRef = ref<InstanceType<typeof CommentView> | null>(null)
const currentReplyComment = ref<any>({})
const replyShouldFixed = ref(false)
const addPictureAlbumDialogVisible = ref(false)
const addPictureDialogVisible = ref(false)
const previewPictureDialogVisible = ref(false)
const pictureAlbumLoading = ref(false)
const pictureLoading = ref(false)
const pictureAddDisabled = ref(false)
const pictureActionDisabled = ref(false)
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
const pictureAlbumForm = ref<any>(Object.assign({}, defaultPictureAlbumForm))
const pictureAlbumRules = ref({
  name: [
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { min: 2, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ]
})
const pictureFormPreviewUrl = ref<string | null>('')
const pictureForm = ref<any>({
  isEdit: false,
  albumId: '',
  url: null,
  thumbUrl: null,
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
const previousPreviewPicture = computed(() => {
  return getAdjacentPictureItem(pictureList.value, previewPictureItem.value.id, 'prev')
})
const nextPreviewPicture = computed(() => {
  return getAdjacentPictureItem(pictureList.value, previewPictureItem.value.id, 'next')
})
const previewPicturePosition = computed(() => {
  return getPreviewPicturePosition(pictureList.value, previewPictureItem.value.id)
})
const canAddPictureToCurrentAlbum = computed(() => {
  return (albumCategory.value === AlbumCategoryTypeEnum.ALL && !!currentActive.value)
    || (albumCategory.value === AlbumCategoryTypeEnum.MY && !!userCurrentActive.value)
})
const pictureEmptyDescription = computed(() => {
  const activeAlbum = albumCategory.value === AlbumCategoryTypeEnum.ALL ? currentActive.value : userCurrentActive.value
  if (activeAlbum) {
    return '这个图库还没有图片'
  }
  return '请选择一个具体图库后添加图片'
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
  window.addEventListener('keydown', handlePreviewKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePreviewKeydown)
})


/**
 * 获取公开图库分页列表。
 *
 * :return: 无返回值。
 */
function getPictureAlbumPageList(): void {
  pictureAlbumLoading.value = true
  pictureApi.getPictureAlbumPageList(pictureAlbumQueryParams.value.pageNum, pictureAlbumQueryParams.value.pageSize, {}).then(res => {
    pictureAlbumList.value = res.data.records
    albumCount.value = res.data.total
  }).finally(() => {
    pictureAlbumLoading.value = false
  })
}

/**
 * 切换公开图库并重新加载图片列表。
 *
 * :param item: 当前选中的图库。
 * :return: 无返回值。
 */
function changePictureAlbum(item: any): void {
  currentActive.value = item
  pictureForm.value.albumId = item ? item.id : null
  resetPaginationPage(pictureQueryParams.value)
  getAlbumPicturePageList()
}

/**
 * 获取当前用户图库分页列表。
 *
 * :return: 无返回值。
 */
function getUserPictureAlbumPageList(): void {
  pictureAlbumLoading.value = true
  pictureApi.getUserPictureAlbumPageList(
    userPictureAlbumQueryParams.value.pageNum,
    userPictureAlbumQueryParams.value.pageSize,
    user.value?.id || '',
    {}
  ).then(res => {
    pictureAlbumList.value = res.data.records
    albumCount.value = res.data.total
  }).finally(() => {
    pictureAlbumLoading.value = false
  })
}

/**
 * 切换当前用户图库并重新加载图片列表。
 *
 * :param item: 当前选中的用户图库。
 * :return: 无返回值。
 */
function changeUserPictureAlbum(item: any): void {
  userCurrentActive.value = item
  pictureForm.value.albumId = item ? item.id : null
  resetPaginationPage(userPictureQueryParams.value)
  getUserAlbumPicturePageList()
}

/**
 * 获取公开图片分页列表。
 *
 * :return: 无返回值。
 */
function getAlbumPicturePageList(): void {
  pictureLoading.value = true
  pictureApi.getAlbumPicturePageList(
    pictureQueryParams.value.pageNum,
    pictureQueryParams.value.pageSize,
    { albumId: pictureForm.value.albumId }
  ).then(res => {
    pictureList.value = res.data.records
    count.value = res.data.total
  }).finally(() => {
    pictureLoading.value = false
  })
}

/**
 * 获取当前用户图片分页列表。
 *
 * :return: 无返回值。
 */
function getUserAlbumPicturePageList(): void {
  pictureLoading.value = true
  pictureApi.getUserAlbumPicturePageList(
    userPictureQueryParams.value.pageNum,
    userPictureQueryParams.value.pageSize,
    { albumId: pictureForm.value.albumId }
  ).then(res => {
    pictureList.value = res.data.records
    count.value = res.data.total
  }).finally(() => {
    pictureLoading.value = false
  })
}

/**
 * 切换图库分类来源。
 *
 * :param type: 图库分类来源。
 * :return: 无返回值。
 */
function changePictureAlbumCategory(type: AlbumCategoryTypeEnum): void {
  if (albumCategory.value === type) {
    return
  }
  if (type === AlbumCategoryTypeEnum.ALL) { // 所有公开的
    resetPaginationPage(pictureAlbumQueryParams.value)
    getPictureAlbumPageList()
    changePictureAlbum(currentActive.value)
  } else { // 自己所有的
    if (!checkIsLogin()) return
    resetPaginationPage(userPictureAlbumQueryParams.value)
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

function beforePictureAlbumCoverUpload(file: File) {
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
  getBase64(file, (url: string) => {
    nextTick(() => {
      pictureAlbumPreviewCover.value = url
      pictureAlbumForm.value.cover = file
    })
  })
  return false
}

/**
 * 上传压缩后的图册封面。
 *
 * :param data: 待提交的图册表单数据。
 * :param coverFile: 图册封面文件。
 * :return: 无返回值。
 */
async function uploadAlbumCover(data: any, coverFile: File): Promise<void> {
  const thumbFile = await compressImageFile(coverFile)
  const coverRes = await ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.COVER,
    fileName: getThumbFileName(coverFile.name)
  })
  data.cover = await uploadFile(coverRes.data, thumbFile)
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
  addPictureAlbumFormRef.value?.validate((async (valid: boolean) => {
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
      try {
        await uploadAlbumCover(saveData, pictureAlbumForm.value.cover)
      } catch (error) {
        pictureAlbumAddDisabled.value = false
        ElMessage({
          message: '图库封面上传失败，请稍后重试',
          type: 'error',
          plain: true
        })
        return
      }
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
  }) as any)
}

function getUserOrPictureAlbumPageList() {
  albumCategory.value === AlbumCategoryTypeEnum.ALL ? getPictureAlbumPageList() : getUserPictureAlbumPageList()
}

function changeUserOrPictureAlbum() {
  albumCategory.value === AlbumCategoryTypeEnum.ALL ? changePictureAlbum(currentActive.value) : changeUserPictureAlbum(userCurrentActive.value)
}

function updatePictureAlbum() {
  addPictureAlbumFormRef.value?.validate((async (valid: boolean) => { // 验证表单
    if (!valid) {
      pictureAlbumAddDisabled.value = false
      return false
    }
    if (pictureAlbumForm.value.albumType === AlbumTypeEnum.PUBLIC && userCurrentActive.value.albumType !== pictureAlbumForm.value.albumType) {
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
      try {
        await uploadAlbumCover(saveData, pictureAlbumForm.value.cover)
      } catch (error) {
        pictureAlbumAddDisabled.value = false
        ElMessage({
          message: '图库封面上传失败，请稍后重试',
          type: 'error',
          plain: true
        })
        return
      }
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
  }) as any)
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

function beforePictureUpload(file: File) {
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
    const imgData = e.target?.result as string
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
  getBase64(file, (url: string) => {
    nextTick(() => {
      pictureFormPreviewUrl.value = url
      pictureForm.value.size = file.size
      pictureForm.value.url = file
    })
  })
  return false
}

/**
 * 上传图库图片原图和缩略图。
 *
 * :param data: 待提交的图片表单数据。
 * :param imageFile: 原始图片文件。
 * :return: 无返回值。
 */
async function uploadPictureImage(data: any, imageFile: File): Promise<void> {
  const thumbFile = await compressImageFile(imageFile)
  const imageRes = await ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.IMAGE,
    fileName: imageFile.name
  })
  const thumbRes = await ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.THUMB,
    fileName: getThumbFileName(imageFile.name)
  })
  data.url = await uploadFile(imageRes.data, imageFile)
  data.thumbUrl = await uploadFile(thumbRes.data, thumbFile)
}

/**
 * 保存或更新图片，提交期间禁用按钮防止重复提交。
 *
 * :return: 无返回值。
 */
function saveOrUpdatePicture(): void {
  if (pictureAddDisabled.value) {
    return
  }
  pictureAddDisabled.value = true
  if (pictureForm.value.isEdit) {
    updatePicture()
  } else {
    addPicture()
  }
}

/**
 * 新增图片。
 *
 * :return: 无返回值。
 */
function addPicture(): void {
  addPictureFormRef.value?.validate((async (valid: boolean) => {
    if (!valid) {
      pictureAddDisabled.value = false
      return false
    }
    ElMessage({
      message: '正在添加图片, 请稍等...',
      type: 'info',
      plain: true
    })
    const saveData = Object.assign({}, pictureForm.value)
    if (typeof pictureForm.value.url === 'object') {
      try {
        await uploadPictureImage(saveData, pictureForm.value.url as File)
      } catch (error) {
        pictureAddDisabled.value = false
        ElMessage({
          message: '图片上传失败，请稍后重试',
          type: 'error',
          plain: true
        })
        return
      }
    }
    pictureApi.savePicture(saveData).then(() => {
      ElMessage({
        message: '添加成功',
        type: 'success',
        plain: true
      })
      cancelAddPicture()
      changeUserOrPictureAlbum()
    }).finally(() => {
      pictureAddDisabled.value = false
    })
  }) as any)
}

/**
 * 更新图片描述。
 *
 * :return: 无返回值。
 */
function updatePicture(): void {
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
  }).finally(() => {
    pictureAddDisabled.value = false
  })
}

function cancelAddPicture() {
  addPictureDialogVisible.value = false
  pictureForm.value.url = null
  pictureForm.value.thumbUrl = null
  pictureFormPreviewUrl.value = null
}

function handlePictureRemove() {
  pictureFormPreviewUrl.value = null
  pictureForm.value.url = null
  pictureForm.value.thumbUrl = null
}

/**
 * 打开图片预览弹窗。
 *
 * :param item: 当前预览图片。
 * :return: 无返回值。
 */
function openPreviewPicture(item: any): void {
  cancelReply()
  previewPictureDialogVisible.value = true
  previewPictureItem.value = item
}

/**
 * 切换预览图片。
 *
 * :param direction: 切换方向。
 * :return: 无返回值。
 */
function switchPreviewPicture(direction: PreviewDirection): void {
  const item = direction === 'prev' ? previousPreviewPicture.value : nextPreviewPicture.value
  if (!item) {
    return
  }
  openPreviewPicture(item)
}

/**
 * 处理图片预览弹窗快捷键。
 *
 * :param event: 键盘事件。
 * :return: 无返回值。
 */
function handlePreviewKeydown(event: KeyboardEvent): void {
  if (!previewPictureDialogVisible.value || isTypingTarget(event.target)) {
    return
  }
  if (event.key === 'ArrowLeft') {
    switchPreviewPicture('prev')
  }
  if (event.key === 'ArrowRight') {
    switchPreviewPicture('next')
  }
}

/**
 * 判断当前焦点是否处于输入类元素中。
 *
 * :param target: 事件目标。
 * :return: 是否处于输入类元素中。
 */
function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return !!element && ['INPUT', 'TEXTAREA'].includes(element.tagName)
}

/**
 * 下载当前预览图片。
 *
 * :return: 无返回值。
 */
function downloadPicture(): void {
  const a = document.createElement('a')
  a.href = previewPictureItem.value.url
  a.download = getPictureDownloadName(previewPictureItem.value)
  a.click()
}

/**
 * 点赞或取消点赞当前预览图片。
 *
 * :param _id: 图片 ID，保留模板调用参数。
 * :return: 无返回值。
 */
function thumbPicture(_id?: any): void {
  if (pictureActionDisabled.value) {
    return
  }
  pictureActionDisabled.value = true
  actionApi.addOrUpdate({
    actionType: ActionTypeEnum.LIKE,
    objType: ObjectTypeEnum.PICTURE,
    objId: previewPictureItem.value.id
  }).then(res => {
    previewPictureItem.value.hasLike = res.data
    previewPictureItem.value.likeCount = getNextLikeCount(previewPictureItem.value.likeCount, res.data)
  }).finally(() => {
    pictureActionDisabled.value = false
  })
}

function deletePicture(_id?: any) {
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
  if (replyRef.value) {
    replyRef.value.$el.style.width = ''
  }
  if (emptyReplyRef.value) {
    emptyReplyRef.value.style.height = ''
  }
}
</script>

<style src="@/assets/css/picture.scss" lang="scss" scoped />
