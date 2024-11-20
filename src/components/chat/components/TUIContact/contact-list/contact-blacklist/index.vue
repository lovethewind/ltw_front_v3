<template>
  <div>
    <ul class="tui-contact-list">
      <li class="tui-contact-list-item">
        <header class="tui-contact-list-item-header" @click="changeExpand">
          <div class="tui-contact-list-item-header-left">
            <Icon :icon="expand ? 'ic:baseline-expand-more' : 'lets-icons:expand-right'" />
            <div>黑名单 ({{ total }})
            </div>
          </div>
        </header>
        <ul :class="['tui-contact-list-item-main', expand ? '' : 'hidden']">
          <li v-for="item in blackList" :key="'blacklist_' + item.id" class="tui-contact-list-item-main-item"
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
import { Icon } from '@iconify/vue'
import { IBlackListItem } from '@/interface/ws'
import actionApi from '@/api/action'
import { ActionTypeEnum } from '@/enums'
import { ContactListTypeEnum } from '@/enums/ws'
import { useChatStore } from '@/stores/chat'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { ElMessage } from 'element-plus'

const chatStore = useChatStore()
const eventServer = EventServer.getInstance()

const blackList = ref<IBlackListItem[]>([])
const total = ref(0)
const expand = ref(false)
const currentPage = ref(1)
const pageSize = ref(100)

onMounted(() => {
  eventServer.on(EventName.FLUSH_BLACKLIST, getUserBlacklist)
  getUserBlacklist()
})

onUnmounted(() => {
  eventServer.off(EventName.FLUSH_BLACKLIST, getUserBlacklist)
})

function getUserBlacklist() {
  actionApi.getActionList(currentPage.value, pageSize.value, {
    actionType: ActionTypeEnum.BLACKLIST
  }).then(res => {
    blackList.value = [...blackList.value, ...res.data.records]
    total.value = res.data.total
    if (res.data.records.length) {
      currentPage.value++
    }
  })
}


function showApplicationStatus(item) {
  return [{
    key: 'blacklist_cancel',
    style: 'button',
    type: 'info',
    label: '取消拉黑',
    icon: 'ic:baseline-block',
    onClick: () => {
      cancelBlackList(item)
    }
  }]
}

function cancelBlackList(item: IBlackListItem) {
  actionApi.addOrUpdate({
    objId: item.objId,
    objType: item.objType,
    actionType: ActionTypeEnum.BLACKLIST
  }).then(() => {
    ElMessage({
      message: '已取消拉黑该用户',
      type: 'success',
      plain: true
    })
    blackList.value.splice(blackList.value.indexOf(item), 1)
    total.value--
    chatStore.resetCurrentContact()
    eventServer.emit(EventName.FLUSH_FRIEND_LIST)
  })
}

function showContactDetail(item: IBlackListItem) {
  chatStore.setCurrentContactType(ContactListTypeEnum.BlackList)
  chatStore.setCurrentContact(item)
  chatStore.setCurrentContactOperation(showApplicationStatus(item))
}

function changeExpand() {
  expand.value = !expand.value
}

</script>
<style lang="scss" scoped src="../style/index.scss"></style>
