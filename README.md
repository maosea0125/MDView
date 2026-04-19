# MDView

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="MDView Icon">
</p>

<p align="center">
  <strong>轻量、跨平台的 Markdown 预览工具</strong>
</p>

<p align="center">
  <a href="https://github.com/maosea0125/MDView/releases/latest">
    <img src="https://img.shields.io/github/v/release/maosea0125/MDView?style=flat-square" alt="Release">
  </a>
  <a href="https://github.com/maosea0125/MDView/actions/workflows/build.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/maosea0125/MDView/build.yml?style=flat-square" alt="Build">
  </a>
  <a href="https://github.com/maosea0125/MDView/blob/main/package.json">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  </a>
</p>

---

## 功能特性

- **Markdown 渲染** — 基于 markdown-it，支持 GFM 表格、任务列表、脚注、Emoji、Front Matter
- **数学公式** — KaTeX 渲染，支持行内 `$...$` 和块级 `$$...$$`
- **Mermaid 图表** — 流程图、时序图、甘特图等，支持弹窗放大查看（最高 1500%）
- **GitHub Alerts** — 支持 `[!NOTE]` `[!TIP]` `[!IMPORTANT]` `[!WARNING]` `[!CAUTION]` 语法
- **多标签页** — 同时打开多个文件，支持拖拽排序
- **标签页右键菜单** — 关闭、关闭其他、关闭右侧、重新加载
- **目录导航** — 自动提取标题生成侧边栏目录
- **主题切换** — 明亮 / 暗黑主题一键切换
- **文件关联** — 系统右键菜单直接用 MDView 打开 `.md` 文件
- **拖放打开** — 将文件拖入窗口即可预览
- **最近文件** — 菜单栏快速访问最近打开的文件
- **缩放** — 支持 `Cmd/Ctrl +/-` 调整预览字号

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Tauri v2](https://v2.tauri.app/) |
| 前端 | [SvelteKit](https://svelte.dev/) + TypeScript |
| 渲染 | [markdown-it](https://github.com/markdown-it/markdown-it) + 插件 |
| 公式 | [KaTeX](https://katex.org/) |
| 图表 | [Mermaid](https://mermaid.js.org/) |
| DOM  | [morphdom](https://github.com/patrick-steele-idem/morphdom) |
| 样式 | [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) |

## 平台支持

| 平台 | 架构 | 格式 |
|------|------|------|
| macOS | Apple Silicon (aarch64) | `.app` / `.dmg` |
| macOS | Intel (x86_64) | `.app` / `.dmg` |
| Windows | x64 | `.exe` / `.msi` |

## 安装

前往 [Releases](https://github.com/maosea0125/MDView/releases/latest) 下载对应平台的安装包。

### macOS

```bash
# 或通过命令行安装 DMG 中的 app
cp -R /Volumes/MDView/MDView.app /Applications/
```

> macOS 首次打开可能提示"无法验证开发者"，请在 **系统设置 → 隐私与安全性** 中允许打开。

### Windows

下载 `.msi` 安装包双击安装，或使用 `.exe` 直接运行。

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 22
- [Rust](https://www.rust-lang.org/tools/install) ≥ 1.77
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

### 构建

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + O` | 打开文件 |
| `Cmd/Ctrl + W` | 关闭当前标签 |
| `Cmd/Ctrl + +` | 放大 |
| `Cmd/Ctrl + -` | 缩小 |
| `Cmd/Ctrl + 0` | 重置缩放 |

## 项目结构

```
md-view/
├── src/                    # 前端源码
│   ├── lib/
│   │   ├── components/     # Svelte 组件
│   │   │   ├── Preview.svelte    # Markdown 预览 + Mermaid 弹窗
│   │   │   ├── TabBar.svelte     # 标签栏
│   │   │   ├── Toolbar.svelte    # 工具栏
│   │   │   └── TOCSidebar.svelte # 目录侧边栏
│   │   ├── markdown/
│   │   │   └── engine.ts         # markdown-it 引擎及插件配置
│   │   ├── types.ts              # 类型定义
│   │   └── zoom.ts               # 缩放常量
│   └── routes/
│       └── +page.svelte          # 主页面 (标签管理、菜单、快捷键)
├── src-tauri/              # Rust 后端
│   └── src/lib.rs          # 文件读取、文件关联处理
├── static/                 # 静态资源
└── .github/workflows/      # CI/CD
    └── build.yml           # GitHub Actions 自动构建
```

## License

[MIT](package.json)
# Tauri + SvelteKit + TypeScript

This template should help get you started developing with Tauri, SvelteKit and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).
