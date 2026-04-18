<script lang="ts">
  import type { Tab } from '$lib/types';

  interface Props {
    tabs: Tab[];
    activeTabId: string;
    onSelectTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onReorderTabs: (fromIndex: number, toIndex: number) => void;
    onCloseOtherTabs: (id: string) => void;
    onCloseRightTabs: (id: string) => void;
    onReloadTab: (id: string) => void;
  }

  let { tabs, activeTabId, onSelectTab, onCloseTab, onReorderTabs, onCloseOtherTabs, onCloseRightTabs, onReloadTab }: Props = $props();

  let dragging = $state(false);
  let dragFromIndex = $state(-1);
  let dropTargetIndex = $state(-1);
  let dropSide = $state<'left' | 'right'>('left');
  let didDrag = false;

  let tabBarEl = $state<HTMLDivElement>(null!);

  // Context menu state
  let ctxMenuVisible = $state(false);
  let ctxMenuX = $state(0);
  let ctxMenuY = $state(0);
  let ctxMenuTabId = $state('');

  function handleContextMenu(e: MouseEvent, tabId: string) {
    e.preventDefault();
    e.stopPropagation();
    ctxMenuTabId = tabId;
    ctxMenuX = e.clientX;
    ctxMenuY = e.clientY;
    ctxMenuVisible = true;
  }

  function closeCtxMenu() {
    ctxMenuVisible = false;
  }

  function ctxClose() {
    onCloseTab(ctxMenuTabId);
    closeCtxMenu();
  }

  function ctxCloseOthers() {
    onCloseOtherTabs(ctxMenuTabId);
    closeCtxMenu();
  }

  function ctxCloseRight() {
    onCloseRightTabs(ctxMenuTabId);
    closeCtxMenu();
  }

  function ctxReload() {
    onReloadTab(ctxMenuTabId);
    closeCtxMenu();
  }

  function handlePointerDown(e: PointerEvent, index: number) {
    if ((e.target as HTMLElement).closest('.tab-close')) return;
    if (e.button !== 0) return;

    const startX = e.clientX;
    dragFromIndex = index;
    didDrag = false;

    function onMove(me: PointerEvent) {
      if (!dragging && Math.abs(me.clientX - startX) > 4) {
        dragging = true;
        didDrag = true;
      }
      if (!dragging || !tabBarEl) return;

      const tabEls = tabBarEl.querySelectorAll<HTMLElement>('.tab');
      let found = false;
      for (let i = 0; i < tabEls.length; i++) {
        if (i === dragFromIndex) continue;
        const rect = tabEls[i].getBoundingClientRect();
        if (me.clientX >= rect.left && me.clientX <= rect.right) {
          const midX = rect.left + rect.width / 2;
          dropSide = me.clientX < midX ? 'left' : 'right';
          dropTargetIndex = i;
          found = true;
          break;
        }
      }
      if (!found) dropTargetIndex = -1;
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      if (dragging && dropTargetIndex >= 0 && dropTargetIndex !== dragFromIndex) {
        let toIdx = dropTargetIndex;
        if (dropSide === 'right') toIdx++;
        if (dragFromIndex < toIdx) toIdx--;
        if (toIdx !== dragFromIndex) {
          onReorderTabs(dragFromIndex, toIdx);
        }
      }
      dragging = false;
      dragFromIndex = -1;
      dropTargetIndex = -1;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleTabClick(tabId: string) {
    if (didDrag) {
      didDrag = false;
      return;
    }
    onSelectTab(tabId);
  }
</script>

{#if tabs.length > 0}
  <div class="tab-bar" bind:this={tabBarEl}>
    {#each tabs as tab, i (tab.id)}
      <button
        class="tab"
        class:active={tab.id === activeTabId}
        class:dragging={dragging && i === dragFromIndex}
        class:drop-left={dropTargetIndex === i && dropSide === 'left'}
        class:drop-right={dropTargetIndex === i && dropSide === 'right'}
        onclick={() => handleTabClick(tab.id)}
        title={tab.filePath}
        onpointerdown={(e: PointerEvent) => handlePointerDown(e, i)}
        oncontextmenu={(e: MouseEvent) => handleContextMenu(e, tab.id)}
      >
        <span class="tab-name">{tab.fileName}</span>
        <span
          class="tab-close"
          role="button"
          tabindex="-1"
          onclick={(e: MouseEvent) => { e.stopPropagation(); onCloseTab(tab.id); }}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); onCloseTab(tab.id); } }}
          title="关闭"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M9.35 3.35l-.7-.7L6 5.29 3.35 2.65l-.7.7L5.29 6 2.65 8.65l.7.7L6 6.71l2.65 2.64.7-.7L6.71 6z"/>
          </svg>
        </span>
      </button>
    {/each}
  </div>
{/if}

{#if ctxMenuVisible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="ctx-overlay" onclick={closeCtxMenu} oncontextmenu={(e) => { e.preventDefault(); closeCtxMenu(); }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="ctx-menu" style="left:{ctxMenuX}px;top:{ctxMenuY}px" onclick={(e) => e.stopPropagation()}>
      <button class="ctx-item" onclick={ctxReload}>重新加载</button>
      <div class="ctx-separator"></div>
      <button class="ctx-item" onclick={ctxClose}>关闭</button>
      <button class="ctx-item" onclick={ctxCloseOthers}>关闭其他标签页</button>
      <button class="ctx-item" onclick={ctxCloseRight}>关闭右侧标签页</button>
    </div>
  </div>
{/if}

<style>
  .tab-bar {
    display: flex;
    align-items: stretch;
    height: 34px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-user-select: none;
    user-select: none;
  }

  .tab-bar::-webkit-scrollbar {
    height: 2px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    min-width: 80px;
    max-width: 200px;
    cursor: pointer;
    border: none;
    border-right: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 12px;
    position: relative;
    flex-shrink: 0;
    font-family: inherit;
  }

  .tab:hover {
    background: var(--hover-bg);
  }

  .tab.active {
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent-color);
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 3px;
    cursor: pointer;
    padding: 0;
    opacity: 0;
    flex-shrink: 0;
  }

  .tab:hover .tab-close,
  .tab.active .tab-close {
    opacity: 0.6;
  }

  .tab-close:hover {
    opacity: 1 !important;
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .tab.dragging {
    opacity: 0.4;
    cursor: grabbing;
  }

  .tab.drop-left {
    box-shadow: inset 3px 0 0 var(--accent-color);
  }

  .tab.drop-right {
    box-shadow: inset -3px 0 0 var(--accent-color);
  }

  .ctx-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
  }

  .ctx-menu {
    position: fixed;
    min-width: 180px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 4px 0;
    z-index: 1001;
  }

  .ctx-item {
    display: block;
    width: 100%;
    padding: 6px 16px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }

  .ctx-item:hover {
    background: var(--accent-color);
    color: #fff;
  }

  .ctx-separator {
    height: 1px;
    margin: 4px 8px;
    background: var(--border-color);
  }
</style>
