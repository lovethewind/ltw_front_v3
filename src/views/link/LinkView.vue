<template>
  <!-- banner -->
  <div class="banner" :style="cover">
    <h1 class="banner-title">友链</h1>
  </div>
  <!-- 链接列表 -->
  <el-card class="blog-container">
    <div class="link-section-header">
      <div class="link-title">
        <Icon icon="noto:link" />
        友链伙伴
      </div>
      <span class="link-sort-note">随机展示</span>
    </div>
    <el-row class="link-container" :gutter="18" align="stretch" justify="start">
      <el-col v-for="item of linkList" :key="item.id" class="link-wrapper" :md="12" :span="24">
        <a
          class="link-card"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`访问友链：${item.name}`"
        >
          <el-avatar
            :size="68"
            :src="item.cover"
            :alt="`${item.name} 站点标志`"
            class="link-avatar"
          >
            <template #error>
              <span class="link-avatar-fallback" aria-hidden="true">
                {{ item.name ? item.name.slice(0, 1) : '?' }}
              </span>
            </template>
          </el-avatar>
          <div class="link-content">
            <div class="link-name ellipsis">{{ item.name }}</div>
            <div class="link-intro ellipsis-2l">{{ item.introduce }}</div>
          </div>
          <Icon
            icon="material-symbols:open-in-new-rounded"
            class="link-external-icon"
            aria-hidden="true"
          />
        </a>
      </el-col>
    </el-row>

    <div class="link-title mt-4 mb-4">
      <Icon icon="noto:cupcake" />
      本站信息
    </div>
    <div class="site-info-panel">
      <div class="site-info-row">
        <span class="site-info-label">网站名称</span>
        <span class="site-info-value">{{ websiteInfo.home }}</span>
        <button
          type="button"
          class="site-info-copy-button"
          aria-label="复制网站名称"
          @click="copy(websiteInfo.name)"
        >
          <Icon icon="material-symbols:content-copy-outline" aria-hidden="true" />
        </button>
      </div>
      <div class="site-info-row">
        <span class="site-info-label">网站简介</span>
        <span class="site-info-value">{{ websiteInfo.metaInfo.meta[1].content }}</span>
        <button
          type="button"
          class="site-info-copy-button"
          aria-label="复制网站简介"
          @click="copy(websiteInfo.summary)"
        >
          <Icon icon="material-symbols:content-copy-outline" aria-hidden="true" />
        </button>
      </div>
      <div class="site-info-row">
        <span class="site-info-label">网站地址</span>
        <span class="site-info-value">{{ websiteInfo.webUrl }}</span>
        <button
          type="button"
          class="site-info-copy-button"
          aria-label="复制网站地址"
          @click="copy(websiteInfo.webUrl)"
        >
          <Icon icon="material-symbols:content-copy-outline" aria-hidden="true" />
        </button>
      </div>
      <div class="site-info-row">
        <span class="site-info-label">网站 Logo</span>
        <span class="site-info-value">{{ websiteInfo.logo }}</span>
        <button
          type="button"
          class="site-info-copy-button"
          aria-label="复制网站 Logo"
          @click="copy(websiteInfo.logo)"
        >
          <Icon icon="material-symbols:content-copy-outline" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="link-title mt-4 mb-4">
      <Icon icon="emojione-v1:lower-left-pencil" />
      添加友链
    </div>
    <div class="link-apply-panel">
      <div class="link-apply-copy">
        <strong>想和本站交换友链？</strong>
        <span>提交站点信息后会进入审核，通过后将通过邮件告知。</span>
        <small>已申请过但需要修改信息时，重新提交后也需要再次审核。</small>
      </div>
      <el-button type="primary" size="large" class="link-apply-button" @click="onclick()"
        >申请友链</el-button
      >
    </div>
    <div>
      <AppFormDialog
        v-model="dialogFormVisible"
        class="link-dialog"
        width="560px"
        center
        title="申请友链"
        :close-on-click-modal="false"
        hero-icon="noto:link"
        hero-title="交换一个有趣的入口"
        hero-description="提交站点信息后会进入审核，通过后会通过邮件告知。"
        tip="如果已经申请过但需要修改信息，重新提交后也需要再次审核。"
        @close="closeModal()"
      >
        <el-form
          ref="postFormRef"
          :rules="rules"
          :model="postForm"
          label-width="92"
          class="app-dialog-form"
        >
          <el-form-item label="网站名称" prop="name">
            <el-input v-model="postForm.name" autocomplete="off" placeholder="请输入网站名称" />
          </el-form-item>
          <el-form-item label="网站 Logo" prop="cover">
            <el-input v-model="postForm.cover" autocomplete="off" placeholder="请输入图片 URL" />
          </el-form-item>
          <el-form-item label="网站地址" prop="url">
            <el-input v-model="postForm.url" autocomplete="off" placeholder="https://example.com" />
          </el-form-item>
          <el-form-item label="网站简介" prop="introduce">
            <el-input
              v-model="postForm.introduce"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 6 }"
              autocomplete="off"
              placeholder="简单介绍一下你的网站"
            />
          </el-form-item>
          <el-form-item label="邮箱地址" prop="email">
            <el-input
              v-model="postForm.email"
              type="email"
              autocomplete="off"
              placeholder="成功或有疑问时，可通过此邮箱联系你"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="app-dialog-footer">
            <el-button @click="closeModal()">取 消</el-button>
            <el-button type="primary" :loading="btnDisabled" @click="submit()">提交申请</el-button>
          </div>
        </template>
      </AppFormDialog>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import linkApi from '@/api/link'
