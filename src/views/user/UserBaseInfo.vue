<template>
  <el-card v-if="user?.id === viewUser.id && loginUser" class="profile-edit-card user-container" :class="{ 'is-editing': isEdit }">
    <el-form ref="formRef" :model="loginUser" label-position="top" class="profile-edit-form">
      <div class="profile-edit-hero">
        <div class="profile-edit-avatar-wrap">
          <el-upload
            v-if="isEdit && !avatarPreviewUrl"
            ref="upload"
            accept="image/*"
            class="avatar-uploader"
            :show-file-list="false"
            action=""
            :before-upload="beforeAvatarUpload"
          >
            <div class="profile-avatar-uploader">
              <el-avatar v-if="loginUser.avatar" :src="loginUser.avatar" class="profile-edit-avatar" />
              <Icon v-else icon="ic:round-plus" />
              <div class="profile-avatar-edit-mask">
                <Icon icon="material-symbols:add-a-photo-outline-rounded" />
                <span>更换头像</span>
              </div>
            </div>
          </el-upload>
          <el-avatar v-if="!isEdit && !avatarPreviewUrl" :src="loginUser.avatar" class="profile-edit-avatar" />
          <div v-if="avatarPreviewUrl" class="profile-avatar-preview">
            <el-avatar :src="avatarPreviewUrl" class="profile-edit-avatar" />
            <button type="button" @click="handleAvatarRemove()">取消</button>
          </div>
        </div>
        <div class="profile-edit-hero__content">
          <div class="profile-overview-eyebrow">我的资料</div>
          <h3>{{ loginUser.nickname || loginUser.username }}</h3>
          <p>{{ loginUser.summary || '这个人很神秘，还没有写签名' }}</p>
        </div>
        <div class="profile-edit-actions">
          <button v-if="isEdit" class="profile-save-button" type="button" :disabled="changDisabled" @click="update()">
            <Icon icon="material-symbols:check-rounded" />
            确认修改
          </button>
          <button v-if="isEdit" class="profile-ghost-button" type="button" @click="cancelEdit()">
            取消
          </button>
          <button v-else class="profile-save-button" type="button" @click="isEdit = !isEdit">
            <Icon icon="material-symbols:edit-outline-rounded" />
            修改资料
          </button>
        </div>
      </div>

      <section class="profile-edit-section">
        <div class="profile-edit-section__title">
          <Icon icon="solar:user-id-linear" />
          <span>公开资料</span>
        </div>
        <div class="profile-field-grid">
          <div class="profile-field-card">
            <span>用户名</span>
            <strong>{{ loginUser.username }}</strong>
          </div>
          <div class="profile-field-card" :class="{ 'is-editing': isEdit }">
            <span>昵称</span>
            <el-input v-if="isEdit" v-model="loginUser.nickname" maxlength="20" show-word-limit placeholder="请输入您的昵称" />
            <strong v-else>{{ loginUser.nickname }}</strong>
          </div>
          <div class="profile-field-card" :class="{ 'is-editing': isEdit }">
            <span>性别</span>
            <el-radio-group v-if="isEdit" v-model="loginUser.gender">
              <el-radio :value="0">保密</el-radio>
              <el-radio :value="1">男</el-radio>
              <el-radio :value="2">女</el-radio>
            </el-radio-group>
            <strong v-else>{{ genderMap[loginUser.gender].name }}</strong>
          </div>
          <div class="profile-field-card is-wide" :class="{ 'is-editing': isEdit }">
            <span>签名</span>
            <el-input
              v-if="isEdit"
              v-model="loginUser.summary"
              maxlength="100"
              show-word-limit
              placeholder="既然选择了远方，便要风雨兼程"
              clearable
            />
            <strong v-else>{{ loginUser.summary || '这个人很神秘，还没有写签名' }}</strong>
          </div>
        </div>
      </section>

      <section class="profile-edit-section">
        <div class="profile-edit-section__title">
          <Icon icon="material-symbols:shield-outline" />
          <span>账号绑定</span>
        </div>
        <div class="profile-bind-grid">
          <div class="profile-bind-card">
            <div class="profile-bind-card__icon"><Icon icon="ic:outline-email" /></div>
            <div>
              <span>邮箱</span>
              <strong>{{ loginUser.email || '未绑定' }}</strong>
            </div>
            <button type="button" @click="openEmailModel()">
              {{ loginUser.email ? '修改绑定' : '绑定邮箱' }}
            </button>
          </div>
          <div class="profile-bind-card">
            <div class="profile-bind-card__icon"><Icon icon="mynaui:mobile" /></div>
            <div>
              <span>手机号</span>
              <strong>{{ loginUser.mobile || '未绑定' }}</strong>
            </div>
            <button type="button" @click="openMobileModel()">
              {{ loginUser.mobile ? '修改绑定' : '绑定手机号' }}
            </button>
          </div>
          <div class="profile-bind-card">
            <div class="profile-bind-card__icon"><Icon icon="mdi:wechat" /></div>
            <div>
              <span>微信号</span>
              <strong>{{ loginUser.wechat || '未绑定' }}</strong>
            </div>
            <button type="button" @click="openWeChatModel()">
              {{ loginUser.wechat ? '修改绑定' : '绑定微信号' }}
            </button>
          </div>
        </div>
      </section>
    </el-form>
    <!-- 更换邮箱 -->
    <el-dialog
      v-model="emailDialogVisible"
      class="profile-bind-dialog"
      :title="needValidOldEmail ? '验证绑定邮箱' : '更换邮箱'"
      append-to-body
      align-center
      width="460"
      @close="closeEmailDialog()">
      <div v-if="needValidOldEmail" class="profile-dialog-panel">
        <div class="profile-dialog-hero">
          <div class="profile-dialog-icon">
            <Icon icon="ic:outline-email" />
          </div>
          <div>
            <h3>确认是你本人操作</h3>
            <p>修改邮箱前，需要先验证当前已绑定邮箱。</p>
          </div>
        </div>
        <div class="profile-dialog-tip">
          <span>当前邮箱</span>
          <strong>{{ loginUser.email }}</strong>
        </div>
        <div class="profile-dialog-error">{{ errMsg }}</div>
        <div class="profile-dialog-code-row">
          <el-input v-model="postForm.oldCode" :maxlength="6" :minlength="6" :disabled="inputDisabled" placeholder="请输入6位验证码">
            <template #prefix>
              <Icon icon="material-symbols:shield-outline" />
            </template>
          </el-input>
          <el-button
            class="profile-dialog-secondary"
            type="primary"
            :disabled="sendBtnDisabled"
            @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL)"
          >
            {{ codeMsg }}
          </el-button>
        </div>
        <el-button
          class="profile-dialog-primary"
          type="success"
          :disabled="!postForm.oldCode"
          @click="validateOldCode(SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL)"
        >
          验证并继续
        </el-button>
      </div>
      <div v-else class="profile-dialog-panel">
        <div class="profile-dialog-hero">
          <div class="profile-dialog-icon">
            <Icon icon="ic:outline-email" />
          </div>
          <div>
            <h3>绑定新的邮箱</h3>
            <p>验证码会发送到新邮箱，请确认填写无误。</p>
          </div>
        </div>
        <el-form ref="changeBindFormRef" :model="postForm" :rules="rules" label-position="top" class="profile-dialog-form">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="postForm.email" placeholder="请输入您的新邮箱" clearable>
              <template #prefix>
                <Icon icon="ic:outline-email" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <div class="profile-dialog-code-row">
              <el-input v-model="postForm.code" :maxlength="6" :minlength="6" label="验证码" placeholder="请输入6位验证码">
                <template #prefix>
                  <Icon icon="material-symbols:shield-outline" />
                </template>
              </el-input>
              <el-button
                class="profile-dialog-secondary"
                type="primary"
                :disabled="postForm.sendBtnDisabled"
                @click="sendNewEmailMobileCode(SendNewBindCodeTypeEnum.BIND_EMAIL)"
              >
                {{ codeMsg }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button
              class="profile-dialog-primary"
              type="success"
              :disabled="btnDisabled"
              @click="saveUserEmailMobile(SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL)"
            >
              绑定
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
    <!-- 更换手机号 -->
    <el-dialog
      v-model="mobileDialogVisible"
      class="profile-bind-dialog"
      :title="needValidOldMobile ? '验证绑定手机号' : '更换手机号'"
      append-to-body
      align-center
      width="460"
      @close="closeMobileDialog()">
      <div v-if="needValidOldMobile" class="profile-dialog-panel">
        <div class="profile-dialog-hero">
          <div class="profile-dialog-icon">
            <Icon icon="mynaui:mobile" />
          </div>
          <div>
            <h3>确认是你本人操作</h3>
            <p>修改手机号前，需要先验证当前已绑定手机号。</p>
          </div>
        </div>
        <div class="profile-dialog-tip">
          <span>当前手机号</span>
          <strong>{{ loginUser.mobile }}</strong>
        </div>
        <div class="profile-dialog-error">{{ errMsg }}</div>
        <div class="profile-dialog-code-row">
          <el-input v-model="postForm.oldCode" :maxlength="6" :minlength="6" :disabled="inputDisabled" placeholder="请输入6位验证码">
            <template #prefix>
              <Icon icon="material-symbols:shield-outline" />
            </template>
          </el-input>
          <el-button
            class="profile-dialog-secondary"
            type="primary"
            :disabled="sendBtnDisabled"
            @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE)"
          >
            {{ codeMsg }}
          </el-button>
        </div>
        <el-button
          class="profile-dialog-primary"
          type="success"
          :disabled="!postForm.oldCode"
          @click="validateOldCode(SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE)"
        >
          验证并继续
        </el-button>
      </div>
      <div v-else class="profile-dialog-panel">
        <div class="profile-dialog-hero">
          <div class="profile-dialog-icon">
            <Icon icon="mynaui:mobile" />
          </div>
          <div>
            <h3>绑定新的手机号</h3>
            <p>验证码会发送到新手机号，请保持手机畅通。</p>
          </div>
        </div>
        <el-form ref="changeBindFormRef" :model="postForm" :rules="rules" label-position="top" class="profile-dialog-form">
          <el-form-item label="手机号" prop="mobile">
            <el-input v-model="postForm.mobile" placeholder="请输入您的新手机号" clearable>
              <template #prefix>
                <Icon icon="mynaui:mobile" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <div class="profile-dialog-code-row">
              <el-input v-model="postForm.code" :maxlength="6" :minlength="6" label="验证码" placeholder="请输入6位验证码">
                <template #prefix>
                  <Icon icon="material-symbols:shield-outline" />
                </template>
              </el-input>
              <el-button
                class="profile-dialog-secondary"
                type="primary"
                :disabled="postForm.sendBtnDisabled"
                @click="sendNewEmailMobileCode(SendNewBindCodeTypeEnum.BIND_MOBILE)"
              >
                {{ codeMsg }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button
              class="profile-dialog-primary"
              type="success"
              :disabled="btnDisabled"
              @click="saveUserEmailMobile(SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE)"
            >
              绑定
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
    <!-- 更换微信号 -->
    <el-dialog
      v-model="wechatDialogVisible"
      class="profile-bind-dialog profile-wechat-dialog"
      :title="needValidOldWeChat ? '验证绑定微信号' : '更换微信绑定'"
      append-to-body
      align-center
      width="460"
      @close="closeWeChatDialog()">
      <div v-if="needValidOldWeChat" class="profile-wechat-panel">
        <div class="profile-dialog-hero">
          <div class="profile-dialog-icon">
            <Icon icon="mdi:wechat" />
          </div>
          <div>
            <h3>验证当前微信</h3>
            <p>请使用已绑定的微信扫码，验证通过后再绑定新微信。</p>
          </div>
        </div>
        <div class="profile-wechat-qr">
          <el-image v-if="wechatOldCode && !isExpired" :src="wechatAppletImg" alt="" />
          <div v-if="!wechatOldCode && !isExpired" class="profile-wechat-loading">加载中...</div>
          <button
            v-if="isExpired"
            type="button"
            class="profile-wechat-retry"
            @click="getWechatAppletCode(WechatAppletCodeTypeEnum.VALIDATE_OLD_WECHAT)"
          >
            二维码已过期，点击重新获取
          </button>
        </div>
        <div class="profile-dialog-tip">
          <span>下一步</span>
          <strong>扫码验证成功后，将自动进入新微信绑定</strong>
        </div>
      </div>
      <div v-else class="profile-wechat-panel">
        <div class="profile-dialog-hero">
          <div class="profile-dialog-icon">
            <Icon icon="mdi:wechat" />
          </div>
          <div>
            <h3>绑定新的微信</h3>
            <p>请使用新微信扫码完成绑定，完成后资料会自动刷新。</p>
          </div>
        </div>
        <div class="profile-wechat-qr">
          <el-image v-if="wechatCode && !isExpired" :src="wechatAppletImg" alt="" />
          <div v-if="!wechatCode && !isExpired" class="profile-wechat-loading">加载中...</div>
          <button
            v-if="isExpired"
            type="button"
            class="profile-wechat-retry"
            @click="getWechatAppletCode(WechatAppletCodeTypeEnum.BIND_NEW_WECHAT)"
          >
            二维码已过期，点击重新获取
          </button>
        </div>
        <div class="profile-dialog-tip is-warning">
          <span>微信扫码</span>
          <strong>请确认使用的是新的微信账号</strong>
        </div>
      </div>
    </el-dialog>
  </el-card>
</template>

<style src="@/assets/css/user-center.scss" scoped />

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, toRefs, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import userApi from '@/api/user'
import ossApi from '@/api/oss-api'
import commonApi from '@/api/common'
import {
  binaryStrToImgUrl,
  checkFileSize,
  compressImageFile,
  getBase64,
  getObjKeyCount,
  removeSameValues
} from '@/utils/common'
import { uploadFile } from '@/utils/oss-upload'
import { genderMap } from '@/utils/constant'
import { ElMessage, type FormInstance, type UploadRawFile } from 'element-plus'
import {
  WechatScanResultEnum,
  SendChangeCodeTypeEnum,
  SendNewBindCodeTypeEnum, VerifyCodeTypeEnum,
  WechatAppletCodeTypeEnum, UploadFileTypeEnum
} from '@/enums'
import { Icon } from '@iconify/vue'
import type { IUserDetail } from '@/interface'

const userStore = useUserStore()

const emit = defineEmits(['update-user-info'])

const props = defineProps<{
  viewUser: IUserDetail
}>()
const { viewUser } = toRefs(props)

const loginUser = ref<any>(null)

const defaultPostForm = {
  email: '',
  mobile: '',
  oldCode: '',
  code: '',
  sendBtnDisabled: true
}

const validateEmail = (rule: any, value: any, callback: any) => {
  const reg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  if (!reg.test(value)) {
    postForm.value.sendBtnDisabled = true
    callback(new Error('邮箱格式不正确'))
  } else {
    setTimeout(() => {
      commonApi.validAccountExists({ email: value }).then(res => {
        if (res.data === true) {
          postForm.value.sendBtnDisabled = true
          callback(new Error('该邮箱已存在'))
        } else {
          postForm.value.sendBtnDisabled = false
          callback()
        }
      })
    }, 1000)
  }
}

const validateMobile = (rule: any, value: any, callback: any) => {
  const reg = /^1[345789][0-9]{9}$/
  if (!reg.test(value)) {
    postForm.value.sendBtnDisabled = true
    callback(new Error('手机号格式不正确'))
  } else {
    commonApi.validAccountExists({
      mobile: value
    }).then(res => {
      if (res.data) {
        postForm.value.sendBtnDisabled = true
        callback(new Error('该手机号已存在'))
      } else {
        postForm.value.sendBtnDisabled = false
        callback()
      }
    })
  }
}

const validateCode = (rule: any, value: any, callback: any) => {
  if (!value || value.length !== 6) {
    callback(new Error('验证码长度为6位'))
  } else {
    callback()
  }
}
const formRef = ref<FormInstance | null>(null)
const changeBindFormRef = ref<FormInstance | null>(null)
const currentRow = ref<any>(null)
const isEdit = ref(false)
const oldAvatar = ref('')
const avatarPreviewUrl = ref('')
const changDisabled = ref(false)
const btnDisabled = ref(false)
const emailDialogVisible = ref(false)
const mobileDialogVisible = ref(false)
const wechatDialogVisible = ref(false)
const codeMsg = ref('发送验证码')
const time = ref(60)
const errMsg = ref('请在下方输入获取的验证码')
const inputDisabled = ref(false)
const sendBtnDisabled = ref(false)
const needValidOldEmail = ref(true)
const needValidOldMobile = ref(true)
const needValidOldWeChat = ref(true)
const wechatOldCode = ref('')
const wechatCode = ref('')
const wechatAppletImg = ref('')
const codeTimer = ref<any>(null)
const isExpired = ref(false)
const postForm = ref<any>(Object.assign({}, defaultPostForm))
const rules = ref({
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { validator: validateEmail, trigger: 'blur' }
  ],
  mobile: [
    { required: true, message: '手机号不能为空', trigger: 'blur' },
    {
      validator: validateMobile,
      trigger: 'blur'
    }
  ],
  code: [
    { validator: validateCode, trigger: 'blur' }
  ]
})

