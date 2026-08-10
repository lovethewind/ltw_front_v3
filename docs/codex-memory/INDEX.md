# Codex Memory 索引

- [2026-08-01：网页版重新进入同一笔记后保存不发请求](entries/2026-08-01-note-save-session.md)——销毁工作区只清理自动保存会话而保留当前笔记，重新加载同一 ID 时需重建会话。
- [2026-08-02：搜索结果目录裁剪](entries/2026-08-02-search-folder-pruning.md)——网页端非空关键词属于筛选视图，目录树只保留匹配笔记所在路径；零结果时不再显示全部空文件夹。
- [2026-08-02：大笔记切换优化](entries/2026-08-02-large-note-switch-performance.md)——网页端使用有界LRU缓存最近完整正文，来回切换不重复请求；Milkdown替换前不再序列化整篇旧正文。
- [2026-08-02：笔记路由复用工作区](entries/2026-08-02-note-route-workspace-reuse.md)——根路由视图对notes使用稳定key，切换noteId只加载详情，不再销毁工作区并重拉文件夹、标签和列表。
- [2026-08-02：笔记桌面版下载入口](entries/2026-08-02-note-desktop-download-entry.md)——下载卡片仅放在网页笔记侧栏标签下方并固定于底部，跳转桌面笔记项目的GitHub Releases。
- [2026-08-09：桌面端授权后清理 URL 参数](entries/2026-08-09-desktop-auth-query-cleanup.md)——唤起桌面应用后移除临时授权参数，避免刷新网页重复弹窗。
- [2026-08-09：Web 端版本更新弹窗美化](entries/2026-08-09-update-dialog-polish.md)——增加刷新图标、说明卡片、清晰按钮和深色/窄屏适配。
- [2026-08-09：文章图片加载失败兜底](entries/2026-08-09-article-image-load-fallback.md)——文章正文图片失败时隐藏浏览器破图并显示“图片加载失败”，正常图片和预览逻辑不变。
