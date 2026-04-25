/**
 * Minimal browser-native DOCX generator.
 * Converts rendered HTML (from .markdown-body) into a valid .docx file
 * using JSZip — no Node.js globals required.
 */
import JSZip from 'jszip';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Image handling ────────────────────────────────────────────────────────────

interface ImageData {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

// Module-level registry reset at the start of each export (browser is single-threaded)
let _images: ImageData[] = [];

async function svgToPng(svgString: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Parse SVG dimensions
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;
    let w = parseFloat(svgEl.getAttribute('width') ?? '0');
    let h = parseFloat(svgEl.getAttribute('height') ?? '0');
    if (!w || !h) {
      const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
      if (vb?.length === 4) { w = vb[2]; h = vb[3]; }
    }
    w = Math.round(w) || 600;
    h = Math.round(h) || 400;

    const encoded = btoa(unescape(encodeURIComponent(svgString)));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('canvas.toBlob failed')); return; }
        blob.arrayBuffer().then(ab => {
          resolve({ bytes: new Uint8Array(ab), widthPx: w, heightPx: h });
        }).catch(reject);
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('SVG load error'));
    img.src = `data:image/svg+xml;base64,${encoded}`;
  });
}

function buildImageXml(idx: number, widthPx: number, heightPx: number): string {
  // Scale to fit 6-inch page width max (6" * 914400 EMU/inch = 5486400)
  const maxWidthEmu = 5486400;
  const px2emu = 9525;
  let cx = widthPx * px2emu;
  let cy = heightPx * px2emu;
  if (cx > maxWidthEmu) {
    cy = Math.round(cy * (maxWidthEmu / cx));
    cx = maxWidthEmu;
  }
  const relId = `rId${idx + 2}`;
  const imgName = `image${idx + 1}.png`;
  return (
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>` +
    `<w:r><w:drawing>` +
    `<wp:inline>` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${idx + 1}" name="${imgName}"/>` +
    `<wp:cNvGraphicFramePr/>` +
    `<a:graphic>` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic>` +
    `<pic:nvPicPr>` +
    `<pic:cNvPr id="${idx + 1}" name="${imgName}"/>` +
    `<pic:cNvPicPr/>` +
    `</pic:nvPicPr>` +
    `<pic:blipFill>` +
    `<a:blip r:embed="${relId}"/>` +
    `<a:stretch><a:fillRect/></a:stretch>` +
    `</pic:blipFill>` +
    `<pic:spPr>` +
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `</pic:spPr>` +
    `</pic:pic>` +
    `</a:graphicData>` +
    `</a:graphic>` +
    `</wp:inline></w:drawing></w:r></w:p>`
  );
}

// ── Inline elements → w:r runs ───────────────────────────────────────────────

interface RunProps {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
}

function inlineToRuns(node: Node, rp: RunProps = {}): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!text) return '';
    const pr = [
      rp.bold   ? '<w:b/><w:bCs/>' : '',
      rp.italic ? '<w:i/><w:iCs/>' : '',
      rp.code   ? '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>' : '',
      rp.strike ? '<w:strike/>' : '',
    ].join('');
    return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') return '<w:r><w:br/></w:r>';

  const next: RunProps = { ...rp };
  if (tag === 'strong' || tag === 'b') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italic = true;
  if (tag === 'code') next.code = true;
  if (tag === 'del' || tag === 's') next.strike = true;

  return Array.from(el.childNodes).map(n => inlineToRuns(n, next)).join('');
}

// ── Block elements → <w:p> / <w:tbl> ─────────────────────────────────────────

function blockToXml(el: Element, listLevel = 0): string {
  const tag = el.tagName.toLowerCase();

  // Headings
  const hMatch = tag.match(/^h([1-6])$/);
  if (hMatch) {
    const lvl = hMatch[1];
    const sz: Record<string, string> = { '1':'48','2':'36','3':'28','4':'24','5':'22','6':'20' };
    const sp: Record<string, string> = { '1':'400','2':'320','3':'280','4':'240','5':'200','6':'160' };
    const runs = Array.from(el.childNodes).map(n => inlineToRuns(n, { bold: true })).join('');
    return (
      `<w:p>` +
        `<w:pPr><w:pStyle w:val="Heading${lvl}"/>` +
          `<w:spacing w:before="${sp[lvl]}" w:after="120"/>` +
        `</w:pPr>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="${sz[lvl]}"/><w:szCs w:val="${sz[lvl]}"/></w:rPr>` +
          `<w:t xml:space="preserve">${escapeXml(el.textContent ?? '')}</w:t></w:r>` +
      `</w:p>`
    );
  }

  // Paragraph
  if (tag === 'p') {
    const runs = Array.from(el.childNodes).map(n => inlineToRuns(n)).join('');
    return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>${runs}</w:p>`;
  }

  // Code block
  if (tag === 'pre') {
    const codeEl = el.querySelector('code');
    const text = codeEl?.textContent ?? el.textContent ?? '';
    const lines = text.split('\n');
    if (lines.at(-1) === '') lines.pop();
    return lines.map(line =>
      `<w:p>` +
        `<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F5F5F5"/><w:spacing w:after="0"/></w:pPr>` +
        `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="18"/></w:rPr>` +
          `<w:t xml:space="preserve">${escapeXml(line || ' ')}</w:t></w:r>` +
      `</w:p>`
    ).join('\n');
  }

  // Blockquote
  if (tag === 'blockquote') {
    return Array.from(el.children).map(child => {
      const runs = Array.from(child.childNodes).map(n => inlineToRuns(n)).join('');
      return (
        `<w:p>` +
          `<w:pPr><w:ind w:left="720"/><w:spacing w:after="120"/></w:pPr>` +
          `<w:r><w:rPr><w:color w:val="777777"/><w:i/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` +
          runs +
        `</w:p>`
      );
    }).join('\n');
  }

  // Horizontal rule
  if (tag === 'hr') {
    return (
      `<w:p><w:pPr><w:pBdr>` +
        `<w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/>` +
      `</w:pBdr></w:pPr></w:p>`
    );
  }

  // Lists
  if (tag === 'ul' || tag === 'ol') {
    const type = tag === 'ol' ? 'ordered' : 'bullet';
    return Array.from(el.children)
      .map((li, idx) => listItemToXml(li as Element, listLevel, type, idx + 1))
      .join('\n');
  }

  // Table
  if (tag === 'table') return tableToXml(el);

  // Div / section — recurse children; handle mermaid markers
  if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main') {
    // Mermaid placeholder injected during pre-processing
    const imgIdx = el.getAttribute('data-docx-img');
    if (imgIdx !== null) {
      const idx = parseInt(imgIdx);
      const imgData = _images[idx];
      return imgData ? buildImageXml(idx, imgData.widthPx, imgData.heightPx) : '';
    }
    return Array.from(el.children).map(c => blockToXml(c as Element)).join('\n');
  }

  // Fallback: render inline content as paragraph
  const runs = Array.from(el.childNodes).map(n => inlineToRuns(n)).join('');
  return runs ? `<w:p>${runs}</w:p>` : '';
}