import { randomSortList, copy } from '@/utils/common'
import { ElMessage, type FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import AppFormDialog from '@/components/base/AppFormDialog.vue'

const commonStore = useCommonStore()

const baseInfo = {
  url: null,
  name: null,
  cover: null,
  introduce: null,
  email: null,
  type: 1
}

const postFormRef = ref<FormInstance | null>(null)
const linkList = ref<any>([])
const dialogFormVisible = ref(false)
const btnDisabled = ref(false)
const postForm = ref(Object.assign({}, baseInfo))
const rules = {
  'name': [{ required: true, message: '网站名称不能为空', trigger: 'blur' },
    { max: 100, message: '网站名称不能超过100个字符', trigger: 'blur' }
  ],
  'email': [
    { required: true, message: '请填写邮箱，不然无法通知到您', trigger: 'blur' },
    {
      pattern: /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((.[a-zA-Z0-9_-]{2,3}){1,2})$/,
      message: '请填写正确的邮箱'
    }
  ],
  'introduce': [{ required: true, message: '简单介绍一下该网站吧', trigger: 'blur' }],
  'url': [
    { required: true, message: '网站地址不能为空', trigger: 'blur' },
    {
      pattern: /^((https|http|ftp|rtsp|mms)?(:\/\/)?)(www\.)?(([A-Za-z0-9-]+)\.)+([A-Za-z0-9])+([A-Za-z0-9-~./])+$/,
      message: '请填写正确的网址'
    }
  ],
  'cover': [{ required: true, message: '网站图标url不能为空', trigger: 'blur' }]
}

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['link'].pageCover + ') center center / cover no-repeat'
})

fetchData()

function fetchData() {
  linkApi.getList().then(res => {
    linkList.value = randomSortList(res.data)
  })
}

function onclick() {
  dialogFormVisible.value = true
}

function submit() {
  btnDisabled.value = true
  postFormRef.value?.validate((valid) => {
    if (valid) {
      linkApi.save(postForm.value).then(() => {
        ElMessage({
          message: '申请成功,通过申请后将通过邮件告知您',
          type: 'success',
          plain: true
        })
        dialogFormVisible.value = false
      }).finally(() => {
        btnDisabled.value = false
      })
    } else {
      btnDisabled.value = false
      ElMessage({
        message: '填写信息不正确，请确认',
        type: 'error',
        plain: true
      })
    }
  })
}

function closeModal() {
  postForm.value = Object.assign({}, baseInfo)
  postFormRef.value?.resetFields()
  btnDisabled.value = false
  dialogFormVisible.value = false
}
</script>

