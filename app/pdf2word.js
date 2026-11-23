/* DM Studio · PDF — PDF a Word con maquetación: tablas reales, negritas y colores por palabra,
   imagen junto al texto, líneas bajo los títulos, justificado, márgenes y estilos de título. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
  const tw = pt => Math.max(0, Math.round(pt * 20));           // puntos → twips
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

  // ---------- muestreo de colores sobre la página dibujada ----------
  function sampler(cv, k) {
    const W = cv.width, H = cv.height, data = cv.getContext('2d').getImageData(0, 0, W, H).data;
    const px = (x, y) => { x = Math.max(0, Math.min(W - 1, x | 0)); y = Math.max(0, Math.min(H - 1, y | 0)); const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
    const mode = pts => { const m = new Map(); for (const c of pts) { const key = c.map(v => v >> 3).join(','); const e = m.get(key) || { n: 0, s: [0, 0, 0] }; e.n++; c.forEach((v, i) => { e.s[i] += v; }); m.set(key, e); } const b = [...m.values()].sort((a, b2) => b2.n - a.n)[0]; return b ? b.s.map(v => Math.round(v / b.n)) : [255, 255, 255]; };
    const hex = c => c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    return {
      hex,
      bg(b) { const pts = [], x0 = b.x * k, y0 = b.y * k, x1 = (b.x + b.w) * k, y1 = (b.y + b.h) * k, sx = Math.max(1, (x1 - x0) / 50), sy = Math.max(1, (y1 - y0) / 20); for (let y = y0; y < y1; y += sy) for (let x = x0; x < x1; x += sx) pts.push(px(x, y)); return mode(pts); },
      fg(b, bg) { let best = null, far = -1; const x0 = b.x * k, y0 = b.y * k, x1 = (b.x + b.w) * k, y1 = (b.y + b.h) * k; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const c = px(x, y), d = (c[0] - bg[0]) ** 2 + (c[1] - bg[1]) ** 2 + (c[2] - bg[2]) ** 2; if (d > far) { far = d; best = c; } } return far > 5000 ? best : null; },
      at(x, y) { return px(x * k, y * k); }
    };
  }
  const isWhite = c => c[0] > 238 && c[1] > 238 && c[2] > 238;
  const isDark = c => c[0] < 70 && c[1] < 70 && c[2] < 70 && Math.max(...c) - Math.min(...c) < 25;

  // ---------- nombre de fuente para Word ----------
  function officeFont(f) {
    let n = (f?.fontName || '').replace(/^[A-Z]{6}\+/, '').replace(/[-,].*$/, '').replace(/(PS)?MT$/, '').replace(/PS$/, '');
    n = n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim();
    if (!n || /^(Liberation|Helvetica)/i.test(n)) return f?.family === 'Times' ? 'Times New Roman' : f?.family === 'Courier' ? 'Courier New' : 'Arial';
    return n;
  }

  // ---------- tablas: líneas horizontales + bandas de color + huecos verticales entre columnas ----------
  function detectTables(lines, shapes, g) {
    const hl = [];
    for (const s of shapes) {
      if (s.h <= 2.5 && s.w >= 40) hl.push({ x1: s.x, x2: s.x + s.w, y: s.y + s.h / 2 });
      else if (s.kind === 'fill' && s.h >= 6 && s.h <= 90 && s.w >= g.dw * 0.25) { hl.push({ x1: s.x, x2: s.x + s.w, y: s.y, band: s }); hl.push({ x1: s.x, x2: s.x + s.w, y: s.y + s.h, band: s }); }
    }
    const clusters = [];
    for (const h of hl.sort((a, b) => a.y - b.y)) {
      const c = clusters.find(c2 => Math.abs(c2.x1 - h.x1) < 5 && Math.abs(c2.x2 - h.x2) < 5 && h.y - c2.ys[c2.ys.length - 1] < 160);
      if (c) { if (h.y - c.ys[c.ys.length - 1] > 1.5) c.ys.push(h.y); if (h.band) c.bands.push(h.band); } else clusters.push({ x1: h.x1, x2: h.x2, ys: [h.y], bands: h.band ? [h.band] : [] });
    }
    const words = lines.flatMap(l => (l.words?.length ? l.words : [{ x1: l.x1, x2: l.x2, str: l.str }]).map(w => ({ ...w, l, cy: (l.top + l.bottom) / 2 })));
    const tables = [];
    for (const c of clusters) {
      if (c.ys.length < 2) continue;
      // cada intervalo entre líneas es una fila si su texto está separado en columnas
      let rows = [];
      const flush = () => { if (rows.length >= 1) tables.push({ x1: c.x1, x2: c.x2, rows, bands: c.bands }); rows = []; };
      for (let i = 0; i < c.ys.length - 1; i++) {
        const y1 = c.ys[i], y2 = c.ys[i + 1], ws = words.filter(w => w.cy > y1 && w.cy < y2 && w.x1 >= c.x1 - 2 && w.x2 <= c.x2 + 2);
        if (!ws.length) { if (y2 - y1 > 30) flush(); continue; }
        const byBase = new Map(); ws.forEach(w => { const k = Math.round(w.l.base); (byBase.get(k) || byBase.set(k, []).get(k)).push(w); });
        const rowLike = [...byBase.values()].some(list => { list.sort((a, b) => a.x1 - b.x1); return list.some((w, j) => j && w.x1 - list[j - 1].x2 >= Math.max(9, (w.l.fs || 10) * 0.9)); });
        if (rowLike || (rows.length && ws.length <= 4)) rows.push({ y1, y2, ws }); else flush();
      }
      flush();
    }
    // columnas: huecos verticales sin texto dentro de la tabla
    for (const t of tables) {
      const all = t.rows.flatMap(r => r.ws), x0 = Math.floor(t.x1), n = Math.ceil(t.x2 - t.x1) + 1, cov = new Uint8Array(n);
      all.forEach(w => { for (let x = Math.max(0, Math.floor(w.x1 - x0 - 1)); x <= Math.min(n - 1, Math.ceil(w.x2 - x0 + 1)); x++) cov[x] = 1; });
      const cuts = []; let s = -1;
      for (let x = 0; x < n; x++) { if (!cov[x] && s < 0) s = x; if ((cov[x] || x === n - 1) && s >= 0) { const e = cov[x] ? x : x + 1; const first = cov.findIndex(v => v), last = n - 1 - [...cov].reverse().findIndex(v => v); if (s > first && e <= last && e - s >= 4) cuts.push(x0 + (s + e) / 2); s = -1; } }
      t.cols = [t.x1, ...cuts, t.x2];
      t.words = new Set(all);
    }
    const ruled = tables.filter(t => t.cols.length >= 3);
    // tablas hechas de rectángulos de celda en mosaico (PDF impresos desde una web o desde Word)
    const tiled = detectTiledTables(words, shapes, g);
    return [...tiled, ...ruled.filter(t => !tiled.some(u => t.rows[0].y1 < u.rows[u.rows.length - 1].y2 && t.rows[t.rows.length - 1].y2 > u.rows[0].y1))];
  }
  function detectTiledTables(words, shapes, g) {
    const rects = shapes.filter(s => s.kind === 'fill' && s.h >= 6 && s.w >= 8 && s.w < g.dw * 0.98).sort((a, b) => a.y - b.y || a.x - b.x);
    const bands = [];
    for (const r of rects) {
      const row = bands.find(t => Math.abs(t.y - r.y) < 1.2 && Math.abs(t.h - r.h) < 1.2 && Math.abs(t.x2 - r.x) < 1.5);
      if (row) { row.edges.push(r.x + r.w); row.x2 = r.x + r.w; row.n++; } else bands.push({ y: r.y, h: r.h, x1: r.x, x2: r.x + r.w, edges: [r.x, r.x + r.w], n: 1 });
    }
    const groups = [];
    for (const b of bands.filter(x => x.n >= 2).sort((a, c) => a.y - c.y)) {
      // misma tabla: mismo ancho, mismas columnas y sin separarse mucho (si no, son tablas distintas)
      const sameCols = t => t.bands[0].edges.length === b.edges.length && b.edges.every((e, i) => Math.abs(e - t.bands[0].edges[i]) < 2.5);
      const gr = groups.find(t => Math.abs(t.x1 - b.x1) < 2.5 && Math.abs(t.x2 - b.x2) < 2.5 && b.y - t.bottom < 80 && (sameCols(t) || b.y - t.bottom < 2));
      if (gr) { gr.bands.push(b); gr.bottom = b.y + b.h; } else groups.push({ x1: b.x1, x2: b.x2, bands: [b], bottom: b.y + b.h });
    }
    const out = [];
    for (const gr of groups) {
      const edges = []; gr.bands.flatMap(b => b.edges).sort((a, b) => a - b).forEach(e => { if (!edges.length || e - edges[edges.length - 1] > 2) edges.push(e); });
      if (edges.length < 3) continue;
      const rules = shapes.filter(s => s.h <= 2.5 && Math.abs(s.x - gr.x1) < 3 && Math.abs(s.x + s.w - gr.x2) < 3).map(s => s.y + s.h / 2);
      const ys = []; [...gr.bands.flatMap(b => [b.y, b.y + b.h]), ...rules.filter(y => y > gr.bands[0].y - 1 && y < gr.bottom + 200)].sort((a, b) => a - b).forEach(y => { if (!ys.length || y - ys[ys.length - 1] > 1.5) ys.push(y); });
      const inX = w => w.x1 >= gr.x1 - 2 && w.x2 <= gr.x2 + 2;
      const rows = [];
      const crosses = l => { const n = edges.filter(e => e > gr.x1 + 2 && e < gr.x2 - 2 && l.x1 < e - 3 && l.x2 > e + 3).length; return n >= 2 || (n === 1 && l.x2 - l.x1 > (gr.x2 - gr.x1) * 0.6); };
      for (let i = 0; i < ys.length - 1; i++) {
        const ws = words.filter(w => w.cy > ys[i] && w.cy < ys[i + 1] && inX(w)); if (!ws.length) continue;
        if (ws.some(w => crosses(w.l)) && !gr.bands.some(b => Math.abs(b.y - ys[i]) < 1.5)) break; // texto corrido: la tabla terminó
        rows.push({ y1: ys[i], y2: ys[i + 1], ws });
      }
      // última fila sin fondo ni borde inferior: las líneas que siguen pegadas y encajan en las columnas
      const last = ys[ys.length - 1], below = words.filter(w => w.cy > last && inX(w)).sort((a, b) => a.l.top - b.l.top);
      if (below.length) {
        const trail = []; let bottom = last;
        for (const w of below) {
          if (w.l.top - bottom > 9 && !trail.some(t => t.l === w.l)) break;
          if (crosses(w.l)) break; // la línea cruza una columna: ya no es tabla
          trail.push(w); bottom = Math.max(bottom, w.l.bottom);
        }
        if (trail.length) rows.push({ y1: last, y2: bottom + 2, ws: trail });
      }
      if (!rows.length) continue;
      out.push({ x1: gr.x1, x2: gr.x2, rows, cols: edges, words: new Set(rows.flatMap(r => r.ws)), tiled: true });
    }
    return out;
  }

  // ---------- párrafos con estilo por palabra ----------
  function wordsOfPara(pl) {
    const out = [];
    pl.forEach((l, li) => {
      const ws = l.words?.length ? l.words : [{ x1: l.x1, x2: l.x2, str: l.str, f: { family: l.family, bold: l.bold, italic: l.italic, fontName: l.fontName }, fs: l.fs }];
      ws.forEach((w, wi) => {
        let str = w.str;
        const lastOfLine = wi === ws.length - 1, next = pl[li + 1];
        const hyph = lastOfLine && next && /-$/.test(str) && /^\p{Ll}/u.test((next.words?.[0]?.str || next.str || ''));
        if (hyph) str = str.slice(0, -1);
        out.push({ str, sp: !hyph && !(lastOfLine && li === pl.length - 1), w, l });
      });
    });
    return out;
  }
  function runsXml(items, colorOf) {
    // agrupa palabras consecutivas con el mismo estilo en un solo «run»
    const runs = [];
    for (const it of items) {
      const f = it.w.f || {}, st = { bold: !!f.bold, italic: !!f.italic, size: Math.round((it.w.fs || it.l.fs) * 2), font: officeFont(f), color: colorOf(it) };
      const key = JSON.stringify(st), last = runs[runs.length - 1];
      if (last && last.key === key) last.text += it.str + (it.sp ? ' ' : ''); else runs.push({ key, st, text: it.str + (it.sp ? ' ' : '') });
    }
    return runs.map(r => `<w:r><w:rPr><w:rFonts w:ascii="${xe(r.st.font)}" w:hAnsi="${xe(r.st.font)}" w:cs="${xe(r.st.font)}"/>${r.st.bold ? '<w:b/>' : ''}${r.st.italic ? '<w:i/>' : ''}${r.st.color ? `<w:color w:val="${r.st.color}"/>` : ''}<w:sz w:val="${r.st.size}"/><w:szCs w:val="${r.st.size}"/></w:rPr><w:t xml:space="preserve">${xe(r.text)}</w:t></w:r>`).join('');
  }
  function paraAlign(pl, g, area) {
    const x1 = Math.min(...pl.map(l => l.x1)), x2 = Math.max(...pl.map(l => l.x2));
    if (pl.length >= 2 && pl.slice(0, -1).every(l => Math.abs(l.x2 - x2) < 2.5) && pl.every(l => Math.abs(l.x1 - x1) < 14) && x2 - x1 > (area.x2 - area.x1) * 0.6) return 'both';
    const mid = (area.x1 + area.x2) / 2;
    if (x1 > area.x1 + 20 && Math.abs((x1 + x2) / 2 - mid) < 6 && x2 < area.x2 - 20) return 'center';
    if (x1 > mid && Math.abs(x2 - area.x2) < 4) return 'right';
    return null;
  }

  // ---------- documento ----------
  async function toDocxLayout() {
    const body = [], media = [];
    let imgN = 0, layout = null, carry = null; // carry: párrafo que puede seguir en la página siguiente
    const addImage = async (c, wPt, hPt, maxW) => {
      const jpg = c.width * c.height > 1.5e6, data = new Uint8Array(await (await new Promise(r => c.toBlob(r, jpg ? 'image/jpeg' : 'image/png', 0.88))).arrayBuffer());
      const n = ++imgN, ext = jpg ? 'jpeg' : 'png'; media.push({ name: `word/media/image${n}.${ext}`, data });
      let w = wPt, h = hPt; if (w > maxW) { h *= maxW / w; w = maxW; }
      const cx = Math.round(w * 12700), cy = Math.round(h * 12700);
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Imagen ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="image${n}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    };
    // tamaño de letra habitual del documento (para decidir qué es un título)
    const allFs = [];
    for (const pg of S.pages) (await pageLines(pg)).forEach(l => (l.words || [l]).forEach(w => allFs.push(w.fs || l.fs)));
    const bodyFs = median(allFs) || 11;

    for (let pi = 0; pi < S.pages.length; pi++) {
      const pg = S.pages[pi], g = geom(pg);
      toast(`Convirtiendo a Word: página ${pi + 1} de ${S.pages.length}…`, 120000); await sleep(0);
      const lines = await allLines(pg);
      await getImages(pg).catch(() => []);
      const shapes = (pdfShapeCache.get(lineKey(pg)) || []).filter(sh => !isShapeCovered(pg, sh));
      const imgs = (pdfImgCache.get(lineKey(pg)) || []).filter(im => !isImgCovered(pg, im));
      const K = 2, cv = await FX.renderPageCanvas(pg, K), smp = sampler(cv, K);
      const colorCache = new Map();
      const colorOf = it => {
        const w = it.w, key = w; if (colorCache.has(key)) return colorCache.get(key);
        const box = { x: w.x1, y: it.l.top, w: Math.max(1, w.x2 - w.x1), h: Math.max(1, it.l.bottom - it.l.top) };
        const bg = smp.bg({ x: box.x - 2, y: box.y - 2, w: box.w + 4, h: box.h + 4 }), fg = smp.fg(box, bg);
        const v = fg && !isDark(fg) ? smp.hex(fg) : null; colorCache.set(key, v); return v;
      };
      // área de contenido (márgenes de Word sacados de la primera página con contenido)
      const xs = [...lines.flatMap(l => [l.x1, l.x2]), ...imgs.flatMap(im => [im.x, im.x + im.w])];
      if (!layout && xs.length) {
        const left = Math.max(18, Math.min(108, Math.min(...xs) - 2)), right = Math.max(18, Math.min(108, g.dw - Math.max(...xs) - 2));
        const top = Math.max(18, Math.min(72, Math.min(...lines.map(l => l.top), ...imgs.map(im => im.y)) - 4));
        layout = { W: g.dw, H: g.dh, left, right, top, bottom: Math.max(28, Math.min(72, top)) };
      }
      const L0 = layout || { W: g.dw, H: g.dh, left: 54, right: 54, top: 54, bottom: 54 };
      const area = { x1: L0.left, x2: g.dw - L0.right }, usable = area.x2 - area.x1;

      // 1) tablas
      const tables = detectTables(lines, shapes, g);
      const tableWords = new Set(tables.flatMap(t => [...t.words]));
      const restLines = lines.map(l => (l.words?.length ? { ...l, words: l.words.filter(w => ![...tableWords].some(tw2 => tw2.l === l && tw2.x1 === w.x1)) } : l))
        .filter(l => !(l.words && l.words.length === 0) && !tables.some(t => (l.top + l.bottom) / 2 > t.rows[0].y1 && (l.top + l.bottom) / 2 < t.rows[t.rows.length - 1].y2 && l.x1 >= t.x1 - 2 && l.x2 <= t.x2 + 2))
        .map(l => (l.words?.length ? { ...l, x1: Math.min(...l.words.map(w => w.x1)), x2: Math.max(...l.words.map(w => w.x2)) } : l));
      // 2) líneas sueltas (reglas bajo títulos)
      const inTableSpan = s => tables.some(t => s.y + s.h / 2 >= t.rows[0].y1 - 4 && s.y + s.h / 2 <= t.rows[t.rows.length - 1].y2 + 4 && s.x >= t.x1 - 4 && s.x + s.w <= t.x2 + 4);
      const rules = shapes.filter(s => s.h <= 4 && s.w >= g.dw * 0.25 && !inTableSpan(s))
        .map(s => ({ y: s.y, h: s.h, x1: s.x, x2: s.x + s.w, color: smp.hex(smp.at(s.x + s.w / 2, s.y + s.h / 2)) }));
      // 3) párrafos e imágenes
      // un párrafo no cruza una línea horizontal ni cambia de tamaño de letra (título + texto)
      const ruleYs = rules.map(r => r.y + r.h / 2);
      // también se corta donde una línea acaba mucho antes del margen (era un salto de línea, no texto corrido)
      const split = pl => { const maxX = Math.max(...pl.map(l => l.x2)), out = [[pl[0]]]; for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i], fw = b.words?.[0] ? b.words[0].x2 - b.words[0].x1 : a.fs * 3, shortLine = maxX - a.x2 > fw + a.fs * 0.8; if (ruleYs.some(y => y > a.bottom - 1 && y < b.top + 1) || Math.abs(a.fs - b.fs) > Math.min(a.fs, b.fs) * 0.08 || shortLine) out.push([b]); else out[out.length - 1].push(b); } return out; };
      const paras = paragraphsOf(restLines).flatMap(split).map(pl => ({ kind: 'p', pl, y: Math.min(...pl.map(l => l.top)), y2: Math.max(...pl.map(l => l.bottom)), x1: Math.min(...pl.map(l => l.x1)), x2: Math.max(...pl.map(l => l.x2)) }));
      const items = [...paras, ...tables.map(t => ({ kind: 't', t, y: t.rows[0].y1, y2: t.rows[t.rows.length - 1].y2 }))];
      for (const im of imgs) items.push({ kind: 'i', im, y: im.y, y2: im.y + im.h, x1: im.x, x2: im.x + im.w });
      pg.annots.filter(a => a.type === 'image').forEach(a => items.push({ kind: 'ia', a, y: a.ay, y2: a.ay + a.h, x1: a.ax, x2: a.ax + a.w }));
      // 4) imagen con texto a su lado → tabla sin bordes de dos columnas
      for (const it of items.filter(x => x.kind === 'i' || x.kind === 'ia')) {
        const side = items.filter(p => p.kind === 'p' && !p.used && p.x1 >= it.x2 - 4 && p.y < it.y2 && p.y2 > it.y - 4);
        if (side.length && it.x2 - it.x1 < usable * 0.45) { side.forEach(p => { p.used = true; }); it.side = side.sort((a, b) => a.y - b.y); it.y2 = Math.max(it.y2, ...side.map(p => p.y2)); }
      }
      const flow = items.filter(x => !x.used).sort((a, b) => a.y - b.y || (a.x1 || 0) - (b.x1 || 0));
      if (!flow.length) flow.push({ kind: 'full', y: 0, y2: g.dh });
      // regla debajo de un elemento → borde inferior de ese párrafo
      for (const r of rules) { const above = flow.filter(f => f.y2 <= r.y + 2 && r.y - f.y2 < 16).sort((a, b) => b.y2 - a.y2)[0]; if (above && above.kind === 'p' && !above.rule) above.rule = r; else flow.push({ kind: 'r', r, y: r.y, y2: r.y + r.h }); }
      flow.sort((a, b) => a.y - b.y);

      const paraXml = (p, next, inCell) => {
        const words = wordsOfPara(p.pl), fs = median(words.map(it => it.w.fs || it.l.fs)) || bodyFs;
        const text = words.map(it => it.str).join(' '), allBold = words.every(it => it.w.f?.bold);
        const heading = !inCell && text.length < 140 && p.pl.length <= 3 && (fs >= bodyFs * 1.18 || (allBold && fs >= bodyFs * 1.05 && p.rule));
        const style = heading ? (fs >= bodyFs * 1.5 ? 'Heading1' : 'Heading2') : null;
        const al = inCell ? null : paraAlign(p.pl, g, area);
        const gap = next ? Math.max(0, Math.min(36, next.y - p.y2)) : 6;
        const lh = p.pl.length > 1 ? median(p.pl.slice(1).map((l, i) => l.base - p.pl[i].base)) : 0;
        const ind = !inCell && p.x1 - area.x1 > 8 && al !== 'center' && al !== 'right' ? `<w:ind w:left="${tw(p.x1 - area.x1)}"/>` : '';
        const bdr = p.rule ? `<w:pBdr><w:bottom w:val="single" w:sz="${Math.max(4, Math.min(48, Math.round(p.rule.h * 8)))}" w:space="${Math.max(0, Math.min(20, Math.round(p.rule.y - p.y2 - 1)))}" w:color="${p.rule.color}"/></w:pBdr>` : '';
        return `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${bdr}<w:spacing w:before="0" w:after="${tw(inCell ? 0 : gap * 0.85)}"${lh > fs * 0.9 && lh < fs * 2.2 ? ` w:line="${tw(lh)}" w:lineRule="exact"` : ''}/>${ind}${al ? `<w:jc w:val="${al}"/>` : ''}</w:pPr>${runsXml(words, colorOf)}</w:p>`;
      };
      for (let fi = 0; fi < flow.length; fi++) {
        const it = flow[fi], next = flow[fi + 1];
        if (it.kind === 'p') {
          const words = wordsOfPara(it.pl), first = words[0]?.str || '', text = words.map(x => x.str).join(' ');
          let idx;
          if (fi === 0 && carry !== null && /^\p{Ll}/u.test(first)) { // continúa el párrafo de la página anterior
            body[carry] = body[carry].replace(/<\/w:p>$/, '<w:r><w:t xml:space="preserve"> </w:t></w:r>' + runsXml(words, colorOf) + '</w:p>');
            idx = carry;
          } else { body.push(paraXml(it, next, false)); idx = body.length - 1; }
          carry = !/[.:;!?»)"”]\s*$/.test(text) && words.length > 3 ? idx : null;
          continue;
        }
        carry = null;
        if (it.kind === 'r') body.push(`<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="${Math.max(4, Math.min(48, Math.round(it.r.h * 8)))}" w:space="1" w:color="${it.r.color}"/></w:pBdr><w:spacing w:before="0" w:after="${tw(next ? Math.max(0, Math.min(24, next.y - it.y2)) : 6)}" w:line="20" w:lineRule="exact"/></w:pPr></w:p>`);
        else if (it.kind === 't') body.push(tableXml(it.t, smp, colorOf, usable), `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${tw(next ? Math.max(4, Math.min(24, next.y - it.y2)) : 8)}" w:lineRule="exact"/></w:pPr></w:p>`);
        else {
          let c, wPt, hPt;
          if (it.kind === 'full') { c = await FX.renderPageCanvas(pg, 2); wPt = g.dw; hPt = g.dh; }
          else if (it.kind === 'i') { c = await extractPdfImage(pg, it.im); wPt = it.im.w; hPt = it.im.h; }
          else { const im = await loadImg(imgData(it.a)); c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); wPt = it.a.w; hPt = it.a.h; }
          if (it.side) {
            const leftW = (it.x2 - it.x1) + Math.max(6, Math.min(30, it.side[0].x1 - it.x2)), rightW = usable - leftW;
            const run = await addImage(c, wPt, hPt, leftW - 4);
            const cells = it.side.map((p, k) => paraXml(p, it.side[k + 1], true)).join('');
            body.push(`<w:tbl><w:tblPr><w:tblW w:w="${tw(usable)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${tw(leftW)}"/><w:gridCol w:w="${tw(rightW)}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${tw(leftW)}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${run}</w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${tw(rightW)}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${cells}</w:tc></w:tr></w:tbl>`,
              `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${tw(next ? Math.max(4, Math.min(24, next.y - it.y2)) : 6)}" w:lineRule="exact"/></w:pPr></w:p>`);
          } else {
            const al = it.kind !== 'full' && Math.abs(((it.x1 + it.x2) / 2) - (area.x1 + area.x2) / 2) < 12 && it.x1 > area.x1 + 10 ? '<w:jc w:val="center"/>' : '';
            body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="${tw(next ? Math.max(0, Math.min(24, next.y - it.y2)) : 6)}"/>${al}</w:pPr>${await addImage(c, wPt, hPt, usable)}</w:p>`);
          }
        }
      }
    }
    const L = layout || { W: 595.28, H: 841.89, left: 54, right: 54, top: 54, bottom: 54 };
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
      { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(S.name)}</dc:title><dc:creator>DM Studio · PDF</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
      { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map((m, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.name.replace('word/', '')}"/>`).join('')}</Relationships>` },
      { name: 'word/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${Math.round(bodyFsGlobal() * 2)}"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>` },
      { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${tw(L.W)}" w:h="${tw(L.H)}"${L.W > L.H ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${tw(L.top)}" w:right="${tw(L.right)}" w:bottom="${tw(L.bottom)}" w:left="${tw(L.left)}" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>` },
      ...media
    ];
    $('#toast').classList.add('hidden');
    return FX.zip(files);
    function bodyFsGlobal() { return bodyFs; }
  }

  function tableXml(t, smp, colorOf, usable) {
    const widths = t.cols.slice(1).map((x, i) => x - t.cols[i]), total = widths.reduce((a, b) => a + b, 0), scale = Math.min(1, usable / total), W = widths.map(w => w * scale);
    const ruleColor = 'D0D5DD';
    const rowsXml = t.rows.map((r, ri) => {
      const rowBox = { x: t.x1, y: r.y1 + 0.5, w: t.x2 - t.x1, h: Math.max(1, r.y2 - r.y1 - 1) }, rowBg = smp.bg(rowBox), shade = !isWhite(rowBg) ? smp.hex(rowBg) : null;
      const cells = W.map((w, ci) => {
        const cx1 = t.cols[ci], cx2 = t.cols[ci + 1], ws = r.ws.filter(wd => (wd.x1 + wd.x2) / 2 > cx1 && (wd.x1 + wd.x2) / 2 < cx2);
        // líneas de la celda (por línea base)
        const byBase = []; ws.sort((a, b) => a.l.base - b.l.base || a.x1 - b.x1).forEach(wd => { const ln = byBase.find(x => Math.abs(x.base - wd.l.base) < 2); if (ln) ln.ws.push(wd); else byBase.push({ base: wd.l.base, ws: [wd] }); });
        const items = []; byBase.forEach((ln, li) => ln.ws.forEach((wd, wi) => items.push({ str: wd.str, sp: !(li === byBase.length - 1 && wi === ln.ws.length - 1), w: wd, l: wd.l })));
        const right = ws.length && Math.abs(Math.max(...ws.map(x => x.x2)) - cx2) < 12 && Math.min(...ws.map(x => x.x1)) - cx1 > 12;
        const runs = items.length ? runsXml(items, it => { const v = colorOf(it); return v; }) : '';
        return `<w:tc><w:tcPr><w:tcW w:w="${tw(w)}" w:type="dxa"/>${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40"/>${right ? '<w:jc w:val="right"/>' : ''}</w:pPr>${runs}</w:p></w:tc>`;
      }).join('');
      // la fila de encabezado (con fondo) se repite si la tabla continúa en otra página
      return `<w:tr><w:trPr><w:cantSplit/>${ri === 0 && shade && t.rows.length > 2 ? '<w:tblHeader/>' : ''}</w:trPr>${cells}</w:tr>`;
    }).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${tw(W.reduce((a, b) => a + b, 0))}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="${ruleColor}"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="${ruleColor}"/><w:right w:val="nil"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="${ruleColor}"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${W.map(w => `<w:gridCol w:w="${tw(w)}"/>`).join('')}</w:tblGrid>${rowsXml}</w:tbl>`;
  }

  // utilidades de convert.js que reutilizamos
  const pageLines = async pg => { try { return await getLines(pg); } catch { return []; } };
  const allLines = async pg => {
    const covers = pg.annots.filter(a => a.type === 'textedit' || a.type === 'cover' || a.type === 'redact');
    const own = (await pageLines(pg)).filter(l => !covers.some(a => !a.real && insideBox({ x: (l.x1 + l.x2) / 2, y: (l.top + l.bottom) / 2 }, a)));
    const ann = pg.annots.filter(a => (a.type === 'text' || a.type === 'textedit') && a.text).flatMap(a => {
      const x = a.type === 'text' ? a.ax : a.tx, base = a.type === 'text' ? a.ay + a.fs : a.ty, lh = a.lh || a.fs * 1.2;
      return a.text.split('\n').map((t, i) => ({ str: t, x1: x, x2: x + textWidth(t, a.fs, a), base: base + i * lh, top: base + i * lh - a.fs * 0.8, bottom: base + i * lh + a.fs * 0.2, fs: a.fs, family: a.family || 'Helvetica', bold: a.bold, italic: a.italic }));
    }).filter(l => l.str.trim());
    return [...own, ...ann];
  };
  const paragraphsOf = lines => {
    let left = [...lines].sort((a, b) => a.base - b.base || a.x1 - b.x1); const paras = [];
    while (left.length) { const { lines: pl } = FX.findParagraph(left, left[0]); paras.push(pl); left = left.filter(l => !pl.includes(l)); }
    return paras;
  };
  FX.toDocx = toDocxLayout;
  FX.detectTables = detectTables;
})();
