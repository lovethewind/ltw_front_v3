<template>
  <el-dialog title="用户注册" v-model="registerFlag" class="login-container" width="452" @close="closeModal()">
    <div class="login-wrapper">
      <el-form ref="registerFormRef" :model="postForm" :rules="rules" label-position="top" hide-required-asterisk>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="postForm.username" placeholder="用户名，注册完成后不可更改，可用于登录" clearable>
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="postForm.nickname" placeholder="昵称用来在各页面展示" clearable>
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <!-- 邮箱号 -->
          <el-input v-model="postForm.email" placeholder="请输入您的邮箱号" clearable>
            <template #prefix>
              <Icon icon="ic:outline-email" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <!-- 验证码 -->
          <el-input v-model="postForm.code" :maxlength="6" label="验证码" placeholder="请输入6位验证码" class="me-2 w-50">
            <template #prefix>
              <Icon icon="material-symbols:shield-outline" />
            </template>
          </el-input>
          <el-button type="primary" small :disabled="postForm.flag" @click="sendCode">
            {{ codeMsg }}
          </el-button>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <!-- 密码 -->
          <el-input v-model="postForm.password" show-password placeholder="请输入您的密码">
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <!-- 注册按钮 -->
          <el-button
            type="success"
            class="mt-3 register-btn vw-100"
            block
            :disabled="registerDisabled"
            @click="register"
          >
            注册
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
import { ElMessage, type FormInstance } from 'element-plus'
import { useModalStore } from '@/stores/modal'
import { useUserStore } from '@/stores/user'
import { Icon } from '@iconify/vue'
import { VerifyCodeTypeEnum } from '@/enums'

const modalStore = useModalStore()
const userStore = useUserStore()

const baseInfo = {
  email: '',
  username: '',
  code: '',
  password: '',
  nickname: '',
  flag: true
}

const validateUsername = (rule: any, value: string, callback: any) => {
  const regex = /^(?![0-9]+$)[a-zA-Z0-9_-]+$/
  if (!regex.test(value)) {
    callback(new Error('用户名只能包含字母数字_-且不能全为数字'))
    return
  }
  setTimeout(() => {
    commonApi.validAccountExists({ username: value }).then(res => {
      if (res.data === true) {
        callback(new Error('该用户名已存在'))
      } else {
        callback()
      }
    })
  }, 1000)
}

const validateEmail = (rule: any, value: string, callback: any, postForm: any) => {
  const reg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  if (!reg.test(value)) {
    postForm.flag = true
    callback(new Error('邮箱格式不正确'))
  } else {
    setTimeout(() => {
      commonApi.validAccountExists({ email: value }).then(res => {
        if (res.data === true) {
          postForm.flag = true
          callback(new Error('该邮箱已存在'))
        } else {
          postForm.flag = false
          callback()
        }
      })
    }, 1000)
  }
}

const validateCode = (rule: any, value: string, callback: any, email: string) => {
  const reg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  if (!reg.test(email)) {
    callback()
  } else if (!value || value.length !== 6) {
    callback(new Error('验证码长度为6位'))
  } else {
    callback()
  }
}

const validatePassword = (rule: any, value: string, callback: any) => {
  const reg = /^(?![0-9]*$|[a-zA-Z]*$)[0-9a-zA-Z!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{6,30}$/
  if (!reg.test(value)) {
    callback(new Error('密码长度为6-30位，不能全为字母或数字'))
  } else {
    callback()
  }
}

const registerFormRef = ref<FormInstance>()
const registerDisabled = ref(false)
const codeMsg = ref('发送')
const timer = ref<any>(null)
const time = ref(60)
const postForm = ref(baseInfo)
const rules = ref({
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 3, message: '用户名长度不能小于3个字符', trigger: 'blur' },
    { validator: validateUsername, trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' }
  ],
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => validateEmail(rule, value, callback, postForm.value),
      trigger: 'blur'
    }
  ],
  code: [
    {
      validator: (rule: any, value: string, callback: any) => validateCode(rule, value, callback, postForm.value.email),
      trigger: 'blur'
    }
  ],
  nickname: [
    { required: true, message: '内容不能为空', trigger: 'blur' },
    { min: 3, message: '昵称长度不能小于3个字符', trigger: 'blur' }
  ]
})

const registerFlag = computed(() => {
  return modalStore.registerFlag
})

function openLogin() {
  modalStore.setRegisterFlag(false)
  modalStore.setLoginFlag(true)
}

function sendCode() {
  if (!postForm.value.email) {
    return
  }
  // 发送邮件
  countDown()
  commonApi.getEmailCode({
    email: postForm.value.email,
    codeType: VerifyCodeTypeEnum.REGISTER
  }).then(() => {
    ElMessage({
      message: '验证码发送成功，请进入邮箱获取验证码',
      type: 'success',
      plain: true
    })
  }).catch(err => {
    console.log('send email fail:', err)
    ElMessage({
      message: '验证码发送失败，请重新尝试',
      type: 'error',
      plain: true
    })
  })
}

function countDown() {
  postForm.value.flag = true
  timer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(timer.value)
      codeMsg.value = '发送'
      time.value = 60
      postForm.value.flag = false
    }
  }, 1000)
}

function register() {
  registerDisabled.value = true
  ElMessage({
    message: '正在注册，请稍后',
    type: 'info',
    plain: true
  })
  registerFormRef.value?.validate(valid => {
    if (!valid) {
      ElMessage({
        message: '填写的数据不正确，请修改再试',
        type: 'error',
        plain: true
      })
      registerDisabled.value = false
    } else {
      userApi.emailRegister(postForm.value).then(res => {
        ElMessage({
          message: '注册成功，欢迎加入~',
          type: 'success',
          plain: true
        })
        postForm.value = Object.assign({}, baseInfo)
        userStore.setUserToken(res.data.token)
        userStore.getInfo()
        modalStore.setRegisterFlag(false)
      }).finally(() => {
        registerDisabled.value = false
      })
    }
  })
}

function closeModal() {
  modalStore.setRegisterFlag(false)
  registerFormRef.value?.resetFields()
}

</script>

