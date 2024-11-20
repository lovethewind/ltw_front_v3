<template>
  <MdEditor
    ref="editorRef"
    v-model="contentValue"
    :toolbars-exclude="toolbarExclude"
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
const editorRef = shallowRef<InstanceType<typeof MdEditor>>(null)
const contentValue = ref('')
const theme = computed(() => {
  return commonStore.theme
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
  background: #fff;
  z-index: 2;

  .md-editor-toolbar {
    justify-content: space-around;

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
  width: 980px;
  margin: 5px auto 0 auto;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>

<style lang="scss" scoped>

</style>
