import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import { full as emoji } from 'markdown-it-emoji';
import frontMatter from 'markdown-it-front-matter';
import anchor from 'markdown-it-anchor';
import texmath from 'markdown-it-texmath';
import katex from 'katex';

let frontMatterData = '';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
});

// GFM extensions
md.use(taskLists, { enabled: false, label: true });
md.use(footnote);
md.use(emoji);
md.use(frontMatter, (fm: string) => {
  frontMatterData = fm;
});

// Heading anchors
md.use(anchor, {
  permalink: false,
  slugify: (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
});

// Math (KaTeX)
md.use(texmath, {
  engine: katex,
  delimiters: 'dollars',
});

// GitHub-style alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
const alertTypes = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];
const alertIcons: Record<string, string> = {
  NOTE: '&#8505;&#65039;',
  TIP: '&#128161;',
  IMPORTANT: '&#10071;',
  WARNING: '&#9888;&#65039;',
  CAUTION: '&#128721;',
};

// Custom blockquote processing for GitHub alerts
const defaultBlockquoteOpen =
  md.renderer.rules.blockquote_open ||
  ((tokens: any, idx: any, options: any, env: any, self: any) =>
    self.renderToken(tokens, idx, options));
const defaultBlockquoteClose =
  md.renderer.rules.blockquote_close ||
  ((tokens: any, idx: any, options: any, env: any, self: any) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
  // Look ahead for [!TYPE] pattern in the first inline content
  for (let i = idx + 1; i < tokens.length; i++) {
    if (tokens[i].type === 'inline' && tokens[i].content) {
      const match = tokens[i].content.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/
      );
      if (match) {
        const type = match[1];
        const label = type.charAt(0) + type.slice(1).toLowerCase();
        // Remove the [!TYPE] prefix from content
        tokens[i].content = tokens[i].content.replace(
          /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/,
          ''
        );
        if (tokens[i].children) {
          // Also clean children tokens
          let removed = 0;
          tokens[i].children = tokens[i].children!.filter((child: any) => {
            if (removed === 0 && child.type === 'text' && child.content) {
              child.content = child.content.replace(
                /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/,
                ''
              );
              removed = 1;
            }
            return true;
          });
        }
        return `<blockquote class="markdown-alert markdown-alert-${type.toLowerCase()}"><p class="markdown-alert-title">${alertIcons[type]} ${label}</p>\n`;
      }
      break;
    }
    if (tokens[i].type === 'blockquote_close') break;
  }
  return defaultBlockquoteOpen(tokens, idx, options, env, self);
};

// Mermaid code block detection
const defaultFence =
  md.renderer.rules.fence ||
  ((tokens: any, idx: any, options: any, env: any, self: any) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const lang = token.info.trim().toLowerCase();
  if (lang === 'mermaid') {
    const escaped = md.utils.escapeHtml(token.content);
    return `<div class="mermaid-container"><div class="mermaid">${escaped}</div></div>\n`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export interface RenderResult {
  html: string;
  frontMatter: string;
  hasMermaid: boolean;
}

export function renderMarkdown(source: string): RenderResult {
  frontMatterData = '';
  const hasMermaid = /```mermaid/i.test(source);
  const html = md.render(source);
  return {
    html,
    frontMatter: frontMatterData,
    hasMermaid,
  };
}

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

export function extractToc(source: string): TocItem[] {
  const tokens = md.parse(source, {});
  const toc: TocItem[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'heading_open') {
      const level = parseInt(tokens[i].tag.slice(1), 10);
      const inline = tokens[i + 1];
      if (inline && inline.type === 'inline') {
        const text = inline.content;
        const id = text
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '');
        toc.push({ level, text, id });
      }
    }
  }
  return toc;
}
