<template>
  <!-- 加载更多 -->
  <div class="text-center pt-4 mb-6">
    <el-empty v-if="!loading && total === 0" :style="{minHeight: (emptyHeight ? emptyHeight + 'px' : 'auto')}"
              :class="showBoxShadow ? 'box-shadow' : ''" />
    <el-button v-if="!noMore && !loading && total > 0" type="success" class="load-more" @click="infiniteHandler">
      加载更多
    </el-button>
    <el-skeleton v-if="loading" :rows="loadingRows" class="text-left pa-5 white bra-5 mt-2" animated />
    <el-button v-if="showNoMore && !loading && noMore && total > 0" class="no-more">没有更多了</el-button>
  </div>
</template>
<script setup lang="ts">
import { toRefs } from 'vue'

const emit = defineEmits(['load'])

interface Props {
  loading?: boolean // 是否正在加载
  noMore?: boolean // 是否没有更多
  total?: number  // 总数, 决定是否显示暂无数据
  showNoMore?: boolean // 显示是否没有更多
  loadingRows?: number // 加载中占位行数
  emptyHeight?: number  // 暂无数据高度
  showBoxShadow?: boolean  // 暂无数据是否显示阴影
}

const props = withDefaults(defineProps<Props>(), {
  loading: () => false,
  noMore: () => false,
  total: () => 0,
  showNoMore: () => false,
  loadingRows: () => 4,
  emptyHeight: () => 0,
  showBoxShadow: () => false
})

const { loading, noMore, total, showNoMore, loadingRows, emptyHeight, showBoxShadow } = toRefs(props)

function infiniteHandler() {
  emit('load')
}

</script>

<style scoped>

</style>
