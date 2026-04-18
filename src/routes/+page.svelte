<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onMount } from 'svelte';
  import { renderMarkdown, extractToc, type TocItem, type RenderResult } from '$lib/markdown/engine';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import Preview from '$lib/components/Preview.svelte';
  import TOCSidebar from '$lib/components/TOCSidebar.svelte';
  import TabBar from '$lib/components/TabBar.svelte';
  import type { Tab } from '$lib/types';
  import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, clampZoom } from '$lib/zoom';
  import lightMdCss from 'github-markdown-css/github-markdown-light.css?inline';
  import darkMdCss from 'github-markdown-css/github-markdown-dark.css?inline';
  import 'katex/dist/katex.min.css';

  let tabs = $state<Tab[]>([]);
  let activeTabId = $state('');
  let globalTheme = $state<'light' | 'dark'>('light');
  let isDragging = $state(false);

  // Derived: active tab
  let activeTab = $derived(tabs.find(t => t.id === activeTabId));

  // Tab helpers
  let tabIdCounter = 0;
  function newTabId(): string { return `tab-${++tabIdCounter}-${Date.now()}`; }

  function createTab(filePath: string, fileName: string, content: string): Tab {
    const rendered = renderMarkdown(content);
    const tocItems = extractToc(content);
    return {
      id: newTabId(),
      filePath,
      fileName,
      content,
      rendered,
      tocItems,
      tocVisible: false,
      zoom: 1.0,
      scrollTop: 0,
    };
  }

  function updateActiveTab(updater: (tab: Tab) => void) {
    const idx = tabs.findIndex(t => t.id === activeTabId);
    if (idx < 0) return;
    updater(tabs[idx]);
    tabs = [...tabs]; // trigger reactivity
  }

  function selectTab(id: string) {
    if (activeTab) {
      // Save scroll position of leaving tab
      const previewWrapper = document.querySelector('.preview-wrapper');
      if (previewWrapper) {
        updateActiveTab(t => { t.scrollTop = previewWrapper.scrollTop; });
      }
    }
    activeTabId = id;
    const tab = tabs.find(t => t.id === id);
    // Restore scroll position after DOM update
    requestAnimationFrame(() => {
      const previewWrapper = document.querySelector('.preview-wrapper');
      if (previewWrapper && tab) {
        previewWrapper.scrollTop = tab.scrollTop;
      }
    });
  }

  function closeTab(id: string) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    tabs = tabs.filter(t => t.id !== id);
    if (activeTabId === id) {
      if (tabs.length > 0) {
        const newIdx = Math.min(idx, tabs.length - 1);
        selectTab(tabs[newIdx].id);
      } else {
        activeTabId = '';
      }
    }
  }

  // Zoom operations on active tab
  function setZoom(value: number) {
    updateActiveTab(t => { t.zoom = clampZoom(value); });
  }
  function zoomIn() { if (activeTab) setZoom(activeTab.zoom + ZOOM_STEP); }
  function zoomOut() { if (activeTab) setZoom(activeTab.zoom - ZOOM_STEP); }
  function resetZoom() { setZoom(1.0); }

  // TOC toggle on active tab
  function toggleToc() {
    updateActiveTab(t => { t.tocVisible = !t.tocVisible; });
  }

  // Reorder tabs
  function reorderTabs(fromIndex: number, toIndex: number) {
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, moved);
    tabs = newTabs;
  }

  // Close other tabs (keep the specified tab)
  function closeOtherTabs(id: string) {
    tabs = tabs.filter(t => t.id === id);
    selectTab(id);
  }

  // Close tabs to the right
  function closeRightTabs(id: string) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    tabs = tabs.slice(0, idx + 1);
    if (!tabs.find(t => t.id === activeTabId)) {
      selectTab(id);
    }
  }

  // Reload tab (re-read file from disk)
  async function reloadTab(id: string) {
    const tab = tabs.find(t => t.id === id);
    if (!tab || !tab.filePath) return;
    try {
      const content: string = await invoke('read_markdown_file', { path: tab.filePath });
      const rendered = renderMarkdown(content);
      tabs = tabs.map(t => t.id === id ? { ...t, content, rendered } : t) as typeof tabs;
    } catch (e) {
      console.error('Failed to reload file:', e);
    }
  }

  // Theme management
  function applyMarkdownTheme(t: 'light' | 'dark') {
    let el = document.getElementById('github-md-theme');
    if (!el) {
      el = document.createElement('style');
      el.id = 'github-md-theme';
      document.head.appendChild(el);
    }
    el.textContent = t === 'dark' ? darkMdCss : lightMdCss;
  }

  function applyTheme(t: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', t);
    applyMarkdownTheme(t);
  }

  function setGlobalTheme(t: 'light' | 'dark') {
    globalTheme = t;
    localStorage.setItem('md-view-theme', t);
    applyTheme(t);
  }

  function toggleTheme() {
    setGlobalTheme(globalTheme === 'light' ? 'dark' : 'light');
  }

  // Recent files
  const RECENT_FILES_KEY = 'md-view-recent-files';
  const MAX_RECENT = 10;

  function getRecentFiles(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_FILES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function addRecentFile(path: string) {
    let recent = getRecentFiles().filter(p => p !== path);
    recent.unshift(path);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
    rebuildRecentMenu();
  }

  function clearRecentFiles() {
    localStorage.removeItem(RECENT_FILES_KEY);
    rebuildRecentMenu();
  }

  // Will be set in onMount after menu is built
  let rebuildRecentMenu: () => void = () => {};

  // File operations
  async function loadFile(path: string) {
    try {
      // Check if file is already open
      const existing = tabs.find(t => t.filePath === path);
      if (existing) {
        selectTab(existing.id);
        addRecentFile(path);
        return;
      }
      const content: string = await invoke('read_markdown_file', { path });
      const name: string = await invoke('get_file_name', { path });
      const tab = createTab(path, name, content);
      tabs = [...tabs, tab];
      selectTab(tab.id);
      addRecentFile(path);
    } catch (e) {
      console.error('Failed to load file:', e);
    }
  }

  async function openFileDialog() {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] }],
        multiple: true,
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        for (const p of paths) {
          await loadFile(p as string);
        }
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
    } else if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      zoomIn();
    } else if (mod && e.key === '-') {
      e.preventDefault();
      zoomOut();
    } else if (mod && e.key === '0') {
      e.preventDefault();
      resetZoom();
    } else if (mod && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
    }
  }

  onMount(async () => {
    // Restore theme
    const savedTheme = localStorage.getItem('md-view-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setGlobalTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setGlobalTheme('dark');
    } else {
      applyMarkdownTheme('light');
    }

    // Build native menu via JS API
    const { Menu, MenuItem, Submenu, PredefinedMenuItem } = await import('@tauri-apps/api/menu');

    const openItem = await MenuItem.new({
      id: 'open_file',
      text: '打开文件...',
      accelerator: 'CmdOrCtrl+O',
      action: () => openFileDialog(),
    });

    const closeTabItem = await MenuItem.new({
      id: 'close_tab',
      text: '关闭标签',
      accelerator: 'CmdOrCtrl+W',
      action: () => { if (activeTabId) closeTab(activeTabId); },
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
      accelerator: 'CmdOrCtrl+Shift+L',
      action: async () => {
        toggleToc();
        const tab = tabs.find(t => t.id === activeTabId);
        await tocItem.setText(tab?.tocVisible ? '关闭目录' : '展示目录');
      },
    });

    const zoomInItem = await MenuItem.new({
      id: 'zoom_in',
      text: '放大',
      accelerator: 'CmdOrCtrl+=',
      action: () => zoomIn(),
    });

    const zoomOutItem = await MenuItem.new({
      id: 'zoom_out',
      text: '缩小',
      accelerator: 'CmdOrCtrl+Minus',
      action: () => zoomOut(),
    });

    const zoomResetItem = await MenuItem.new({
      id: 'zoom_reset',
      text: '重置缩放',
      accelerator: 'CmdOrCtrl+0',
      action: () => resetZoom(),
    });

    const { getCurrentWindow } = await import('@tauri-apps/api/window');

    const quitItem = await MenuItem.new({
      id: 'quit',
      text: '退出 MDView',
      accelerator: 'CmdOrCtrl+Q',
      action: async () => { await getCurrentWindow().close(); },
    });

    // Recent files submenu
    const recentSubmenu = await Submenu.new({
      id: 'recent_files',
      text: '最近打开',
      items: [],
    });

    async function _rebuildRecentMenu() {
      // Remove all existing items
      const existingItems = await recentSubmenu.items();
      for (const item of existingItems) {
        await recentSubmenu.remove(item);
      }

      const recent = getRecentFiles();
      if (recent.length === 0) {
        const emptyItem = await MenuItem.new({ id: 'recent_empty', text: '(无)', enabled: false });
        await recentSubmenu.append(emptyItem);
      } else {
        for (let i = 0; i < recent.length; i++) {
          const p = recent[i];
          const name = p.split('/').pop() || p;
          const item = await MenuItem.new({
            id: `recent_${i}`,
            text: name,
            action: () => loadFile(p),
          });
          await recentSubmenu.append(item);
        }
        await recentSubmenu.append(await PredefinedMenuItem.new({ item: 'Separator' }));
        const clearItem = await MenuItem.new({
          id: 'clear_recent',
          text: '清除最近打开',
          action: () => clearRecentFiles(),
        });
        await recentSubmenu.append(clearItem);
      }
    }
    rebuildRecentMenu = _rebuildRecentMenu;
    await _rebuildRecentMenu();

    const fileSubmenu = await Submenu.new({
      text: '文件',
      items: [openItem, closeTabItem, separator, recentSubmenu, await PredefinedMenuItem.new({ item: 'Separator' }), quitItem],
    });

    const viewSubmenu = await Submenu.new({
      text: '视图',
      items: [themeItem, tocItem, await PredefinedMenuItem.new({ item: 'Separator' }), zoomInItem, zoomOutItem, zoomResetItem],
    });

    const menu = await Menu.new({
      items: [fileSubmenu, viewSubmenu],
    });
    await menu.setAsAppMenu();

    // Listen for file open from Rust (file association while app is running)
    listen<string>('open-file', (event) => {
      loadFile(event.payload);
    });

    // Check for pending files (from CLI args or file association on launch)
    const pendingFiles: string[] = await invoke('get_pending_files');
    for (const filePath of pendingFiles) {
      await loadFile(filePath);
    }

    // Set up Tauri's native drag and drop handling
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const appWindow = getCurrentWebviewWindow();
    await appWindow.onDragDropEvent((event) => {
      if (event.payload.type === 'enter') {
        isDragging = true;
      } else if (event.payload.type === 'leave') {
        isDragging = false;
      } else if (event.payload.type === 'drop') {
        isDragging = false;
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          for (const path of paths) {
            if (path.match(/\.(md|markdown|mdown|mkd|mdx)$/i)) {
              loadFile(path);
            }
          }
        }
      }
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('md-view-theme')) {
        setGlobalTheme(e.matches ? 'dark' : 'light');
      }
    });
  });
</script>

<svelte:window onkeydown={handleKeydown} oncontextmenu={(e) => e.preventDefault()} />

<div
  class="app-container"
  role="application"
>
  <Toolbar
    fileName={activeTab?.fileName ?? ''}
    onOpenFile={openFileDialog}
    onToggleTheme={toggleTheme}
    onToggleToc={toggleToc}
    theme={globalTheme}
    tocVisible={activeTab?.tocVisible ?? false}
    zoom={activeTab?.zoom ?? 1.0}
    onZoomIn={zoomIn}
    onZoomOut={zoomOut}
    onZoomReset={resetZoom}
  />

  <TabBar {tabs} {activeTabId} onSelectTab={selectTab} onCloseTab={closeTab} onReorderTabs={reorderTabs} onCloseOtherTabs={closeOtherTabs} onCloseRightTabs={closeRightTabs} onReloadTab={reloadTab} />

  <div class="main-content">
    {#if activeTab}
      <TOCSidebar items={activeTab.tocItems} visible={activeTab.tocVisible} />
      <Preview html={activeTab.rendered.html} hasMermaid={activeTab.rendered.hasMermaid} zoom={activeTab.zoom} onZoomChange={setZoom} />
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
