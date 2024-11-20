<template>
  <div :class="['message-card', showDirection]">
    <el-row :class="{'row-reverse': isSelf}">
      <el-col :span="2">
        <el-avatar v-if="!isSelf"
                   shape="square"
                   class="avatar"
                   :src="message.userProfile?.avatar || message.groupProfile.avatar" />
        <el-avatar v-else shape="square" class="avatar" :src="user.avatar" />
      </el-col>
      <el-col :span="20" :class="isSelf ? 'pe-2': 'ps-2'">
        <el-row>
          <el-col :span="24" class="nickname">
            <span v-if="isSelf">{{ user.nickname }}</span>
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
import { computed, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import { IChatMessage } from '@/interface/ws'

interface IProps {
  message: IChatMessage
}

const props = defineProps<IProps>()
const { message } = toRefs(props)
const userStore = useUserStore()

const user = computed(() => {
  return userStore.user
})
const showDirection = computed(() => {
  return message.value.userId === user.value.id ? 'is-me' : 'is-other'
})
const isSelf = computed(() => {
  return message.value.userId === user.value.id
})
</script>

<style scoped lang="scss">
.row-reverse {
  flex-direction: row-reverse;
}

.message-card {
  width: 70%;
  margin-left: 10px;
  margin-bottom: 10px;

  .avatar {
    margin-top: 10px;
  }

  .nickname {
    display: flex;
    align-items: center;

    .message-status {
      margin: 0 5px;
    }

    span {
      font-size: 12px;
      color: #afbcb2;
    }
  }

  .message-card-content{
    max-width: 100%;
    display: inline-flex;
    border-radius: 5px;
    color: black;
  }

}

.is-other {
  padding-left: 10px;
  margin-right: auto;

  .nickname {
    text-align: left;
  }

}

.is-me {
  margin-left: auto;
  padding-right: 10px;

  .nickname {
    text-align: right;
    display: inline-flex;
    align-items: center;
    justify-content: end;
  }
}
</style>