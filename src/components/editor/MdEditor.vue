<template>
  <MdEditor
    ref="editorRef"
    v-model="contentValue"
    :toolbars-exclude="toolbarExclude as any"
    :footers="[]"
    :show-toolbar-name="true"
    :tab-width="4"
    @onUploadImg="uploadImg"
    @onChange="contentChange"
    :theme="theme"
  />
</template>
<script setup lang="ts">
import 'md-editor-v3/lib/style.css'
import { MdEditor } from 'md-editor-v3'
import { computed, ref, shallowRef } from 'vue'

import ossApi from '@/api/oss-api'
import { uploadFile } from '@/utils/oss-upload'
import { ElMessage } from 'element-plus'
import { UploadFileTypeEnum } from '@/enums'
import { useCommonStore } from '@/stores/common'

const emit = defineEmits(['change'])

interface Props {
  toolbar?: object,
  toolbarExclude?: string[]
}

withDefaults(defineProps<Props>(), {
  toolbar: () => {
    return {
      bold: true, // 粗体
      italic: true, // 斜体
      header: true, // 标题
      underline: true, // 下划线
      strikethrough: true, // 中划线
      mark: true, // 标记
      superscript: true, // 上角标
      subscript: true, // 下角标
      quote: true, // 引用
      ol: true, // 有序列表
      ul: true, // 无序列表
      link: true, // 链接
      imagelink: true, // 图片链接
      code: true, // code
      table: true, // 表格
      fullscreen: true, // 全屏编辑
      readmodel: true, // 沉浸式阅读
      htmlcode: true, // 展示html源码
      help: true, // 帮助
      /* 1.3.5 */
      undo: true, // 上一步
      redo: true, // 下一步
      trash: true, // 清空
      save: true, // 保存（触发events中的save事件）
      /* 1.4.2 */
      navigation: true, // 导航目录
      /* 2.1.8 */
      alignleft: true, // 左对齐
      aligncenter: true, // 居中
      alignright: true, // 右对齐
      /* 2.2.1 */
      subfield: true, // 单双栏模式
      preview: true // 预览
    }
  },
  toolbarExclude: () => ['save', 'github', 'fullscreen', 'pageFullscreen']
})

const commonStore = useCommonStore()
const editorRef = shallowRef<any>(null)
const contentValue = ref('')
const theme = computed(() => {
  return commonStore.theme as any
})

function contentChange(data: string) {
  emit('change', data)
}

function setContent(value: string) {
  contentValue.value = value
}

function getContentLength() {
  return contentValue.value.length
}

function uploadImg(files: File[], callback: Function) {
  const file = files[0]
  ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.IMAGE,
    fileName: file.name
  }).then(res => {
    uploadFile(res.data, file).then(url => {
      ElMessage({
        message: '上传成功',
        type: 'success',
        plain: true
      })
      callback([{
        url: url,
        alt: file.name,
        title: file.name
      }])
    })
  }).finally(() => {
  })
}

defineExpose({
  setContent,
  getContentLength
})
</script>

<style lang="scss">
.md-editor-toolbar-wrapper {
  position: sticky;
  top: 61px;
  width: 100%;
  background: rgb(255 255 255 / 96%);
  z-index: 5;
  border-top: 1px solid #eef2f6;
  border-bottom: 1px solid #eef2f6;
  backdrop-filter: blur(12px);

  .md-editor-toolbar {
    justify-content: center;
    gap: 4px;
    width: min(1160px, calc(100vw - 48px));
    margin: 0 auto;

    .md-editor-dropdown {
      position: fixed;
      top: 105px !important;
    }

    .md-editor-toolbar-item {
      text-align: -webkit-center;
    }
  }
}

.md-editor-catalog {
  z-index: 0;
}

.md-editor-content {
  width: min(1160px, calc(100vw - 48px));
  margin: 10px auto 0 auto;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 16px 36px rgb(15 23 42 / 6%);
}

.md-editor-input-wrapper,
.md-editor-preview-wrapper {
  scrollbar-color: #b8c5d6 transparent;
}

.md-editor-dark {
  .md-editor-toolbar-wrapper {
    background: rgb(31 41 55 / 96%);
    border-color: rgb(255 255 255 / 10%);
  }

  .md-editor-content {
    border-color: rgb(255 255 255 / 12%);
    background: #111827;
    box-shadow: none;
  }
}

@media screen and (max-width: 759px) {
  .md-editor-toolbar-wrapper {
    .md-editor-toolbar {
      justify-content: flex-start;
      width: calc(100vw - 24px);
      overflow-x: auto;
    }
  }

  .md-editor-content {
    width: calc(100vw - 24px);
  }
}

body.article-editing-page {
  .md-editor-toolbar-wrapper {
    .md-editor-toolbar {
      width: 100%;
      max-width: none;
      padding: 0 12px;
      justify-content: center;
      overflow-x: hidden;
    }
  }

  .md-editor-content {
    width: 100%;
    height: calc(100vh - 246px);
    min-height: 620px;
    max-width: none;
    margin: 10px 0 0;
  }
}
</style>

<style lang="scss" scoped>

</style>
