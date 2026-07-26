/**
 * LaTeX → self-contained SVG via MathJax's browser bundle (es5/tex-svg.js).
 * The bundle is a webpack IIFE that installs a global `MathJax` object —
 * unlike the mathjax-full/js/* source modules, it has no CommonJS `require`
 * calls and runs fine inside WKWebView.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let _mathjaxReady: Promise<any> | null = null;

function loadMathJax(): Promise<any> {
  if (!_mathjaxReady) {
    // Config must exist before the bundle evaluates
    (window as any).MathJax = {
      startup: { typeset: false },
      svg: { fontCache: 'local' },
    };
    _mathjaxReady = import('mathjax-full/es5/tex-svg.js')
      .then(() => (window as any).MathJax.startup.promise)
      .then(() => (window as any).MathJax);
  }
  return _mathjaxReady;
}

export interface MathSvg {
  svg: string;
  widthPx: number;
  heightPx: number;
}

/**
 * Renders LaTeX to an SVG string with concrete pixel dimensions
 * (2× for crisp rasterization) and black glyphs.
 */
export async function latexToSvg(latex: string, display: boolean): Promise<MathSvg> {
  const MathJax = await loadMathJax();
  const container: HTMLElement = MathJax.tex2svg(latex, { display });
  const svgEl = container.querySelector('svg');
  if (!svgEl) throw new Error('MathJax produced no SVG');

  // MathJax sizes in ex units; 1ex ≈ 8px at default 16px font, ×2 for sharpness
  const exToPx = 16;
  const widthPx = Math.max(1, Math.ceil(parseFloat(svgEl.getAttribute('width') ?? '10') * exToPx));
  const heightPx = Math.max(1, Math.ceil(parseFloat(svgEl.getAttribute('height') ?? '3') * exToPx));

  const clone = svgEl.cloneNode(true) as SVGElement;
  clone.setAttribute('width', String(widthPx));
  clone.setAttribute('height', String(heightPx));
  clone.setAttribute('color', '#000000');

  return { svg: new XMLSerializer().serializeToString(clone), widthPx, heightPx };
}
