# version-info 规格增量

## ADDED Requirements

### Requirement: 查看当前软件版本
应用 SHALL 提供一个"关于"入口，展示应用名称与当前版本号；版本号 SHALL 通过 Tauri `getVersion()` 读取自 `tauri.conf.json`，不得在前端硬编码。

#### Scenario: 打开关于面板查看版本
- **WHEN** 用户点击"关于"入口
- **THEN** 界面展示应用名称"MDView"与当前版本号（如 `0.7.2`），并提供"检查更新"按钮

#### Scenario: 版本号与构建配置一致
- **WHEN** `tauri.conf.json` 中的 `version` 更新并重新构建应用
- **THEN** 关于面板展示的版本号随之变化，无需修改前端代码
