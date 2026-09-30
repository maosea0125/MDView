## 1. 双架构构建

- [x] 1.1 在 `.github/workflows/build.yml` 新增 `aarch64-apple-darwin` 矩阵条目，安装对应 Rust target，保留 x86_64 和 Windows 构建。
- [x] 1.2 增加 macOS 最终 `.app` 的架构验证，通过 Info.plist 定位主程序并检查包内 Mach-O 文件；实际架构不匹配时构建失败。
- [ ] 1.3 构建两种 macOS 目标，确认 DMG、更新压缩包及 `.sig` 文件名称区分架构且无上传覆盖，记录部署目标。

## 2. 更新清单验证

- [ ] 2.1 验证 draft release 最终 `latest.json` 同时包含 `darwin-aarch64`、`darwin-x86_64` 与原 Windows 条目，URL 和签名对应实际产物；如有覆盖则调整为构建完成后汇总。
- [x] 2.2 使用两个不同版本的 arm64 客户端完成签名更新及重启验收，确认更新前后均为原生 Apple 进程。
- [ ] 2.3 在 Intel Mac 验证 x86_64 安装与签名更新，确认现有更新公钥、更新源及功能正常。

## 3. 下载与迁移说明

- [x] 3.1 更新 README，添加双架构构建命令、产物路径、安装包选择与旧 x86_64 安装手动替换为 arm64 的步骤。
- [ ] 3.2 更新 `docs/index.html` 下载区域的架构识别及迁移说明，明确应用内更新不会自动切换架构，检查桌面与移动端文字布局。
- [x] 3.3 将同样的迁移提示加入首次双架构发布说明，提醒用户在升级 macOS 28 前迁移，并说明已升级系统的手动安装路径。

## 4. 原生运行与发布验收

- [ ] 4.1 在 Apple Silicon 上安装 arm64 DMG，记录进程种类为 Apple 的证据，验证文件关联、拖放、Markdown、公式、Mermaid、PDF 和 Word 导出。
- [x] 4.2 在仍支持 Rosetta 的 Apple Silicon 系统上，从旧 x86_64 安装手动替换为 arm64 包，确认可原生启动并重新打开原文件。
- [ ] 4.3 运行 `npm run check`、`npm run build` 并验证 Windows 构建，记录所有平台的构建与安装结果。
- [x] 4.4 在可用的 macOS 28 环境验证原生启动与核心功能；环境不可用时明确记录待验收，不宣称已完成 macOS 28 实测。
- [ ] 4.5 汇总架构、安装、更新及清单验证证据，确认 draft release 全部产物通过验收后交由人工发布。

## 本地执行记录（2026-09-30）

- 环境：Apple Silicon，macOS 27.0，SDK 27.0。没有 macOS 28 环境；4.4 按任务约定完成环境缺失记录，macOS 28 实机验收仍待执行。
- `npm run check`：0 errors、0 warnings。两次 Tauri 构建所调用的 `npm run build` 均成功；存在原有 MathJax eval 和大 chunk 提示。
- 两种 `.app` 编译及架构校验通过：arm64 部署目标 11.0，x86_64 部署目标 10.15。
- 两种 DMG 打包成功：`src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/MDView_0.7.4_aarch64.dmg` 与 `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/MDView_0.7.4_x64.dmg`。沙箱内 hdiutil 创建设备失败，经批准使用可访问设备的环境后完成。
- 两种 DMG 的 `hdiutil verify` 均通过，映像校验和有效。
- 本地临时覆盖 `createUpdaterArtifacts: false` 并跳过 Apple 签名；仓库的正式签名配置未改。1.3 的更新压缩包及 `.sig` 尚未验证，因此保持未完成。
- 校验脚本正常路径、主程序架构不匹配，以及包内混入 Intel 附加二进制的失败路径均验证通过；Bash 与 workflow YAML 语法检查通过。
- 通过原生 UI 打开本次 arm64 构建并加载 `test.md`，确认 Markdown、公式与 Mermaid 预览；进程路径已核实为此次构建目录。尚未完成 DMG 安装、文件关联、拖放、导出和进程种类的全部验收；后续 UI 工具连接关闭，4.1 保持未完成。
- 下载页文字已修改，桌面与移动端视觉检查因浏览器禁止 `file:` 访问而未完成，3.2 保持未完成。
- 首轮尚未运行 GitHub workflow 或创建发布版本，因此未验收最终 `latest.json`、签名更新或上传冲突；没有真实 Intel 和 Windows 设备验收结果。后续本机结果见下文。

## 本机补充验收（2026-09-30）

- 用户确认暂无正式 updater 签名密钥、GitHub 发布权限及 Intel/Windows 测试环境，本轮仅完成本机可验证部分，不提交或发布版本。
- 从两种 DMG 复制应用至 `src-tauri/target/native-validation/installed/`，使用独立测试 bundle identifier，未替换 `/Applications/MDView.app`。先运行 Intel 包，再在同一测试安装路径手动替换为 arm64 包，并重新打开原 `test.md`。`intel-process.txt` 记录 `X86-64 (translated)`，`arm-process.txt` 记录 `ARM64`；Activity Monitor 中 arm64 测试进程种类为 Apple。4.2 完成。
- arm64 DMG 安装副本验证 Markdown、公式、Mermaid，并通过 Finder 的“打开方式”打开 `association-test.md`；没有修改默认文件关联。PDF 导出为 5 页 A4，文本提取正常；DOCX 压缩包完整性、XML 内容及 5 个 PNG 图片通过检查。产物为 `src-tauri/target/native-validation/native-export.pdf` 和 `native-export.docx`。拖放未取得完整验收证据，4.1 保持未完成。
- 使用独立应用 `MDViewUpdaterTest`、独立 bundle identifier、临时测试密钥及仅监听 `127.0.0.1:17654` 的更新服务，完成 arm64 `0.7.4` → `0.7.5` 的签名更新。新版本归档由临时密钥单独签名；UI 显示更新已安装并执行立即重启，安装副本 Info.plist 版本变为 `0.7.5`。更新前后应用包均通过纯 arm64 校验；重启进程 PID 65971 的 `updated-process.txt` 记录 `ARM64`，服务记录重启后的再次清单请求。2.2 完成本机临时密钥验收，不代表正式公钥、生产源或 GitHub release 验收。
- 重启后的原生 UI 工具无法重新绑定测试窗口；重启证据来自进程路径、架构采样、安装版本和更新服务请求，未声称完成重启后的 UI 回归。
- 临时 HTTP 更新服务已停止，两种验收 DMG 已卸载。测试配置和临时密钥均位于被忽略的 `src-tauri/target/`，未修改正式 updater 公钥、端点或安全配置。
- 剩余：1.3 的双架构更新产物与实际上传不覆盖、2.1 的最终发布清单、2.3 的 Intel 实机更新、3.2 的桌面/移动端视觉检查、4.1 的拖放、4.3 的 Windows 构建安装，以及 4.5 的正式发布验收。macOS 28 实机测试仍待环境可用。
