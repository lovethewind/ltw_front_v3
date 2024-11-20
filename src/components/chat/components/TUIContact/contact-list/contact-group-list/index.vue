<template>
  <div>
    <ul class="tui-contact-list">
      <li class="tui-contact-list-item">
        <header class="tui-contact-list-item-header" @click="changeExpand">
          <div class="tui-contact-list-item-header-left">
            <Icon :icon="expand ? 'ic:baseline-expand-more' : 'lets-icons:expand-right'" />
            <div>我的群聊 ({{ total }})
            </div>
          </div>
        </header>
        <ul :class="['tui-contact-list-item-main', expand ? '' : 'hidden']">
          <li v-for="item in groupList" :key="'group_' + item.id" class="tui-contact-list-item-main-item">
            <div class="tui-contact-list-card">
              <div class="tui-contact-list-card-left">
                <el-avatar
                  class="tui-contact-list-card-left-avatar"
                  :src="item.avatar"
                />
              </div>
              <div class="tui-contact-list-card-main">
                <div class="tui-contact-list-card-main-name">
                  {{ item.name }}
                </div>
              </div>
              <div class="tui-contact-list-card-bottom">
                <div class="tui-contact-list-card-bottom-application">
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
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ContactTypeEnum } from '@/enums/ws'
import { Icon } from '@iconify/vue'
import chatApi from '@/api/chat'
import { IBlackListItem, IGroupInfo } from '@/interface/ws'
import { useUserStore } from '@/stores/user'
import { EventName } from '@/event-server/event-name'
import { EventServer } from '@/event-server'

interface Option {
  key: string;
  style: 'text' | 'button';
  type: string;
  label: string;
  onClick: () => void
}

const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const groupList = ref<IGroupInfo[]>([])
const total = ref(0)
const expand = ref(false)
const currentPage = ref(1)
const pageSize = ref(500)

const user = computed(() => {
  return userStore.user
})
const showApplicationStatus: Option[] = computed((item) => {
  return [{
    key: 'blacklist_cancel',
    style: 'button',
    type: 'primary',
    label: '取消拉黑',
    onClick: () => {
      cancelBlackList(item)
    }
  }]
})

onMounted(() => {
  eventServer.on(EventName.FLUSH_GROUP_LIST, getContactGroupList)
  getContactGroupList()
})

onUnmounted(() => {
  eventServer.off(EventName.FLUSH_GROUP_LIST, getContactGroupList)
})

function getContactGroupList() {
  chatApi.getContactPageList(ContactTypeEnum.GROUP, currentPage.value, pageSize.value).then(res => {
    groupList.value = [...groupList.value, ...res.data.records]
    total.value = res.data.total
    if (res.data.records.length) {
      currentPage.value++
    }
  })
}

function cancelBlackList(item: IBlackListItem) {

}

function changeExpand() {
  expand.value = !expand.value
}

</script>
<style lang="scss" scoped src="../style/index.scss"></style>
