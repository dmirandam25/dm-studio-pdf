/* DM Studio · PDF — Crear y convertir.
   PDF → Word, Excel, PowerPoint, imágenes, texto, HTML · Word/Excel/PowerPoint/HTML/texto → PDF ·
   Comprimir de verdad (recodifica las imágenes y conserva el texto). Todo en el navegador. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const { PDFName, PDFArray, PDFRawStream, PDFNumber, PDFDict, PDFRef } = PDFLib;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
  const enc = new TextEncoder(), dec = new TextDecoder();
  const baseName = () => (S.name || 'documento').replace(/[\\/:*?"<>|]+/g, '_');
  const progress = (msg) => toast(msg, 120000);
  const done = (msg) => { $('#toast').classList.add('hidden'); if (msg) toast(msg, 3500); };

  // ======================= ZIP (escritura y lectura) =======================
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function deflateRaw(bytes) { const cs = new CompressionStream('deflate-raw'); return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer()); }
  async function inflate(bytes, fmt = 'deflate-raw') { const ds = new DecompressionStream(fmt); return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer()); }
  FX.inflate = inflate;
  async function zip(files) { // files: [{name, data: Uint8Array|string}]
    const parts = [], central = []; let off = 0;
    for (const f of files) {
      const raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data, name = enc.encode(f.name), crc = crc32(raw);
      let data = raw, method = 0;
      if (!/\.(png|jpe?g)$/i.test(f.name) && raw.length > 64) { try { const z = await deflateRaw(raw); if (z.length < raw.length) { data = z; method = 8; } } catch { } }
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, method, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, raw.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, method, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, raw.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const csize = central.reduce((n, p) => n + p.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Uint8Array(await new Blob([...parts, ...central, new Uint8Array(e.buffer)]).arrayBuffer());
  }
  async function unzip(bytes) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let e = bytes.length - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('El archivo no es un documento de Office válido');
    const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true); const out = {};
    for (let i = 0; i < n; i++) {
      const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      const name = dec.decode(bytes.subarray(p + 46, p + 46 + nl));
      const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), data = bytes.subarray(ds, ds + csize);
      out[name] = method === 8 ? await inflate(data) : data.slice();
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  const xmlOf = (z, path) => (z[path] ? new DOMParser().parseFromString(dec.decode(z[path]), 'application/xml') : null);
  const kids = (el, name) => (el ? [...el.children].filter(c => c.localName === name) : []);
  const kid = (el, name) => kids(el, name)[0] || null;
  const deep = (el, name) => (el ? [...el.getElementsByTagName('*')].filter(c => c.localName === name) : []);
  const at = (el, name) => (el ? el.getAttribute(name) ?? el.getAttribute(name.replace(/^\w+:/, '')) ?? [...el.attributes].find(a => a.localName === name.replace(/^\w+:/, ''))?.value ?? null : null);
  function rels(z, path) {
    const d = xmlOf(z, path), m = {}; if (!d) return m;
    const dir = path.replace(/_rels\/[^/]+$/, '');
    for (const r of deep(d.documentElement, 'Relationship')) {
      let t = r.getAttribute('Target'); if (r.getAttribute('TargetMode') === 'External') { m[r.getAttribute('Id')] = { ext: t, type: r.getAttribute('Type') }; continue; }
      t = t.startsWith('/') ? t.slice(1) : normPath(dir + t);
      m[r.getAttribute('Id')] = { path: t, type: r.getAttribute('Type') };
    }
    return m;
  }
  const normPath = p => { const out = []; for (const s of p.split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); } return out.join('/'); };
  const mimeOf = n => (/\.png$/i.test(n) ? 'image/png' : /\.jpe?g$/i.test(n) ? 'image/jpeg' : /\.gif$/i.test(n) ? 'image/gif' : /\.bmp$/i.test(n) ? 'image/bmp' : /\.webp$/i.test(n) ? 'image/webp' : /\.svg$/i.test(n) ? 'image/svg+xml' : '');

  // ======================= utilidades de lectura del PDF =======================
  async function pageLines(pg) { try { return await getLines(pg); } catch { return []; } }
  function paragraphsOf(lines) {
    let left = [...lines].sort((a, b) => a.base - b.base || a.x1 - b.x1); const paras = [];
    while (left.length) { const { lines: pl } = FX.findParagraph(left, left[0]); paras.push(pl); left = left.filter(l => !pl.includes(l)); }
    return paras.sort((a, b) => a[0].top - b[0].top || a[0].x1 - b[0].x1);
  }
  async function canvasBytes(c, type = 'image/png', q = 0.9) { const b = await new Promise(r => c.toBlob(r, type, q)); return new Uint8Array(await b.arrayBuffer()); }
  async function renderPageCanvas(pg, scale) {
    const g = geom(pg), p = await src(pg.src).pdf.getPage(pg.idx + 1), vp = p.getViewport({ scale, rotation: g.R });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: ctx, viewport: vp, optionalContentConfigPromise: src(pg.src).occ || undefined }).promise;
    const ov = await annotsToCanvasImage(pg, g, c.width, c.height); if (ov) ctx.drawImage(ov, 0, 0, c.width, c.height);
    return c;
  }
  FX.renderPageCanvas = renderPageCanvas;
  const famOffice = f => (f === 'Times' ? 'Times New Roman' : f === 'Courier' ? 'Courier New' : f?.startsWith('F:') ? (S.fonts.find(x => 'F:' + x.key === f)?.name || 'Arial') : 'Arial');
  const isCentered = (pl, g) => { const x1 = Math.min(...pl.map(l => l.x1)), x2 = Math.max(...pl.map(l => l.x2)); return x1 > g.dw * 0.15 && Math.abs((x1 + x2) / 2 - g.dw / 2) < g.dw * 0.04; };
  // texto de las ediciones de Folio (anotaciones de texto) para incluirlo en las conversiones
  const annotLines = pg => pg.annots.filter(a => (a.type === 'text' || a.type === 'textedit') && a.text).map(a => {
    const x = a.type === 'text' ? a.ax : a.tx, base = a.type === 'text' ? a.ay + a.fs : a.ty;
    return a.text.split('\n').map((t, i) => ({ str: t, x1: x, x2: x + textWidth(t, a.fs, a), base: base + i * (a.lh || a.fs * 1.2), top: base + i * (a.lh || a.fs * 1.2) - a.fs * 0.8, bottom: base + i * (a.lh || a.fs * 1.2) + a.fs * 0.2, fs: a.fs, family: a.family || 'Helvetica', bold: a.bold, italic: a.italic }));
  }).flat().filter(l => l.str.trim());
  async function allLines(pg) {
    const covers = pg.annots.filter(a => a.type === 'textedit' || a.type === 'cover' || a.type === 'redact');
    const own = (await pageLines(pg)).filter(l => !covers.some(a => !a.real && insideBox({ x: (l.x1 + l.x2) / 2, y: (l.top + l.bottom) / 2 }, a)));
    return [...own, ...annotLines(pg)];
  }

  // ======================= PDF → Word (.docx) =======================
  async function toDocx() {
    const body = [], media = []; let first = null;
    for (let i = 0; i < S.pages.length; i++) {
      const pg = S.pages[i], g = geom(pg); first = first || g;
      progress(`Convirtiendo a Word: página ${i + 1} de ${S.pages.length}…`); await sleep(0);
      const lines = await allLines(pg), imgs = (await getImages(pg).catch(() => [])).filter(im => !isImgCovered(pg, im));
      const items = paragraphsOf(lines).map(pl => ({ y: pl[0].top, pl }));
      for (const im of imgs) items.push({ y: im.y, im });
      pg.annots.filter(a => a.type === 'image').forEach(a => items.push({ y: a.ay, ann: a }));
      if (!items.length) items.push({ y: 0, full: true });
      items.sort((a, b) => a.y - b.y);
      const usable = (g.dw - 72) * 12700;
      for (const it of items) {
        if (it.pl) {
          const l0 = it.pl[0], text = FX.joinLines(it.pl), fam = famOffice(l0.family), sz = Math.max(2, Math.round(l0.fs * 2));
          body.push(`<w:p><w:pPr>${isCentered(it.pl, g) ? '<w:jc w:val="center"/>' : ''}<w:spacing w:before="0" w:after="${Math.round(l0.fs * 6)}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${xe(fam)}" w:hAnsi="${xe(fam)}" w:cs="${xe(fam)}"/>${l0.bold ? '<w:b/>' : ''}${l0.italic ? '<w:i/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xe(text)}</w:t></w:r></w:p>`);
        } else {
          let c, wPt, hPt;
          if (it.full) { c = await renderPageCanvas(pg, 2); wPt = g.dw; hPt = g.dh; }
          else if (it.im) { c = await extractPdfImage(pg, it.im); wPt = it.im.w; hPt = it.im.h; }
          else { const im = await loadImg(imgData(it.ann)); c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); wPt = it.ann.w; hPt = it.ann.h; }
          const jpg = c.width * c.height > 1.5e6, data = await canvasBytes(c, jpg ? 'image/jpeg' : 'image/png', 0.88), n = media.length + 1, ext = jpg ? 'jpeg' : 'png';
          media.push({ name: `word/media/image${n}.${ext}`, data });
          let cx = wPt * 12700, cy = hPt * 12700; if (cx > usable) { cy *= usable / cx; cx = usable; }
          const maxH = (g.dh - 72) * 12700; if (cy > maxH) { cx *= maxH / cy; cy = maxH; }
          body.push(`<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${Math.round(cx)}" cy="${Math.round(cy)}"/><wp:docPr id="${n}" name="Imagen ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="image${n}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(cx)}" cy="${Math.round(cy)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
        }
      }
      if (i < S.pages.length - 1) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }
    const W = Math.round(first.dw * 20), H = Math.round(first.dh * 20);
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
      { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(S.name)}</dc:title><dc:creator>DM Studio · PDF</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
      { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map((m, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.name.replace('word/', '')}"/>`).join('')}</Relationships>` },
      { name: 'word/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>` },
      { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${W}" w:h="${H}"${W > H ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>` },
      ...media
    ];
    return zip(files);
  }

  // ======================= PDF → Excel (.xlsx) =======================
  const parseNum = s => {
    const t = s.replace(/[€$£\s ]/g, ''); if (!/^[-+]?[\d.,]+%?$/.test(t) || !/\d/.test(t)) return null;
    let n = t.replace('%', ''); const lc = n.lastIndexOf(','), ld = n.lastIndexOf('.');
    if (lc > -1 && ld > -1) n = lc > ld ? n.replace(/\./g, '').replace(',', '.') : n.replace(/,/g, '');
    else if (lc > -1) n = /,\d{3}$/.test(n) && n.split(',').length > 2 ? n.replace(/,/g, '') : /,\d{1,2}$/.test(n) ? n.replace(',', '.') : n.replace(/,/g, '');
    else if (ld > -1 && n.split('.').length > 2) n = n.replace(/\./g, '');
    const v = parseFloat(n); return isFinite(v) ? (t.endsWith('%') ? v / 100 : v) : null;
  };
  function tableOf(lines) {
    // filas por línea base; celdas separadas por huecos grandes; columnas alineadas por posición
    const sorted = [...lines].sort((a, b) => a.base - b.base || a.x1 - b.x1), rows = [];
    for (const l of sorted) { const r = rows.find(r => Math.abs(r.base - l.base) < l.fs * 0.45); if (r) r.lines.push(l); else rows.push({ base: l.base, lines: [l] }); }
    const cells = rows.map(r => {
      const out = [];
      for (const l of r.lines.sort((a, b) => a.x1 - b.x1)) {
        const ws = l.words?.length ? l.words : [{ x1: l.x1, x2: l.x2, str: l.str }];
        let cur = null;
        for (const w of ws) { if (cur && w.x1 - cur.x2 < Math.max(l.fs * 1.1, 6)) { cur.str += ' ' + w.str; cur.x2 = w.x2; } else { cur = { x1: w.x1, x2: w.x2, str: w.str }; out.push(cur); } }
      }
      return out;
    });
    const anchors = []; cells.flat().map(c => c.x1).sort((a, b) => a - b).forEach(x => { const a = anchors[anchors.length - 1]; if (a !== undefined && x - a < 12) return; anchors.push(x); });
    return cells.map(r => { const row = []; for (const c of r) { let k = 0; anchors.forEach((a, i) => { if (Math.abs(a - c.x1) < Math.abs(anchors[k] - c.x1)) k = i; }); while (row[k] !== undefined) k++; row[k] = parseNum(c.str) ?? c.str; } return Array.from(row, v => v ?? ''); });
  }
  const colL = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  async function toXlsx() {
    const sheets = [];
    for (let i = 0; i < S.pages.length; i++) {
      progress(`Convirtiendo a Excel: página ${i + 1} de ${S.pages.length}…`); await sleep(0);
      const rows = tableOf(await allLines(S.pages[i])); if (!rows.length) continue;
      const widths = []; rows.forEach(r => r.forEach((v, c) => { widths[c] = Math.max(widths[c] || 8, Math.min(60, String(v).length + 2)); }));
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (v === '' ? '' : typeof v === 'number' ? `<c r="${colL(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${colL(ci)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`)).join('')}</row>`).join('')}</sheetData></worksheet>`;
      sheets.push({ name: `Página ${i + 1}`, xml });
    }
    if (!sheets.length) sheets.push({ name: 'Hoja1', xml: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>' });
    return zip([
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml }))
    ]);
  }

  // ======================= PDF → PowerPoint (.pptx) =======================
  const NS_P = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
  const GRP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
  const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Folio"><a:themeElements><a:clrScheme name="Folio"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Folio"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Folio"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
  async function toPptx() {
    const g0 = geom(S.pages[0]), cx = 12192000, cy = Math.round(cx * g0.dh / g0.dw), slides = [], media = [];
    for (let i = 0; i < S.pages.length; i++) {
      progress(`Convirtiendo a PowerPoint: diapositiva ${i + 1} de ${S.pages.length}…`); await sleep(0);
      const pg = S.pages[i], g = geom(pg), c = await renderPageCanvas(pg, Math.min(3, 2000 / Math.max(g.dw, g.dh)));
      media.push({ name: `ppt/media/image${i + 1}.jpeg`, data: await canvasBytes(c, 'image/jpeg', 0.9) });
      // la imagen se ajusta dentro de la diapositiva manteniendo la proporción
      let w = cx, h = Math.round(cx * g.dh / g.dw); if (h > cy) { w = Math.round(cy * g.dw / g.dh); h = cy; }
      const ox = Math.round((cx - w) / 2), oy = Math.round((cy - h) / 2);
      const txt = FX.joinLines((await allLines(pg)).sort((a, b) => a.base - b.base)).slice(0, 3000);
      slides.push({ xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS_P}><p:cSld><p:spTree>${GRP}<p:pic><p:nvPicPr><p:cNvPr id="2" name="Página ${i + 1}" descr="${xe(txt.slice(0, 1000))}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${ox}" y="${oy}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`, notes: txt });
    }
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((s, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_P} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((s, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${cx}" cy="${cy}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>${slides.map((s, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>` },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS_P}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${GRP}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2400"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>` },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>` },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_P} type="blank" preserve="1"><p:cSld name="En blanco"><p:spTree>${GRP}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>` },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>` },
      { name: 'ppt/theme/theme1.xml', data: THEME },
      ...slides.flatMap((s, i) => [
        { name: `ppt/slides/slide${i + 1}.xml`, data: s.xml },
        { name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i + 1}.jpeg"/></Relationships>` }
      ]),
      ...media
    ];
    return zip(files);
  }

  // ======================= PDF → imágenes, texto, HTML =======================
  const imgList = which => (which === 'cur' ? S.pages.filter(p => p.id === S.cur) : which === 'sel' && S.selPages.size ? S.pages.filter(p => S.selPages.has(p.id)) : S.pages);
  async function toImages(fmt, dpi, which, target, outName) {
    const list = imgList(which);
    const files = [], ext = fmt === 'image/png' ? 'png' : 'jpg';
    for (let i = 0; i < list.length; i++) {
      progress(`Creando imagen ${i + 1} de ${list.length}…`); await sleep(0);
      const c = await renderPageCanvas(list[i], dpi / 72);
      files.push({ name: `${baseName()}_pagina${S.pages.indexOf(list[i]) + 1}.${ext}`, data: await canvasBytes(c, fmt, 0.92) });
    }
    const where = files.length === 1 ? await FX.commitSave(target, files[0].data, outName, fmt) : await FX.commitSave(target, await zip(files), outName, 'application/zip');
    done(); toast(FX.savedMsg(where), 4000);
  }
  async function toText() {
    const parts = [];
    for (let i = 0; i < S.pages.length; i++) {
      const paras = paragraphsOf(await allLines(S.pages[i]));
      parts.push((S.pages.length > 1 ? `--- Página ${i + 1} ---\n\n` : '') + paras.map(pl => FX.joinLines(pl)).join('\n\n'));
    }
    return '﻿' + parts.join('\n\n\n');
  }
  async function toHtml() {
    const sections = [];
    for (let i = 0; i < S.pages.length; i++) {
      progress(`Convirtiendo a HTML: página ${i + 1} de ${S.pages.length}…`); await sleep(0);
      const pg = S.pages[i], g = geom(pg), lines = await allLines(pg), fsMed = lines.map(l => l.fs).sort((a, b) => a - b)[Math.floor(lines.length / 2)] || 12;
      const items = paragraphsOf(lines).map(pl => ({ y: pl[0].top, pl }));
      for (const im of (await getImages(pg).catch(() => [])).filter(im => !isImgCovered(pg, im))) items.push({ y: im.y, im });
      if (!items.length) items.push({ y: 0, full: true });
      let html = '';
      for (const it of items.sort((a, b) => a.y - b.y)) {
        if (it.pl) {
          const l0 = it.pl[0], t = xe(FX.joinLines(it.pl)), tag = l0.fs > fsMed * 1.6 ? 'h1' : l0.fs > fsMed * 1.25 ? 'h2' : 'p';
          const st = [isCentered(it.pl, g) ? 'text-align:center' : '', l0.bold && tag === 'p' ? 'font-weight:bold' : '', l0.italic ? 'font-style:italic' : '', l0.family === 'Times' ? "font-family:Georgia,'Times New Roman',serif" : l0.family === 'Courier' ? 'font-family:monospace' : ''].filter(Boolean).join(';');
          html += `<${tag}${st ? ` style="${st}"` : ''}>${t}</${tag}>\n`;
        } else {
          const c = it.full ? await renderPageCanvas(pg, 1.5) : await extractPdfImage(pg, it.im);
          html += `<p class="img"><img src="${c.width * c.height > 1e6 ? c.toDataURL('image/jpeg', 0.85) : c.toDataURL('image/png')}" alt="" style="max-width:${Math.round(it.full ? g.dw : it.im.w) * 1.333}px"></p>\n`;
        }
      }
      sections.push(`<section class="page" id="pagina-${i + 1}">\n${html}</section>`);
    }
    return `<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xe(S.name)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:820px;margin:0 auto;padding:24px}section.page{padding:12px 0 28px;border-bottom:1px solid #ddd}h1{font-size:1.8em}h2{font-size:1.35em}.img{text-align:center}img{max-width:100%;height:auto}</style></head>
<body>\n${sections.join('\n')}\n</body></html>`;
  }

  // ======================= Comprimir de verdad (recodifica imágenes) =======================
  function unpredict(raw, colors, columns) {
    const rowLen = colors * columns, out = new Uint8Array(rowLen * Math.floor(raw.length / (rowLen + 1))); let prev = new Uint8Array(rowLen);
    for (let r = 0, i = 0; i + rowLen < raw.length + 1 && r * rowLen < out.length; r++) {
      const type = raw[i++], row = out.subarray(r * rowLen, (r + 1) * rowLen);
      for (let x = 0; x < rowLen; x++) {
        const v = raw[i + x], a = x >= colors ? row[x - colors] : 0, b = prev[x], c = x >= colors ? prev[x - colors] : 0;
        let p = v; if (type === 1) p = v + a; else if (type === 2) p = v + b; else if (type === 3) p = v + ((a + b) >> 1); else if (type === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
        row[x] = p & 255;
      }
      i += rowLen; prev = row;
    }
    return out;
  }
  async function optimizeBytes(bytes, level, report) {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }), ctx = doc.context; let changed = 0, n = 0;
    const objs = ctx.enumerateIndirectObjects().filter(([, o]) => o instanceof PDFRawStream && o.dict.get(PDFName.of('Subtype'))?.toString() === '/Image');
    for (const [ref, obj] of objs) {
      n++; report?.(`Optimizando imagen ${n} de ${objs.length}…`); if (n % 3 === 0) await sleep(0);
      try {
        const d = obj.dict, num = k => d.lookup(PDFName.of(k))?.asNumber?.();
        if (d.lookup(PDFName.of('ImageMask'))?.toString?.() === 'true') continue;
        let filter = d.lookup(PDFName.of('Filter')); if (filter instanceof PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : null;
        const fname = filter?.toString(), W = num('Width'), H = num('Height'), bpc = num('BitsPerComponent');
        let cs = d.lookup(PDFName.of('ColorSpace')), comps = 0;
        if (cs?.toString() === '/DeviceRGB') comps = 3; else if (cs?.toString() === '/DeviceGray') comps = 1;
        else if (cs instanceof PDFArray && cs.lookup(0)?.toString() === '/ICCBased') { const icc = cs.lookup(1); comps = icc?.dict?.lookup(PDFName.of('N'))?.asNumber?.() || 0; }
        if (!W || !H || (comps !== 1 && comps !== 3) || d.lookup(PDFName.of('Decode'))) continue;
        const k = Math.min(1, level.maxDim / Math.max(W, H)), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
        if (fname === '/DCTDecode') {
          if (k === 1 && obj.contents.length < W * H * 0.15) continue; // ya está bien comprimida
          const bmp = await createImageBitmap(new Blob([obj.contents], { type: 'image/jpeg' })); x.drawImage(bmp, 0, 0, w, h);
        } else if (fname === '/FlateDecode' && bpc === 8) {
          let raw = await inflate(obj.contents, 'deflate');
          const parms = d.lookup(PDFName.of('DecodeParms')), pred = parms?.lookup?.(PDFName.of('Predictor'))?.asNumber?.() || 1;
          if (pred >= 10) raw = unpredict(raw, comps, parms.lookup(PDFName.of('Columns'))?.asNumber?.() || W);
          if (raw.length < W * H * comps) continue;
          const src = document.createElement('canvas'); src.width = W; src.height = H; const sx = src.getContext('2d'), id = sx.createImageData(W, H);
          for (let i = 0, j = 0; i < W * H; i++, j += comps) { const p = i * 4; id.data[p] = raw[j]; id.data[p + 1] = raw[comps === 3 ? j + 1 : j]; id.data[p + 2] = raw[comps === 3 ? j + 2 : j]; id.data[p + 3] = 255; }
          sx.putImageData(id, 0, 0); x.drawImage(src, 0, 0, w, h);
        } else continue;
        const jpg = await canvasBytes(c, 'image/jpeg', level.q);
        if (jpg.length >= obj.contents.length * 0.9) continue;
        const nd = { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, BitsPerComponent: 8, ColorSpace: 'DeviceRGB', Filter: 'DCTDecode' };
        const sm = d.get(PDFName.of('SMask')); if (sm) nd.SMask = sm;
        ctx.assign(ref, ctx.stream(jpg, nd)); changed++;
      } catch (e) { console.warn('optimizar imagen', e); }
    }
    let out = await doc.save({ useObjectStreams: true });
    try { // limpieza extra con MuPDF (objetos duplicados, flujos sin comprimir)
      const mu = await getMupdf(), md = mu.Document.openDocument(out, 'application/pdf').asPDF();
      const m2 = md.saveToBuffer('garbage=deduplicate,compress,compress-fonts,compress-images').asUint8Array().slice(); md.destroy?.();
      if (m2.length < out.length) out = m2;
    } catch { }
    return { out, changed, total: objs.length };
  }
  function openCompress() {
    if (!S.pages.length) return toast('Abre un documento primero');
    openModal(`<h2>Comprimir PDF</h2>
      <p class="hint" style="padding:0;margin-bottom:10px">Reduce el tamaño recodificando las imágenes. <b>El texto se conserva</b> (se puede seleccionar y buscar).</p>
      <div class="row"><label>Nivel</label><select id="cmpLvl"><option value="1000|0.6">Máxima compresión (pantalla)</option><option value="1600|0.72" selected>Equilibrado</option><option value="2400|0.85">Alta calidad (impresión)</option></select></div>
      <div id="cmpRes" class="hint" style="padding:0;min-height:18px"></div>
      <div class="actions"><button data-close>Cerrar</button><button class="primary" id="cmpGo">Comprimir y guardar</button></div>`);
    $('#cmpGo').onclick = async () => {
      const [maxDim, q] = $('#cmpLvl').value.split('|').map(Number), res = $('#cmpRes'), btn = $('#cmpGo');
      let target; try { target = await FX.prepareSave([{ name: baseName() + '_comprimido.pdf', mime: 'application/pdf' }]); } catch (e) { if (!FX.isCancel(e)) res.textContent = e.message; return; }
      btn.disabled = true;
      try {
        res.textContent = 'Preparando el PDF…';
        const before = await buildPdf(S.pages, { title: S.name });
        const { out, changed, total } = await optimizeBytes(before, { maxDim, q }, m => { res.textContent = m; });
        const pct = Math.round((1 - out.length / before.length) * 100);
        res.innerHTML = `Antes: <b>${fmt(before.length)}</b> · Después: <b>${fmt(out.length)}</b> (${pct > 0 ? '−' + pct + '%' : 'sin reducción'}) · ${changed} de ${total} imágenes recodificadas`;
        const where = await FX.commitSave(target, out.length < before.length ? out : before, baseName() + '_comprimido.pdf', 'application/pdf');
        res.innerHTML += `<br>${esc(FX.savedMsg(where))}`;
      } catch (e) { console.error(e); res.textContent = 'Error: ' + e.message; }
      btn.disabled = false;
    };
  }
  const fmt = n => (n > 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  // ======================= motor de maquetación para crear PDF =======================
  async function makeFonts(out) {
    if (typeof fontkit !== 'undefined') out.registerFontkit(fontkit);
    const cache = new Map();
    return st => {
      const fam = st.family || 'Helvetica', b = !!st.bold, it = !!st.italic, k = fam + b + it;
      if (!cache.has(k)) cache.set(k, (async () => {
        try { const by = await getFontBytes(fam, b, it); if (by) return await out.embedFont(by, { subset: true }); } catch { }
        const n = fam === 'Times' ? (b && it ? 'TimesRomanBoldItalic' : b ? 'TimesRomanBold' : it ? 'TimesRomanItalic' : 'TimesRoman') : fam === 'Courier' ? (b && it ? 'CourierBoldOblique' : b ? 'CourierBold' : it ? 'CourierOblique' : 'Courier') : (b && it ? 'HelveticaBoldOblique' : b ? 'HelveticaBold' : it ? 'HelveticaOblique' : 'Helvetica');
        return out.embedFont(StandardFonts[n]);
      })());
      return cache.get(k);
    };
  }
  const famFromName = n => (/courier|consol|mono|menlo/i.test(n || '') ? 'Courier' : /times|georgia|garamond|cambria|book|serif|palatino|roman/i.test(n || '') && !/sans/i.test(n || '') ? 'Times' : 'Helvetica');
  const toRgb = hex => { if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return rgb(0, 0, 0); const n = parseInt(hex, 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
  // reparte palabras de varios estilos en líneas de un ancho dado
  async function layoutRuns(runs, width, fonts, firstIndent = 0) {
    const toks = [];
    for (const r of runs) {
      const font = await fonts(r), size = r.size || 11;
      for (const part of String(r.text).replace(/\t/g, '    ').split(/(\n|\s+)/)) {
        if (!part) continue;
        if (part === '\n') { toks.push({ br: true, size }); continue; }
        const t = safeText(font, part); toks.push({ text: t, w: font.widthOfTextAtSize(t, size), font, size, color: r.color, underline: r.underline, space: /^\s+$/.test(part) });
      }
    }
    const lines = []; let cur = { toks: [], w: 0, size: 0 }, avail = width - firstIndent;
    const push = () => { while (cur.toks.length && cur.toks[cur.toks.length - 1].space) cur.w -= cur.toks.pop().w; lines.push(cur); cur = { toks: [], w: 0, size: 0 }; avail = width; };
    for (const t of toks) {
      if (t.br) { cur.size = Math.max(cur.size, t.size); push(); continue; }
      if (t.space && !cur.toks.length) continue;
      if (cur.w + t.w > avail && cur.toks.length && !t.space) push();
      if (t.w > avail && !t.space) { // palabra más larga que la línea: se corta
        let s = t.text; while (s) { let k = s.length; while (k > 1 && t.font.widthOfTextAtSize(s.slice(0, k), t.size) > avail - cur.w) k--; const piece = s.slice(0, k); cur.toks.push({ ...t, text: piece, w: t.font.widthOfTextAtSize(piece, t.size) }); cur.w += cur.toks[cur.toks.length - 1].w; cur.size = Math.max(cur.size, t.size); s = s.slice(k); if (s) push(); }
        continue;
      }
      cur.toks.push(t); cur.w += t.w; cur.size = Math.max(cur.size, t.size);
    }
    if (cur.toks.length || !lines.length) push();
    lines.forEach(l => { if (!l.size) l.size = runs[0]?.size || 11; });
    return lines;
  }
  function drawLines(page, lines, x, yTop, width, align = 'left', lh = 1.2) {
    let y = yTop;
    for (const l of lines) {
      const hgt = l.size * lh; y -= l.size * 0.92;
      let cx = x + (align === 'center' ? (width - l.w) / 2 : align === 'right' ? width - l.w : 0);
      const gaps = align === 'justify' && l !== lines[lines.length - 1] ? l.toks.filter(t => t.space).length : 0, extra = gaps ? (width - l.w) / gaps : 0;
      for (const t of l.toks) {
        if (!t.space) {
          page.drawText(t.text, { x: cx, y, size: t.size, font: t.font, color: t.color || rgb(0, 0, 0) });
          if (t.underline) page.drawLine({ start: { x: cx, y: y - t.size * 0.12 }, end: { x: cx + t.w, y: y - t.size * 0.12 }, thickness: Math.max(0.5, t.size / 18), color: t.color || rgb(0, 0, 0) });
        }
        cx += t.w + (t.space ? extra : 0);
      }
      y -= hgt - l.size * 0.92;
    }
    return yTop - y;
  }
  class Flow {
    constructor(out, fonts, w, h, m) { Object.assign(this, { out, fonts, W: w, H: h, m }); this.newPage(); }
    newPage() { this.page = this.out.addPage([this.W, this.H]); this.y = this.H - this.m.t; this.fresh = true; }
    get width() { return this.W - this.m.l - this.m.r; }
    ensure(h) { if (this.y - h < this.m.b && !this.fresh) this.newPage(); }
    async paragraph(runs, o = {}) {
      if (!runs.length || runs.every(r => !String(r.text).trim())) { this.y -= (o.emptyH ?? 8) + (o.after || 0); if (this.y < this.m.b) this.newPage(); return; }
      const indent = o.indent || 0, width = this.width - indent, lh = o.lh || 1.2;
      const lines = await layoutRuns(runs, width, this.fonts, o.firstIndent || 0);
      this.y -= this.fresh ? 0 : o.before || 0;
      let i = 0;
      while (i < lines.length) {
        const fit = []; let h = 0;
        while (i < lines.length && (this.y - h - lines[i].size * lh >= this.m.b || (!fit.length && this.fresh))) { h += lines[i].size * lh; fit.push(lines[i++]); }
        if (!fit.length) { this.newPage(); continue; }
        if (o.bullet && fit[0] === lines[0]) { const bf = await this.fonts({ family: 'Helvetica' }); this.page.drawText(safeText(bf, o.bullet), { x: this.m.l + indent - 14, y: this.y - fit[0].size * 0.92, size: fit[0].size, font: bf }); }
        drawLines(this.page, fit, this.m.l + indent, this.y, width, o.align, lh);
        this.y -= h; this.fresh = false;
        if (i < lines.length) this.newPage();
      }
      this.y -= o.after ?? 4;
    }
    async image(bytes, mime, wPt, hPt) {
      let img;
      try { img = /png/.test(mime) ? await this.out.embedPng(bytes) : /jpe?g/.test(mime) ? await this.out.embedJpg(bytes) : null; } catch { img = null; }
      if (!img) { try { const r = await imageToPng(new Blob([bytes], { type: mime || 'image/png' }), 2400); img = await this.out.embedPng(r.dataUrl); } catch { return; } }
      let w = wPt || img.width * 0.75, h = hPt || img.height * 0.75;
      const maxH = this.H - this.m.t - this.m.b; if (w > this.width) { h *= this.width / w; w = this.width; } if (h > maxH) { w *= maxH / h; h = maxH; }
      this.ensure(h); this.page.drawImage(img, { x: this.m.l, y: this.y - h, width: w, height: h }); this.y -= h + 6; this.fresh = false;
    }
    async table(rows, widths, o = {}) {
      const n = Math.max(...rows.map(r => r.length)); if (!n) return;
      let ws = widths && widths.length >= n ? widths.slice(0, n) : Array(n).fill(1), tot = ws.reduce((a, b) => a + b, 0);
      ws = ws.map(w => w * this.width / tot);
      const pad = 3, size = o.size || 10;
      for (let ri = 0; ri < rows.length; ri++) {
        const cells = [];
        for (let c = 0; c < n; c++) { const runs = rows[ri][c] || [{ text: '' }]; cells.push(await layoutRuns(runs.map(r => ({ size, ...r, bold: r.bold || (o.header && ri === 0) })), ws[c] - pad * 2, this.fonts)); }
        const h = Math.max(...cells.map(ls => ls.reduce((s, l) => s + l.size * 1.2, 0))) + pad * 2;
        this.ensure(h);
        let x = this.m.l;
        for (let c = 0; c < n; c++) {
          if (o.header && ri === 0) this.page.drawRectangle({ x, y: this.y - h, width: ws[c], height: h, color: rgb(0.93, 0.94, 0.96) });
          this.page.drawRectangle({ x, y: this.y - h, width: ws[c], height: h, borderColor: rgb(0.6, 0.62, 0.66), borderWidth: 0.5 });
          drawLines(this.page, cells[c], x + pad, this.y - pad, ws[c] - pad * 2, typeof rows[ri][c]?.[0]?.num === 'boolean' && rows[ri][c][0].num ? 'right' : 'left');
          x += ws[c];
        }
        this.y -= h; this.fresh = false;
      }
      this.y -= 8;
    }
  }

  // ======================= Word (.docx) → PDF =======================
  async function docxToPdf(bytes) {
    const z = await unzip(bytes), d = xmlOf(z, 'word/document.xml'); if (!d) throw new Error('No es un documento de Word (.docx)');
    const R = rels(z, 'word/_rels/document.xml.rels'), st = xmlOf(z, 'word/styles.xml'), num = xmlOf(z, 'word/numbering.xml');
    const onOff = el => el && !/^(0|false|off)$/i.test(at(el, 'w:val') || '');
    const rprOf = rPr => { if (!rPr) return {}; const o = {}; const b = kid(rPr, 'b'), i = kid(rPr, 'i'), u = kid(rPr, 'u'), sz = kid(rPr, 'sz'), c = kid(rPr, 'color'), f = kid(rPr, 'rFonts'); if (b) o.bold = onOff(b); if (i) o.italic = onOff(i); if (u && at(u, 'w:val') !== 'none') o.underline = true; if (sz) o.size = +at(sz, 'w:val') / 2; if (c && at(c, 'w:val') !== 'auto') o.color = at(c, 'w:val'); if (f) o.family = famFromName(at(f, 'w:ascii') || at(f, 'w:hAnsi')); if (kid(rPr, 'vanish')) o.hidden = true; return o; };
    // estilos
    const styles = {}; let defR = { size: 11, family: 'Helvetica' };
    if (st) {
      const dd = deep(st.documentElement, 'rPrDefault')[0]; if (dd) defR = { ...defR, ...rprOf(kid(dd, 'rPr')) };
      for (const s of deep(st.documentElement, 'style')) {
        const id = at(s, 'w:styleId'), pPr = kid(s, 'pPr'), name = at(kid(s, 'name'), 'w:val') || '';
        const sp = pPr && kid(pPr, 'spacing'), jc = pPr && kid(pPr, 'jc');
        styles[id] = { basedOn: at(kid(s, 'basedOn'), 'w:val'), r: rprOf(kid(s, 'rPr')), name, before: sp && at(sp, 'w:before') ? +at(sp, 'w:before') / 20 : undefined, after: sp && at(sp, 'w:after') ? +at(sp, 'w:after') / 20 : undefined, align: jc ? at(jc, 'w:val') : undefined };
      }
    }
    const styleChain = id => { const out = []; let s = styles[id], g = 0; while (s && g++ < 10) { out.unshift(s); s = styles[s.basedOn]; } return out; };
    const headingSize = name => { const m = /heading\s*(\d)|t[íi]tulo\s*(\d)/i.exec(name); if (/^title$|^t[íi]tulo$/i.test(name)) return 26; if (!m) return null; return [0, 20, 16, 14, 12.5, 12, 11][+(m[1] || m[2])] || 12; };
    // numeración
    const numFmt = {}; if (num) {
      const abs = {}; for (const a of deep(num.documentElement, 'abstractNum')) abs[at(a, 'w:abstractNumId')] = Object.fromEntries(kids(a, 'lvl').map(l => [at(l, 'w:ilvl'), { fmt: at(kid(l, 'numFmt'), 'w:val'), text: at(kid(l, 'lvlText'), 'w:val') }]));
      for (const n of kids(num.documentElement, 'num')) numFmt[at(n, 'w:numId')] = abs[at(kid(n, 'abstractNumId'), 'w:val')] || {};
    }
    const counters = {};
    // página
    const sect = deep(d.documentElement, 'sectPr').pop(), pgSz = kid(sect, 'pgSz'), pgMar = kid(sect, 'pgMar');
    const W = pgSz ? +at(pgSz, 'w:w') / 20 : 595.28, H = pgSz ? +at(pgSz, 'w:h') / 20 : 841.89;
    const mg = k => (pgMar && at(pgMar, 'w:' + k) ? Math.max(18, +at(pgMar, 'w:' + k) / 20) : 72);
    const out = await PDFDocument.create(), fonts = await makeFonts(out), flow = new Flow(out, fonts, W || 595.28, H || 841.89, { t: mg('top'), r: mg('right'), b: mg('bottom'), l: mg('left') });
    const runsOf = (p, base) => { // recorre runs (también dentro de hipervínculos, inserciones, etc.)
      const items = [];
      const walk = el => {
        for (const c of el.children) {
          const ln = c.localName;
          if (ln === 'r') {
            const r = { ...base, ...rprOf(kid(c, 'rPr')) }; if (r.hidden) continue;
            for (const x of c.children) {
              if (x.localName === 't') items.push({ ...r, text: x.textContent });
              else if (x.localName === 'tab') items.push({ ...r, text: '\t' });
              else if (x.localName === 'br' || x.localName === 'cr') items.push(at(x, 'w:type') === 'page' ? { pageBreak: true } : { ...r, text: '\n' });
              else if (x.localName === 'noBreakHyphen') items.push({ ...r, text: '-' });
              else if (x.localName === 'drawing' || x.localName === 'pict') {
                const blip = deep(x, 'blip')[0] || deep(x, 'imagedata')[0], ext = deep(x, 'extent')[0];
                const id = blip && (at(blip, 'r:embed') || at(blip, 'r:id')), rel = id && R[id];
                if (rel?.path && z[rel.path]) items.push({ image: z[rel.path], mime: mimeOf(rel.path), w: ext ? +at(ext, 'cx') / 12700 : 0, h: ext ? +at(ext, 'cy') / 12700 : 0 });
              }
            }
          } else if (['hyperlink', 'ins', 'smartTag', 'sdt', 'sdtContent', 'fldSimple', 'customXml'].includes(ln)) walk(c);
        }
      };
      walk(p); return items;
    };
    const paraProps = p => {
      const pPr = kid(p, 'pPr'), sid = at(kid(pPr, 'pStyle'), 'w:val') || 'Normal', chain = styleChain(sid);
      const base = { ...defR }; let before, after, align; chain.forEach(s => { Object.assign(base, s.r); if (s.before !== undefined) before = s.before; if (s.after !== undefined) after = s.after; if (s.align) align = s.align; });
      const hs = headingSize(chain.map(s => s.name).join(' ') || sid); if (hs && !chain.some(s => s.r.size)) { base.size = hs; base.bold = base.bold ?? true; }
      if (hs) { before = before ?? hs * 0.6; after = after ?? hs * 0.3; }
      const sp = pPr && kid(pPr, 'spacing'), jc = pPr && kid(pPr, 'jc'), ind = pPr && kid(pPr, 'ind');
      if (sp && at(sp, 'w:before')) before = +at(sp, 'w:before') / 20; if (sp && at(sp, 'w:after')) after = +at(sp, 'w:after') / 20; if (jc) align = at(jc, 'w:val');
      Object.assign(base, rprOf(pPr && kid(pPr, 'rPr')) && {});
      let indent = ind ? (+(at(ind, 'w:left') || at(ind, 'w:start') || 0)) / 20 : 0, bullet = null;
      const np = pPr && kid(pPr, 'numPr');
      if (np) {
        const nid2 = at(kid(np, 'numId'), 'w:val'), lvl = at(kid(np, 'ilvl'), 'w:val') || '0', f = numFmt[nid2]?.[lvl];
        if (nid2 && nid2 !== '0') {
          const key = nid2 + ':' + lvl; counters[key] = (counters[key] || 0) + 1; Object.keys(counters).forEach(k2 => { const [a2, l2] = k2.split(':'); if (a2 === nid2 && +l2 > +lvl) delete counters[k2]; });
          bullet = !f || f.fmt === 'bullet' ? '•' : (f.text || '%1.').replace(/%(\d)/g, (_, k3) => counters[nid2 + ':' + (k3 - 1)] || 1);
          indent = Math.max(indent, 18 + 18 * +lvl);
        }
      }
      return { base, before: before ?? 0, after: after ?? 6, align: align === 'center' ? 'center' : align === 'right' || align === 'end' ? 'right' : align === 'both' || align === 'distribute' ? 'justify' : 'left', indent, bullet };
    };
    const doPara = async p => {
      const pp = paraProps(p), items = runsOf(p, pp.base); let buf = [];
      const flush = async () => { await flow.paragraph(buf, { ...pp, emptyH: (pp.base.size || 11) * 1.1 }); buf = []; pp.bullet = null; };
      if (!items.length) return flow.paragraph([], { emptyH: (pp.base.size || 11) * 1.15, after: pp.after * 0.3 });
      for (const it of items) {
        if (it.pageBreak) { if (buf.length) await flush(); flow.newPage(); continue; }
        if (it.image) { if (buf.some(r => String(r.text).trim())) await flush(); else buf = []; await flow.image(it.image, it.mime, it.w, it.h); continue; }
        buf.push({ ...it, color: toRgb(it.color) });
      }
      if (buf.length) await flush();
    };
    const doTable = async tbl => {
      const grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map(g => +at(g, 'w:w') || 1);
      const rowsData = [];
      for (const tr of kids(tbl, 'tr')) {
        const row = [];
        for (const tc of kids(tr, 'tc')) {
          const runs = []; kids(tc, 'p').forEach((p, i) => { const pp = paraProps(p); if (i) runs.push({ text: '\n', size: pp.base.size }); runsOf(p, pp.base).filter(x => x.text !== undefined).forEach(x => runs.push({ ...x, size: Math.min(x.size || 10, 12), color: toRgb(x.color) })); });
          row.push(runs.length ? runs : [{ text: '' }]);
          const span = +at(kid(kid(tc, 'tcPr'), 'gridSpan'), 'w:val') || 1; for (let k = 1; k < span; k++) row.push([{ text: '' }]);
        }
        rowsData.push(row);
      }
      await flow.table(rowsData, grid);
    };
    const body = kid(d.documentElement, 'body'), blocks = [];
    const collect = el => { for (const c of el.children) { if (c.localName === 'p' || c.localName === 'tbl') blocks.push(c); else if (['sdt', 'sdtContent', 'customXml'].includes(c.localName)) collect(c); } };
    collect(body);
    for (let i = 0; i < blocks.length; i++) {
      if (i % 20 === 0) { progress(`Convirtiendo Word a PDF… ${Math.round(i / blocks.length * 100)}%`); await sleep(0); }
      if (blocks[i].localName === 'p') await doPara(blocks[i]); else await doTable(blocks[i]);
    }
    return out.save({ useObjectStreams: true });
  }

  // ======================= Excel (.xlsx) → PDF =======================
  async function xlsxToPdf(bytes) {
    const z = await unzip(bytes), wb = xmlOf(z, 'xl/workbook.xml'); if (!wb) throw new Error('No es un libro de Excel (.xlsx)');
    const R = rels(z, 'xl/_rels/workbook.xml.rels'), ss = xmlOf(z, 'xl/sharedStrings.xml');
    const shared = ss ? kids(ss.documentElement, 'si').map(si => deep(si, 't').filter(t => t.parentElement.localName !== 'rPh').map(t => t.textContent).join('')) : [];
    const sty = xmlOf(z, 'xl/styles.xml'), xfs = sty ? kids(kid(sty.documentElement, 'cellXfs'), 'xf').map(x => +at(x, 'numFmtId') || 0) : [];
    const custom = sty ? Object.fromEntries(kids(kid(sty.documentElement, 'numFmts'), 'numFmt').map(n => [at(n, 'numFmtId'), at(n, 'formatCode') || ''])) : {};
    const isDate = id => (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (custom[id] && /[dmy]/i.test(custom[id].replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/0/.test(custom[id]));
    const out = await PDFDocument.create(), fonts = await makeFonts(out);
    for (const sh of deep(wb.documentElement, 'sheet')) {
      const rel = R[at(sh, 'r:id')]; const sx = rel && xmlOf(z, rel.path); if (!sx) continue;
      const grid = []; let maxC = 0;
      for (const row of deep(sx.documentElement, 'row')) for (const c of kids(row, 'c')) {
        const ref = at(c, 'r'), m = /^([A-Z]+)(\d+)$/.exec(ref || ''); if (!m) continue;
        const col = [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1, r = +m[2] - 1;
        const t = at(c, 't'), v = kid(c, 'v')?.textContent ?? '', xf = xfs[+at(c, 's') || 0] || 0; let val = v, numeric = false;
        if (t === 's') val = shared[+v] ?? ''; else if (t === 'inlineStr') val = deep(c, 't').map(x => x.textContent).join(''); else if (t === 'b') val = v === '1' ? 'VERDADERO' : 'FALSO';
        else if (!t || t === 'n') { if (v === '') continue; const n = +v; numeric = true; if (isDate(xf)) { const dt = new Date(Math.round((n - 25569) * 86400000)); val = dt.toLocaleDateString('es-ES', { timeZone: 'UTC' }); } else val = Number.isInteger(n) ? n.toLocaleString('es-ES') : n.toLocaleString('es-ES', { maximumFractionDigits: 4 }); }
        if (val === '') continue;
        (grid[r] = grid[r] || [])[col] = { text: String(val), num: numeric }; maxC = Math.max(maxC, col + 1);
      }
      const rows = grid.filter(Boolean); if (!rows.length) continue;
      const widths = Array.from({ length: maxC }, (_, c) => Math.min(220, Math.max(28, ...rows.map(r => (r[c]?.text.length || 0) * 5.6 + 8))));
      const total = widths.reduce((a, b) => a + b, 0), land = total > 540;
      const flow = new Flow(out, fonts, land ? 841.89 : 595.28, land ? 595.28 : 841.89, { t: 40, r: 30, b: 40, l: 30 });
      const size = Math.max(6, Math.min(10, 10 * flow.width / total));
      await flow.paragraph([{ text: at(sh, 'name') || 'Hoja', size: 14, bold: true }], { after: 8 });
      await flow.table(rows.map(r => Array.from({ length: maxC }, (_, c) => [{ text: r[c]?.text ?? '', num: !!r[c]?.num }])), widths, { size, header: true });
    }
    if (!out.getPageCount()) throw new Error('El libro no tiene datos');
    return out.save({ useObjectStreams: true });
  }

  // ======================= PowerPoint (.pptx) → PDF =======================
  async function pptxToPdf(bytes) {
    const z = await unzip(bytes), pres = xmlOf(z, 'ppt/presentation.xml'); if (!pres) throw new Error('No es una presentación de PowerPoint (.pptx)');
    const R = rels(z, 'ppt/_rels/presentation.xml.rels'), sz = deep(pres.documentElement, 'sldSz')[0];
    const W = sz ? +at(sz, 'cx') / 12700 : 720, H = sz ? +at(sz, 'cy') / 12700 : 405, E = v => (+v || 0) / 12700;
    const out = await PDFDocument.create(), fonts = await makeFonts(out);
    const relsOf = path => rels(z, path.replace(/([^/]+)$/, '_rels/$1.rels'));
    const xfrmOf = el => { const x = deep(el, 'xfrm')[0]; if (!x) return null; const o = kid(x, 'off'), e = kid(x, 'ext'); return o && e ? { x: E(at(o, 'x')), y: E(at(o, 'y')), w: E(at(e, 'cx')), h: E(at(e, 'cy')) } : null; };
    const phOf = sp => { const ph = deep(sp, 'ph')[0]; return ph ? { type: at(ph, 'type') || 'body', idx: at(ph, 'idx') } : null; };
    const findPh = (doc, ph) => { if (!doc) return null; for (const sp of deep(doc.documentElement, 'sp')) { const p = phOf(sp); if (p && ((ph.idx && p.idx === ph.idx) || p.type === ph.type || (ph.type === 'ctrTitle' && p.type === 'title'))) return sp; } return null; };
    const fillOf = el => { const sf = el && [...el.children].find(c => c.localName === 'solidFill'); const c = sf && deep(sf, 'srgbClr')[0]; return c ? at(c, 'val') : null; };
    const slides = kids(kid(pres.documentElement, 'sldIdLst'), 'sldId').map(s => R[at(s, 'r:id')]?.path).filter(Boolean);
    for (let si = 0; si < slides.length; si++) {
      progress(`Convirtiendo PowerPoint a PDF: diapositiva ${si + 1} de ${slides.length}…`); await sleep(0);
      const path = slides[si], sd = xmlOf(z, path); if (!sd) continue;
      const sR = relsOf(path), layPath = Object.values(sR).find(r => /slideLayout/.test(r.type))?.path, lay = layPath && xmlOf(z, layPath);
      const mPath = layPath && Object.values(relsOf(layPath)).find(r => /slideMaster/.test(r.type))?.path, mas = mPath && xmlOf(z, mPath);
      const page = out.addPage([W, H]);
      const bg = [sd, lay, mas].map(x => x && deep(x.documentElement, 'bg')[0]).find(Boolean); const bgc = bg && deep(bg, 'srgbClr')[0];
      if (bgc) page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: toRgb(at(bgc, 'val')) });
      const drawTree = async (tree, tf, relMap) => {
        for (const el of tree.children) {
          const ln = el.localName;
          if (ln === 'grpSp') {
            const x = deep(kid(el, 'grpSpPr'), 'xfrm')[0]; let t2 = tf;
            if (x) { const o = kid(x, 'off'), e = kid(x, 'ext'), co = kid(x, 'chOff'), ce = kid(x, 'chExt'); if (o && e && co && ce) { const sx = (+at(e, 'cx') || 1) / (+at(ce, 'cx') || 1), sy = (+at(e, 'cy') || 1) / (+at(ce, 'cy') || 1); t2 = p => tf({ x: E(at(o, 'x')) + (p.x - E(at(co, 'x'))) * sx, y: E(at(o, 'y')) + (p.y - E(at(co, 'y'))) * sy, w: p.w * sx, h: p.h * sy }); } }
            await drawTree(el, t2, relMap); continue;
          }
          if (ln === 'pic') {
            const blip = deep(el, 'blip')[0], rel = blip && relMap[at(blip, 'r:embed')], b = xfrmOf(kid(el, 'spPr'));
            if (!rel?.path || !z[rel.path] || !b) continue;
            const r = tf(b), mime = mimeOf(rel.path);
            try { let img = /png/.test(mime) ? await out.embedPng(z[rel.path]) : /jpe?g/.test(mime) ? await out.embedJpg(z[rel.path]) : null; if (!img) { const p2 = await imageToPng(new Blob([z[rel.path]], { type: mime }), 2400); img = await out.embedPng(p2.dataUrl); } page.drawImage(img, { x: r.x, y: H - r.y - r.h, width: r.w, height: r.h }); } catch { }
            continue;
          }
          if (ln !== 'sp') continue;
          const ph = phOf(el); let b = xfrmOf(kid(el, 'spPr')); const fromLay = ph && (findPh(lay, ph) || findPh(mas, ph));
          if (!b && fromLay) b = xfrmOf(kid(fromLay, 'spPr')) || (findPh(mas, ph) && xfrmOf(kid(findPh(mas, ph), 'spPr')));
          if (!b) continue;
          const r = tf(b), fillc = fillOf(kid(el, 'spPr'));
          if (fillc) page.drawRectangle({ x: r.x, y: H - r.y - r.h, width: r.w, height: r.h, color: toRgb(fillc) });
          const tx = kid(el, 'txBody'); if (!tx) continue;
          const defSize = ph ? (/title/i.test(ph.type) ? (ph.type === 'subTitle' ? 24 : 36) : 20) : 18;
          let y = H - r.y - 4;
          const anchor = at(kid(tx, 'bodyPr'), 'anchor'), blocks = [];
          for (const p of kids(tx, 'p')) {
            const pPr = kid(p, 'pPr'), algn = at(pPr, 'algn'), runs = [], bu = pPr && deep(pPr, 'buChar')[0];
            for (const c of p.children) {
              if (c.localName === 'r') { const rp = kid(c, 'rPr'), col = rp && deep(rp, 'srgbClr')[0], lat = rp && kid(rp, 'latin'); runs.push({ text: kid(c, 't')?.textContent || '', size: rp && at(rp, 'sz') ? +at(rp, 'sz') / 100 : defSize, bold: at(rp, 'b') === '1' || (ph && (ph.type === 'title' || ph.type === 'ctrTitle') && at(rp, 'b') !== '0'), italic: at(rp, 'i') === '1', underline: !!at(rp, 'u') && at(rp, 'u') !== 'none', color: col ? toRgb(at(col, 'val')) : rgb(0, 0, 0), family: famFromName(lat && at(lat, 'typeface')) }); }
              else if (c.localName === 'br') runs.push({ text: '\n', size: defSize });
            }
            // en los cuadros de contenido, PowerPoint pone viñetas por defecto (salvo «sin viñeta»)
            const autoBullet = ph && ph.type === 'body' && !(pPr && deep(pPr, 'buNone').length) && runs.some(r => r.text.trim());
            if ((bu || autoBullet) && runs.length) runs.unshift({ ...runs[0], bold: false, text: '•  ' });
            const lines = runs.length ? await layoutRuns(runs, r.w - 14, fonts) : [{ toks: [], w: 0, size: defSize * 0.8 }];
            blocks.push({ lines, align: algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left' });
          }
          const totalH = blocks.reduce((s, bl) => s + bl.lines.reduce((t, l) => t + l.size * 1.2, 0), 0);
          if (anchor === 'ctr') y = H - r.y - (r.h - totalH) / 2; else if (anchor === 'b') y = H - r.y - r.h + totalH + 4;
          for (const bl of blocks) y -= drawLines(page, bl.lines, r.x + 7, y, r.w - 14, bl.align, 1.2);
        }
      };
      const ident = b => b;
      const tree = deep(sd.documentElement, 'spTree')[0]; if (tree) await drawTree(tree, ident, sR);
    }
    return out.save({ useObjectStreams: true });
  }

  // ======================= HTML / web / texto → PDF =======================
  async function htmlToPdf(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript,template,iframe,svg,nav,footer form').forEach(e => e.remove());
    const out = await PDFDocument.create(), fonts = await makeFonts(out), flow = new Flow(out, fonts, 595.28, 841.89, { t: 56, r: 56, b: 56, l: 56 });
    const H = { H1: 22, H2: 17, H3: 14, H4: 12.5, H5: 12, H6: 11 };
    const inline = (node, st, out2) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { const t = c.textContent.replace(/\s+/g, ' '); if (t) out2.push({ ...st, text: t }); continue; }
        if (c.nodeType !== 1) continue;
        const tag = c.tagName, s2 = { ...st };
        if (/^(B|STRONG)$/.test(tag)) s2.bold = true; if (/^(I|EM|CITE)$/.test(tag)) s2.italic = true; if (tag === 'U') s2.underline = true;
        if (/^(CODE|KBD|SAMP|TT)$/.test(tag)) s2.family = 'Courier';
        if (tag === 'A') { s2.color = rgb(0.05, 0.3, 0.75); s2.underline = true; }
        if (tag === 'BR') { out2.push({ ...st, text: '\n' }); continue; }
        if (tag === 'IMG' || isBlock(c)) continue;
        inline(c, s2, out2);
      }
    };
    const isBlock = el => /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|MAIN|ASIDE|FIGURE|HR|DL|DT|DD|ADDRESS|FIGCAPTION)$/.test(el.tagName);
    const imgBytes = async src2 => {
      try { const u = new URL(src2, baseUrl || location.href); const r = await fetch(u.href); if (!r.ok) return null; const b = new Uint8Array(await r.arrayBuffer()); return { b, mime: r.headers.get('content-type') || mimeOf(u.pathname) }; } catch { return null; }
    };
    const walk = async (el, depth = 0, list = null) => {
      for (const c of el.children) {
        const tag = c.tagName;
        if (tag === 'IMG') { const im = await imgBytes(c.getAttribute('src') || ''); if (im) await flow.image(im.b, im.mime); continue; }
        if (tag === 'HR') { flow.ensure(10); flow.page.drawLine({ start: { x: flow.m.l, y: flow.y - 4 }, end: { x: flow.W - flow.m.r, y: flow.y - 4 }, thickness: 0.6, color: rgb(0.7, 0.7, 0.7) }); flow.y -= 12; continue; }
        if (tag === 'TABLE') {
          const rows = [...c.querySelectorAll('tr')].map(tr => [...tr.children].filter(x => /^T[DH]$/.test(x.tagName)).map(td => { const r = []; inline(td, { size: 10, bold: td.tagName === 'TH' }, r); return r.length ? r : [{ text: '' }]; })).filter(r => r.length);
          if (rows.length) await flow.table(rows, null, { size: 10, header: !!c.querySelector('th') }); continue;
        }
        if (tag === 'UL' || tag === 'OL') { await walk(c, depth + 1, { ordered: tag === 'OL', n: 0 }); continue; }
        if (tag === 'PRE') { await flow.paragraph([{ text: c.textContent, family: 'Courier', size: 9.5 }], { after: 6 }); continue; }
        const runs = []; inline(c, { size: H[tag] || 11, bold: !!H[tag] }, runs);
        const hasText = runs.some(r => r.text.trim());
        if (hasText && (tag === 'LI' || !isBlock(c) || /^(P|H[1-6]|LI|DT|DD|BLOCKQUOTE|FIGCAPTION|ADDRESS)$/.test(tag) || ![...c.children].some(isBlock))) {
          runs[0].text = runs[0].text.replace(/^\s+/, '');
          await flow.paragraph(runs, { before: H[tag] ? H[tag] * 0.6 : 0, after: H[tag] ? 4 : 6, indent: (tag === 'LI' ? 18 : 0) + depth * 14 + (tag === 'BLOCKQUOTE' ? 24 : 0), bullet: tag === 'LI' ? (list?.ordered ? `${++list.n}.` : '•') : null, italic: tag === 'BLOCKQUOTE' });
        }
        if ([...c.children].some(x => isBlock(x) || x.tagName === 'IMG')) await walk(c, depth, list);
      }
    };
    const title = doc.querySelector('title')?.textContent?.trim();
    if (title && !doc.querySelector('h1')) await flow.paragraph([{ text: title, size: 22, bold: true }], { after: 10 });
    await walk(doc.body || doc.documentElement);
    return out.save({ useObjectStreams: true });
  }
  async function textToPdf(text) {
    const out = await PDFDocument.create(), fonts = await makeFonts(out), flow = new Flow(out, fonts, 595.28, 841.89, { t: 56, r: 56, b: 56, l: 56 });
    const mono = /\t| {3,}/.test(text);
    for (const line of text.replace(/\r\n?/g, '\n').split('\n')) await flow.paragraph(line ? [{ text: line, size: mono ? 9.5 : 11, family: mono ? 'Courier' : 'Helvetica' }] : [], { after: mono ? 0 : 2, emptyH: 9 });
    return out.save({ useObjectStreams: true });
  }
  async function webToPdf() {
    const url = await askText('Página web a PDF', 'https://ejemplo.com/articulo', '', 'Convertir'); if (!url) return;
    const u = /^https?:/i.test(url) ? url : 'https://' + url;
    progress('Descargando la página…');
    try {
      const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status);
      const bytes = await htmlToPdf(await r.text(), u); done();
      await loadFiles([new File([bytes], (new URL(u).hostname || 'web') + '.pdf', { type: 'application/pdf' })], true);
    } catch (e) {
      done();
      openModal(`<h2>No se pudo leer esa página</h2><p>La mayoría de webs no dejan que otra página las lea directamente (es una protección del navegador).</p>
        <p>Hazlo así:</p><ol><li>Abre la página en una pestaña nueva (botón de abajo).</li><li>Pulsa <b>Ctrl + P</b> y elige <b>«Guardar como PDF»</b>, o pulsa <b>Ctrl + S</b> para guardarla como archivo .html.</li><li>Arrastra aquí el PDF o el .html y se abrirá en una pestaña nueva.</li></ol>
        <div class="actions"><button data-close>Cerrar</button><button class="primary" id="webOpen">Abrir la página</button></div>`);
      $('#webOpen').onclick = () => { window.open(u, '_blank', 'noopener'); closeModal(); };
    }
  }

  // ======================= integración: abrir Office directamente =======================
  const EXT = /\.(docx|xlsx|pptx|html?|txt|md|csv)$/i;
  FX.canConvert = f => EXT.test(f.name);
  FX.convertToPdfBytes = async f => {
    const b = new Uint8Array(await f.arrayBuffer()), ext = f.name.split('.').pop().toLowerCase();
    try {
      if (ext === 'docx') return await docxToPdf(b);
      if (ext === 'xlsx') return await xlsxToPdf(b);
      if (ext === 'pptx') return await pptxToPdf(b);
      if (ext === 'html' || ext === 'htm') return await htmlToPdf(dec.decode(b));
      if (ext === 'csv') { const rows = dec.decode(b).replace(/\r/g, '').split('\n').filter(Boolean).map(l => l.split(/[;,\t](?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => [{ text: c.replace(/^"|"$/g, '') }])); const out = await PDFDocument.create(), fl = new Flow(out, await makeFonts(out), 841.89, 595.28, { t: 40, r: 30, b: 40, l: 30 }); await fl.table(rows, null, { size: 9, header: true }); return out.save(); }
      return await textToPdf(dec.decode(b));
    } finally { $('#toast').classList.add('hidden'); }
  };
  const fo = $('#fileOpen'), fa = $('#fileAdd');
  [fo, fa].forEach(i => { i.accept = 'application/pdf,image/*,.docx,.xlsx,.pptx,.html,.htm,.txt,.md,.csv'; });
  function pickAndOpen(accept) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = true; i.onchange = () => loadFiles(i.files, true); i.click(); }

  // ======================= menú «Convertir» =======================
  async function run(label, fn, name, type) {
    if (!S.pages.length) return toast('Abre un documento primero');
    closeEditor();
    let target = null;
    if (name) { try { target = await FX.prepareSave([{ name, mime: type }]); } catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; } }
    try { const r = await fn(); done(); if (r !== undefined && target) toast(FX.savedMsg(await FX.commitSave(target, r, name, type)), 4000); else toast(`${label} listo ✓`, 3000); }
    catch (e) { console.error(e); done(); toast('No se pudo convertir: ' + e.message, 6000); }
  }
  function imagesDialog() {
    if (!S.pages.length) return toast('Abre un documento primero');
    openModal(`<h2>PDF a imágenes</h2>
      <div class="row"><label>Formato</label><select id="imFmt"><option value="image/png">PNG (mejor calidad)</option><option value="image/jpeg">JPG (menos peso)</option></select></div>
      <div class="row"><label>Resolución</label><select id="imDpi"><option value="96">96 ppp (pantalla)</option><option value="150" selected>150 ppp</option><option value="300">300 ppp (impresión)</option></select></div>
      <div class="row"><label>Páginas</label><select id="imWhich"><option value="all">Todas (${S.pages.length})</option><option value="cur">Página actual</option>${S.selPages.size ? `<option value="sel">Seleccionadas (${S.selPages.size})</option>` : ''}</select></div>
      <p class="hint" style="padding:0">Varias páginas se descargan juntas en un .zip.</p>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="imGo">Crear imágenes</button></div>`);
    $('#imGo').onclick = async () => {
      const f = $('#imFmt').value, dpi = +$('#imDpi').value, w = $('#imWhich').value, list = imgList(w);
      const outName = list.length === 1 ? `${baseName()}_pagina${S.pages.indexOf(list[0]) + 1}.${f === 'image/png' ? 'png' : 'jpg'}` : baseName() + '_imagenes.zip';
      let target; try { target = await FX.prepareSave([{ name: outName, mime: list.length === 1 ? f : 'application/zip' }]); } catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; }
      closeModal();
      try { await toImages(f, dpi, w, target, outName); } catch (e) { console.error(e); done(); toast('No se pudo crear las imágenes: ' + e.message, 6000); }
    };
  }
  const MIME = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  FX.convertItems = () => ([
    { label: 'PDF a Word (.docx)', icon: 'convert', action: () => run('Word', () => FX.toDocx(), baseName() + '.docx', MIME.docx) },
    { label: 'PDF a Excel (.xlsx)', icon: 'convert', action: () => run('Excel', toXlsx, baseName() + '.xlsx', MIME.xlsx) },
    { label: 'PDF a PowerPoint (.pptx)', icon: 'convert', action: () => run('PowerPoint', toPptx, baseName() + '.pptx', MIME.pptx) },
    { label: 'PDF a imágenes (PNG / JPG)…', icon: 'image', action: imagesDialog },
    { label: 'PDF a texto (.txt)', icon: 'text', action: () => run('Texto', async () => enc.encode(await toText()), baseName() + '.txt', 'text/plain;charset=utf-8') },
    { label: 'PDF a HTML (página web)', icon: 'convert', action: () => run('HTML', async () => enc.encode(await toHtml()), baseName() + '.html', 'text/html;charset=utf-8') },
    { label: 'Comprimir PDF…', icon: 'download', action: openCompress },
    '-',
    { label: 'Word a PDF…', icon: 'fileplus', action: () => pickAndOpen('.docx') },
    { label: 'Excel a PDF…', icon: 'fileplus', action: () => pickAndOpen('.xlsx,.csv') },
    { label: 'PowerPoint a PDF…', icon: 'fileplus', action: () => pickAndOpen('.pptx') },
    { label: 'Página web a PDF…', icon: 'link', action: webToPdf },
    { label: 'Archivo HTML o de texto a PDF…', icon: 'fileplus', action: () => pickAndOpen('.html,.htm,.txt,.md') },
    { label: 'Imágenes a PDF…', icon: 'image', action: () => pickAndOpen('image/*') },
    '-',
    { label: 'Dónde guardar los archivos…', icon: 'open', action: () => FX.openSaveSettings() }
  ]);
  FX.convertMenu = () => FX.showMenuAt('[data-act=convertMenu]', FX.convertItems());
  Object.assign(FX, { optimizeBytes, toText, toHtml, allLines, paragraphsOf, isCentered, openCompress, pickAndOpen, baseName });
  ACTIONS.convertMenu = FX.convertMenu;
  FX.addTopButton('<button data-act="convertMenu" title="Convertir a/desde Word, Excel, PowerPoint, imágenes…"><i data-i="convert"></i><span>Convertir</span></button>');
  Object.assign(FX, { toDocx, toXlsx, toPptx, toText, toHtml, docxToPdf, xlsxToPdf, pptxToPdf, htmlToPdf, textToPdf, optimizeBytes, zip, unzip });
})();
