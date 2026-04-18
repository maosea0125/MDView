<script lang="ts">
  import morphdom from 'morphdom';
  import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, BASE_FONT_SIZE } from '$lib/zoom';

  interface Props {
    html: string;
    hasMermaid: boolean;
    zoom: number;
    onZoomChange: (zoom: number) => void;
  }

  let { html, hasMermaid, zoom, onZoomChange }: Props = $props();
  let previewEl: HTMLDivElement;
  let wrapperEl: HTMLDivElement;
  let mermaidLoaded = false;

  // Modal state
  let modalVisible = $state(false);
  let modalSvgHtml = $state('');
  let modalScale = $state(1);
  let modalPanX = $state(0);
  let modalPanY = $state(0);
  let isPanning = $state(false);
  let panStartX = 0;
  let panStartY = 0;

  function updateDOM(newHtml: string) {
    if (!previewEl) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = newHtml;
    morphdom(previewEl, wrapper, {
      childrenOnly: true,
      onBeforeElUpdated: (fromEl, toEl) => {
        if (fromEl.classList.contains('mermaid') && fromEl.hasAttribute('data-processed')) {
          return false;
        }
        // Preserve mermaid containers that already have magnify buttons
        if (fromEl.classList.contains('mermaid-container') && fromEl.querySelector('.mermaid-magnify-btn')) {
          return false;
        }
        return true;
      },
    });
  }

  async function renderMermaid() {
    if (!hasMermaid) return;
    if (!mermaidLoaded) {
      const mermaid = await import('mermaid');
      mermaid.default.initialize({
        startOnLoad: false,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      });
      mermaidLoaded = true;
    }
    const mermaid = await import('mermaid');
    mermaid.default.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    });
    try {
      await mermaid.default.run({ querySelector: '.mermaid:not([data-processed])' });
    } catch {
      // Mermaid syntax errors are expected for incomplete diagrams
    }
    addMagnifyButtons();
  }

  function addMagnifyButtons() {
    if (!previewEl) return;
    const containers = previewEl.querySelectorAll('.mermaid-container');
    containers.forEach((container) => {
      if (container.querySelector('.mermaid-magnify-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'mermaid-magnify-btn';
      btn.title = '放大查看';
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="7" cy="7" r="5.5"/>
        <line x1="11" y1="11" x2="14.5" y2="14.5"/>
        <line x1="5" y1="7" x2="9" y2="7"/>
        <line x1="7" y1="5" x2="7" y2="9"/>
      </svg>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mermaidEl = container.querySelector('.mermaid');
        if (mermaidEl) {
          openModal(mermaidEl.innerHTML);
        }
      });
      container.appendChild(btn);
    });
  }

  function openModal(svgContent: string) {
    modalSvgHtml = svgContent;
    modalPanX = 0;
    modalPanY = 0;
    // Auto-fit: calculate initial scale to fit the SVG within the modal
    modalScale = 1;
    requestAnimationFrame(() => {
      const contentEl = document.querySelector('.mermaid-modal-content');
      const svgEl = document.querySelector('.mermaid-modal-svg svg') as SVGSVGElement;
      if (contentEl && svgEl) {
        const containerRect = contentEl.getBoundingClientRect();
        const svgW = svgEl.width?.baseVal?.value || svgEl.viewBox?.baseVal?.width || svgEl.getBoundingClientRect().width;
        const svgH = svgEl.height?.baseVal?.value || svgEl.viewBox?.baseVal?.height || svgEl.getBoundingClientRect().height;
        if (svgW > 0 && svgH > 0) {
          const padding = 40;
          const fitScale = Math.min(
            (containerRect.width - padding) / svgW,
            (containerRect.height - padding) / svgH
          );
          // Use fit scale but at least 1x
          modalScale = Math.round(Math.max(1, fitScale) * 100) / 100;
        }
      }
    });
    modalVisible = true;
  }

  function closeModal() {
    modalVisible = false;
    modalSvgHtml = '';
  }

  function modalZoomIn() {
    modalScale = Math.min(15, Math.round((modalScale + 0.25) * 100) / 100);
  }

  function modalZoomOut() {
    modalScale = Math.max(0.2, Math.round((modalScale - 0.25) * 100) / 100);
  }

  function modalZoomReset() {
    modalScale = 1;
    modalPanX = 0;
    modalPanY = 0;
  }

  function handleModalWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    modalScale = Math.min(15, Math.max(0.2, Math.round((modalScale + delta) * 100) / 100));
  }

  function handleModalPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isPanning = true;
    panStartX = e.clientX - modalPanX;
    panStartY = e.clientY - modalPanY;
  }

  function handleModalPointerMove(e: PointerEvent) {
    if (!isPanning) return;
    modalPanX = e.clientX - panStartX;
    modalPanY = e.clientY - panStartY;
  }

  function handleModalPointerUp() {
    isPanning = false;
  }

  function handleModalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
  }

  $effect(() => {
    if (html && previewEl) {
      updateDOM(html);
      if (hasMermaid) {
        requestAnimationFrame(() => renderMermaid());
      }
    }
  });

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((zoom + delta) * 10) / 10));
      onZoomChange(newZoom);
    }
  }
