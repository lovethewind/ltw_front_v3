<template>
  <el-card class="user-settings-card">
    <el-form label-width="200px" class="user-settings-form">
      <div class="setting-title">隐私设置</div>
      <el-form-item v-for="settingItem in privacySettingsList" :key="'userSettings_' + settingItem.key"
                    :label="settingItem.name">
        <el-switch v-model="settingsForm[settingItem.key]" />
      </el-form-item>
      <div class="setting-title">通知设置</div>
      <el-form-item v-for="settingItem in noticeSettingsList" :key="'userSettings_' + settingItem.key"
                    :label="settingItem.name">
        <el-switch v-model="settingsForm[settingItem.key]" />
      </el-form-item>
      <el-form-item>
        <el-button type="success" :disabled="updateBtnDisabled" @click="update()">确认修改
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style src="@/assets/css/user-center.scss" scoped />

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import userApi from '@/api/user'
import { userSettingsList } from '@/utils/constant'
import { UserSettingsCategoryEnum } from '@/enums'

const userStore = useUserStore()

const defaultSettingsForm = {}
userSettingsList.map(item => {
  defaultSettingsForm[item.key] = item.default
})
const settingsForm = ref(Object.assign({}, defaultSettingsForm))
const updateBtnDisabled = ref(false)

const user = computed(() => {
  return userStore.user
})
const privacySettingsList = computed(() => {
  return userSettingsList.filter(item => item.category === UserSettingsCategoryEnum.PRIVACY)
})
const noticeSettingsList = computed(() => {
  return userSettingsList.filter(item => item.category === UserSettingsCategoryEnum.NOTICE)
})

onMounted(() => {
  settingsForm.value = Object.assign(settingsForm.value, user.value.userSettings)
})

function update() {
  updateBtnDisabled.value = true
  userApi.saveUserSettings(settingsForm.value).then(() => {
    ElMessage({
      message: '修改成功',
      type: 'success',
      plain: true
    })
  }).finally(() => {
    updateBtnDisabled.value = false
  })
}
</script>