const user = computed(() => {
  return userStore.user
})

onMounted(() => {
  currentRow.value = Object.assign({}, user.value)
  if (viewUser.value.id === user.value?.id) {
    loginUser.value = Object.assign({}, user.value) as any
  }
})

onUnmounted(() => {
  codeTimer.value && clearInterval(codeTimer.value)
})

async function update() {
  changDisabled.value = true
  const newData: any = removeSameValues(loginUser.value, currentRow.value)
  if (getObjKeyCount(newData) <= 1) {
    ElMessage({
      message: '没有更改的用户信息',
      type: 'warning',
      plain: true
    })
    changDisabled.value = false
    return
  }
  if (typeof newData.avatar === 'object') {
    const avatarFile = await compressImageFile(newData.avatar as File, 320)
    const res = await ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.AVATAR,
      fileName: avatarFile.name
    })
    newData.avatar = await uploadFile(res.data, avatarFile)
  }
  userApi.update(newData).then(async () => {
    ElMessage({
      message: '修改成功',
      type: 'success',
      plain: true
    })
    isEdit.value = false
    await userStore.getInfo()
    currentRow.value = Object.assign({}, user.value)
    avatarPreviewUrl.value = ''
    emit('update-user-info')
  }).finally(() => {
    changDisabled.value = false
  })
}

