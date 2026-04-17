<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onMount } from 'svelte';
  import { renderMarkdown, extractToc, type TocItem, type RenderResult } from '$lib/markdown/engine';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import Preview from '$lib/components/Preview.svelte';
  import TOCSidebar from '$lib/components/TOCSidebar.svelte';
  import 'github-markdown-css/github-markdown.css';
  import 'katex/dist/katex.min.css';

  let filePath = $state('');
  let fileName = $state('');
  let markdownContent = $state('');
  let rendered = $state<RenderResult>({ html: '', frontMatter: '', hasMermaid: false });
  let tocItems = $state<TocItem[]>([]);
  let tocVisible = $state(false);
  let theme = $state<'light' | 'dark'>('light');
  let isDragging = $state(false);

  // Theme management
  function setTheme(t: 'light' | 'dark') {
    theme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('md-view-theme', t);
  }

  function toggleTheme() {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  // File operations
  async function loadFile(path: string) {
    try {
      const content: string = await invoke('read_markdown_file', { path });
      const name: string = await invoke('get_file_name', { path });
      filePath = path;
      fileName = name;
      markdownContent = content;
      rendered = renderMarkdown(content);
      tocItems = extractToc(content);
    } catch (e) {
      console.error('Failed to load file:', e);
    }
  }

  async function openFileDialog() {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] }],
        multiple: false,
      });
      if (selected) {
        await loadFile(selected as string);
      }
    } catch (e) {
      console.error('Failed to open dialog:', e);
    }
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'o') {
      e.preventDefault();
      openFileDialog();
    } else if (mod && e.shiftKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      toggleTheme();
    }
  }

  // Drag and drop
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.match(/\.(md|markdown|mdown|mkd|mdx)$/i)) {
        const reader = new FileReader();
        reader.onload = () => {
          fileName = file.name;
          markdownContent = reader.result as string;
          rendered = renderMarkdown(markdownContent);
          tocItems = extractToc(markdownContent);
        };
        reader.readAsText(file);
      }
    }
  }

  onMount(async () => {
    // Restore theme
    const savedTheme = localStorage.getItem('md-view-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    // Build native menu via JS API
    const { Menu, MenuItem, Submenu, PredefinedMenuItem } = await import('@tauri-apps/api/menu');

    const openItem = await MenuItem.new({
      id: 'open_file',
      text: '打开文件...',
      accelerator: 'CmdOrCtrl+O',
      action: () => openFileDialog(),
    });

    const separator = await PredefinedMenuItem.new({ item: 'Separator' });

    const themeItem = await MenuItem.new({
      id: 'toggle_theme',
      text: '切换主题',
      accelerator: 'CmdOrCtrl+Shift+T',
      action: () => toggleTheme(),
    });

    const tocItem = await MenuItem.new({
      id: 'toggle_toc',
      text: '展示目录',
      action: async () => {
        tocVisible = !tocVisible;
        await tocItem.setText(tocVisible ? '关闭目录' : '展示目录');
      },
    });

    const { getCurrentWindow } = await import('@tauri-apps/api/window');

    const quitItem = await MenuItem.new({
      id: 'quit',
      text: '退出 MDView',
      accelerator: 'CmdOrCtrl+Q',
      action: async () => { await getCurrentWindow().close(); },
    });

    const fileSubmenu = await Submenu.new({
      text: '文件',
      items: [
        openItem,
        separator,
        quitItem,
      ],
    });

    const viewSubmenu = await Submenu.new({
      text: '视图',
      items: [themeItem, tocItem],
    });

    const menu = await Menu.new({
      items: [fileSubmenu, viewSubmenu],
    });
    await menu.setAsAppMenu();

    // Listen for file open from Rust (CLI args or file association)
    listen<string>('open-file', (event) => {
      loadFile(event.payload);
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('md-view-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="app-container"
  role="application"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <Toolbar
    {fileName}
    onOpenFile={openFileDialog}
    onToggleTheme={toggleTheme}
    onToggleToc={() => tocVisible = !tocVisible}
    {theme}
    {tocVisible}
  />

  <div class="main-content">
    <TOCSidebar items={tocItems} visible={tocVisible} />

    {#if markdownContent}
      <Preview html={rendered.html} hasMermaid={rendered.hasMermaid} />
    {:else}
      <div class="welcome">
        <h2>MDView</h2>
        <p>打开 Markdown 文件或拖拽文件到此处</p>
        <p style="font-size: 12px; color: var(--text-secondary)">
          Cmd/Ctrl + O 打开文件 &middot; Cmd/Ctrl + Shift + T 切换主题
        </p>
      </div>
    {/if}
  </div>

  {#if isDragging}
    <div class="drop-overlay">将 Markdown 文件拖放到此处</div>
  {/if}
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
</style>
