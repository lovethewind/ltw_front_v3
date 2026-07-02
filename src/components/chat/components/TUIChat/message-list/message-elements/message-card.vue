<template>
  <div :class="['message-card', showDirection]">
    <el-row :class="{'row-reverse': isSelf}">
      <el-col :span="2">
        <el-popover trigger="click" width="320" popper-class="chat-user-popover" @show="getMessageUserDetail">
          <template #default>
            <div v-if="userDetail" class="more-info">
              <div class="more-info-profile">
                <el-avatar :size="64" :src="userDetail.avatar" />
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
              <div v-if="!isSelf" class="more-info-actions">
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
              shape="square"
              class="avatar"
              :src="avatarUrl"
            />
          </template>
        </el-popover>
      </el-col>
      <el-col :span="20" :class="isSelf ? 'pe-2': 'ps-2'">
        <el-row>
          <el-col :span="24" class="nickname">
            <span v-if="isSelf">{{ user?.nickname }}</span>
            <span v-else>{{ message.userProfile?.nickname || message.groupProfile?.name }}</span>
          </el-col>
          <el-col :span="24" class="nickname">
            <div v-if="isSelf" class="message-status">
              <slot name="status" />
            </div>
            <div class="message-card-content">
              <slot name="content"></slot>
            </div>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import userApi from '@/api/user'
import chatApi from '@/api/chat'
import actionApi from '@/api/action'
import type { IUserDetail } from '@/interface'
import type { IChatMessage } from '@/interface/ws'
import { formatRegisterTime } from '@/utils/date'
import GenderBadge from '@/components/base/GenderBadge.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ContactTypeEnum } from '@/enums/ws'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'

interface IProps {
  message: IChatMessage | any
}

const props = defineProps<IProps>()
const { message } = toRefs(props)
const userStore = useUserStore()
const eventServer = EventServer.getInstance()
const userDetail = ref<IUserDetail>()

const user = computed(() => {
  return userStore.user
})
const showDirection = computed(() => {
  return message.value.userId === user.value?.id ? 'is-me' : 'is-other'
})
const isSelf = computed(() => {
  return message.value.userId === user.value?.id
})
const avatarUrl = computed(() => {
  return isSelf.value ? user.value?.avatar : message.value.userProfile?.avatar || message.value.groupProfile?.avatar
})
const messageUserId = computed(() => {
  return isSelf.value ? user.value?.id : message.value.userProfile?.id || message.value.userId
})

/**
 * 获取当前消息头像对应的用户详情。
 *
 * :return: 无返回值。
 */
function getMessageUserDetail(): void {
  if (!messageUserId.value) return
  userApi.getUserById(messageUserId.value).then(res => {
    userDetail.value = res.data
  })
}

/**
 * 发送好友申请。
 *
 * :return: 无返回值。
 */
function addFriend(): void {
  if (!userDetail.value || isSelf.value) return
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
      eventServer.emit(EventName.FLUSH_FRIEND_APPLY_LIST)
    })
  }).catch(() => {
  })
}

/**
 * 拉黑或取消拉黑当前消息头像用户。
 *
 * :return: 无返回值。
 */
function blockUser(): void {
  if (!userDetail.value || isSelf.value) return
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
      eventServer.emit(EventName.FLUSH_FRIEND_LIST)
      eventServer.emit(EventName.FLUSH_BLACKLIST)
    })
  }).catch(() => {
  })
}
</script>

<style scoped lang="scss">
@import "@/assets/css/variables";

.row-reverse {
  flex-direction: row-reverse;
}

.message-card {
  width: min(76%, 680px);
  margin-left: 0;
  margin-bottom: 4px;

  .avatar {
    width: 36px;
    height: 36px;
    margin-top: 18px;
    border-radius: 8px;
    cursor: pointer;
    transition: box-shadow 160ms ease, transform 160ms ease;

    &:hover {
      box-shadow: 0 8px 18px rgba(31, 41, 51, 0.16);
      transform: translateY(-1px);
    }
  }

  .nickname {
    display: flex;
    align-items: center;

    .message-status {
      margin: 0 5px;
    }

    span {
      font-size: 12px;
      color: #8794a1;
    }
  }

  .message-card-content{
    max-width: 100%;
    display: inline-flex;
    border-radius: 8px;
    color: #1f2933;
    position: relative;
  }

}

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
    font-size: 16px;
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

  &-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #e8edf2;

    .el-button {
      min-width: 86px;
      border-radius: 8px;
    }
  }
}

.is-other {
  padding-left: 2px;
  margin-right: auto;

  .nickname {
    text-align: left;
  }

}

.is-me {
  margin-left: auto;
  padding-right: 2px;

  .nickname {
    text-align: right;
    display: inline-flex;
    align-items: center;
    justify-content: end;
  }
}

html.dark {
  .message-card {
    .nickname {
      span {
        color: #9ca3af;
      }
    }

    .message-card-content {
      color: #e5e7eb;
    }
  }

  .more-info {
    color: #e5e7eb;

    &-profile {
      border-bottom-color: $dark-border-color;
    }

    &-actions {
      border-top-color: $dark-border-color;
    }

    &-name,
    &-meta-item strong {
      color: #f3f4f6;
    }

    &-summary,
    &-meta-item {
      color: #9ca3af;
    }

    &-meta-item svg {
      color: #37D18C;
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
