<template>
  <el-dialog title="找回密码" v-model="forgetFlag" class="login-container" width="452" @close="closeModal">
    <div class="login-wrapper">
      <el-form ref="forgetFormRef" :model="postForm" :rules="rules" label-position="top" hide-required-asterisk>
        <!-- 用户名 -->
        <el-form-item label="邮箱/手机号" prop="username">
          <el-input v-model="postForm.username" placeholder="请输入您的邮箱/手机号">
            <template #prefix>
              <Icon icon="mynaui:mobile" />
            </template>
          </el-input>
        </el-form-item>
        <!-- 验证码 -->
        <el-form-item label="验证码" prop="code">
          <el-input v-model="postForm.code" class="underline vw-50 me-2" placeholder="请输入6位验证码">
            <template #prefix>
              <Icon icon="material-symbols:shield-outline" />
            </template>
          </el-input>
          <el-button :disabled="sendCodeDisabled" type="primary" small @click="sendCode()">
            {{ codeMsg }}
          </el-button>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="postForm.password" show-password placeholder="请输入您的新密码">
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="rePassword">
          <el-input v-model="postForm.rePassword" show-password placeholder="请再次输入密码">
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="success" class="vw-100 register-btn" :disabled="forgetDisabled" @click="updatePassword()">
            确定
          </el-button>
        </el-form-item>
      </el-form>
      <!-- 登录 -->
      <div class="login-tip">
        已有账号？<span style="color: #00a1d6" class="a-link" @click="openLogin">登录</span>
      </div>
    </div>
  </el-dialog>
</template>

<style src="@/assets/css/modal.css" scoped />

<script setup lang="ts">
import { computed, ref } from 'vue'
import userApi from '@/api/user'
import commonApi from '@/api/common'
import { useModalStore } from '@/stores/modal'
import { ElMessage, FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import { VerifyCodeTypeEnum } from '@/enums'

const modalStore = useModalStore()

const validateUsername = (rule: any, value: any, callback: any) => {
  const mobileRegex = /^1[345789][0-9]{9}$/
  const emailReg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  if (!mobileRegex.test(value) && !emailReg.test(value)) {
    sendCodeDisabled.value = true
    callback(new Error('请输入正确的邮箱或手机号'))
    return
  }
  setTimeout(() => {
    const payload: any = {}
    if (mobileRegex.test(value)) {
      payload.mobile = value
    } else {
      payload.email = value
    }
    commonApi.validAccountExists(payload).then(res => {
      if (res.data === true) {
        sendCodeDisabled.value = false
        callback()
      } else {
        sendCodeDisabled.value = true
        callback(new Error('该账号不存在'))
      }
    })
  }, 500)
}

const validatePassword = (rule: any, value: any, callback: any) => {
  const reg = /^(?![0-9]*$|[a-zA-Z]*$)[0-9a-zA-Z!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{6,30}$/
  if (!reg.test(value)) {
    callback(new Error('密码长度为6-30位，不能全为字母或数字'))
  } else {
    callback()
  }
}

const validateRePassword = (rule: any, value: any, callback: any) => {
  if (value !== postForm.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const baseInfo = {
  account: '',
  code: '',
  password: '',
  rePassword: ''
}

const forgetFormRef = ref<FormInstance>()
const postForm = ref(baseInfo)
const codeMsg = ref('发送')
const timer = ref<any>(null)
const time = ref(60)
const sendCodeDisabled  = ref(true)
const forgetDisabled = ref(false)
const rules = ref({
  username: [
    { required: true, message: '账号不能为空', trigger: 'blur' },
    {
      validator: validateUsername,
      trigger: 'blur'
    }
  ],
  code: [
    { required: true, message: '验证码不能为空', trigger: 'blur' },
    { min: 6, max: 6, message: '请输入6位数的验证码', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' }
  ],
  rePassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateRePassword, trigger: 'blur' }
  ]
})

const forgetFlag = computed(() => {
  return modalStore.forgetFlag
})

function openLogin() {
  modalStore.setForgetFlag(false)
  modalStore.setLoginFlag(true)
}

function sendCode() {
  // 发送邮件
  countDown()
  const EmailReg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  let func
  const sendData = {
    codeType: VerifyCodeTypeEnum.FIND_PASSWORD
  }
  let tipMsg
  if (EmailReg.test(postForm.value.account)) {
    func = commonApi.getEmailCode
    sendData.email = postForm.value.account
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
  } else {
    func = commonApi.getMobileCode
    sendData.mobile = postForm.value.account
    tipMsg = '验证码发送成功，请查看短信获取验证码'
  }
  func(sendData).then(() => {
    ElMessage({
      message: tipMsg,
      type: 'success',
      plain: true
    })
  }).catch(() => {
    ElMessage({
      message: '验证码发送失败，请重新尝试',
      type: 'error',
      plain: true
    })
  })
}

function countDown() {
  sendCodeDisabled.value = true
  timer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(timer.value)
      codeMsg.value = '发送'
      time.value = 60
      sendCodeDisabled.value = false
    }
  }, 1000)
}

function updatePassword() {
  forgetDisabled.value = true
  forgetFormRef.value?.validate(valid => {
    if (!valid) {
      ElMessage({
        message: '填写的数据不正确，请修改再试',
        type: 'error',
        plain: true
      })
      forgetDisabled.value = false
    } else {
      const user: any = {
        password: postForm.value.password,
        code: postForm.value.code
      }
      const EmailReg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
      if (EmailReg.test(postForm.value.account)) {
        user.email = postForm.value.account
      } else {
        user.mobile = postForm.value.account
      }
      userApi.changePasswordByFind(user).then(() => {
        ElMessage({
          message: '修改密码成功，你可以用新密码登录了',
          type: 'success',
          plain: true
        })
        postForm.value = Object.assign({}, baseInfo)
        modalStore.setForgetFlag(false)
        modalStore.setLoginFlag(true)
      }).catch(() => {
        forgetDisabled.value = false
      })
    }
  })
}

function closeModal() {
  modalStore.setForgetFlag(false)
  forgetFormRef.value?.resetFields()
}
</script>
