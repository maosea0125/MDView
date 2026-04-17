export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;
export const BASE_FONT_SIZE = 16;
export const DEFAULT_ZOOM = 1.0;
export const ZOOM_STORAGE_KEY = 'md-view-zoom';

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));
}

export function loadSavedZoom(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_ZOOM;
  const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
  if (!saved) return DEFAULT_ZOOM;
  const parsed = parseFloat(saved);
  return isNaN(parsed) ? DEFAULT_ZOOM : clampZoom(parsed);
}
