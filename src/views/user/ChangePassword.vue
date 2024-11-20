<template>
  <el-card class="change-pwd-card">
    <el-form label-width="100px" class="change-pwd-form">
      <el-form-item label="验证方式">
        <el-select v-model="changePasswordForm.changePasswordVerifyType">
          <el-option label="原密码验证" :value="ValidTypeEnum.ORIGINAL_PASSWORD" />
          <el-option v-if="user.email" label="邮箱验证" :value="ValidTypeEnum.EMAIL" />
          <el-option v-if="user.mobile" label="手机验证" :value="ValidTypeEnum.MOBILE" />
          <el-option v-if="user.wechat" label="微信验证" :value="ValidTypeEnum.WECHAT" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.ORIGINAL_PASSWORD"
                    label="原密码">
        <el-input v-model="changePasswordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
      </el-form-item>
      <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.EMAIL" label="验证码">
        <el-input v-model="changePasswordForm.code" placeholder="请输入邮箱验证码" class="w-50">
          <template #prefix>
            <Icon icon="material-symbols:shield-outline" />
          </template>
        </el-input>
        <el-button
          type="primary"
          :disabled="sendCodeBtnDisabled"
          @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_PASSWORD_EMAIL)"
          class="ms-2"
        >
          {{ codeMsg }}
        </el-button>
      </el-form-item>
      <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.MOBILE" label="验证码">
        <el-input v-model="changePasswordForm.code" placeholder="请输入手机验证码" class="w-50">
          <template #prefix>
            <Icon icon="material-symbols:shield-outline" />
          </template>
        </el-input>
        <el-button
          type="primary"
          :disabled="sendCodeBtnDisabled"
          @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_PASSWORD_MOBILE)"
          class="ms-2"
        >
          {{ codeMsg }}
        </el-button>
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="changePasswordForm.password" type="password" placeholder="请输入新密码" show-password />
      </el-form-item>
      <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.WECHAT">
        <div class="wechat-login pa-0">
          <el-image v-if="!changePasswordForm.randomCodeVerifySuccess && changePasswordForm.randomCode && !isExpired"
                    class="wechat-loading" :src="changePasswordForm.wechatAppletImg" alt="" />
          <div v-if="!changePasswordForm.randomCodeVerifySuccess && !changePasswordForm.randomCode && !isExpired"
               class="wechat-loading">加载中...
          </div>
          <div v-if="changePasswordForm.randomCodeVerifySuccess" class="wechat-loading">验证成功</div>
          <div v-if="isExpired" class="wechat-loading cursor"
               @click="getWechatAppletCode(WechatAppletCodeTypeEnum.MODIFY_PASSWORD)">
            该二维码已过期，请点击重新获取
          </div>
          <div v-if="!changePasswordForm.randomCodeVerifySuccess" class="mt-3">请使用微信进行扫码验证</div>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="success" :disabled="updateBtnDisabled" @click="changePassword()">确认修改
        </el-button>
        <el-button type="info" @click="cancelChangePassword()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style src="@/assets/css/user-center.scss" scoped />

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  WechatScanResultEnum,
  SendChangeCodeTypeEnum,
  ValidTypeEnum,
  VerifyCodeTypeEnum,
  WechatAppletCodeTypeEnum
} from '@/enums'
import { ElMessage } from 'element-plus'
import userApi from '@/api/user'
import { binaryStrToImgUrl, removeEmptyValues } from '@/utils/common'
import commonApi from '@/api/common'
import { Icon } from '@iconify/vue'

const userStore = useUserStore()

const defaultChangePasswordForm = {
  password: '',
  oldPassword: '',
  code: null,
  randomCode: null,
  wechatAppletImg: '',
  randomCodeVerifySuccess: false,
  changePasswordVerifyType: 1
}
const changePasswordForm = ref(Object.assign({}, defaultChangePasswordForm))
const updateBtnDisabled = ref(false)
const sendCodeBtnDisabled = ref(false)
const isExpired = ref(false)
const codeMsg = ref('发送验证码')
const time = ref(60)
const codeTimer = ref<any>(null)

const user = computed(() => {
  return userStore.user
})

watch(() => changePasswordForm.value.changePasswordVerifyType, (val) => {
  changePasswordForm.value.wechatAppletImg = ''
  changePasswordForm.value.randomCode = null
  clearInterval(codeTimer.value)
  if (val === ValidTypeEnum.WECHAT) {
    getWechatAppletCode(val)
  }
})

onUnmounted(() => {
  codeTimer.value && clearInterval(codeTimer.value)
})

