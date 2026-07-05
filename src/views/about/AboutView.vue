<template>
  <div class="about-page">
    <section class="about-hero" :style="cover">
      <div class="about-hero__content">
        <span class="about-hero__eyebrow">关于本站</span>
        <h1>{{ commonStore.websiteInfo.name }}</h1>
        <p>{{ commonStore.websiteInfo.summary }}</p>
      </div>
    </section>
    <main class="about-main">
      <section class="about-overview" aria-label="站点内容概览">
        <article v-for="item in overviewItems" :key="item.title" class="about-overview__item">
          <span class="about-overview__icon">{{ item.icon }}</span>
          <div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description }}</p>
          </div>
        </article>
      </section>
      <section class="about-grid">
        <div class="about-primary">
          <article class="about-card about-markdown">
            <div class="about-section-heading">
              <span>详细介绍</span>
              <h2>写在这里的故事</h2>
            </div>
            <div
              ref="aboutRef"
              v-dompurify-html="aboutContent"
              class="about-content markdown-body"
            />
          </article>
          <section class="about-commits about-card" aria-label="近期 GitHub commit 动态">
            <div class="about-section-heading about-commits__heading">
              <span>GitHub commits</span>
              <h2>近期更新</h2>
            </div>
            <div class="about-commit__list">
              <a
                v-for="item in visibleCommitItems"
                :key="item.hash"
                class="about-commit"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="about-commit__line" />
                <span class="about-commit__type">{{ item.type }}</span>
                <span class="about-commit__content">
                  <strong>{{ item.message }}</strong>
                  <span>{{ item.repo }} · {{ item.branch }}</span>
                </span>
                <span class="about-commit__meta">
                  <time>{{ item.time }}</time>
                  <code>{{ item.hash }}</code>
                </span>
              </a>
              <a
                v-if="hasMoreCommits && repositoryUrl"
                class="about-commit__more"
                :href="repositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>前往 GitHub 查看更多 →</span>
              </a>
            </div>
          </section>
        </div>
        <aside class="about-side">
          <article class="about-card about-timeline">
            <div class="about-section-heading">
              <span>时间线</span>
              <h2>小站轨迹</h2>
            </div>
            <ol>
              <li v-for="item in timelineItems" :key="item.year">
                <strong>{{ item.year }}</strong>
                <span>{{ item.text }}</span>
              </li>
            </ol>
          </article>
          <article class="about-card about-tech">
            <div class="about-section-heading">
              <span>技术栈</span>
              <h2>构建方式</h2>
            </div>
            <div class="about-tech__list">
              <span v-for="item in techItems" :key="item">{{ item }}</span>
            </div>
          </article>
          <article class="about-card about-contact">
            <div class="about-section-heading">
              <span>Contact</span>
              <h2>邮箱联系</h2>
            </div>
            <p>部分资源来源于网络，如若发现侵权，请联系我们立即删除</p>
            <p class="about-contact__email">
              <span>1720045474@qq.com</span>
            </p>
          </article>
        </aside>
      </section>
    </main>
    <el-dialog
      v-model="previewImgVisible"
      @close="closePreviewImg"
      :show-close="false"
      width="70vw"
      style="margin-top: 5vh"
    >
      <el-image :src="previewImgUrl" />
    </el-dialog>
  </div>
</template>

<style src="@/assets/css/about.scss" scoped />

<style lang="scss">
html.dark .about-page {
  background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
}

html.dark .about-hero::after {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0), #111827);
}

html.dark .about-overview__item,
html.dark .about-card {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.78);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.18);
}

html.dark .about-overview h2,
html.dark .about-section-heading h2,
html.dark .about-content,
html.dark .about-content h1,
html.dark .about-content h2,
html.dark .about-content h3 {
  color: #e5e7eb;
}

html.dark .about-overview p,
html.dark .about-timeline li {
  color: #94a3b8;
}

html.dark .about-overview__icon {
  color: #5eead4;
  background: rgba(20, 184, 166, 0.16);
}

html.dark .about-tech__list span {
  border-color: rgba(96, 165, 250, 0.22);
  color: #93c5fd;
  background: rgba(37, 99, 235, 0.16);
}

html.dark .about-contact__email {
  border-color: rgba(45, 212, 191, 0.18);
  color: #99f6e4;
  background: rgba(20, 184, 166, 0.12);
}

html.dark .about-commit {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.46);
}

html.dark .about-commit:hover {
  border-color: rgba(45, 212, 191, 0.34);
  background: rgba(15, 23, 42, 0.66);
}

html.dark .about-commit__content strong {
  color: #e5e7eb;
}

html.dark .about-commit__content span,
html.dark .about-commit__meta {
  color: #94a3b8;
}

html.dark .about-commit__meta code {
  color: #67e8f9;
  background: rgba(8, 145, 178, 0.16);
}

html.dark .about-commit__more {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0), rgba(30, 41, 59, 0.98) 58%);
}

