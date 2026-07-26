# 任务清单：软件版本查看与在线升级

## 1. 前置准备（密钥与依赖）

- [x] 1.1 使用 `npm run tauri signer generate` 生成 minisign 更新签名密钥对，私钥离线备份（人工步骤，产出公钥字符串）
- [ ] 1.2 将私钥与口令配置到 GitHub Secrets：`TAURI_SIGNING_PRIVATE_KEY`、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（人工步骤）
- [x] 1.3 Rust 端添加依赖：`src-tauri/Cargo.toml` 加入 `tauri-plugin-updater`、`tauri-plugin-process`
- [x] 1.4 前端添加依赖：`@tauri-apps/plugin-updater`、`@tauri-apps/plugin-process`

## 2. Tauri 配置与插件注册

- [x] 2.1 在 `src-tauri/src/lib.rs` 的 builder 中注册 updater 与 process 插件
- [x] 2.2 在 `tauri.conf.json` 添加 `plugins.updater` 配置：`endpoints` 指向 `https://github.com/maosea0125/MDView/releases/latest/download/latest.json`，填入 1.1 生成的 `pubkey`，并设置 `createUpdaterArtifacts: true`
- [x] 2.3 在 `src-tauri/capabilities/default.json` 中授予 `updater:default` 与 `process:allow-restart` 权限

## 3. 前端 UI 实现

- [x] 3.1 新增"关于"入口与面板：展示应用名称与 `getVersion()` 读取的版本号，含"检查更新"按钮（version-info spec）
- [x] 3.2 实现手动检查更新流程：调用 `check()`，区分"有更新 / 已最新 / 检查失败"三种结果并展示（app-update spec）
- [x] 3.3 实现下载安装流程：`downloadAndInstall()` 展示下载进度，完成后提示"重启以完成更新"，点击后调用 `relaunch()`
- [x] 3.4 实现启动时静默检查：应用启动完成后检查一次，有更新时展示非模态提示，无更新或失败时静默

## 4. CI 与发布流程

- [x] 4.1 修改 `.github/workflows/build.yml`：为 `tauri-action` 步骤注入签名私钥环境变量，开启 `includeUpdaterJson: true`
- [x] 4.2 在 README 或发版文档中补充说明：draft release 必须人工 publish 后 `latest.json` 才可被客户端检测到；老版本用户需手动升级一次

## 5. 验证

- [ ] 5.1 本地运行 `npm run tauri dev`，验证关于面板版本号展示与"检查更新"各状态提示
- [ ] 5.2 打测试 tag 触发 CI，确认 release 产物包含更新包、`.sig` 文件与 `latest.json`
- [ ] 5.3 端到端升级验证：安装低版本构建 → publish 新版本 release → 应用内检查、下载、安装、重启后版本号为新版本（macOS 与 Windows 各验证一次，macOS 注意 Gatekeeper 行为）
