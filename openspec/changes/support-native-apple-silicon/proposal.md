## 为什么

Apple 将通用 Rosetta 支持保留至 macOS 27，macOS 28 上普通 Intel 应用无法再依赖它运行。MDView 的 README 已宣称支持 Apple Silicon，但 `.github/workflows/build.yml` 仅发布 x86_64 macOS 包，必须提供原生 arm64 版本。

官方依据：[Apple Rosetta 支持变更](https://developer.apple.com/news/?id=w5ngl9k2)。

## 变更内容

- 按用户选择，分别发布 `aarch64-apple-darwin` 和 `x86_64-apple-darwin` 安装包，保留 Intel 与 Windows 支持。
- 为两种 macOS 架构生成匹配的签名更新包及 `latest.json` 平台条目。
- 验证发布包中的 Mach-O 架构，确保 Apple Silicon 包可原生运行。
- 更新 README 和下载页，明确安装包选择与 Apple Silicon 上旧 Intel 版本的手动迁移步骤。
- 在 Apple Silicon 上验证文件打开、预览、导出及更新流程，记录原生运行证据。

## 能力

### 新增能力

- `macos-native-distribution`：macOS 双架构分发、匹配架构的更新与原生运行验收。

### 修改能力

无。现有主规格仅有 `preview-link-handling`；更新能力仍位于未归档变更中，本次不修改其文件。

## 影响

- `.github/workflows/build.yml`：新增 arm64 构建与产物验证。
- `README.md`、`docs/index.html`：安装、构建和迁移说明。
- GitHub Releases：新增 arm64 安装包及更新包；继续复用已有签名密钥、公钥和更新源。
- 预计无需调整业务代码或升级依赖；实际构建若发现原生依赖问题，再根据证据处理。
- 兼容性目标为消除 Rosetta 运行依赖；macOS 28 的实际系统兼容性仍须在可用测试环境中验证。
