<template>
  <div v-if="!currentContact" class="tui-contact">
    <div class="tui-contact-default">
      <slot />
    </div>
  </div>
  <div v-if="userDetail || groupDetail" class="tui-contact">
    <div v-if="currentContactType !== ContactListTypeEnum.GroupList" class="tui-contact-info">
      <div class="user-detail-div">
        <el-row align="middle" justify="start">
          <el-col :span="6">
            <el-avatar shape="square" :size="80" :src="userDetail.avatar" />
          </el-col>
          <el-col :span="18" class="username-info">
            <el-row align="middle" justify="start">
              <el-col :span="24">
                {{ userDetail.nickname }}
                <Icon :icon="genderMap[userDetail.gender].icon" :color="genderMap[userDetail.gender].color" />
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
import { genderMap } from '@/utils/constant'
import { covertTimeHowLongAgo } from '@/utils/date'
import { Icon } from '@iconify/vue'
import { IUserDetail } from '@/interface'
import userApi from '@/api/user'
import { IGroupInfo } from '@/interface/ws'

const chatStore = useChatStore()
const userDetail = ref<IUserDetail>()
const groupDetail = ref<IGroupInfo>()


const currentContact = computed(() => {
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
  if (currentContactType.value !== ContactListTypeEnum.GroupList) {
    userApi.getUserById(currentContact.value.userProfile.id).then(res => {
      userDetail.value = res.data
    })
  }
})
</script>
<style lang="scss" scoped src="./style/index.scss"></style>
