## Purpose

为 MDView 提供可区分的 Apple Silicon 与 Intel macOS 分发产物，使 Apple Silicon 用户无需依赖 Rosetta 即可运行，并保证各架构更新包匹配及旧 Intel 安装的迁移路径清晰。

## ADDED Requirements

### Requirement: macOS 双架构安装包
每次正式发布 MUST 提供独立且名称可区分的 arm64 和 x86_64 macOS 安装包。Apple Silicon 安装包 SHALL 在支持的 Apple Silicon macOS 系统上原生运行，运行所需的随包 Mach-O 文件 MUST 包含 arm64 架构。

#### Scenario: Apple Silicon 原生安装
- **WHEN** Apple Silicon 用户安装 arm64 包并启动 MDView
- **THEN** 应用以 Apple 原生进程运行，无需安装或调用 Rosetta，并可打开 Markdown、渲染公式和 Mermaid、导出 PDF 与 Word

#### Scenario: Intel 安装
- **WHEN** Intel Mac 用户安装 x86_64 包
- **THEN** 应用可启动并保持现有文件预览及导出能力

### Requirement: 更新包匹配客户端架构
发布的 `latest.json` MUST 同时包含 `darwin-aarch64` 和 `darwin-x86_64`，分别指向对应架构的可下载更新包并提供有效签名；客户端 SHALL 通过已有更新流程安装匹配自身构建架构的版本。

#### Scenario: arm64 更新
- **WHEN** arm64 客户端检查到更高版本并安装更新
- **THEN** 下载 arm64 更新包，签名验证通过，重启后仍以原生 Apple 进程运行

#### Scenario: x86_64 更新
- **WHEN** x86_64 客户端在可运行该版本的 macOS 上安装更新
- **THEN** 下载 x86_64 更新包且签名验证通过，Intel Mac 用户可继续使用

### Requirement: 安装选择和旧版本迁移说明
README、下载页及首次双架构发布说明 MUST 清楚区分 Apple Silicon 与 Intel 安装包，并说明 Apple Silicon 上旧 x86_64 安装需在升级 macOS 28 前手动替换为 arm64 包。说明 MUST 告知用户常规应用内更新不会自动切换架构。

#### Scenario: 旧 Intel 安装迁移
- **WHEN** Apple Silicon 用户按照说明迁移旧 x86_64 版本
- **THEN** 用户退出应用、下载 arm64 包并替换原有应用后，可原生启动并重新打开原 Markdown 文件

### Requirement: 发布架构验证
发布流程 MUST 校验每个 macOS 应用包的实际 Mach-O 架构与标称架构一致；缺失目标架构或无法确定架构时 MUST 将该构建标记为失败，不得作为可发布的合格产物。

#### Scenario: 架构不匹配
- **WHEN** arm64 构建的应用主程序或随包运行依赖仅包含 x86_64
- **THEN** 架构校验失败，该构建不得通过发布验收
