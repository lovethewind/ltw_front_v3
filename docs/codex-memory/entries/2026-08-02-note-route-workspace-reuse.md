# 笔记路由复用工作区

## 问题

根组件使用 `$route.fullPath` 作为 `router-view` 的 key。点击笔记会把地址更新为 `/notes/:noteId`，fullPath 随之变化，导致整个 `NoteWorkspace` 被销毁并重新挂载，文件夹、标签和笔记列表也全部重新请求。

## 处理

- `notes` 路由固定使用稳定 key，笔记 ID 改变时复用当前工作区实例。
- 工作区已有的路由监听负责按新 noteId 选择详情，支持地址栏、前进和后退导航。
- 其他路由继续使用 fullPath 作为 key，保持原有刷新行为。

## 验证

路由回归测试约束笔记页面使用稳定 key，并保留 noteId 与当前笔记的双向同步。
