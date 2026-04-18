import type { TocItem, RenderResult } from '$lib/markdown/engine';

export interface Tab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  rendered: RenderResult;
  tocItems: TocItem[];
  tocVisible: boolean;
  zoom: number;
  scrollTop: number;
}
