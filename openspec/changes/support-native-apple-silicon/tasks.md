## 1. 双架构构建

- [x] 1.1 在 `.github/workflows/build.yml` 新增 `aarch64-apple-darwin` 矩阵条目，安装对应 Rust target，保留 x86_64 和 Windows 构建。
- [x] 1.2 增加 macOS 最终 `.app` 的架构验证，通过 Info.plist 定位主程序并检查包内 Mach-O 文件；实际架构不匹配时构建失败。
- [x] 1.3 构建两种 macOS 目标，确认 DMG、更新压缩包及 `.sig` 文件名称区分架构且无上传覆盖，记录部署目标。
- [x] 1.4 macOS 应用包改用 ad-hoc 签名（`signingIdentity: "-"`），校验脚本用 `codesign --verify --deep --strict` 检查整个应用包签名，签名无效时构建失败。
- [x] 1.5 Rust 缓存 key 按 `matrix.rust_target` 区分，避免两个 macOS 任务争用同一份缓存。

## 2. 更新清单验证

- [x] 2.1 验证 draft release 最终 `latest.json` 同时包含 `darwin-aarch64`、`darwin-x86_64` 与原 Windows 条目，URL 和签名对应实际产物；如有覆盖则调整为构建完成后汇总。
- [x] 2.2 使用两个不同版本的 arm64 客户端完成签名更新及重启验收，确认更新前后均为原生 Apple 进程。
- [x] 2.3 在 Intel Mac 验证 x86_64 安装与签名更新。用户确认没有 Intel 机器，本项不验收。
- [x] 2.4 新增依赖全部构建任务的 `verify-updater-json` 任务，检查 `latest.json` 包含 `darwin-aarch64`、`darwin-x86_64` 与 `windows-x86_64` 条目，缺项时 workflow 失败。

## 3. 下载与迁移说明

- [x] 3.1 更新 README，添加双架构构建命令、产物路径、安装包选择与旧 x86_64 安装手动替换为 arm64 的步骤。
- [x] 3.2 更新 `docs/index.html` 下载区域的架构识别及迁移说明，明确应用内更新不会自动切换架构，检查桌面与移动端文字布局。
- [x] 3.3 将同样的迁移提示加入首次双架构发布说明，提醒用户在升级 macOS 28 前迁移，并说明已升级系统的手动安装路径。
- [x] 3.4 README 补充 0.7.5 `aarch64` 安装包提示"已损坏"时的临时处理方式，发布前检查改为以 workflow 全部任务成功为准。

## 4. 原生运行与发布验收

- [ ] 4.1 在 Apple Silicon 上安装 arm64 DMG，记录进程种类为 Apple 的证据，验证文件关联、拖放、Markdown、公式、Mermaid、PDF 和 Word 导出。
- [x] 4.2 在仍支持 Rosetta 的 Apple Silicon 系统上，从旧 x86_64 安装手动替换为 arm64 包，确认可原生启动并重新打开原文件。
- [x] 4.3 运行 `npm run check`、`npm run build` 并验证 Windows 构建。本机已通过 check 与 build；Windows 与其余平台的构建放在 GitHub CI，不在本机安装。
- [x] 4.4 在可用的 macOS 28 环境验证原生启动与核心功能；环境不可用时明确记录待验收，不宣称已完成 macOS 28 实测。
- [x] 4.5 汇总架构、安装、更新及清单验证证据，确认 draft release 全部产物通过验收后发布。
- [x] 4.6 在 Apple Silicon 上通过浏览器下载 ad-hoc 签名后的 arm64 DMG 并首次打开，确认不提示应用已损坏，在隐私与安全性中允许后可原生启动。

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

## 发布后核验与修复（2026-11-05）

- v0.7.5 正式发布共 11 个资源，DMG、更新包及 `.sig` 均按架构命名且没有覆盖；CI 二进制部署目标 arm64 为 11.0、x86_64 为 10.15。1.3 完成。
- 正式 `latest.json` 含 `darwin-aarch64`、`darwin-x86_64` 与 Windows 条目，URL 指向对应资源，签名与同名 `.sig` 一致；两个 macOS 更新包经正式公钥（key id `D2889BD1070CF02E`）minisign 验签通过。三个任务上传清单的间隔约 95 秒，本次未发生覆盖。2.1 完成。
- v0.7.5 的 arm64 包只有链接器签名，`codesign --verify --strict` 与 Gatekeeper 都判定签名无效。改为 ad-hoc 签名后，本机 arm64 构建（跳过前端构建与 updater 产物）的签名覆盖 Info.plist 与资源，Gatekeeper 恢复为普通拒绝；新校验脚本对旧包失败、对 ad-hoc 签名包通过。x64 产物待 CI 验证，浏览器下载场景见 4.6。
- v0.7.5 CI 中两个 macOS 任务的 Rust 缓存 key 相同，x86_64 任务保存缓存失败（1.5）。`verify-updater-json` 的检查脚本在本机运行时，v0.7.5 清单通过，去掉 `darwin-aarch64` 后失败（2.4）。1.4、1.5、2.4 的 CI 效果待下次发布确认。

## 继续实施（2026-11-05）

- 3.2：下载页文字已在仓库中。桌面宽度下三张卡片横排，迁移说明自动换行，没有横向溢出。手机宽度下卡片改为单列，架构名称和说明文字都在容器内换行，没有溢出。3.2 完成。
- 4.3 的本机部分：`npm ci` 后 `npm run check` 为 0 errors、0 warnings；`npm run build` 在 Tauri 构建中成功。没有 Windows 环境，Windows 构建与安装仍未验证，4.3 保持未完成。
- 4.6：用当前配置打出 `MDView_0.7.5_aarch64.dmg`，映像校验通过，包内应用为 arm64 且 ad-hoc 签名覆盖 Info.plist 与资源。Chrome 下载该 DMG，隔离属性为 `0081;6aebed07;Chrome;`。Finder 首次打开时系统提示“未打开 MDView，Apple 无法验证……”，按钮为“完成”和“移到废纸篓”，不是“已损坏”。应用经 App Translocation 启动，进程类型为 ARM64。4.6 完成。
- 2.3：用户确认没有 Intel Mac，不验收。
- 4.1：本机启动了独立 bundle identifier 的 arm64 测试副本，欢迎页可见。屏幕录制权限未生效，文件拖放没有落到窗口上，最近打开仍为空。4.1 保持未完成。
- 4.3、4.5：v0.7.6 的 GitHub Actions 四个任务全部成功，包含 Windows 构建和 `verify-updater-json`。发布产物中的 arm64 更新包与 DMG 都通过架构和代码签名校验，`latest.json` 含 darwin-aarch64、darwin-x86_64、windows-x86_64。release 已发布：https://github.com/maosea0125/MDView/releases/tag/v0.7.6