html.dark .about-commit__more span {
  border-color: rgba(45, 212, 191, 0.3);
  color: #99f6e4;
  background: rgba(15, 23, 42, 0.94);
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import commonApi, { type GithubCommit, type GithubCommitPage } from '@/api/common'
import { useCommonStore } from '@/stores/common'
import { markdownToHtml } from '@/utils/common'
import { covertTimeHowLongAgo } from '@/utils/date'

const commonStore = useCommonStore()

const aboutRef = ref<HTMLElement | null>(null)
const aboutContent = ref('')
const previewImgUrl = ref('')
const previewImgVisible = ref(false)

interface CommitItem {
  type: string
  message: string
  repo: string
  branch: string
  time: string
  hash: string
  url: string
  commitTime: string
}

const overviewItems = [
  {
    icon: '文',
    title: '文章记录',
    description: '沉淀学习过程、开发经验和踩坑复盘。'
  },
  {
    icon: '图',
    title: '图库收藏',
    description: '收集值得回看的图片、灵感和生活瞬间。'
  },
  {
    icon: '站',
    title: '网站导航',
    description: '整理常用工具、资源入口和优秀站点。'
  },
  {
    icon: '言',
    title: '留言交流',
    description: '保留想法、建议和来访者之间的互动。'
  }
]
const timelineItems = [
  {
    year: '2023',
    text: '小站上线，开始整理学习记录和资源。'
  },
  {
    year: '2024',
    text: '持续补充文章、图库和导航内容。'
  },
  {
    year: '2026',
    text: '重构界面体验，让内容更容易被发现。'
  }
]
const techItems = ['Vue', 'TypeScript', 'Element Plus', 'Python', 'FastAPI', 'MySQL']
const githubRepos = ['ltw_front_v3', 'ltw_blog']
const commitItems = ref<CommitItem[]>([])
const hasMoreCommits = ref(false)
const visibleCommitItems = computed(() => commitItems.value.slice(0, 5))
const repositoryUrl = computed(() => {
  return commitItems.value[0]?.url.match(/^(https:\/\/github\.com\/[^/]+)/)?.[1] ?? ''
})

const cover = computed(() => {
  const pageCover = commonStore.pageCoverMap['about'].pageCover
  if (!pageCover) {
    return ''
  }
  return (
    'background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.68), rgba(20, 184, 166, 0.5)), url(' +
    pageCover +
    ')'
  )
})

const aboutMe = computed(() => {
  return commonStore.websiteInfo.aboutMe
})

onMounted(() => {
  getAboutContent()
  void loadGithubCommits()
})

/**
 * 从后端加载 GitHub 提交动态。
 *
 * :return: 无返回值。
 */
async function loadGithubCommits(): Promise<void> {
  try {
    const pages = await Promise.all(githubRepos.map((repo) => loadGithubCommitPage(repo)))
    commitItems.value = pages
      .flatMap((data) => data.commits.map((item) => formatCommitItem(item, data.repo, data.branch)))
      .sort((left, right) => right.commitTime.localeCompare(left.commitTime))
    hasMoreCommits.value = pages.some((data) => data.has_next) || commitItems.value.length > 3
  } catch {
    commitItems.value = []
    hasMoreCommits.value = false
  }
}

/**
 * 加载单个 GitHub 仓库的提交分页数据。
 *
 * :param repo: GitHub 仓库名。
 * :return: 仓库提交分页数据。
 */
async function loadGithubCommitPage(repo: string): Promise<GithubCommitPage> {
  const res = await commonApi.getGithubCommits({
    repo,
    page: 1,
    size: 10
  })
  return res.data as GithubCommitPage
}

/**
 * 将后端 Commit 数据转换为页面展示结构。
 *
 * :param commit: 后端返回的 Commit 数据。
 * :param repo: 仓库名。
 * :param branch: 分支名。
 * :return: 页面展示用 Commit 数据。
 */
function formatCommitItem(commit: GithubCommit, repo: string, branch: string): CommitItem {
  const firstLine = commit.message.split('\n', 1)[0]
  const matched = firstLine.match(/^([a-z]+)(?:\([^)]+\))?!?:\s*(.*)$/i)
  return {
    type: matched?.[1] ?? 'commit',
    message: matched?.[2] || firstLine,
    repo,
    branch,
    time: covertTimeHowLongAgo(commit.commit_time),
    hash: commit.short_sha,
    url: commit.html_url,
    commitTime: commit.commit_time
  }
}

/**
 * 渲染后端配置的关于页 Markdown，并为正文图片绑定预览。
 *
 * :return: 无返回值。
 */
function getAboutContent(): void {
  // 将markdown替换为html标签
  aboutContent.value = markdownToHtml(aboutMe.value) as string
  // 添加图片预览功能
  const images = aboutRef.value?.querySelectorAll('img')
  // 替换每个img标签为el-image组件
  images?.forEach((img) => {
    img.addEventListener('click', () => {
      previewImgUrl.value = img.src
      previewImgVisible.value = true
    })
  })
}

/**
 * 关闭 Markdown 图片预览。
 *
 * :return: 无返回值。
 */
function closePreviewImg(): void {
  previewImgUrl.value = ''
  previewImgVisible.value = false
}
</script>
