<template>
  <div v-if="!currentContact" class="tui-contact">
    <div class="tui-contact-default">
      <slot />
    </div>
  </div>
  <div v-if="userDetail || groupDetail" class="tui-contact">
    <div v-if="currentContactType !== ContactListTypeEnum.GroupList && userDetail" class="tui-contact-info">
      <div class="user-detail-div">
        <el-row align="middle" justify="start">
          <el-col :span="6">
            <el-avatar shape="square" :size="80" :src="userDetail.avatar" />
          </el-col>
          <el-col :span="18" class="username-info">
            <el-row align="middle" justify="start">
              <el-col :span="24" class="username-line">
                {{ userDetail.nickname }}
                <GenderBadge :gender="userDetail.gender" />
              </el-col>
              <el-col :span="24" class="font-12">
                {{ userDetail.summary }}
              </el-col>
            </el-row>
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col :span="6">
            uid
          </el-col>
          <el-col :span="18">
            {{ userDetail.uid }}
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col :span="6">
            地区
          </el-col>
          <el-col :span="18">
            {{ userDetail.address }}
          </el-col>
        </el-row>
        <el-row v-if="currentContactType === ContactListTypeEnum.FriendApplyList" align="middle" justify="start">
          <el-col :span="6">
            申请时间
          </el-col>
          <el-col :span="18">
            {{ covertTimeHowLongAgo(currentContact.createTime) }}
          </el-col>
        </el-row>
        <el-row v-if="currentContactType === ContactListTypeEnum.FriendApplyList" align="middle" justify="start">
          <el-col :span="6">
            申请信息
          </el-col>
          <el-col :span="18">
            {{ currentContact.content }}
          </el-col>
        </el-row>
        <el-row v-if="currentContactType === ContactListTypeEnum.FriendList" align="middle" justify="start">
          <el-col :span="6">
            添加时间
          </el-col>
          <el-col :span="18">
            {{ covertTimeHowLongAgo(currentContact.createTime) }}
          </el-col>
        </el-row>
        <el-row v-if="currentContactType === ContactListTypeEnum.BlackList" align="middle" justify="start">
          <el-col :span="6">
            拉黑时间
          </el-col>
          <el-col :span="18">
            {{ covertTimeHowLongAgo(currentContact.updateTime) }}
          </el-col>
        </el-row>
      </div>
    </div>
    <div class="tui-contact-operate">
      <div v-for="option in currentContactOperation" :key="'option_' + option.key">
        <div
          v-if="option.style === 'text'"
          class="tui-contact-operate-text"
        >
          {{ option.label }}
        </div>
        <el-button
          v-else-if="option.style === 'button'"
          :type="option.type"
          size="small"
          class="tui-contact-operate-button"
          @click="option.onClick"
        >
          <template #icon>
            <Icon :icon="option.icon" />
          </template>
          <template #default>
            {{ option.label }}
          </template>
        </el-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { ContactListTypeEnum } from '@/enums/ws'
import { covertTimeHowLongAgo } from '@/utils/date'
import { Icon } from '@iconify/vue'
import userApi from '@/api/user'
import type { IUserDetail } from '@/interface'
import type { IContactSearchItem, ICurrentContact } from '@/interface/ws'
import GenderBadge from '@/components/base/GenderBadge.vue'

const chatStore = useChatStore()
const userDetail = ref<IUserDetail>()
const groupDetail = ref<any>()
const userDetailCache = new Map<string, IUserDetail>()
const userDetailPendingMap = new Map<string, Promise<IUserDetail>>()


const currentContact = computed<any>(() => {
  return chatStore.currentContact
})
const currentContactType = computed(() => {
  return chatStore.currentContactType
})
const currentContactOperation = computed(() => {
  return chatStore.currentContactOperation
})

watch(currentContact, (val) => {
  if (!val) {
    userDetail.value = undefined
    return
  }
  if (isContactSearchItem(val as ICurrentContact)) {
    userDetail.value = val.searchUserDetail
    return
  }
  if (currentContactType.value !== ContactListTypeEnum.GroupList) {
    userDetail.value = undefined
    const userId = currentContact.value?.userProfile?.id
    if (!userId) return
    getUserDetail(userId).then(detail => {
      if (currentContact.value?.userProfile?.id === userId) {
        userDetail.value = detail
      }
    })
  }
})

/**
 * 获取用户详情，并合并同一用户的重复请求。
 *
 * :param userId: 用户 id。
 * :return: 用户详情。
 */
function getUserDetail(userId: string): Promise<IUserDetail> {
  const cachedDetail = userDetailCache.get(userId)
  if (cachedDetail) {
    return Promise.resolve(cachedDetail)
  }
  const pendingRequest = userDetailPendingMap.get(userId)
  if (pendingRequest) {
    return pendingRequest
  }
  const request = userApi.getUserById(userId).then(res => {
    userDetailCache.set(userId, res.data)
    return res.data
  }).finally(() => {
    userDetailPendingMap.delete(userId)
  })
  userDetailPendingMap.set(userId, request)
  return request
}

/**
 * 判断当前联系人是否为添加好友搜索结果。
 *
 * :param contact: 当前通讯录右侧联系人。
 * :return: 是搜索结果时返回 true。
 */
function isContactSearchItem(contact: ICurrentContact): contact is IContactSearchItem {
  return 'searchUserDetail' in contact
}
</script>
<style lang="scss" scoped src="./style/index.scss"></style>
