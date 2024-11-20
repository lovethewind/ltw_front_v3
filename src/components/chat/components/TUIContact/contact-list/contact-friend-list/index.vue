<template>
  <div>
    <ul class="tui-contact-list">
      <li class="tui-contact-list-item">
        <header class="tui-contact-list-item-header" @click="changeExpand">
          <div class="tui-contact-list-item-header-left">
            <Icon :icon="expand ? 'ic:baseline-expand-more' : 'lets-icons:expand-right'" />
            <div>我的好友 ({{ total }})
            </div>
          </div>
        </header>
        <ul :class="['tui-contact-list-item-main', expand ? '' : 'hidden']">
          <li v-for="item in friendList" :key="'friend_' + item.id" class="tui-contact-list-item-main-item"
              @click="showContactDetail(item)">
            <div class="tui-contact-list-card">
              <div class="tui-contact-list-card-left">
                <el-avatar
                  class="tui-contact-list-card-left-avatar"
                  :src="item.userProfile.avatar"
                />
              </div>
              <div class="tui-contact-list-card-main">
                <div class="tui-contact-list-card-main-name">
                  {{ item.userProfile.nickname }}
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
import { onMounted, onUnmounted, ref } from 'vue'
import { ContactListTypeEnum, ContactTypeEnum } from '@/enums/ws'
import { Icon } from '@iconify/vue'
import chatApi from '@/api/chat'
import actionApi from '@/api/action'
import { IFriend } from '@/interface/ws'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { useChatStore } from '@/stores/chat'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'

const chatStore = useChatStore()
const eventServer = EventServer.getInstance()
const friendList = ref<IFriend[]>([])
const total = ref(0)
const expand = ref(true)
const currentPage = ref(1)
const pageSize = ref(500)

function showApplicationStatus(item) {
  return [{
    key: 'friend_conversation',
    style: 'button',
    type: 'primary',
    label: '发消息',
    icon: 'tabler:send',
    onClick: () => {
      startConversation(item)
    }
  },
    {
      key: 'friend_delete',
      style: 'button',
      type: 'danger',
      label: '删除好友',
      icon: 'ant-design:user-delete-outlined',
      onClick: () => {
        deleteContact(item)
      }
    },
    {
      key: 'friend_block',
      style: 'button',
      type: 'info',
      label: '拉黑',
      icon: 'ic:baseline-block',
      onClick: () => {
        blockContact(item)
      }
    }]
}

onMounted(() => {
  eventServer.on(EventName.FLUSH_FRIEND_LIST, getContactGroupList)
  getContactGroupList()
})

onUnmounted(() => {
  eventServer.off(EventName.FLUSH_FRIEND_LIST, getContactGroupList)
})

function getContactGroupList() {
  chatApi.getContactPageList(ContactTypeEnum.USER, currentPage.value, pageSize.value).then(res => {
    friendList.value = res.data.records
    total.value = res.data.total
  })
}

function startConversation(item: IFriend) {
  chatApi.getConversationDetail({
    contactId: item.contactId,
    contactType: item.contactType
  }).then(res => {
    eventServer.emit(EventName.START_CONVERSATION_CHANGE_TO_CONTACT, res.data)
  })
}

function deleteContact(item: IFriend) {
  ElMessageBox.confirm(`确定删除好友【${item.userProfile.nickname}】?`, '提示').then(() => {
    chatApi.deleteContact({
      contactId: item.contactId
    }).then(() => {
      ElMessage({
        message: '删除成功',
        type: 'success',
        plain: true
      })
      eventServer.emit(EventName.FLUSH_FRIEND_LIST)
      chatStore.resetCurrentContact()
    })
  }).catch(() => {
  })
}

function blockContact(item: IFriend) {
  ElMessageBox.confirm(`确定拉黑好友【${item.userProfile.nickname}】?`, '提示').then(() => {
    actionApi.addOrUpdate({
      objId: item.contactId,
      objType: ObjectTypeEnum.USER,
      actionType: ActionTypeEnum.BLACKLIST
    }).then(() => {
      ElMessage({
        message: '已拉黑该用户',
        type: 'success',
        plain: true
      })
      eventServer.emit(EventName.FLUSH_FRIEND_LIST)
      eventServer.emit(EventName.FLUSH_BLACKLIST)
      chatStore.resetCurrentContact()
    })
  }).catch(() => {
  })
}

function showContactDetail(item: IFriend) {
  chatStore.setCurrentContactType(ContactListTypeEnum.FriendList)
  chatStore.setCurrentContact(item)
  chatStore.setCurrentContactOperation(showApplicationStatus(item))
}

function changeExpand() {
  expand.value = !expand.value
}

</script>
<style lang="scss" scoped src="../style/index.scss"></style>
