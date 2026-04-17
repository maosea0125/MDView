<script lang="ts">
  import type { TocItem } from '$lib/markdown/engine';

  interface Props {
    items: TocItem[];
    visible: boolean;
  }

  let { items, visible }: Props = $props();

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

{#if visible && items.length > 0}
  <aside class="toc-sidebar">
    <div class="toc-title">Table of Contents</div>
    <nav class="toc-nav">
      {#each items as item}
        <button
          class="toc-item toc-level-{item.level}"
          onclick={() => scrollTo(item.id)}
        >
          {item.text}
        </button>
      {/each}
    </nav>
  </aside>
{/if}

<style>
  .toc-sidebar {
    width: 240px;
    min-width: 200px;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    padding: 16px 0;
    background: var(--sidebar-bg);
  }

  .toc-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    padding: 0 16px 8px;
  }

  .toc-nav {
    display: flex;
    flex-direction: column;
  }

  .toc-item {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 4px 16px;
    cursor: pointer;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .toc-item:hover {
    color: var(--text-primary);
    background: var(--hover-bg);
  }

  .toc-level-2 { padding-left: 16px; }
  .toc-level-3 { padding-left: 32px; }
  .toc-level-4 { padding-left: 48px; }
  .toc-level-5 { padding-left: 64px; }
  .toc-level-6 { padding-left: 80px; }
</style>