<style src="@/assets/css/about.scss" scoped />
<style lang="scss" scoped>
.link-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.link-title {
  color: #344c67;
  font-size: 21px;
  font-weight: bold;
  line-height: 2;
  display: flex;
  align-items: center;

  :deep(svg) {
    margin-right: 5px;
  }
}

.link-sort-note {
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid #d9e8f3;
  border-radius: 999px;
  background: #f4f9fd;
  color: #637083;
  font-size: 12px;
}

.link-container {
  margin-top: 12px;
}

.link-wrapper {
  margin-bottom: 18px;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 110px;
  padding: 16px;
  border: 1px solid #e3ebf3;
  border-radius: 12px;
  background: linear-gradient(145deg, #fff 0%, #f8fbfe 100%);
  color: #344c67;
  box-shadow: 0 4px 16px rgba(47, 84, 112, 0.06);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #9fd4f2;
    color: #344c67 !important;
    box-shadow: 0 10px 26px rgba(73, 177, 245, 0.18);
    transform: translateY(-2px);

    .link-external-icon {
      color: #49b1f5;
      transform: translate(2px, -2px);
    }
  }

  &:focus-visible {
    outline: 3px solid rgba(64, 158, 255, 0.35);
    outline-offset: 3px;
  }
}

.link-avatar {
  flex: 0 0 auto;
  background: #e8eef5;
  color: #52657a;
  font-size: 22px;
  font-weight: 700;
}

.link-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.link-content {
  min-width: 0;
  flex: 1;
}

.link-name {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: bold;
  line-height: 1.4;
}

.link-intro {
  color: #657286;
  font-size: 13px;
  line-height: 1.65;
}

.link-external-icon {
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 3px;
  color: #9aa9b8;
  font-size: 19px;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.site-info-panel {
  overflow: hidden;
  border: 1px solid #dcecf7;
  border-left: 4px solid #49b1f5;
  border-radius: 10px;
  background: #f4faff;
}

.site-info-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid #e2eef6;

  &:last-child {
    border-bottom: 0;
  }
}

.site-info-label {
  color: #52657a;
  font-size: 13px;
  font-weight: 700;
}

.site-info-value {
  min-width: 0;
  color: #344054;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.site-info-copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #5f7085;
  font-size: 18px;

  &:hover {
    border-color: #b9ddf4;
    background: #e9f6fe;
    color: #228dcc;
  }

  &:focus-visible {
    outline: 3px solid rgba(64, 158, 255, 0.35);
    outline-offset: 2px;
  }
}

.link-apply-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 20px;
  border: 1px solid #e4e9ef;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff 0%, #f7fbff 100%);
}

.link-apply-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;

  strong {
    color: #344054;
    font-size: 16px;
  }

  span {
    color: #667085;
    line-height: 1.6;
  }

  small {
    color: #b54708;
    line-height: 1.5;
  }
}

.link-apply-button {
  flex: 0 0 auto;
  min-width: 112px;
}

:global(html.dark) {
  .link-title {
    color: #71b4ff;
  }

  .link-sort-note {
    border-color: #39434f;
    background: #242a31;
    color: #b8c3cf;
  }

  .link-card,
  .link-apply-panel {
    border-color: #343d47;
    background: linear-gradient(145deg, #23282f 0%, #1f242a 100%);
  }

  .link-name,
  .link-apply-copy strong {
    color: #f4f6f8;
  }

  .link-intro,
  .link-apply-copy span {
    color: #b7c0ca;
  }

  .site-info-panel {
    border-color: #364652;
    border-left-color: #49b1f5;
    background: #20262c;
  }

  .site-info-row {
    border-color: #35404a;
  }

  .site-info-label,
  .site-info-value {
    color: #d6dde5;
  }
}

@media (max-width: 759px) {
  .link-card {
    min-height: 104px;
    padding: 14px;
  }

  .link-intro {
    font-size: 13px;
  }

  .site-info-row {
    grid-template-columns: 74px minmax(0, 1fr) 34px;
    gap: 8px;
    padding: 9px 10px;
  }

  .link-apply-panel {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .link-apply-button {
    width: 100%;
  }
}
</style>
