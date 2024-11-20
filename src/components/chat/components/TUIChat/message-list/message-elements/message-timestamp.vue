<template>
  <div v-if="timestampShowFlag" class="message-timestamp">
    {{ timestampShowContent }}
  </div>
</template>
<script setup lang="ts">
import { toRefs, ref, computed } from 'vue'
import { dateStringDiff, formatDateToMinute } from '@/utils/date'

const props = defineProps({
  currTime: {
    type: String,
    default: null
  },
  prevTime: {
    type: String,
    default: null
  }
})
const { currTime, prevTime } = toRefs(props)
const timestampShowFlag = ref(true)
const timestampShowContent = computed(() => {
  return handleItemTime(currTime.value, prevTime.value)
})

function handleItemTime(currTime: string, prevTime: string) {
  timestampShowFlag.value = false
  if (!currTime || !prevTime) {
    return
  }
  if (dateStringDiff(currTime, prevTime) > 60) {
    timestampShowFlag.value = true
    return formatDateToMinute(currTime)
  }
}

</script>
<style lang="scss" scoped>
@import "../../../../assets/styles/common";

.message-timestamp {
  margin: 10px auto;
  color: #999;
  font-size: 12px;
  overflow-wrap: anywhere;
  display: flex;
  align-items: center;
  text-align: center;
}
</style>
