# app-update 规格增量

## ADDED Requirements

### Requirement: 手动检查更新
应用 SHALL 允许用户从"关于"面板手动检查更新。检查 SHALL 请求 GitHub Releases 更新源（`latest.json`），并将最新版本与当前版本比较。

#### Scenario: 有可用更新
- **WHEN** 用户点击"检查更新"且更新源中的版本高于当前版本
- **THEN** 界面展示新版本号与更新说明，并提供"立即更新"与"稍后"操作

#### Scenario: 已是最新版本
- **WHEN** 用户点击"检查更新"且当前已是最新版本
- **THEN** 界面提示"当前已是最新版本"

#### Scenario: 检查失败
- **WHEN** 用户点击"检查更新"且网络不可用或更新源不可达
- **THEN** 界面提示检查失败原因，不影响应用其他功能使用

### Requirement: 应用内下载并安装更新
用户确认更新后，应用 SHALL 在应用内下载更新包、校验 minisign 签名并安装；安装完成后 SHALL 提示用户重启应用以完成升级。

#### Scenario: 下载并安装成功
- **WHEN** 用户点击"立即更新"
- **THEN** 应用展示下载进度，下载完成并通过签名校验后自动安装，随后提示"重启以完成更新"

#### Scenario: 用户确认重启
- **WHEN** 安装完成后用户点击"立即重启"
- **THEN** 应用调用 relaunch 重启，启动后运行的是新版本

#### Scenario: 签名校验失败
- **WHEN** 下载的更新包签名与内置公钥不匹配
- **THEN** 应用 MUST 拒绝安装该更新包，并向用户提示更新失败

### Requirement: 启动时静默检查更新
应用 SHALL 在每次启动完成后自动检查一次更新；无更新或检查失败时 MUST 不打扰用户。

#### Scenario: 启动时发现新版本
- **WHEN** 应用启动且更新源中存在更高版本
- **THEN** 界面展示非模态的更新提示，用户可选择更新或忽略

#### Scenario: 启动时无更新或检查失败
- **WHEN** 应用启动且无可用更新（或检查请求失败）
- **THEN** 不展示任何提示，应用正常使用

### Requirement: 更新产物由 CI 自动生成
发布构建 SHALL 生成经 minisign 私钥签名的更新包及对应 `latest.json`（含各平台下载地址、签名与更新说明），并随 GitHub Release 一同发布。

#### Scenario: 打 tag 触发发布构建
- **WHEN** 推送 `v*` tag 触发 CI 构建
- **THEN** release 产物中包含 macOS 与 Windows 的更新包、`.sig` 签名文件以及 `latest.json`
