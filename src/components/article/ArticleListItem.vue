<template>
  <el-card class="article-list-item-card" style="border-radius: 12px 8px 8px 12px">
    <div
      :class="[
        'article-cover',
        isRight(index) ? ' right-radius float-end' : 'left-radius float-start'
      ]"
    >
      <el-image
        class="on-hover cover-img"
        :src="article.coverThumb || article.cover"
        lazy
        fit="cover"
        @click="openArticleDetail"
      />
    </div>
    <div :class="['article-wrapper', !isRight(index) ? 'float-end' : 'float-start']">
      <h3 class="article-list-item-title">
        <router-link :to="'/article/' + article.id" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </router-link>
      </h3>
      <div class="article-content">
        {{ article.content }}
      </div>
      <div class="article-info">
        <div class="first-info">
          <router-link :to="'/user/' + article.user.id" class="username-avatar-info">
            <el-avatar :src="article.user.avatar" size="small" />
            <span class="ms-1 a-link ellipsis username-info">{{ article.user.nickname }}</span>
          </router-link>
          <span class="d-inline-flex float-end">
            <Icon icon="solar:calendar-broken" class="font-14" />
            <span class="me-3">{{ date(article.createTime) }}</span>
            <Icon icon="tabler:category" class="font-14" />
            <a @click="emitCategoryClick">
              {{ categoryMap[article.categoryId] ? categoryMap[article.categoryId].name : '' }}
            </a>
          </span>
        </div>
        <div class="second-info">
          <span class="me-2">
            <el-tag size="small" :type="article.isOriginal ? 'success' : 'warning'">
              {{ article.isOriginal ? '原创' : '转载' }}
            </el-tag>
          </span>
          <span class="me-3">
            <Icon icon="ph:eye" class="font-14" />
            {{ covertNumberDisplay(article.viewCount) }}
          </span>
          <span class="me-3">
            <Icon icon="iconamoon:comment-dots" class="font-14" />
            {{ covertNumberDisplay(article.commentCount) }}
          </span>
          <span>
            <Icon icon="tabler:thumb-up" class="font-14" />
            {{ covertNumberDisplay(article.likeCount) }}
          </span>
          <span class="tag-span">
            <router-link
              v-for="tagId of article.tagList.slice(0, isMobile() ? 2 : 3)"
              :key="'articleListItemTag' + article.id + tagId"
              :to="'/tag/' + tagId"
            >
              <el-tag
                size="small"
                :color="colors[tagId] || 'green'"
                class="el-tag-btn-a"
                :style="{ '--tag-color': colors[tagId] }"
              >
                {{ tagMap[tagId] ? tagMap[tagId].name : '' }}</el-tag
              >
            </router-link>
          </span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { IArticle } from '@/interface'
import { covertNumberDisplay, isMobile } from '@/utils/common'
import { date } from '@/utils/date'

const props = defineProps<{
  article: IArticle
  index: number
  categoryMap: Record<string, { name: string }>
  tagMap: Record<string, { name: string }>
  colors: Record<string, string>
}>()

const emit = defineEmits<{
  (event: 'category-click', categoryId: string): void
}>()

/**
 * 判断当前文章封面是否展示在右侧。
 *
 * :param index: 文章在列表中的下标。
 * :return: 奇数项返回 true，偶数项返回 false。
 */
function isRight(index: number): boolean {
  return index % 2 !== 0
}

/**
 * 通知父组件处理文章分类点击。
 *
 * :return: 无返回值。
 */
function emitCategoryClick(): void {
  emit('category-click', String(props.article.categoryId))
}

/**
 * 在新标签页打开文章详情。
 *
 * :return: 无返回值。
 */
function openArticleDetail(): void {
  window.open('/article/' + props.article.id, '_blank', 'noopener,noreferrer')
}
</script>

<style lang="scss" scoped>
:deep(.el-card__body) {
  height: 100%;
  width: 100%;
  --el-card-padding: 0;
}

.left-radius {
  border-radius: 8px 0 0 8px !important;
  order: 0;
}

.right-radius {
  border-radius: 0 8px 8px 0 !important;
  order: 1;
}

.article-list-item-card {
  border: 1px solid rgba(125, 125, 125, 0.12);
  box-shadow: 0 0.5rem 1.5rem rgba(31, 45, 61, 0.06);
  overflow: hidden;
}

.article-list-item-card:hover {
  box-shadow: 0 0.75rem 1.8rem rgba(31, 45, 61, 0.1);
}

.cover-img {
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.article-wrapper {
  font-size: 14px;
  height: 100%;
  padding: 1.25rem;
}

.article-content {
  line-height: 1.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.article-info {
  font-size: 95%;
  color: #858585;
  line-height: 2;

  :deep(a) {
    font-size: 12px;
    color: #858585;
  }

  :deep(svg) {
    margin-right: 5px;
  }

  .first-info {
    height: 50%;

    :deep(span) {
      display: inline-flex;
      align-items: center;
    }
  }

  .second-info {
    display: flex;
    align-items: center;
    position: relative;

    a {
      display: inline-flex;
      align-items: center;
    }

    .tag-span {
      position: absolute;
      right: 0;
    }

    :deep(span) {
      display: inline-flex;
      align-items: center;
    }
  }

  .username-avatar-info {
    display: inline-flex;
    width: 50%;
  }

  .username-info {
    max-width: calc(100% - 30px);
  }
}

.el-tag-btn-a {
  margin-left: 5px;
  color: #fff;

  &:hover {
    opacity: 0.8;
  }
}

@media (min-width: 760px) {
  .article-list-item-card {
    display: flex;
    align-items: center;
    height: 210px;
    width: 100%;
    margin-top: 10px;
  }

  .article-cover {
    overflow: hidden;
    height: 100%;
    width: 35%;
  }

  .on-hover {
    transition: all 0.6s;
  }

  .article-list-item-card:hover .on-hover {
    transform: scale(1.1);
  }

  .article-wrapper {
    padding: 0 1rem;
    width: 65%;
  }

  .article-list-item-title {
    overflow: hidden;
    margin: 0;
    height: 30%;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 2rem;
    display: flex;
    align-items: center;
  }

  .article-content {
    height: 43%;
    opacity: 0.8;
  }

  .article-info {
    height: 27%;
  }
}

@media (max-width: 759px) {
  .article-list-item-title {
    overflow: hidden;
    margin: 0;
    max-height: 4rem;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 2rem;
  }

  .article-info {
    font-size: 12px;
    margin-top: 5px;

    a {
      margin-bottom: 5px;
      display: inline-block;
    }
  }

  .article-list-item-card {
    margin-top: 0.75rem;
  }

  .article-cover {
    border-radius: 8px 8px 0 0 !important;
    height: 190px !important;
    width: 100%;

    div {
      border-radius: 8px 8px 0 0 !important;
    }
  }

  .article-wrapper {
    padding: 0.5rem 1.25rem;
  }
}
</style>
