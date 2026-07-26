# 设计：软件版本查看与在线升级

## Context

MDView 是基于 Tauri 2 + SvelteKit（Svelte 5, adapter-static）的跨平台 Markdown 预览器，当前版本 0.7.2（`tauri.conf.json` 与 `package.json` 各自维护版本号）。发布通过 GitHub Actions（`tauri-action`）在打 tag 时构建 macOS（x86_64）与 Windows 安装包并创建 draft release，仓库为 `maosea0125/MDView`。应用目前无任何版本展示与更新检查能力；macOS 构建未做 Apple 签名。

## Goals / Non-Goals

**Goals:**

- 用户可在应用内查看当前版本号。
- 用户可手动检查更新；应用启动后自动静默检查一次。
- 发现新版本后，用户可在应用内完成下载、安装并重启到新版本。
- 更新包经 minisign 签名校验，防止被篡改。
- CI 自动产出 updater 所需的签名文件与 `latest.json`。

**Non-Goals:**

- 不做增量/差量更新（使用 Tauri updater 的整包更新）。
- 不做多更新通道（beta/stable）与灰度发布。
- 不做后台定时轮询检查（仅启动时一次 + 手动触发）。
- 不处理 Linux 打包（现有 CI 仅构建 macOS/Windows）。
- 不引入 Apple 签名/公证流程。

## Decisions

### D1：使用官方 `tauri-plugin-updater`，更新源为 GitHub Releases 的 `latest.json`

- **方案**：集成 `tauri-plugin-updater`（Rust）+ `@tauri-apps/plugin-updater`（JS），endpoint 配置为 `https://github.com/maosea0125/MDView/releases/latest/download/latest.json`。`tauri-action` 已原生支持生成并上传 `latest.json`（`includeUpdaterJson: true`），零额外服务器成本。
- **备选**：
  - 自建更新服务器 —— 需要运维成本，无必要。
  - 前端直接调 GitHub API 比较 tag，再引导用户去下载页 —— 实现最简，但只解决"提醒"，无法应用内升级，不满足需求。
- **理由**：官方插件与现有 `tauri-action` CI 无缝衔接，改动最小且获得完整的下载/校验/安装能力。

### D2：版本号读取使用 `getVersion()`（`@tauri-apps/api/app`），以 `tauri.conf.json` 为单一版本来源

- 前端不再硬编码版本号，也不从 `package.json` 读取，避免双份版本号漂移。发版流程保持现状（bump `tauri.conf.json` 与 `package.json`），展示口径以 `tauri.conf.json` 为准。

### D3：UI 形态 —— 复用现有工具栏/菜单区域，新增"关于"弹层

- 在现有界面加一个轻量"关于"入口（含版本号 + "检查更新"按钮）。检查到新版本时以内嵌提示条/对话框展示版本号与 release notes（来自 `latest.json` 的 `notes` 字段），提供"立即更新 / 稍后"两个动作；下载中显示进度（updater 的 `downloadAndInstall` 回调事件），完成后提示"重启以完成更新"，调用 `@tauri-apps/plugin-process` 的 `relaunch()`。
- 启动静默检查：无更新或检查失败时完全不打扰；有更新时仅显示非模态提示。

### D4：更新签名密钥管理

- 用 `tauri signer generate` 生成 minisign 密钥对；公钥写入 `tauri.conf.json` 的 `plugins.updater.pubkey`；私钥与口令存入 GitHub Secrets（`TAURI_SIGNING_PRIVATE_KEY`、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`），在 build.yml 中注入 `tauri-action` 步骤。密钥生成与 Secrets 配置属人工前置步骤，任务清单中单列。

### D5：权限与安全

- 新增 capability 权限：`updater:default`、`process:allow-restart`（capabilities/default.json）。
- 更新下载与签名校验在 Rust 侧进行，WebView CSP 无需放开 `connect-src` 到 GitHub。

## Risks / Trade-offs

- [draft release 导致 `latest.json` 不可达] → 现有 CI 创建的是 draft release，draft 的资产 URL 不对外可见；必须在人工发布（publish）release 后更新才生效。在 tasks 中加入发版文档说明；不改变 draft 流程本身（保留人工审核环节）。
- [macOS 未做 Apple 签名，更新后首次启动可能触发 Gatekeeper 隔离] → Tauri updater 替换 .app 后 quarantine 属性行为与直接下载不同（由应用自身写入，不带 quarantine）；实测验证列入任务。若有问题，在文档中说明手动放行方式。
- [首个带 updater 的版本无法通过 updater 升级到位] → 本功能只对"装了本版本之后"的升级生效，老版本用户仍需手动升级一次；在 release notes 中说明。
- [x86_64 单架构 macOS 包在 Apple Silicon 上跑 Rosetta] → 与现状一致，不在本变更范围内解决；`latest.json` 的平台 key（`darwin-x86_64`）与现有构建矩阵匹配即可。
- [签名私钥丢失] → 私钥丢失将导致老用户永远无法自动更新（公钥不匹配）；要求私钥在 GitHub Secrets 之外另行离线备份。

## Open Questions

- 无（更新源、UI 形态、触发时机均已按最小方案决定；如需多语言文案，沿用现有界面语言习惯）。
