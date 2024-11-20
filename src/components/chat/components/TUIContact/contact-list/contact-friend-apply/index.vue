<template>
  <div>
    <ul class="tui-contact-list">
      <li class="tui-contact-list-item">
        <header class="tui-contact-list-item-header" @click="changeExpand">
          <div class="tui-contact-list-item-header-left">
            <Icon :icon="expand ? 'ic:baseline-expand-more' : 'lets-icons:expand-right'" />
            <div>新的联系人 ({{ total }})
            </div>
          </div>
        </header>
        <ul :class="['tui-contact-list-item-main', expand ? '' : 'hidden']">
          <li v-for="item in friendApplyList" :key="'friend_apply_' + item.id" class="tui-contact-list-item-main-item"
              @click="showContactDetail(item)">
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
                <div class="tui-contact-list-card-main-msg ellipsis">
                  {{ item.content }}
                </div>
              </div>
              <div class="tui-contact-list-card-bottom">
                <div class="tui-contact-list-card-bottom-application">
                  <div v-for="option in showApplicationStatus(item)" :key="'option_' + option.key">
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
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ApplyStatusEnum, ContactListTypeEnum } from '@/enums/ws'
import { Icon } from '@iconify/vue'
import chatApi from '@/api/chat'
import { IFriendApplyItem } from '@/interface/ws'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const chatStore = useChatStore()
const eventServer = EventServer.getInstance()

const friendApplyList = ref<IFriendApplyItem[]>([])
const expand = ref(false)

const user = computed(() => {
  return userStore.user
})
const total = computed(() => {
  return friendApplyList.value.filter(item => item.contactId === user.value.id && item.status === ApplyStatusEnum.PENDING).length
})

onMounted(() => {
  eventServer.on(EventName.FLUSH_FRIEND_APPLY_LIST, getContactApplyList)
  getContactApplyList()
})

onUnmounted(() => {
  eventServer.off(EventName.FLUSH_FRIEND_APPLY_LIST, getContactApplyList)
})

function showApplicationStatus(item: IFriendApplyItem) {
  if (item.status === ApplyStatusEnum.PENDING) {
    if (item.contactId === user.value.id) {
      return [{
        key: 'friend_apply_agree',
        style: 'button',
        type: 'success',
        label: '同意',
        icon: 'ic:round-check',
        onClick: () => {
          updateFriendApplyStatus(item, ApplyStatusEnum.AGREE)
        }
      },
        {
          key: 'friend_apply_refuse',
          style: 'button',
          type: 'danger',
          label: '拒绝',
          icon: 'ic:round-close',
          onClick: () => {
            updateFriendApplyStatus(item, ApplyStatusEnum.REFUSE)
          }
        }
      ]
    } else {
      return [{
        key: 'friend_apply_wait',
        style: 'text',
        label: '等待' + (item.contactId === user.value.id ? '' : '对方') + '验证'
      }]
    }
  } else if (item.status === ApplyStatusEnum.AGREE) {
    return [{
      key: 'friend_apply_agreed',
      style: 'text',
      label: (item.contactId === user.value.id ? '' : '对方') + '已同意'
    }]
  } else {
    return [{
      key: 'friend_apply_refused',
      style: 'text',
      label: (item.contactId === user.value.id ? '' : '对方') + '已拒绝'
    }]
  }
}

function getContactApplyList() {
  chatApi.getContactApplyList().then(res => {
    friendApplyList.value = res.data
  })
}

function updateFriendApplyStatus(item: IFriendApplyItem, status: ApplyStatusEnum) {
  chatApi.updateContactApply({
    contactId: item.userId,
    status: status
  }).then(() => {
    ElMessage({
      message: '已' + (status === ApplyStatusEnum.AGREE ? '同意' : '拒绝') + '该申请',
      type: 'success',
      plain: true
    })
    item.status = status
    chatStore.resetCurrentContact()
    eventServer.emit(EventName.FLUSH_FRIEND_APPLY_LIST)
    eventServer.emit(EventName.FLUSH_FRIEND_LIST)
  })
}

function showContactDetail(item: IFriendApplyItem) {
  chatStore.setCurrentContactType(ContactListTypeEnum.FriendApplyList)
  chatStore.setCurrentContact(item)
  chatStore.setCurrentContactOperation(showApplicationStatus(item))
}


function changeExpand() {
  expand.value = !expand.value
}

</script>
<style lang="scss" scoped src="../style/index.scss"></style>