function beforeAvatarUpload(file: UploadRawFile): false | undefined {
  if (!checkFileSize(file, 5, '头像')) return
  oldAvatar.value = loginUser.value.avatar
  getBase64(file, (url: string) => {
    nextTick(() => {
      avatarPreviewUrl.value = url
      loginUser.value.avatar = file
    })
  })
  return false
}

function handleAvatarRemove() {
  avatarPreviewUrl.value = ''
  loginUser.value.avatar = oldAvatar.value
}

function openEmailModel() {
  emailDialogVisible.value = true
  needValidOldEmail.value = !!loginUser.value.email
}

function openMobileModel() {
  mobileDialogVisible.value = true
  needValidOldMobile.value = !!loginUser.value.mobile
}

async function openWeChatModel() {
  wechatDialogVisible.value = true
  needValidOldWeChat.value = !!loginUser.value.wechat
  if (needValidOldWeChat.value) {
    await getWechatAppletCode(2)
  } else {
    await bindNewWeChat()
  }
}

async function getWechatAppletCode(type: WechatAppletCodeTypeEnum) {
  // type 2: 验证旧微信 3: 绑定新微信 4: 修改密码
  const res = await userApi.getWechatAppletCode(type)
  isExpired.value = false
  if (type === WechatAppletCodeTypeEnum.VALIDATE_OLD_WECHAT) {
    wechatOldCode.value = res.data.code
    wechatAppletImg.value = binaryStrToImgUrl(res.data.img)
    codeTimer.value = setInterval(() => {
      userApi.checkOldScan({
        code: wechatOldCode.value
      }).then(res => {
        // res.data.status 0:未扫码 1: 未绑定 2: 已绑定且是登录用户本人 3: 已过期
        if (res.data.status === WechatScanResultEnum.HAS_BIND) {
          clearInterval(codeTimer.value)
          ElMessage({
            message: '验证成功',
            type: 'success',
            plain: true
          })
          needValidOldWeChat.value = false
          bindNewWeChat()
        } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
          clearInterval(codeTimer.value)
          isExpired.value = true
          wechatOldCode.value = ''
          wechatAppletImg.value = ''
          ElMessage({
            message: '二维码已过期，请点击重新获取',
            type: 'warning',
            plain: true
          })
        }
      })
    }, 1500)
  }
  if (type === WechatAppletCodeTypeEnum.BIND_NEW_WECHAT) {
    wechatCode.value = res.data.code
    wechatAppletImg.value = binaryStrToImgUrl(res.data.img)
    codeTimer.value = setInterval(() => {
      userApi.checkScan({
        code: wechatCode.value
      }).then(res => {
        // res.data.status 0:未扫码 1: 未绑定 2: 已绑定 3: 已过期
        if (res.data.status === WechatScanResultEnum.NOT_BIND) { // 未绑定
          clearInterval(codeTimer.value)
          userApi.bindWeChat({
            oldCode: wechatOldCode.value,
            code: wechatCode.value
          }).then(async () => {
            ElMessage({
              message: '绑定成功',
              type: 'success',
              plain: true
            })
            wechatDialogVisible.value = false
            await userStore.getInfo()
            loginUser.value = Object.assign({}, user.value)
          })
        } else if (res.data.status === WechatScanResultEnum.HAS_BIND) { // 已绑定
          clearInterval(codeTimer.value)
          ElMessage({
            message: '该微信已绑定其他账号',
            type: 'warning',
            plain: true
          })
          getWechatAppletCode(WechatAppletCodeTypeEnum.BIND_NEW_WECHAT)
        } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
          clearInterval(codeTimer.value)
          isExpired.value = true
          wechatOldCode.value = ''
          wechatAppletImg.value = ''
          ElMessage({
            message: '二维码已过期，请点击重新获取',
            type: 'warning',
            plain: true
          })
        }
      })
    }, 1500)
  }
}

