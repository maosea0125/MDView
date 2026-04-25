<script lang="ts">
  interface Props {
    fileName: string;
    onOpenFile: () => void;
    onToggleTheme: () => void;
    onToggleToc: () => void;
    onExportPdf: () => void;
    onExportWord: () => void;
    theme: string;
    tocVisible: boolean;
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    hasContent: boolean;
  }

  let { fileName, onOpenFile, onToggleTheme, onToggleToc, onExportPdf, onExportWord, theme, tocVisible, zoom, onZoomIn, onZoomOut, onZoomReset, hasContent }: Props = $props();

  let zoomPercent = $derived(Math.round(zoom * 100));
</script>

<div class="toolbar">
  <div class="toolbar-left">
    <button class="toolbar-btn" onclick={onOpenFile} title="打开文件 (Cmd/Ctrl+O)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 1h5l1 1H14.5l.5.5v3h-1V3H7.71l-1-1H2v10h4v1H1.5l-.5-.5v-11l.5-.5z"/>
        <path d="M14.5 6h-7l-.35.15-3.15 4V14.5l.5.5h10l.5-.5v-8l-.5-.5zm-.5 8H5l2.4-3h6.1v3z"/>
      </svg>
    </button>
    <span class="file-name">{fileName || '未打开文件'}</span>
  </div>
  <div class="toolbar-right">
    <div class="zoom-controls">
      <button class="toolbar-btn" onclick={onZoomOut} title="缩小 (Cmd/Ctrl+-)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7" cy="7" r="4.5"/>
          <line x1="10.2" y1="10.2" x2="14" y2="14"/>
          <line x1="5" y1="7" x2="9" y2="7"/>
        </svg>
      </button>
      <button class="zoom-label" onclick={onZoomReset} title="重置缩放 (Cmd/Ctrl+0)">{zoomPercent}%</button>
      <button class="toolbar-btn" onclick={onZoomIn} title="放大 (Cmd/Ctrl+=)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7" cy="7" r="4.5"/>
          <line x1="10.2" y1="10.2" x2="14" y2="14"/>
          <line x1="5" y1="7" x2="9" y2="7"/>
          <line x1="7" y1="5" x2="7" y2="9"/>
        </svg>
      </button>
    </div>
    <button class="toolbar-btn" onclick={onToggleToc} title={tocVisible ? '关闭目录' : '展示目录'} class:active={tocVisible}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3h12v1H2zm0 3h12v1H2zm0 3h12v1H2zm0 3h12v1H2z"/>
      </svg>
    </button>
    <button class="toolbar-btn" onclick={onExportPdf} title="导出 PDF (Cmd/Ctrl+Shift+E)" disabled={!hasContent}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
        <polyline points="10 2 10 5 13 5"/>
        <line x1="5" y1="9" x2="11" y2="9"/>
        <line x1="5" y1="12" x2="8" y2="12"/>
      </svg>
    </button>
    <button class="toolbar-btn" onclick={onExportWord} title="导出 Word (Cmd/Ctrl+Shift+D)" disabled={!hasContent}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
        <polyline points="10 2 10 5 13 5"/>
        <text x="4.5" y="13" font-size="5" font-family="sans-serif" font-weight="bold" fill="currentColor" stroke="none">W</text>
      </svg>
    </button>
    <button class="toolbar-btn" onclick={onToggleTheme} title="切换主题 (Cmd/Ctrl+Shift+T)">
      {#if theme === 'dark'}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13a6 6 0 01-3.5-10.87A7.02 7.02 0 008 14z"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4a4 4 0 100 8 4 4 0 000-8zm0 6.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5zM8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
        </svg>
      {/if}
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 12px;
    background: var(--toolbar-bg);
    border-bottom: 1px solid var(--border-color);
    -webkit-user-select: none;
    user-select: none;
    /* Allow dragging the window from toolbar */
    -webkit-app-region: drag;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: no-drag;
  }

  .file-name {
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 400px;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .zoom-label {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 42px;
    text-align: center;
    cursor: pointer;
    border: none;
    background: transparent;
    border-radius: 4px;
    padding: 2px 4px;
    height: 28px;
  }

  .zoom-label:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
  }

  .toolbar-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .toolbar-btn.active {
    background: var(--active-bg);
    color: var(--text-primary);
  }
</style>
