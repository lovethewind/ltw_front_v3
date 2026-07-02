import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取顶部导航组件源码，用于验证导航结构的关键语义。
 *
 * :return: 顶部导航组件单文件源码。
 */
function readTopNavBarSource(): string {
  return readFileSync(new URL('../TopNavBar.vue', import.meta.url), 'utf8')
}

describe('TopNavBar 模板语义', () => {
  it('移动端提供主导航菜单入口和抽屉菜单', () => {
    const source = readTopNavBarSource()

    expect(source).toContain('aria-label="打开导航菜单"')
    expect(source).toContain('v-model="mobileMenuVisible"')
    expect(source).toContain('class="mobile-menu-list"')
  })

  it('桌面端和移动端复用同一组主导航菜单项', () => {
    const source = readTopNavBarSource()

    expect(source).toContain('const navMenus')
    expect(source).toMatch(/v-for="menu in navMenus"/)
    expect(source).toContain(':to="menu.path"')
  })

  it('桌面端右侧操作区使用统一动作按钮组', () => {
    const source = readTopNavBarSource()

    expect(source).toContain('class="nav-actions"')
    expect(source).toContain('class="nav-action-button"')
    expect(source).toContain('class="nav-write-button"')
    expect(source).toContain('aria-label="打开搜索页"')
    expect(source).toContain('aria-label="查看消息"')
    expect(source).toContain('aria-label="创作文章"')
    expect(source).toContain('aria-label="登录"')
  })

  it('通知弹层使用消息面板结构展示未读概览', () => {
    const source = readTopNavBarSource()

    expect(source).toContain('popper-class="notice-popover"')
    expect(source).toContain('class="notice-panel-header"')
    expect(source).toContain('class="notice-panel-summary"')
    expect(source).toContain('class="notice-panel-list"')
    expect(source).toContain('class="notice-item-icon"')
    expect(source).toContain('class="notice-item-count"')
    expect(source).toContain('暂无未读消息')
  })

  it('通知入口仅登录后展示且弹层只渲染未读类型', () => {
    const source = readTopNavBarSource()

    expect(source).toMatch(/<el-popover[\s\S]*v-if="user"/)
    expect(source).toContain('v-for="notice in unreadNoticeList"')
    expect(source).toContain('v-if="unreadNoticeList.length"')
    expect(source).toContain('class="notice-panel-empty"')
    expect(source).toContain('getNoticeUnreadCountByType(notice.value)')
  })

  it('登录后头像下拉使用资料卡和动作项结构', () => {
    const source = readTopNavBarSource()

    expect(source).toContain('class="user-avatar-button"')
    expect(source).toContain('aria-label="打开用户菜单"')
    expect(source).toContain('popper-class="user-profile-popper"')
    expect(source).toContain('class="user-profile-card"')
    expect(source).toContain('class="user-profile-header"')
    expect(source).toContain('class="user-profile-summary"')
    expect(source).toContain('这个人很神秘，还没有简介')
    expect(source).toContain('class="user-profile-action is-danger"')
  })

  it('消息和头像下拉提供可命中的夜间模式后代选择器', () => {
    const style = readFileSync(new URL('../../../assets/css/header.scss', import.meta.url), 'utf8')

    expect(style).toContain(':global(html.dark .notice-popover.el-popper .notice-panel)')
    expect(style).toContain(':global(html.dark .notice-popover.el-popper .notice-panel-title)')
    expect(style).toContain(':global(html.dark .user-profile-popper.el-popper .user-profile-card)')
    expect(style).toContain(':global(html.dark .user-profile-popper.el-popper .user-profile-name)')
  })
})
