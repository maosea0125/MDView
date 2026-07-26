<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { updateState, checkForUpdate, downloadAndInstall, restartApp } from '$lib/update.svelte';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let version = $state('');
  getVersion().then(v => { version = v; });

  let progressPercent = $derived(
    updateState.total > 0 ? Math.min(100, Math.round(updateState.downloaded / updateState.total * 100)) : 0
  );
</script>

<div class="about-backdrop" role="presentation" onclick={onClose}>
  <div
    class="about-dialog"
    role="dialog"
    aria-label="关于 MDView"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
  >
    <button class="close-btn" onclick={onClose} title="关闭" aria-label="关闭">✕</button>
    <h2>MDView</h2>
    <p class="version">版本 {version}</p>

    {#if updateState.status === 'idle' || updateState.status === 'checking'}
      <button class="action-btn" onclick={() => checkForUpdate()} disabled={updateState.status === 'checking'}>
        {updateState.status === 'checking' ? '正在检查…' : '检查更新'}
      </button>
    {:else if updateState.status === 'upToDate'}
      <p class="status">当前已是最新版本</p>
      <button class="action-btn" onclick={() => checkForUpdate()}>再次检查</button>
    {:else if updateState.status === 'available'}
      <p class="status highlight">发现新版本 {updateState.version}</p>
      {#if updateState.notes}
        <div class="notes">{updateState.notes}</div>
      {/if}
      <div class="btn-row">
        <button class="action-btn primary" onclick={downloadAndInstall}>立即更新</button>
        <button class="action-btn" onclick={onClose}>稍后</button>
      </div>
    {:else if updateState.status === 'downloading'}
      <p class="status">正在下载更新… {progressPercent}%</p>
      <div class="progress-track"><div class="progress-fill" style="width:{progressPercent}%"></div></div>
    {:else if updateState.status === 'installed'}
      <p class="status highlight">更新已安装，重启后生效</p>
      <button class="action-btn primary" onclick={restartApp}>立即重启</button>
    {:else if updateState.status === 'error'}
      <p class="status error">更新失败：{updateState.error}</p>
      <button class="action-btn" onclick={() => checkForUpdate()}>重试</button>
    {/if}
  </div>
</div>

<style>
  .about-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .about-dialog {
    position: relative;
    width: 320px;
    background: var(--bg-primary, #fff);
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    padding: 24px;
    text-align: center;
    outline: none;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #666);
    cursor: pointer;
    border-radius: 4px;
    font-size: 12px;
  }

  .close-btn:hover {
    background: var(--hover-bg, #eee);
    color: var(--text-primary, #111);
  }

  h2 {
    margin: 0 0 4px;
    font-size: 20px;
    color: var(--text-primary, #111);
  }

  .version {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .status {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .status.highlight {
    color: var(--text-primary, #111);
    font-weight: 600;
  }

  .status.error {
    color: #d93025;
    word-break: break-all;
  }

  .notes {
    max-height: 120px;
    overflow-y: auto;
    margin: 0 0 12px;
    padding: 8px 10px;
    font-size: 12px;
    text-align: left;
    white-space: pre-wrap;
    color: var(--text-secondary, #444);
    background: var(--hover-bg, #f6f8fa);
    border-radius: 6px;
  }

  .btn-row {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .action-btn {
    padding: 6px 16px;
    font-size: 13px;
    border: 1px solid var(--border-color, #d1d5db);
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #111);
    border-radius: 6px;
    cursor: pointer;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--hover-bg, #f3f4f6);
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .action-btn.primary {
    background: var(--accent-color, #0d6efd);
    border-color: var(--accent-color, #0d6efd);
    color: #fff;
  }

  .action-btn.primary:hover {
    opacity: 0.9;
    background: var(--accent-color, #0d6efd);
  }

  .progress-track {
    height: 6px;
    background: var(--hover-bg, #eee);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-color, #0d6efd);
    transition: width 0.2s;
  }
</style>
