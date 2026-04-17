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

  function updateDOM(newHtml: string) {
    if (!previewEl) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = newHtml;
    morphdom(previewEl, wrapper, {
      childrenOnly: true,
      onBeforeElUpdated: (fromEl, toEl) => {
        // Skip mermaid elements that are already rendered
        if (fromEl.classList.contains('mermaid') && fromEl.hasAttribute('data-processed')) {
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
    // Re-initialize with current theme
    mermaid.default.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    });
    try {
      await mermaid.default.run({ querySelector: '.mermaid:not([data-processed])' });
    } catch {
      // Mermaid syntax errors are expected for incomplete diagrams
    }
  }

  $effect(() => {
    if (html && previewEl) {
      updateDOM(html);
      if (hasMermaid) {
        // Delay to let DOM update
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

<div class="preview-wrapper" bind:this={wrapperEl} onwheel={handleWheel}>
  <article class="markdown-body" bind:this={previewEl} style="font-size: {zoom * BASE_FONT_SIZE}px">
    <!-- Content injected via morphdom -->
  </article>
</div>

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
    display: flex;
    justify-content: center;
    margin: 16px 0;
    overflow-x: auto;
  }
</style>