</script>

<svelte:window onkeydown={handleModalKeydown} />

<div class="preview-wrapper" bind:this={wrapperEl} onwheel={handleWheel}>
  <article class="markdown-body" bind:this={previewEl} style="font-size: {zoom * BASE_FONT_SIZE}px">
    <!-- Content injected via morphdom -->
  </article>
</div>

{#if modalVisible}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="mermaid-modal-overlay" onclick={closeModal}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="mermaid-modal" onclick={(e) => e.stopPropagation()}>
      <div class="mermaid-modal-toolbar">
        <button class="modal-zoom-btn" onclick={modalZoomOut} title="缩小">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="7" cy="7" r="5.5"/><line x1="11" y1="11" x2="14.5" y2="14.5"/>
            <line x1="5" y1="7" x2="9" y2="7"/>
          </svg>
        </button>
        <span class="modal-zoom-level">{Math.round(modalScale * 100)}%</span>
        <button class="modal-zoom-btn" onclick={modalZoomIn} title="放大">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="7" cy="7" r="5.5"/><line x1="11" y1="11" x2="14.5" y2="14.5"/>
            <line x1="5" y1="7" x2="9" y2="7"/><line x1="7" y1="5" x2="7" y2="9"/>
          </svg>
        </button>
        <button class="modal-zoom-btn" onclick={modalZoomReset} title="重置">⟳</button>
        <div style="flex:1"></div>
        <button class="modal-zoom-btn modal-close-btn" onclick={closeModal} title="关闭">✕</button>
      </div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="mermaid-modal-content"
        onwheel={handleModalWheel}
        onpointerdown={handleModalPointerDown}
        onpointermove={handleModalPointerMove}
        onpointerup={handleModalPointerUp}
        style="cursor: {isPanning ? 'grabbing' : 'grab'}"
      >
        <div
          class="mermaid-modal-svg"
          style="transform: translate({modalPanX}px, {modalPanY}px) scale({modalScale})"
        >
          {@html modalSvgHtml}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .preview-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .markdown-body {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 16px 48px;
  }

  :global(.mermaid-container) {
    position: relative;
    display: flex;
    justify-content: center;
    margin: 16px 0;
    overflow-x: auto;
  }

  :global(.mermaid-magnify-btn) {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color, #ddd);
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-secondary, #666);
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 5;
    padding: 0;
  }

  :global(.mermaid-container:hover .mermaid-magnify-btn) {
    opacity: 1;
  }

  :global(.mermaid-magnify-btn:hover) {
    background: var(--hover-bg, #e0e0e0);
    color: var(--text-primary, #333);
  }

  .mermaid-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mermaid-modal {
    width: 90vw;
    height: 85vh;
    background: var(--bg-primary, #fff);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .mermaid-modal-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color, #ddd);
    background: var(--bg-secondary, #f5f5f5);
    user-select: none;
  }

  .modal-zoom-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color, #ddd);
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #333);
    font-size: 14px;
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
  }

  .modal-zoom-btn:hover {
    background: var(--hover-bg, #e0e0e0);
  }

  .modal-close-btn {
    font-size: 16px;
    color: var(--text-secondary, #666);
  }

  .modal-close-btn:hover {
    color: var(--text-primary, #333);
    background: #f0a0a0;
  }

  .modal-zoom-level {
    font-size: 12px;
    color: var(--text-secondary, #666);
    min-width: 40px;
    text-align: center;
  }

  .mermaid-modal-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mermaid-modal-svg {
    transform-origin: center center;
    transition: transform 0.05s ease-out;
  }

  :global(.mermaid-modal-svg svg) {
    max-width: none !important;
    max-height: none !important;
  }
</style>
