import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateStatus = 'idle' | 'checking' | 'upToDate' | 'available' | 'downloading' | 'installed' | 'error';

export const updateState = $state({
  status: 'idle' as UpdateStatus,
  version: '',
  notes: '',
  error: '',
  downloaded: 0,
  total: 0,
});

let pending: Update | null = null;

/** 检查更新。silent 模式下（启动时）无更新或失败均保持静默 */
export async function checkForUpdate(silent = false) {
  if (updateState.status === 'checking' || updateState.status === 'downloading' || updateState.status === 'installed') return;
  if (!silent) updateState.status = 'checking';
  try {
    const update = await check();
    if (update) {
      pending = update;
      updateState.version = update.version;
      updateState.notes = update.body ?? '';
      updateState.status = 'available';
    } else {
      updateState.status = silent ? 'idle' : 'upToDate';
    }
  } catch (e) {
    if (silent) {
      updateState.status = 'idle';
    } else {
      updateState.error = String(e);
      updateState.status = 'error';
    }
  }
}

export async function downloadAndInstall() {
  if (!pending) return;
  updateState.status = 'downloading';
  updateState.downloaded = 0;
  updateState.total = 0;
  try {
    await pending.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        updateState.total = event.data.contentLength ?? 0;
      } else if (event.event === 'Progress') {
        updateState.downloaded += event.data.chunkLength;
      }
    });
    updateState.status = 'installed';
  } catch (e) {
    updateState.error = String(e);
    updateState.status = 'error';
  }
}

export async function restartApp() {
  await relaunch();
}