function listItemToXml(li: Element, level: number, type: string, idx: number): string {
  const indent = 720 * (level + 1);
  const nestedLists = Array.from(li.children).filter(c =>
    c.tagName.toLowerCase() === 'ul' || c.tagName.toLowerCase() === 'ol'
  );
  const textNodes = Array.from(li.childNodes).filter(n => {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const t = (n as Element).tagName.toLowerCase();
      return t !== 'ul' && t !== 'ol';
    }
    return true;
  });

  const bullet = type === 'bullet' ? '•' : `${idx}.`;
  const runs = textNodes.map(n => inlineToRuns(n)).join('');
  let xml =
    `<w:p>` +
      `<w:pPr><w:ind w:left="${indent}" w:hanging="360"/><w:spacing w:after="60"/></w:pPr>` +
      `<w:r><w:t xml:space="preserve">${escapeXml(bullet)}  </w:t></w:r>` +
      runs +
    `</w:p>`;

  for (const nested of nestedLists) {
    const nt = nested.tagName.toLowerCase() === 'ol' ? 'ordered' : 'bullet';
    xml += Array.from(nested.children)
      .map((c, i) => listItemToXml(c as Element, level + 1, nt, i + 1))
      .join('\n');
  }
  return xml;
}

function tableToXml(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (!rows.length) return '';

  const rowsXml = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    const cellsXml = cells.map(cell => {
      const isHeader = cell.tagName.toLowerCase() === 'th';
      const runs = Array.from(cell.childNodes).map(n => inlineToRuns(n, { bold: isHeader })).join('');
      return (
        `<w:tc>` +
          `<w:tcPr>${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/>' : ''}</w:tcPr>` +
          `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${runs || '<w:r><w:t> </w:t></w:r>'}</w:p>` +
        `</w:tc>`
      );
    }).join('');
    return `<w:tr>${cellsXml}</w:tr>`;
  }).join('\n');

  return (
    `<w:tbl>` +
      `<w:tblPr>` +
        `<w:tblW w:w="0" w:type="auto"/>` +
        `<w:tblBorders>` +
          `<w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
          `<w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
          `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
          `<w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
          `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
          `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
        `</w:tblBorders>` +
        `<w:tblCellMar>` +
          `<w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>` +
          `<w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/>` +
        `</w:tblCellMar>` +
      `</w:tblPr>` +
      rowsXml +
    `</w:tbl><w:p/>`
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Converts rendered HTML content to a .docx Uint8Array.
 * Pure browser API — no Node.js globals needed.
 */
export async function htmlToDocxBytes(htmlContent: string): Promise<Uint8Array> {
  _images = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Pre-process: replace mermaid containers with image markers
  const containers = Array.from(doc.querySelectorAll('.mermaid-container'));
  for (const container of containers) {
    const svgEl = container.querySelector('.mermaid svg') ?? container.querySelector('svg');
    if (svgEl) {
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      try {
        const pngData = await svgToPng(svgStr);
        const idx = _images.length;
        _images.push(pngData);
        const marker = doc.createElement('div');
        marker.setAttribute('data-docx-img', String(idx));
        container.replaceWith(marker);
      } catch {
        const p = doc.createElement('p');
        p.textContent = '[Mermaid Diagram]';
        container.replaceWith(p);
      }
    } else {
      // Not yet rendered — add text placeholder
      const p = doc.createElement('p');
      p.textContent = '[Mermaid Diagram]';
      container.replaceWith(p);
    }
  }

  const bodyXml = Array.from(doc.body.children)
    .map(el => blockToXml(el as Element))
    .filter(Boolean)
    .join('\n    ');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"
               w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>${_images.length > 0 ? '\n  <Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

  const imageRels = _images.map((_, i) =>
    `  <Relationship Id="rId${i + 2}" ` +
    `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
    `Target="media/image${i + 1}.png"/>`
  ).join('\n');
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRels ? '\n' + imageRels : ''}
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.folder('_rels')!.file('.rels', relsXml);
  const wordFolder = zip.folder('word')!;
  wordFolder.file('document.xml', documentXml);
  wordFolder.folder('_rels')!.file('document.xml.rels', docRelsXml);
  if (_images.length > 0) {
    const mediaFolder = wordFolder.folder('media')!;
    for (let i = 0; i < _images.length; i++) {
      mediaFolder.file(`image${i + 1}.png`, _images[i].bytes);
    }
  }

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new Uint8Array(arrayBuffer);
}