async function getWechatAppletCode() {
  const res = await userApi.getWechatAppletCode(WechatAppletCodeTypeEnum.MODIFY_PASSWORD)
  isExpired.value = false
  changePasswordForm.value.randomCode = res.data.code
  changePasswordForm.value.wechatAppletImg = binaryStrToImgUrl(res.data.img)
  codeTimer.value = setInterval(() => {
    userApi.checkChangePasswordScan({
      code: changePasswordForm.value.randomCode
    }).then(res => {
      // 0:未扫码 1: 未绑定 2: 已绑定 3: 已过期
      if (res.data.status === WechatScanResultEnum.NOT_BIND) { // 未绑定
        clearInterval(codeTimer.value)
        ElMessage({
          message: '该微信号未绑定该用户',
          type: 'error',
          plain: true
        })
        getWechatAppletCode(WechatAppletCodeTypeEnum.MODIFY_PASSWORD)
      } else if (res.data.status === WechatScanResultEnum.HAS_BIND) { // 已绑定
        clearInterval(codeTimer.value)
        ElMessage({
          message: '验证成功',
          type: 'success',
          plain: true
        })
        changePasswordForm.value.randomCodeVerifySuccess = true
        changePasswordForm.value.wechatAppletImg = ''
      } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
        clearInterval(codeTimer.value)
        isExpired.value = true
        changePasswordForm.value.wechatAppletImg = ''
        ElMessage({
          message: '二维码已过期，请点击重新获取',
          type: 'warning',
          plain: true
        })
      }
    })
  }, 1500)
}

function sendEmailMobileCode(type) {
  // 发送邮件
  countDown()
  let func
  let tipMsg
  if (type === SendChangeCodeTypeEnum.CHANGE_PASSWORD_EMAIL) {
    func = commonApi.getUserEmailCode
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
  } else if (type === SendChangeCodeTypeEnum.CHANGE_PASSWORD_MOBILE) {
    func = commonApi.getUserMobileCode
    tipMsg = '验证码发送成功，请查看短信获取验证码'
  }
  func({
    codeType: VerifyCodeTypeEnum.CHANGE_PASSWORD
  }).then(() => {
    ElMessage({
      message: tipMsg,
      type: 'success',
      plain: true
    })
  }).catch(err => {
    console.log('send code fail:', err)
    ElMessage({
      message: '验证码发送失败，请重新尝试',
      type: 'error',
      plain: true
    })
  })
}

function countDown() {
  sendCodeBtnDisabled.value = true
  codeTimer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(codeTimer.value)
      codeMsg.value = '发送验证码'
      time.value = 60
      sendCodeBtnDisabled.value = false
    }
  }, 1000)
}

function changePassword() {
  if (!changePasswordForm.value.password) {
    ElMessage({
      message: '请输入新密码',
      type: 'error',
      plain: true
    })
    return
  }
  const reg = /^(?![0-9]*$|[a-zA-Z]*$)[0-9a-zA-Z!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{6,30}$/
  if (!reg.test(changePasswordForm.value.password)) {
    ElMessage({
      message: '密码长度为6-30位，不能全为字母或数字',
      type: 'error',
      plain: true
    })
    return
  }
  if (changePasswordForm.value.changePasswordVerifyType === ValidTypeEnum.ORIGINAL_PASSWORD && !changePasswordForm.value.oldPassword) {
    ElMessage({
      message: '请输入原密码',
      type: 'error',
      plain: true
    })
    return
  }
  if (changePasswordForm.value.changePasswordVerifyType === ValidTypeEnum.EMAIL && !changePasswordForm.value.code) {
    ElMessage({
      message: '请输入邮箱验证码',
      type: 'error',
      plain: true
    })
    return
  }
  if (changePasswordForm.value.changePasswordVerifyType === ValidTypeEnum.MOBILE && !changePasswordForm.value.code) {
    ElMessage({
      message: '请输入手机验证码',
      type: 'error',
      plain: true
    })
    return
  }
  updateBtnDisabled.value = true
  const sendData = {
    password: changePasswordForm.value.password,
    code: changePasswordForm.value.code,
    oldPassword: changePasswordForm.value.oldPassword,
    randomCode: changePasswordForm.value.randomCode,
    changeType: changePasswordForm.value.changePasswordVerifyType
  }
  userApi.changePasswordByLogin(removeEmptyValues(sendData)).then(() => {
    ElMessage({
      message: '修改密码成功',
      type: 'success',
      plain: true
    })
    cancelChangePassword()
  }).finally(() => {
    updateBtnDisabled.value = false
  })
}


function cancelChangePassword() {
  changePasswordForm.value = Object.assign({}, defaultChangePasswordForm)
  updateBtnDisabled.value = false
}
</script>