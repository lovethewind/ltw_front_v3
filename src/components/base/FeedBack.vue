<template>
  <AppFormDialog
    v-model="feedbackFlag"
    class="feedback-dialog"
    width="540px"
    top="10vh"
    title="意见反馈"
    hero-icon="material-symbols:feedback-outline"
    hero-title="把你的想法告诉我们"
    hero-description="无论是新需求还是 bug 线索，都可以在这里提交。"
    @close="closeModal()"
  >
    <el-form ref="feedbackFormRef" :rules="rules" label-position="left" :model="postForm"
             :label-width="formLabelWidth" class="app-dialog-form">
      <el-form-item label="反馈类型" prop="feedbackType">
        <el-radio-group v-model="postForm.feedbackType" class="app-dialog-segmented">
          <el-radio-button :value="1">
            提交需求
          </el-radio-button>
          <el-radio-button :value="2">
            反馈 Bug
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="联系邮箱" prop="email">
        <el-input v-model="postForm.email" placeholder="请填写您的联系邮箱" />
      </el-form-item>
      <el-form-item label="需求" prop="title">
        <el-input v-model="postForm.title" placeholder="请用一句话描述你的需求" />
      </el-form-item>
      <div class="contentInput">
        <el-form-item label="需求简述" prop="content">
          <el-input v-model="postForm.content" placeholder="请在此详细描述你的需求" :rows="6" type="textarea" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <div class="app-dialog-footer">
        <el-button @click="closeModal()">取 消</el-button>
        <el-button type="primary" :loading="feedbackDisabled" @click="submit">提交反馈</el-button>
      </div>
    </template>
  </AppFormDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import commonApi from '@/api/common.js'
import { useModalStore } from '@/stores/modal'
import AppFormDialog from '@/components/base/AppFormDialog.vue'

const modalStore = useModalStore()

const feedbackFormRef = ref<FormInstance>()
const formLabelWidth = ref('80px')
const postForm = ref({
  feedbackType: 1,
  email: null,
  title: null,
  content: null
})
const feedbackDisabled = ref(false)
const rules = ref({
  feedbackType: [
    { required: true, message: '请选择反馈类型，方便处理', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请填写联系邮箱，以方便与你回应', trigger: 'blur' },
    { pattern: /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((.[a-zA-Z0-9_-]{2,3}){1,2})$/, message: '填写正确的邮箱' }
  ],
  title: [
    { required: true, message: '请简短描述一下', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '反馈内容不能为空', trigger: 'blur' }
  ]
})

const feedbackFlag = computed(() => {
  return modalStore.feedbackFlag
})

function closeModal() {
  postForm.value.feedbackType = 1
  postForm.value.email = null
  postForm.value.title = null
  postForm.value.content = null
  feedbackFormRef.value?.resetFields()
  modalStore.setFeedbackFlag(false)
}

function submit() {
  feedbackDisabled.value = true
  feedbackFormRef.value?.validate((valid) => {
    if (valid) {
      commonApi.addFeedback(postForm.value).then(() => {
        ElMessage({
          message: '提交反馈成功',
          type: 'success',
          plain: true
        })
        closeModal()
      }).catch(() => {
        ElMessage({
          message: '提交反馈失败',
          type: 'error',
          plain: true
        })
      }).finally(() => {
        feedbackDisabled.value = false
      })
    } else {
      ElMessage({
        message: '填写信息不正确，请检查',
        type: 'error',
        plain: true
      })
      feedbackDisabled.value = false
    }
  })
}
</script>