async function bindNewWeChat() {
  await getWechatAppletCode(WechatAppletCodeTypeEnum.BIND_NEW_WECHAT)
}

function cancelEdit() {
  loginUser.value = Object.assign({}, user.value)
  currentRow.value = Object.assign({}, user.value)
  isEdit.value = !isEdit.value
}

function sendEmailMobileCode(type: SendChangeCodeTypeEnum): void {
  // 发送邮件
  countDown()
  let func: ((data: any) => Promise<any>) | null = null
  let tipMsg = ''
  if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
    func = commonApi.getUserEmailCode
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
  } else if (type === SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE) {
    func = commonApi.getUserMobileCode
    tipMsg = '验证码发送成功，请查看短信获取验证码'
  }
  if (!func) return
  func({
    codeType: VerifyCodeTypeEnum.CHANGE_BIND
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

function validateOldCode(type: SendChangeCodeTypeEnum): void {
  inputDisabled.value = true
  let func: (data: any) => Promise<any>
  if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
    func = commonApi.validUserEmailCode
  } else {
    func = commonApi.validUserMobileCode
  }
  func({
    code: postForm.value.oldCode,
    codeType: VerifyCodeTypeEnum.CHANGE_BIND
  }).then(res => {
    if (!res.data) {
      errMsg.value = '验证码不正确'
    } else {
      if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
        needValidOldEmail.value = false
      } else {
        needValidOldMobile.value = false
      }
    }
  }).finally(() => {
    inputDisabled.value = false
  })
}

