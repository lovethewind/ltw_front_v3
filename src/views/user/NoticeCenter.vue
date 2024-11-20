<template>
  <div v-if="user">
    <div class="tabs-container">
      <el-row>
        <el-col :md="4" class="user-menu pe-2">
          <el-card>
            <el-menu :default-active="currentActiveMenu.index">
              <el-menu-item v-for="noticeType in NoticeTypeList" :key="'noticeTypeItem' + noticeType.value"
                            :index="noticeType.index"
                            @click="selectNotice(noticeType)">
                <template #title>
                  <Icon :icon="noticeType.icon" />
                  <el-badge v-if="noticeUnreadCountMap[noticeType.value]"
                            :value="noticeUnreadCountMap[noticeType.value]" :offset="[12, 27]">
                    {{ noticeType.name }}
                  </el-badge>
                  <span v-else>{{ noticeType.name }}</span>
                </template>
              </el-menu-item>
            </el-menu>
          </el-card>
        </el-col>
        <el-col :md="20">
          <el-card class="mb-1">
            <div class="p-2">
              <span class="font-18 font-500 d-inline-flex align-items-center">
                <Icon :icon="currentActiveMenu.icon" />
                {{ currentActiveMenu.name }}({{ total }})
              </span>
              <span class="notice-op">
                <el-checkbox v-model="hasSelectAll" @click="checkAllShow()" class="me-2">全选</el-checkbox>
                <a @click="deleteSelectNotice()" class="me-2">
                  <Icon icon="material-symbols:delete-outline" />
                  删除选中项
                </a>
                <a @click="updateSelectNoticeReadStatus()" class="me-4">
                  <Icon icon="material-symbols:mark-email-read-outline" />
                  标记为已读
                </a>
                <a @click="clearNotice()">
                  <Icon icon="icon-park-outline:clear" />
                  清空消息
                </a>
              </span>
            </div>
          </el-card>
          <el-card>
            <div class="notice-content-div">
                <el-row v-for="notice in noticeDataList" :key="'notice_' + notice.id" class="notice-item"
                        @click="updateNoticeReadStatus(notice)">
                  <el-col :span="1">
                    <el-checkbox-group v-model="checkList">
                    <el-checkbox :value="notice.id" />
                    </el-checkbox-group>
                  </el-col>
                  <el-col :span="23">
                    <div class="notice-title">
                      <el-tag v-if="notice.noticeType === NoticeTypeEnum.SYSTEM" size="small" type="danger"
                              class="me-2">系统
                      </el-tag>
                      <a v-else :href="'/user/' + notice.detail.fromUser.id" target="_blank">
                        <el-avatar :src="notice.detail.fromUser.avatar" size="small" />
                        <span class="ms-1">{{ notice.detail.fromUser.nickname }}</span>
                      </a>
                      <el-badge is-dot v-if="!notice.isRead" :offset="[10, 6]">
                        {{ notice.title }}
                      </el-badge>
                      <span v-else>{{ notice.title }}</span>
                    </div>
                    <div class="notice-second">
                      <div class="notice-content">
                        {{ notice.content }}
                      </div>
                      <blockquote v-if="![NoticeTypeEnum.FOLLOW, NoticeTypeEnum.SYSTEM].includes(notice.noticeType)">
                        <div v-if="[notice.detail.objType, notice.detail.commentType].includes(ObjectTypeEnum.ARTICLE)">
                          <el-tag size="small" type="warning">文章</el-tag>
                          <a :href="'/article/' + notice.detail.objId" target="_blank">
                            {{ notice.detail.objContent }}
                          </a>
                        </div>
                        <div v-if="[notice.detail.objType, notice.detail.commentType].includes(ObjectTypeEnum.PICTURE)">
                          <el-tag size="small" type="primary">图片</el-tag>
                          <el-image :src="notice.detail.objContent" class="w-50"
                                    :preview-src-list="[notice.detail.objContent]" />
                        </div>
                        <div v-if="[notice.detail.objType, notice.detail.commentType].includes(ObjectTypeEnum.SHARE)">
                          <el-tag size="small" type="success">分享</el-tag>
                          <a href="/share" target="_blank">
                            {{ notice.detail.objContent }}
                          </a>
                        </div>
                        <div v-if="notice.detail?.commentId" class="font-12">
                          原评论: {{ notice.detail?.commentContent }}
                        </div>
                      </blockquote>
                    </div>
                    <div class="notice-item-op">
                      <el-row>
                        <el-col :span="12" class="notice-op-left font-12">
                          <Icon icon="solar:calendar-broken" />
                          {{ covertTimeHowLongAgo(notice.createTime) }}
                        </el-col>
                        <el-col :span="12" class="justify-content-end">
                          <a @click="deleteNotice([notice.id])">
                            <Icon icon="material-symbols:delete-outline" />
                            删除
                          </a>
                        </el-col>
                      </el-row>
                    </div>
                  </el-col>
                </el-row>
            </div>
            <LoadMore :total="total" :no-more="noMore" :loading-rows="20" :empty-height="600" @load="getNoticeList" />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import noticeApi from '@/api/notice'
import { Icon } from '@iconify/vue'
import { NoticeTypeEnum, ObjectTypeEnum } from '@/enums'
import { NoticeTypeList } from '@/utils/constant'
import { INotice } from '@/interface'
import { covertTimeHowLongAgo } from '@/utils/date'
import LoadMore from '@/components/base/LoadMore.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'


const route = useRoute()
const userStore = useUserStore()

