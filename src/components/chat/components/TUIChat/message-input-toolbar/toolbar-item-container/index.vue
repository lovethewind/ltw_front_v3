<template>
  <div class="toolbar-item-container" @click="toggleToolbarItem">
    <div class="toolbar-item-container-icon"
         v-if="needDialog"
         v-click-outside="closeToolbarItem"
         :title="props.title"
         >
      <Icon
        :icon="props.icon"
        :width="props.iconWidth"
        :height="props.iconHeight"
      />
      <div v-show="showDialog" ref="dialogRef" class="toolbar-item-container-dialog">
        <slot />
      </div>
    </div>
    <div class="toolbar-item-container-icon"
         v-else
         :title="props.title"
         >
      <Icon
        :icon="props.icon"
        :width="props.iconWidth"
        :height="props.iconHeight"
      />
      <slot />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  needDialog: {
    type: Boolean,
    default: true
  },
  iconWidth: {
    type: Number,
    default: 20
  },
  iconHeight: {
    type: Number,
    default: 20
  }
})

const showDialog = ref(false)
const dialogRef = ref()

function toggleToolbarItem() {
  if (!props.needDialog) {
    return
  }
  showDialog.value = true
}

function closeToolbarItem() {
  showDialog.value = false
}
</script>
<style lang="scss" scoped src="./style/index.scss"></style>
