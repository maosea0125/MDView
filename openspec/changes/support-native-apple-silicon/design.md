## 背景

动机见 proposal.md。现有 CI 的 macOS 矩阵仅有 `--target x86_64-apple-darwin`；README 与下载页已有双架构描述。Tauri 2、Rust 插件和 WebView 承担运行时能力，代码中未发现 sidecar、`externalBin` 或主动调用外部工具的路径。Node 原生构建工具是开发依赖，不直接视为应用运行依赖。

现有 `tauri-plugin-updater` 使用 GitHub Releases 的静态 `latest.json` 和已配置的 minisign 公钥。另一个未归档变更 `add-version-check-and-update` 已有更新实现，但部分验证任务尚未完成；本次复用实现并验证双架构行为。

## 目标与非目标

目标：使用已有发布管线提供两个独立 macOS 架构产物，并验证安装、更新和原生运行。

非目标：Universal 分发、跨架构自动迁移、业务功能改造、Apple 签名与公证流程建设、无证据的依赖升级。Rosetta 移除本身不要求将最低 macOS 版本提高到 28，保留当前配置，构建时核实各架构实际部署目标。

## 决策

### 1. 在现有矩阵新增 arm64 构建

保留 x86_64 与 Windows 条目；macOS 新增 `aarch64-apple-darwin` 条目，明确安装相应 Rust target，并传递显式 `--target`。分别生成包含架构名称的 DMG、应用更新压缩包和签名，避免资源名称碰撞。

用户已选择独立包。Universal 可以减少安装选择和跨架构迁移负担，但不采用；仅 arm64 会移除 Intel 支持，也不采用。无需引入新的发布系统。

### 2. 沿用按构建架构匹配的 updater

继续使用 `tauri-action@v0` 的 `includeUpdaterJson: true`，双架构任务向同一 draft release 汇总平台条目。最终验证 `darwin-aarch64` 与 `darwin-x86_64` 的 URL、签名和实际更新包架构，确认 Windows 条目仍存在。若并行汇总有覆盖问题，在同一 workflow 中添加依赖全部构建完成的汇总步骤，使用 JSON 解析器处理，不提前新增自制清单生成器。

旧 x86_64 应用在 Apple Silicon 上仍匹配 Intel 更新条目，不能仅靠发布 arm64 包自动迁移。采用手动退出并替换应用的迁移方式，在 README、下载页和首次发布说明中明确。不得将 `darwin-x86_64` 指向 arm64 包，否则会破坏 Intel 用户更新。

### 3. 校验最终应用包而非仅相信构建参数

构建完成后，从 Tauri action 产物或明确 target 路径定位 `.app`，通过 Info.plist 的 `CFBundleExecutable` 找到主程序，再使用 `file` 和 `lipo -archs` 校验。扫描包内其余 Mach-O 可执行文件、动态库和 framework 二进制并校验目标架构；当前未发现此类附加依赖，也保留对最终包的检查。

不运行整个 Intel 应用来证明 arm64 支持。Apple Silicon 上用活动监视器的进程种类确认原生运行，进行核心功能与两版本更新验收。macOS 28 环境若暂不可用，明确记录未完成该系统实测，不能将架构检查表述为完整系统兼容性认证。

### 4. 安装和本地构建说明与产物一致

README 增加显式双架构构建命令及对应 target 产物目录。下载页维持现有两个平台入口，补充对应文件名识别方式与迁移提示，不引入硬编码的未来版本下载地址或浏览器自动架构检测。

## 风险与权衡

- 双架构构建增加耗时与下载选择成本 → 复用 Rust 缓存，文件名和安装说明明确架构。
- draft release 并行上传可能导致更新清单缺项 → 验证最终合并结果，必要时串行汇总。
- 旧 Intel 应用在 macOS 28 无法启动，因此不能在该系统内完成应用内迁移 → 发布说明要求提前替换，已升级用户直接手动安装 arm64 包。
- 当前未做 Apple 签名与公证 → 记录现有 Gatekeeper 安装行为，并在原生包上验收；该行为与 Rosetta 依赖分别验证。

## 迁移计划

1. 完成双架构构建和本地架构校验，生成 draft release。
2. 验证两套安装及更新签名，检查最终清单；记录 Apple Silicon 原生进程与功能验收结果。
3. 更新安装说明，并在人工发布前检查全部产物与 Windows 回归结果。
4. 发布后旧 Intel 安装用户按说明手动迁移到 arm64；原生用户以后继续常规更新。

回退时保留最后已验证的 arm64 发布包与更新条目；不得将 Apple Silicon 用户引导回仅 Intel 的发布版本。失败的 draft 不发布，修复后重新验证。

## 技术依据

- [Tauri action v0 文档](https://github.com/tauri-apps/tauri-action/blob/v0/README.md)：多架构构建及更新清单。
- [Tauri CLI 文档](https://v2.tauri.app/reference/cli/)：显式构建 target。
- [Apple Rosetta 说明](https://developer.apple.com/documentation/apple-silicon/about-the-rosetta-translation-environment)：通用支持截至 macOS 27。
