<template>
  <div class="chat-header">
    <div class="chat-header-container">
      <el-popover v-if="currentConversation?.userProfile" trigger="click" width="360" popper-class="chat-user-popover chat-header-user-popover" @show="getUserDetail">
        <template #default>
          <div v-if="userDetail" class="more-info">
            <div class="more-info-profile">
              <el-avatar :size="68" :src="userDetail.avatar" />
              <div class="more-info-profile-main">
                <div class="more-info-name">
                  <span>{{ userDetail.nickname }}</span>
                  <GenderBadge :gender="userDetail.gender" />
                </div>
                <div class="more-info-summary">
                  {{ userDetail.summary || '这个人还没有签名' }}
                </div>
              </div>
            </div>
            <div class="more-info-meta">
              <div class="more-info-meta-item">
                <Icon icon="mdi:id-card-outline" />
                <span>UID</span>
                <strong>{{ userDetail.uid }}</strong>
              </div>
              <div class="more-info-meta-item">
                <Icon icon="mdi:sprout-outline" />
                <span>站龄</span>
                <strong>{{ formatRegisterTime(userDetail.registerTime) }}</strong>
              </div>
              <div class="more-info-meta-item">
                <Icon icon="mdi:map-marker-outline" />
                <span>IP属地</span>
                <strong>{{ userDetail.address || '未知' }}</strong>
              </div>
            </div>
            <div class="more-info-stats">
              <div>
                <strong>{{ userDetail.articleCount }}</strong>
                <span>文章</span>
              </div>
              <div>
                <strong>{{ userDetail.commentCount }}</strong>
                <span>评论</span>
              </div>
              <div>
                <strong>{{ userDetail.fansCount }}</strong>
                <span>粉丝</span>
              </div>
              <div>
                <strong>{{ userDetail.viewCount }}</strong>
                <span>访问</span>
              </div>
            </div>
            <div class="more-info-actions">
              <el-button v-if="!userDetail.isFriend && !userDetail.isBlocked" type="primary" size="small"
                         @click="addFriend">
                <Icon icon="tdesign:user-add" />
                添加好友
              </el-button>
              <el-button type="info" size="small" @click="blockUser">
                <Icon icon="ic:baseline-block" />
                {{ userDetail?.isBlocked ? '取消拉黑' : '拉黑' }}
              </el-button>
            </div>
          </div>
        </template>
        <template #reference>
          <el-avatar
            class="chat-header-avatar"
            shape="square"
            :src="currentConversation.userProfile.avatar"
          />
        </template>
      </el-popover>
      <el-avatar
        v-else-if="currentConversation?.groupProfile"
        class="chat-header-avatar"
        shape="square"
        :src="currentConversation.groupProfile.avatar"
      />
      <span class="chat-header-title">
        {{ currentConversation?.userProfile?.nickname || currentConversation?.groupProfile?.name }}
      </span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import userApi from '@/api/user'
import chatApi from '@/api/chat'
import actionApi from '@/api/action'
import type { IUserDetail } from '@/interface'
import { formatRegisterTime } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ContactTypeEnum } from '@/enums/ws'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import GenderBadge from '@/components/base/GenderBadge.vue'

const chatStore = useChatStore()
const userStore = useUserStore()
const userDetail = ref<IUserDetail>()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})
const user = computed(() => {
  return userStore.user
})

function getUserDetail() {
  if (currentConversation.value?.userProfile) {
    userApi.getUserById(currentConversation.value.userProfile.id).then(res => {
      userDetail.value = res.data
    })
  }
}

function addFriend() {
  if (currentConversation.value?.userProfile) {
    ElMessageBox.prompt('请输入申请信息', '添加好友', {
      inputValue: '我是' + (user.value?.nickname || '')
    }).then(({ value }) => {
      chatApi.postContactApply({
        contactId: userDetail.value?.id,
        contactType: ContactTypeEnum.USER,
        content: value
      }).then(() => {
        ElMessage({
          message: '发送好友申请成功',
          type: 'success',
          plain: true
        })
      })
    }).catch(() => {
    })
  }
}