const currentActiveMenu = ref(NoticeTypeList[0])
const currentPage = ref(1)
const pageSize = ref(10)
const noticeDataList = ref<INotice[]>([])
const noticeUnreadCountMap = ref({})
const total = ref(0)
const checkList = ref<string[]>([])
const hasSelectAll = ref(false)
const eventServer = EventServer.getInstance()

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return noticeDataList.value.length >= total.value
})

onMounted(() => {
  const noticeType = route.params.noticeType || NoticeTypeEnum.SYSTEM
  currentActiveMenu.value = NoticeTypeList.find(item => item.index === noticeType)
  getNoticeUnreadCount()
  getNoticeList()
})

function getNoticeUnreadCount() {
  eventServer.emit(EventName.FLUSH_NOTICE_UNREAD_COUNT)
  noticeApi.getUnreadCount().then(res => {
    noticeUnreadCountMap.value = res.data
  })
}


function getNoticeList() {
  noticeApi.getNoticeList(currentActiveMenu.value.value, currentPage.value, pageSize.value).then(res => {
    noticeDataList.value = [...noticeDataList.value, ...res.data.records]
    total.value = res.data.total
    if (res.data.records.length) {
      currentPage.value++
    }
  })
}

function updateNoticeReadStatus(notice: INotice) {
  if (notice.isRead) {
    return
  }
  noticeApi.updateNoticeReadStatus({
    ids: [notice.id]
  }).then(() => {
    notice.isRead = true
    getNoticeUnreadCount()
  })
}

function updateSelectNoticeReadStatus() {
  if (!checkList.value.length) {
    ElMessage({
      message: '请选择要标记为已读的通知',
      type: 'warning',
      plain: true
    })
    return
  }
  ElMessageBox.confirm(`确定将当前选中的${checkList.value.length}条通知标记为已读吗?`, '提示').then(() => {
    const noticeIds = noticeDataList.value.filter(item => !item.isRead && checkList.value.includes(item.id)).map(item => {
      item.isRead = true
      return item.id
    })
    if (noticeIds.length === 0) {
      checkList.value = []
      hasSelectAll.value = false
      return
    }
    noticeApi.updateNoticeReadStatus({
      ids: noticeIds
    }).then(() => {
      checkList.value = []
      hasSelectAll.value = false
      getNoticeUnreadCount()
    })
  })
}

function deleteNotice(noticeIds: string[]) {
  ElMessageBox.confirm(`确定要删除选中的${checkList.value.length}条通知吗?`, '提示').then(() => {
    noticeApi.deleteNotice({
      ids: noticeIds
    }).then(() => {
      noticeDataList.value = noticeDataList.value.filter(item => !noticeIds.includes(item.id))
      checkList.value = []
      hasSelectAll.value = false
      getNoticeUnreadCount()
      if (noticeDataList.value.length === 0) {
        currentPage.value--
        getNoticeList()
      }
    })
  })
}

function deleteSelectNotice() {
  if (!checkList.value.length) {
    ElMessage({
      message: '请选择要删除的通知',
      type: 'warning',
      plain: true
    })
    return
  }
  deleteNotice(checkList.value)
}

function clearNotice() {
  if (noticeDataList.value.length === 0) {
    ElMessage({
      message: '当前没有通知',
      type: 'warning',
      plain: true
    })
    return
  }
  ElMessageBox.confirm(`确定要清空所有通知吗?`, '提示').then(() => {
    noticeApi.clearNotice(currentActiveMenu.value.value).then(() => {
      getNoticeUnreadCount()
      reset()
    })
  })
}

function checkAllShow() {
  checkList.value = (hasSelectAll.value ? [] : noticeDataList.value.map(item => item.id))
}

function selectNotice(noticeType: any) {
  if (currentActiveMenu.value.index === noticeType.index) return
  currentActiveMenu.value = NoticeTypeList.find(item => item.index === noticeType.index)
  reset()
}

function reset() {
  noticeDataList.value = []
  currentPage.value = 1
  hasSelectAll.value = false
  checkList.value = []
  total.value = 0
  eventServer.emit(EventName.FLUSH_NOTICE_UNREAD_COUNT)
  getNoticeList()
}

</script>

<style lang="scss" scoped>
.tabs-container {
  max-width: 80vw;
  margin: 10px auto;
  padding: 10px;

  svg {
    margin-right: 3px;
  }

  .el-row {
    width: 100%;
  }

  .notice-op {
    float: right;
    display: flex;
    align-items: center;

    a {
      font-weight: 500;
      display: flex;
      align-items: center;
      svg {
        margin-right: 1px;
      }
    }
  }
}

blockquote {
  line-height: 2;
  margin: 0 auto 10px auto;
  font-size: 15px;
  color: gray;
  padding: 10px 5px;
  background-color: #f2f3f5;
  border-radius: 4px;

  a {
    color: gray;
  }

  div {
    display: flex;
    align-items: center;
  }

  .el-tag {
    margin-right: 5px;
  }
}

.notice-content-div {
  padding: 10px;

  .notice-item {
    margin-bottom: 25px;

    .notice-title {
      font-size: 16px;
      padding-bottom: 10px;
      display: flex;
      align-items: center;

      a {
        font-size: 14px;
        display: flex;
        align-items: center;
        margin-right: 5px;
      }
    }

    .notice-second {
      .notice-content {
        font-weight: 500;
        word-break: break-word;
        margin-bottom: 10px;
      }
    }

    .notice-item-op {
      .el-row {
        border-bottom: 1px solid #f0f0f0;

        .el-col {
          display: flex;
          align-items: center;

          a {
            display: flex;
            align-items: center;
          }
        }
      }
    }
  }
}
</style>
