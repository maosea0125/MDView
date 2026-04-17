<script lang="ts">
  interface Props {
    fileName: string;
    onOpenFile: () => void;
    onToggleTheme: () => void;
    onToggleToc: () => void;
    theme: string;
    tocVisible: boolean;
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
  }

  let { fileName, onOpenFile, onToggleTheme, onToggleToc, theme, tocVisible, zoom, onZoomIn, onZoomOut, onZoomReset }: Props = $props();

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
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM3.5 7.5h5v1h-5z"/>
        </svg>
      </button>
      <button class="zoom-label" onclick={onZoomReset} title="重置缩放 (Cmd/Ctrl+0)">{zoomPercent}%</button>
      <button class="toolbar-btn" onclick={onZoomIn} title="放大 (Cmd/Ctrl+=)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM8 5.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V10a.5.5 0 0 1-1 0V8.5H6a.5.5 0 0 1 0-1h1.5V6a.5.5 0 0 1 .5-.5z"/>
        </svg>
      </button>
    </div>
    <button class="toolbar-btn" onclick={onToggleToc} title={tocVisible ? '关闭目录' : '展示目录'} class:active={tocVisible}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3h12v1H2zm0 3h12v1H2zm0 3h12v1H2zm0 3h12v1H2z"/>
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
