# 任务列表：Markdown 预览支持打开链接地址

## 1. 链接点击处理

- [x] 1.1 在 `Preview.svelte` 的预览容器上添加 click 事件委托，用 `closest('a')` 捕获链接点击并统一 `preventDefault`
- [x] 1.2 实现协议白名单判断：`http:` / `https:` / `mailto:` 调用 `@tauri-apps/plugin-opener` 的 `openUrl` 打开；非 Tauri 环境回退 `window.open`
- [x] 1.3 实现锚点链接处理：`#` 开头的 href 经 `decodeURIComponent` 后查找对应 id 元素并 `scrollIntoView`，找不到则静默忽略

## 2. 验证

- [x] 2.1 用包含外部链接、mailto、裸 URL、锚点、相对路径链接的测试文档运行应用，逐项验证行为符合 `preview-link-handling` 规格
- [x] 2.2 确认脚注跳转（markdown-it-footnote 生成的 `#fn`/`#fnref` 锚点）仍可正常在文档内往返跳转