function sendNewEmailMobileCode(type: SendNewBindCodeTypeEnum): void {
  if (!postForm.value.email && !postForm.value.mobile) {
    return
  }
  let func: (data: any) => Promise<any>
  let tipMsg = ''
  const sendData: any = {
    codeType: VerifyCodeTypeEnum.CHANGE_BIND
  }
  if (type === 1) {
    func = commonApi.getUserEmailCode
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
    sendData.email = postForm.value.email
  } else {
    func = commonApi.getUserMobileCode
    tipMsg = '验证码发送成功，请查看短信获取验证码'
    sendData.mobile = postForm.value.mobile
  }
  // 发送邮件
  countDown()
  func(sendData).then(() => {
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
  sendBtnDisabled.value = true
  postForm.value.sendBtnDisabled = true
  codeTimer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(codeTimer.value)
      codeMsg.value = '发送验证码'
      time.value = 60
      sendBtnDisabled.value = false
      postForm.value.sendBtnDisabled = false
    }
  }, 1000)
}

function saveUserEmailMobile(type: SendChangeCodeTypeEnum): void {
  changeBindFormRef.value?.validate(valid => {
    if (valid) {
      btnDisabled.value = true
      const user: any = {
        code: postForm.value.code,
        oldCode: postForm.value.oldCode
      }
      let func: (data: any) => Promise<any>
      if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
        user.email = postForm.value.email
        func = userApi.changeEmailBind
      } else {
        user.mobile = postForm.value.mobile
        func = userApi.changeMobileBind
      }
      func(user).then(async () => {
        closeEmailDialog()
        closeMobileDialog()
        await userStore.getInfo()
        ElMessage({
          message: '修改绑定成功',
          type: 'success',
          plain: true
        })
      }).finally(() => {
        btnDisabled.value = false
      })
    }
  })
}

function closeEmailDialog() {
  postForm.value = Object.assign({}, defaultPostForm)
  errMsg.value = '请在下方输入获取的验证码'
  emailDialogVisible.value = false
}

function closeMobileDialog() {
  postForm.value = Object.assign({}, defaultPostForm)
  errMsg.value = '请在下方输入获取的验证码'
  mobileDialogVisible.value = false
}

function closeWeChatDialog() {
  wechatDialogVisible.value = false
  wechatAppletImg.value = ''
  wechatCode.value = ''
  wechatOldCode.value = ''
  clearInterval(codeTimer.value)
}
</script>
