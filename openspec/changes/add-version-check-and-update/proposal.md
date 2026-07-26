# 提案：软件版本查看与在线升级

## Why

MDView 目前没有任何界面入口可以查看当前软件版本，用户也无法得知是否有新版本发布，只能手动访问 GitHub Releases 页面下载安装包覆盖安装。随着版本迭代加快（当前 v0.7.2），需要提供版本查看与应用内升级能力，降低用户升级成本。

## What Changes

- 新增"关于"入口：在界面中展示应用名称、当前版本号（读取自 Tauri 配置，前后端单一来源）。
- 新增"检查更新"功能：请求 GitHub Releases 更新源，比较最新版本与当前版本。
- 有新版本时展示更新提示（新版本号、更新说明），用户确认后应用内下载并安装更新，安装完成后提示重启。
- 集成 `tauri-plugin-updater` 与 `tauri-plugin-process`（重启用），配置 minisign 更新签名公钥。
- CI 构建流程增强：`tauri-action` 生成 updater 签名产物与 `latest.json`，注入更新签名私钥 secrets。
- 应用启动后静默检查一次更新，发现新版本时给出非打扰式提示。

## Capabilities

### New Capabilities

- `version-info`: 在应用界面查看当前软件版本信息（版本号、应用名）。
- `app-update`: 检查 GitHub Releases 上的新版本，并在应用内完成下载、安装与重启升级；覆盖手动检查与启动时静默检查两种触发方式。

### Modified Capabilities

（无 —— 现有 spec 仅有 `preview-link-handling`，本变更不影响其需求。）

## Impact

- **前端**（SvelteKit/Svelte 5）：新增关于/更新相关 UI（版本展示、检查更新按钮、更新进度与结果提示），调用 `@tauri-apps/api/app` 的 `getVersion` 与 `@tauri-apps/plugin-updater`、`@tauri-apps/plugin-process` API。
- **Rust 端**（src-tauri）：`Cargo.toml` 新增 `tauri-plugin-updater`、`tauri-plugin-process` 依赖并在 builder 中注册；`tauri.conf.json` 新增 updater 插件配置（endpoints 指向 GitHub Releases `latest.json`、pubkey）；capabilities 需授予 updater/process 权限。
- **CSP/网络**：updater 下载由 Rust 端发起，不受 WebView CSP 限制，但需确认 `connect-src` 不需放开（前端不直接请求 GitHub API）。
- **CI**（.github/workflows/build.yml）：`tauri-action` 增加 `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 环境变量，开启 `includeUpdaterJson`；发布仍为 draft，需注意 draft release 的 `latest.json` 对更新源可见性的影响（需发布正式 release 后更新才可被检测到）。
- **运维前置条件**：需生成一对 minisign 更新签名密钥，私钥存入 GitHub Secrets，公钥写入 `tauri.conf.json`。
- **平台说明**：macOS 构建当前未做 Apple 签名/公证，Tauri updater 使用自身 minisign 签名校验更新包，不依赖 Apple 签名；Windows（NSIS/MSI）与 macOS（.app.tar.gz）均支持。
