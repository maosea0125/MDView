# Markdown 预览支持打开链接地址

## Why

当前 Markdown 预览中的链接点击后没有正确处理：外部链接会在 Tauri WebView 内部导航（离开预览界面甚至白屏），用户无法在系统默认浏览器中打开文档里的网址。项目已引入 `tauri-plugin-opener`（依赖与权限均已配置）但前端从未使用。

## What Changes

- 预览区域拦截所有 `<a>` 链接的点击事件，阻止 WebView 内部导航
- 外部链接（`http://`、`https://`、`mailto:` 等）通过 `tauri-plugin-opener` 的 `openUrl` 在系统默认浏览器/应用中打开
- 文档内锚点链接（`#heading`）在预览内平滑滚动到对应标题（配合已有的 `markdown-it-anchor` 生成的标题 id）
- 其他协议或相对路径链接不做导航（保持当前页面不变）

## Capabilities

### New Capabilities

- `preview-link-handling`: 预览中链接点击的处理行为——外部链接用系统浏览器打开、锚点链接文档内跳转、其余链接阻止导航

### Modified Capabilities

（无——现有规格中没有涉及链接行为的能力）

## Impact

- `src/lib/components/Preview.svelte`：新增链接点击委托处理逻辑
- 依赖：使用已有的 `@tauri-apps/plugin-opener`（`package.json`、`src-tauri/Cargo.toml`、`capabilities/default.json` 均已就绪，无需新增配置）
- 无破坏性变更，无后端 Rust 代码改动
