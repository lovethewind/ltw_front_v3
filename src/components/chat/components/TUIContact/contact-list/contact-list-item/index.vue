<template>
  <div class="tui-contact-list-card">
    <div class="tui-contact-list-card-left">
      <el-avatar
        class="tui-contact-list-card-left-avatar"
        :src="item.userProfile?.avatar"
      />
    </div>
    <div class="tui-contact-list-card-main">
      <div class="tui-contact-list-card-main-name">
        {{ item.userProfile?.nickname }}
      </div>
      <div v-if="item.content" class="tui-contact-list-card-main-msg">
        {{ item.content }}
      </div>
      <div v-if="item.content" class="tui-contact-list-card-main-msg">
        {{ covertTimeHowLongAgo(item.createTime) }}
      </div>
    </div>
    <div class="tui-contact-list-card-bottom">
      <div
        v-if="showApplicationStatus"
        class="tui-contact-list-card-bottom-application"
      >
        <div v-for="option in showApplicationStatus" :key="'option_' + option.key">
          <div
            v-if="option.style === 'text'"
            class="tui-contact-list-card-bottom-application-text"
          >
            {{ option.label }}
          </div>
          <el-button
            v-else-if="option.style === 'button'"
            :type="option.type"
            size="small"
            class="tui-contact-list-card-bottom-application-bottom"
            @click="option.onClick"
          >
            {{ option.label }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { IContactListType, IOption } from '@/interface/ws'
import { useUserStore } from '@/stores/user'
import { ApplyStatusEnum, ContactListTypeEnum } from '@/enums/ws'
import chatApi from '@/api/chat'
import { covertTimeHowLongAgo } from '@/utils/date'

interface IProps {
  item: IContactListType,
  type: ContactListTypeEnum
}

const props = defineProps<IProps>()

const { item, type } = toRefs(props)
const userStore = useUserStore()

const user = computed(() => {
  return userStore.user
})

const showApplicationStatus: IOption[] = computed(() => {
  if (type.value === ContactListTypeEnum.FriendApplyList) {
    if (item.value?.status === ApplyStatusEnum.PENDING) {
      if (item.value?.contactId === user.value.id) {
        return [{
          key: 'agree',
          style: 'button',
          type: 'success',
          label: '同意',
          onClick: () => {
            updateFriendApplyStatus(ApplyStatusEnum.AGREE)
          }
        },
          {
            key: 'refuse',
            style: 'button',
            type: 'danger',
            label: '拒绝',
            onClick: () => {
              updateFriendApplyStatus(ApplyStatusEnum.REFUSE)
            }
          }
        ]
      } else {
        return [{
          key: 'wait',
          style: 'text',
          label: '等待验证'
        }]
      }
    } else if (item.value?.status === ApplyStatusEnum.AGREE) {
      return [{
        key: 'agreed',
        style: 'text',
        label: '已同意'
      }]
    } else {
      return [{
        key: 'refused',
        style: 'text',
        label: '已拒绝'
      }]
    }
  }
  return false
})

function updateFriendApplyStatus(status: ApplyStatusEnum) {
  chatApi.updateContactApply({
    applyId: item.value?.id,
    status: status
  }).then(() => {
    item.value.status = status
  })
}
</script>
<style lang="scss" scoped>
.tui-contact-list-card {
  padding: 5px 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  flex: 1;

  &-left {
    position: relative;
    width: 36px;
    height: 36px;

    &-avatar {
      width: 36px;
      height: 36px;
      border-radius: 5px;
    }

    .online-status {
      box-sizing: border-box;
      position: absolute;
      width: 10px;
      height: 10px;
      left: 30px;
      top: 30px;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
      border-radius: 50%;

      &-online {
        background: #29cc85;
      }

      &-offline {
        background: #a4a4a4;
      }
    }
  }

  &-main {
    flex: 1;
    padding: 0 10px;
    overflow: hidden;

    &-name,
    &-other {
      font-size: 14px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &-msg {
      font-size: 12px;
      padding-top: 5px;
    }

    &-other {
      color: #999;
    }
  }

  &-bottom {
    text-align: right;

    &-group-type {
      padding: 0 4px;
      line-height: 14px;
      font-size: 12px;
      border-radius: 1px;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(0, 0, 0, 0.3);
    }

    &-application {
      &-text {
        color: #999;
        font-size: 12px;
      }

      &-bottom {
        margin-top: 5px;
      }
    }
  }
}
</style>
