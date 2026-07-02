<template>
  <el-card class="article-list-item-card">
    <router-link
      :to="'/article/' + article.id"
      class="article-cover-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <el-image
        class="on-hover cover-img"
        :src="article.coverThumb || article.cover"
        lazy
        fit="cover"
      />
    </router-link>
    <div class="article-wrapper">
      <div class="article-meta-row">
        <router-link
          :to="'/user/' + article.user.id"
          class="username-avatar-info"
          target="_blank"
          rel="noopener noreferrer"
        >
          <el-avatar :src="article.user.avatar" size="small" />
          <span class="ms-1 a-link ellipsis username-info">{{ article.user.nickname }}</span>
        </router-link>
        <span class="article-date">
          <Icon icon="solar:calendar-broken" class="font-14" />
          {{ date(article.createTime) }}
        </span>
      </div>
      <h3 class="article-list-item-title">
        <router-link :to="'/article/' + article.id" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </router-link>
      </h3>
      <div class="article-content">
        {{ article.content }}
      </div>
      <div class="article-info">
        <div class="article-taxonomy">
          <el-tag size="small" :type="article.isOriginal ? 'success' : 'warning'">
            {{ article.isOriginal ? '原创' : '转载' }}
          </el-tag>
          <button type="button" class="article-category-button" @click="emitCategoryClick">
            <Icon icon="tabler:category" class="font-14" />
            {{ categoryMap[article.categoryId] ? categoryMap[article.categoryId].name : '' }}
          </button>
          <span class="article-tags">
            <router-link
              v-for="tagId of article.tagList.slice(0, 2)"
              :key="'articleListItemTag' + article.id + tagId"
              :to="'/tag/' + tagId"
            >
              <el-tag
                size="small"
                class="article-tag-pill"
              >
                {{ tagMap[tagId] ? tagMap[tagId].name : '' }}</el-tag
              >
            </router-link>
          </span>
        </div>
        <div class="article-stats">
          <span>
            <Icon icon="ph:eye" class="font-14" />
            {{ covertNumberDisplay(article.viewCount) }}
          </span>
          <span>
            <Icon icon="iconamoon:comment-dots" class="font-14" />
            {{ covertNumberDisplay(article.commentCount) }}
          </span>
          <span>
            <Icon icon="tabler:thumb-up" class="font-14" />
            {{ covertNumberDisplay(article.likeCount) }}
          </span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { IArticle } from '@/interface'
import { covertNumberDisplay } from '@/utils/common'
import { date } from '@/utils/date'

const props = defineProps<{
  article: IArticle
  index: number
  categoryMap: Record<string, { name: string }>
  tagMap: Record<string, { name: string }>
}>()

const emit = defineEmits<{
  (event: 'category-click', categoryId: string): void
}>()

/**
 * 通知父组件处理文章分类点击。
 *
 * :return: 无返回值。
 */
function emitCategoryClick(): void {
  emit('category-click', String(props.article.categoryId))
}
</script>

<style lang="scss" scoped>
:deep(.el-card__body) {
  display: flex;
  height: 100%;
  width: 100%;
  --el-card-padding: 0;
}

.article-list-item-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 26px rgba(31, 45, 61, 0.05);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.article-list-item-card:hover {
  border-color: rgba(47, 128, 237, 0.2);
  box-shadow: 0 16px 34px rgba(31, 45, 61, 0.09);
  transform: translateY(-2px);
}

.article-cover-link {
  display: block;
  overflow: hidden;
  background: #e2e8f0;
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
  display: flex;
  flex-direction: column;
  font-size: 14px;
  height: 100%;
  min-width: 0;
  padding: 0.9rem 1.1rem;
}

.article-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: #64748b;
  font-size: 0.82rem;
}

.username-avatar-info {
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.username-info {
  max-width: calc(100% - 30px);
}

.article-date {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;

  :deep(svg) {
    margin-right: 5px;
  }
}

.article-list-item-title {
  margin: 0.55rem 0 0.35rem;
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 1.42;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  a {
    color: #1f2937;
  }
}

.article-content {
  color: #4b5563;
  line-height: 1.65;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.62rem;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.6;

  :deep(a) {
    color: #64748b;
  }

  :deep(svg) {
    margin-right: 5px;
  }
}

.article-taxonomy,
.article-stats,
.article-tags {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.article-taxonomy {
  flex: 1;
  flex-wrap: wrap;
}

.article-stats {
  flex-shrink: 0;
  gap: 0.75rem;

  span {
    display: inline-flex;
    align-items: center;
  }
}

.article-category-button {
  display: inline-flex;
  align-items: center;
  max-width: 130px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #64748b;
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: #2f80ed;
  }
}

.article-tag-pill {
  border-color: rgba(47, 128, 237, 0.16);
  background: rgba(47, 128, 237, 0.08);
  color: #2f6fcb;
  font-weight: 500;

  &:hover {
    border-color: rgba(47, 128, 237, 0.28);
    background: rgba(47, 128, 237, 0.13);
    color: #1d5fbf;
  }
}

@media (min-width: 760px) {
  .article-list-item-card {
    display: flex;
    height: 196px;
    width: 100%;
    margin-top: 0.75rem;
  }

  .article-cover-link {
    height: 100%;
    width: 34%;
    flex: 0 0 34%;
  }

  .on-hover {
    transition: all 0.6s;
  }

  .article-list-item-card:hover .on-hover {
    transform: scale(1.1);
  }

  .article-wrapper {
    width: 66%;
  }
}

@media (max-width: 759px) {
  :deep(.el-card__body) {
    display: block;
  }

  .article-list-item-title {
    font-size: 1.12rem;
  }

  .article-info {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.55rem;
    font-size: 12px;
    margin-top: 0;

    a {
      display: inline-flex;
    }
  }

  .article-list-item-card {
    margin-top: 0.75rem;
  }

  .article-cover-link {
    height: 190px;
    width: 100%;
  }

  .article-wrapper {
    padding: 0.85rem 1rem 1rem;
  }

  .article-meta-row {
    font-size: 0.78rem;
  }

  .article-stats {
    gap: 0.9rem;
  }
}
</style>
