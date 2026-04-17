<script lang="ts">
  import morphdom from 'morphdom';
  import { onMount } from 'svelte';

  interface Props {
    html: string;
    hasMermaid: boolean;
  }

  let { html, hasMermaid }: Props = $props();
  let previewEl: HTMLDivElement;
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
</script>

<div class="preview-wrapper">
  <article class="markdown-body" bind:this={previewEl}>
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
