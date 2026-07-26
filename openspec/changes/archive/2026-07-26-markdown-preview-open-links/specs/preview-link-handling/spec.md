# preview-link-handling 规格

## ADDED Requirements

### Requirement: 外部链接在系统默认程序中打开
预览中点击 `http:`、`https:` 或 `mailto:` 协议的链接时，系统 SHALL 阻止 WebView 内部导航，并通过操作系统默认程序打开该链接地址。

#### Scenario: 点击 https 链接
- **WHEN** 用户在预览中点击 `https://example.com` 链接
- **THEN** 系统默认浏览器打开该地址，预览页面保持不变

#### Scenario: 点击 mailto 链接
- **WHEN** 用户在预览中点击 `mailto:someone@example.com` 链接
- **THEN** 系统默认邮件客户端打开写信窗口，预览页面保持不变

#### Scenario: 自动识别的裸链接
- **WHEN** Markdown 正文中包含裸 URL（由 linkify 自动转为链接），用户点击它
- **THEN** 系统默认浏览器打开该地址

### Requirement: 锚点链接在文档内跳转
预览中点击以 `#` 开头的锚点链接时，系统 SHALL 在预览内滚动到对应标题元素，且 MUST NOT 触发页面导航。

#### Scenario: 点击目录式锚点链接
- **WHEN** 用户点击 `[章节](#章节标题)` 形式的链接，且文档中存在对应标题
- **THEN** 预览滚动到该标题位置

#### Scenario: 锚点目标不存在
- **WHEN** 用户点击的锚点在文档中没有对应标题
- **THEN** 不发生任何导航或报错，页面保持原位

### Requirement: 非白名单链接阻止导航
对于协议不在白名单（`http:`、`https:`、`mailto:`）内且非锚点的链接（如相对路径、`file:` 等），系统 SHALL 阻止默认导航且不打开任何外部程序。

#### Scenario: 点击相对路径链接
- **WHEN** 用户点击 `[其他文档](./other.md)` 形式的链接
- **THEN** 页面保持不变，不发生导航