function blockUser() {
  if (currentConversation.value?.userProfile) {
    ElMessageBox.confirm('确定要' + (userDetail.value?.isBlocked ? '取消' : '') + '拉黑该用户吗？', '提示').then(() => {
      actionApi.addOrUpdate({
        objId: userDetail.value?.id,
        objType: ObjectTypeEnum.USER,
        actionType: ActionTypeEnum.BLACKLIST
      }).then((res) => {
        ElMessage({
          message: '操作成功',
          type: 'success',
          plain: true
        })
        if (userDetail.value) {
          userDetail.value.isBlocked = res.data
        }
      })
    }).catch(() => {
    })
  }
}

</script>
<style lang="scss" scoped>
@import "@/assets/css/variables";

.more-info {
  padding: 4px;
  color: #25313d;

  &-profile {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e8edf2;

    .el-avatar {
      flex: 0 0 auto;
      border-radius: 14px;
      box-shadow: 0 10px 22px rgba(31, 41, 51, 0.12);
    }
  }

  &-profile-main {
    min-width: 0;
  }

  &-name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: #1f2933;
    font-size: 17px;
    font-weight: 700;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &-summary {
    margin-top: 5px;
    color: #73808c;
    font-size: 13px;
    line-height: 18px;
    word-break: break-word;
  }

  &-meta {
    display: grid;
    gap: 9px;
    padding-top: 14px;
  }

  &-meta-item {
    display: grid;
    grid-template-columns: 22px 54px minmax(0, 1fr);
    align-items: center;
    color: #73808c;
    font-size: 13px;

    svg {
      width: 17px;
      height: 17px;
      color: #2f8f83;
    }

    strong {
      min-width: 0;
      color: #25313d;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #e8edf2;

    div {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      min-width: 0;
    }

    strong {
      color: #1f2933;
      font-size: 16px;
      font-weight: 700;
    }

    span {
      color: #8794a1;
      font-size: 12px;
    }
  }

  &-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;

    .el-button {
      min-width: 86px;
      border-radius: 8px;
    }
  }
}

.chat-header {
  display: flex;
  min-width: 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e8edf2;
  background: #fff;

  &-container {
    display: inline-flex;
    justify-content: flex-start;
    align-items: center;
    min-width: 0;
    gap: 10px;
    font-size: 16px;
    font-weight: 500;
  }

  &-avatar {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    cursor: pointer;
  }

  &-title {
    min-width: 0;
    overflow: hidden;
    color: #1f2933;
    font-weight: 600;
    line-height: 24px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-content {
    margin-right: 20px;
    flex: 1;
    font-size: 16px;
    line-height: 28px;
    font-family: PingFangSC-Medium, serif;
    font-weight: 500;
    color: #1f2933;
    letter-spacing: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &-back,
  &-setting {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    color: #60707f;
    transition: background-color 160ms ease, color 160ms ease;

    &:hover {
      background: #edf3f5;
      color: #2f8f83;
    }
  }
}

html.dark {
  .more-info {
    color: #e5e7eb;

    &-profile,
    &-stats {
      border-color: $dark-border-color;
    }

    &-name,
    &-meta-item strong,
    &-stats strong {
      color: #f3f4f6;
    }

    &-summary,
    &-meta-item,
    &-stats span {
      color: #9ca3af;
    }

    &-meta-item svg {
      color: #37D18C;
    }
  }

  .chat-header {
    border-bottom: 1px solid $dark-border-color;
    background: $dark-main-color;

    &-title,
    &-content {
      color: #e5e7eb;
    }

    &-back,
    &-setting {
      color: #9ca3af;

      &:hover {
        background: $dark-hover-color;
        color: #37D18C;
      }
    }
  }
}

:global(.chat-user-popover) {
  padding: 14px;
  border: 1px solid #dfe7ee;
  border-radius: 10px;
  box-shadow: 0 18px 44px rgba(31, 41, 51, 0.14);
}

:global(html.dark .chat-user-popover) {
  border-color: $dark-border-color;
  background: #232425;
}
</style>
