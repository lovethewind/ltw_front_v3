<template>
  <el-card v-if="props.useCard" class="order-bar-card">
    <div class="order-type-div">
      <Icon v-if="props.showIcon" :icon="icon" class="icon-class" />
      <span v-for="(item, index) in props.barList" :key="item.type">
        <a :class="active === item.type ? 'active': ''" @click="itemClick(item.type)">{{ item.name }}</a>
        <el-divider v-if="index !== props.barList.length - 1" direction="vertical" />
      </span>
    </div>
  </el-card>
  <div v-else>
    <Icon v-if="props.showIcon" :icon="icon" class="icon-class" />
    <span v-for="(item, index) in props.barList" :key="item.type">
      <a :class="active === item.type ? 'active': ''" @click="itemClick(item.type)">{{ item.name }}</a>
      <el-divider v-if="index !== props.barList.length - 1" direction="vertical" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const emit = defineEmits(['item-click'])

const props = defineProps({
  barList: {
    type: Array<any>,
    default: () => [
      {
        type: 1,
        name: '最新'
      },
      {
        type: 2,
        name: '热门'
      },
      {
        type: 3,
        name: '推荐'
      }
    ]
  },
  useCard: {
    type: Boolean,
    default: () => true
  },
  showIcon: {
    type: Boolean,
    default: () => true
  },
  icon: {
    type: String,
    default: () => 'noto:beach-with-umbrella'
  }
})

const active = ref(props.barList[0].type)

/**
 * 切换排序类型并通知父组件。
 *
 * :param val: 当前选中的排序类型。
 * :return: 无返回值。
 */
function itemClick(val: number): void {
  emit('item-click', val)
  active.value = val
}

</script>

<style scoped>
.order-bar-card {
  border-radius: 6px;
}

.order-bar-card :deep(.el-card__body) {
  padding: 0;
}

.order-type-div {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 0.875rem;
  font-size: 16px;
  font-weight: 600;
}

.order-type-div a {
  color: var(--el-text-color-regular);
}

@media screen and (max-width: 759px) {
  .order-type-div {
    margin: 10px 0;
    display: flex;
    height: 42px;
    padding: 0 0.875rem;
  }
}

.active {
  color: #2f80ed !important;
}

.icon-class {
  margin-right: 10px;
}
</style>
