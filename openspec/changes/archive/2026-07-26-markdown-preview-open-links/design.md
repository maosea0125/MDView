# 设计：Markdown 预览支持打开链接地址

## Context

MDView 是 Tauri 2 + Svelte 5 的 Markdown 预览应用。预览 HTML 由 `src/lib/markdown/engine.ts`（markdown-it，`linkify: true`）生成，通过 `Preview.svelte` 以 `{@html}` 方式渲染。当前点击链接会触发 WebView 默认导航，导致离开应用页面。项目已具备 `tauri-plugin-opener` 的完整配置（Cargo 依赖、`opener:default` 权限、npm 包），但前端未调用。

## Goals / Non-Goals

**Goals:**
- 点击外部链接时在系统默认浏览器/应用中打开
- 点击锚点链接时在预览内滚动到对应标题
- 任何情况下都不发生 WebView 内部导航

**Non-Goals:**
- 不处理相对路径的本地 Markdown 文件跳转（打开其他文件属于另一能力）
- 不添加"打开前确认"对话框
- 不修改 Rust 后端代码

## Decisions

1. **事件委托而非逐个绑定**：在预览容器（`previewEl`）上绑定一个 `click` 监听器，通过 `event.target.closest('a')` 捕获链接点击。预览内容每次渲染都会重建 DOM，委托方式无需在每次渲染后重新绑定，与现有 Mermaid 按钮的处理方式一致性更好且更简单。
   - 备选：渲染后遍历所有 `<a>` 绑定监听——每次内容更新都要重绑，代码更多，弃用。
2. **使用 `@tauri-apps/plugin-opener` 的 `openUrl`**：插件已配置就绪，`openUrl` 会走系统默认程序（浏览器打开 http/https，邮件客户端打开 mailto）。
   - 备选：`shell` 插件——未安装且能力更宽，弃用。
3. **协议白名单**：仅对 `http:`、`https:`、`mailto:` 调用 `openUrl`；`#` 开头的锚点走文档内滚动（`scrollIntoView`，配合 `markdown-it-anchor` 生成的 id）；其余一律 `preventDefault` 后忽略。白名单避免 `file:` 等协议被意外唤起。
4. **锚点解码匹配**：锚点 href 可能是 URL 编码（中文标题），查找目标元素前先 `decodeURIComponent`。

## Risks / Trade-offs

- [恶意文档包含大量链接诱导误点] → 白名单协议限制 + 仅响应用户真实点击事件，不自动打开
- [锚点 id 与 slugify 结果不匹配（特殊字符）] → 找不到目标元素时静默忽略，不导航也不报错
- [浏览器端（非 Tauri 环境）开发调试时 `openUrl` 不可用] → 动态 import 失败时回退 `window.open(url, '_blank')`
