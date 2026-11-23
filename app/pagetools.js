/* DM Studio · PDF — recortar páginas (a mano o quitando márgenes blancos) y numeración de páginas
   con etiquetas (i, ii, iii… 1, 2, 3…), que se guardan en el PDF como las de Acrobat. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const { PDFDocument, PDFName, PDFString, PDFHexString } = PDFLib;

  // =================== RECORTAR ===================
  // mueve todas las coordenadas de una anotación
  function shiftAnn(a, dx, dy) {
    for (const [kx, ky] of [['x', 'y'], ['ax', 'ay'], ['tx', 'ty']]) if (kx in a) { a[kx] += dx; a[ky] += dy; }
    if (a.pts) a.pts = a.pts.map(p => [p[0] + dx, p[1] + dy]);
    if (a.cover) a.cover = { ...a.cover, x: a.cover.x + dx, y: a.cover.y + dy };
  }
  // rect en coordenadas de pantalla (puntos, página girada) -> caja en el espacio del PDF
  async function toPdfBox(pg, r) {
    const g = geom(pg), p = await src(pg.src).pdf.getPage(pg.idx + 1), vp = p.getViewport({ scale: 1, rotation: g.R });
    const c = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].map(([x, y]) => vp.convertToPdfPoint(x, y));
    const xs = c.map(q => q[0]), ys = c.map(q => q[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // rects: Map(pg -> rect en pantalla). Escribe la caja de recorte y vuelve a cargar las páginas
  async function applyCrop(rects) {
    if (!rects.size) return;
    toast('Recortando…', 30000);
    pushHistory();
    const bySrc = new Map();
    for (const [pg, r] of rects) { if (!bySrc.has(pg.src)) bySrc.set(pg.src, []); bySrc.get(pg.src).push([pg, r]); }
    for (const [sid, list] of bySrc) {
      const s = src(sid), d = await PDFDocument.load(s.bytes, { ignoreEncryption: true });
      for (const [pg, r] of list) {
        const b = await toPdfBox(pg, r), page = d.getPage(pg.idx), mb = page.getMediaBox();
        const x1 = Math.max(mb.x, b.x), y1 = Math.max(mb.y, b.y), x2 = Math.min(mb.x + mb.width, b.x + b.w), y2 = Math.min(mb.y + mb.height, b.y + b.h);
        if (x2 - x1 < 10 || y2 - y1 < 10) continue;
        page.setCropBox(x1, y1, x2 - x1, y2 - y1);
        try { page.node.delete(PDFName.of('TrimBox')); page.node.delete(PDFName.of('ArtBox')); page.node.delete(PDFName.of('BleedBox')); } catch { }
      }
      const ns = await addSource(await d.save(), s.name);
      ns.formValues = { ...s.formValues };
      for (const pg of S.pages) if (pg.src === sid) {
        const r = rects.get(pg);
        if (r) pg.annots.forEach(a => shiftAnn(a, -r.x, -r.y));
        pg.src = ns.id;
      }
    }
    $('#toast').classList.add('hidden');
    rebuild(true); toast('Páginas recortadas · Ctrl+Z para deshacer', 3500);
  }
  // zona con contenido (sin márgenes blancos) de una página, en puntos de pantalla
  async function contentBox(pg, pad = 8) {
    const g = geom(pg), sc = 1.5, c = await FX.renderPageCanvas(pg, sc), ctx = c.getContext('2d'), { data, width: W, height: H } = ctx.getImageData(0, 0, c.width, c.height);
    let x1 = W, y1 = H, x2 = -1, y2 = -1;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4; if (data[i + 3] < 20) continue;
      if (data[i] < 238 || data[i + 1] < 238 || data[i + 2] < 238) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
    }
    if (x2 < 0) return null;
    const k = W / g.dw;
    const r = { x: Math.max(0, x1 / k - pad), y: Math.max(0, y1 / k - pad) };
    r.w = Math.min(g.dw, x2 / k + pad) - r.x; r.h = Math.min(g.dh, y2 / k + pad) - r.y;
    return r;
  }
  function cropDialog(pg, r) {
    const nSel = S.pages.filter(p => S.selPages.has(p.id)).length;
    openModal(`<h2>Recortar páginas</h2>
      <div class="row"><label>Zona</label><span>${r ? `${Math.round(r.w)} × ${Math.round(r.h)} pt (${Math.round(r.w * 0.3528)} × ${Math.round(r.h * 0.3528)} mm)` : 'Quitar los márgenes blancos de cada página'}</span></div>
      <fieldset><legend>Aplicar a</legend>
        <label><input type="radio" name="crW" value="cur" checked> Esta página (${S.pages.indexOf(pg) + 1})</label>
        <label><input type="radio" name="crW" value="all"> Todas (${S.pages.length})</label>
        <label><input type="radio" name="crW" value="sel" ${nSel ? '' : 'disabled'}> Seleccionadas (${nSel})</label>
        <label><input type="radio" name="crW" value="range"> Rango <input id="crRange" placeholder="1-3, 5" style="max-width:110px"></label>
      </fieldset>
      ${r ? '' : '<div class="row"><label>Margen que se deja</label><input type="number" id="crPad" value="8" min="0" max="72" style="max-width:70px"> pt</div>'}
      <p class="hint" style="padding:0">Recortar oculta lo que queda fuera (no lo borra): con Ctrl+Z vuelve todo.</p>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="crOk">Recortar</button></div>`);
    $('#crRange').onfocus = () => { document.querySelector('[name=crW][value=range]').checked = true; };
    $('#crOk').onclick = async () => {
      const w = document.querySelector('[name=crW]:checked').value;
      const list = w === 'all' ? S.pages : w === 'sel' ? S.pages.filter(p => S.selPages.has(p.id)) : w === 'range' ? parseRange($('#crRange').value, S.pages.length).map(i => S.pages[i]) : [pg];
      if (!list.length) return toast('No hay páginas en ese rango');
      closeModal();
      const rects = new Map(), pad = r ? 0 : +($('#crPad')?.value ?? 8);
      for (const p of list) {
        let q = r;
        if (!r) { toast(`Buscando márgenes… página ${S.pages.indexOf(p) + 1}`, 30000); q = await contentBox(p, pad); }
        else { const g = geom(p); q = { x: Math.min(r.x, g.dw - 10), y: Math.min(r.y, g.dh - 10) }; q.w = Math.min(r.w, g.dw - q.x); q.h = Math.min(r.h, g.dh - q.y); }
        if (q && q.w > 10 && q.h > 10) rects.set(p, q);
      }
      await applyCrop(rects);
    };
  }
  // herramienta: arrastrar el rectángulo a conservar
  $('#viewer').addEventListener('pointerdown', e => {
    if (S.tool !== 'crop' || e.button !== 0) return;
    const d = e.target.closest('.page'); if (!d) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const pg = pageById(d.dataset.id), p0 = toPt(e, d), box = document.createElement('div'); box.className = 'rubber crop-rubber'; d.appendChild(box);
    let p1 = p0;
    dragLoop(ev => { p1 = toPt(ev, d); Object.assign(box.style, { left: Math.min(p0.x, p1.x) * S.scale + 'px', top: Math.min(p0.y, p1.y) * S.scale + 'px', width: Math.abs(p1.x - p0.x) * S.scale + 'px', height: Math.abs(p1.y - p0.y) * S.scale + 'px' }); }, () => {
      box.remove(); toolDone();
      const g = geom(pg), r = { x: Math.max(0, Math.min(p0.x, p1.x)), y: Math.max(0, Math.min(p0.y, p1.y)) };
      r.w = Math.min(g.dw, Math.max(p0.x, p1.x)) - r.x; r.h = Math.min(g.dh, Math.max(p0.y, p1.y)) - r.y;
      if (r.w < 15 || r.h < 15) return toast('Arrastra un rectángulo sobre la zona que quieres conservar');
      cropDialog(pg, r);
    });
  }, true);
  FX.crop = {
    start: () => { if (!S.pages.length) return toast('Abre un documento primero'); setTool('crop'); toast('Arrastra un rectángulo sobre la parte de la página que quieres conservar', 4000); },
    margins: () => { if (!S.pages.length) return toast('Abre un documento primero'); cropDialog(pageById(S.cur) || S.pages[0], null); },
    apply: applyCrop, contentBox
  };

  // =================== NUMERACIÓN (ETIQUETAS DE PÁGINA) ===================
  const STYLES = { D: '1, 2, 3', r: 'i, ii, iii', R: 'I, II, III', a: 'a, b, c', A: 'A, B, C', '': 'Sin número (solo prefijo)' };
  const roman = n => { if (n <= 0 || n > 3999) return String(n); const t = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]; let s = ''; for (const [v, c] of t) while (n >= v) { s += c; n -= v; } return s; };
  const letters = n => { const k = Math.floor((n - 1) / 26), c = String.fromCharCode(97 + ((n - 1) % 26)); return c.repeat(k + 1); };
  function fmt(style, n) { return style === 'D' ? String(n) : style === 'r' ? roman(n) : style === 'R' ? roman(n).toUpperCase() : style === 'a' ? letters(n) : style === 'A' ? letters(n).toUpperCase() : ''; }
  // etiqueta de la página i (0-based) según los tramos
  function labelOf(i, ranges = S.labels) {
    if (!ranges?.length) return null;
    const r = [...ranges].sort((a, b) => a.from - b.from).filter(x => x.from - 1 <= i).pop(); if (!r) return String(i + 1);
    return (r.prefix || '') + fmt(r.style, (r.start || 1) + i - (r.from - 1));
  }
  FX.labelOf = i => labelOf(i);
  function labelsDialog() {
    if (!S.pages.length) return toast('Abre un documento primero');
    let rows = (S.labels?.length ? S.labels : [{ from: 1, style: 'D', prefix: '', start: 1 }]).map(r => ({ ...r }));
    const opts = S.props?.labelStamp || { on: false, pos: 'bc', size: 10 };
    const render = () => {
      $('#lbRows').innerHTML = rows.map((r, i) => `<tr data-i="${i}">
        <td><input type="number" class="lbFrom" min="1" max="${S.pages.length}" value="${r.from}" style="max-width:70px" ${i === 0 ? 'disabled' : ''}></td>
        <td><select class="lbStyle">${Object.entries(STYLES).map(([k, v]) => `<option value="${k}" ${k === r.style ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
        <td><input type="text" class="lbPre" value="${esc(r.prefix || '')}" placeholder="p. ej. A-" style="max-width:90px"></td>
        <td><input type="number" class="lbStart" min="1" value="${r.start || 1}" style="max-width:70px"></td>
        <td>${i ? '<button class="lbDel" title="Quitar tramo">×</button>' : ''}</td></tr>`).join('');
      $('#lbPrev').textContent = S.pages.slice(0, 40).map((_, i) => labelOf(i, rows)).join(' · ') + (S.pages.length > 40 ? ' …' : '');
    };
    openModal(`<h2>Numeración de páginas</h2>
      <p class="hint" style="padding:0;margin-bottom:8px">Divide el documento en tramos. Por ejemplo: portada e índice con <b>i, ii, iii</b> y el resto con <b>1, 2, 3</b> desde la página 5. Los lectores de PDF (Acrobat, Chrome, Edge) mostrarán estos números.</p>
      <table class="lbtab"><thead><tr><th>Desde la página</th><th>Estilo</th><th>Prefijo</th><th>Empezar en</th><th></th></tr></thead><tbody id="lbRows"></tbody></table>
      <button id="lbAdd" style="margin:6px 0"><i data-i="plus"></i> Añadir tramo</button>
      <div class="hint" style="padding:0"><b>Vista previa:</b> <span id="lbPrev"></span></div>
      <fieldset><legend>Escribirla también en la página al guardar</legend>
        <label><input type="checkbox" id="lbOn" ${opts.on ? 'checked' : ''}> Imprimir el número en cada página</label>
        <select id="lbPos">${[['bc', 'Abajo, centro'], ['br', 'Abajo, derecha'], ['bl', 'Abajo, izquierda'], ['tc', 'Arriba, centro'], ['tr', 'Arriba, derecha']].map(([k, v]) => `<option value="${k}" ${opts.pos === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        Tamaño <input type="number" id="lbSize" value="${opts.size || 10}" min="6" max="30" style="max-width:60px">
      </fieldset>
      <div class="actions"><button id="lbClear">Quitar numeración</button><button data-close>Cancelar</button><button class="primary" id="lbOk">Aplicar</button></div>`);
    const read = () => { $$('#lbRows tr').forEach(tr => { const r = rows[+tr.dataset.i]; r.from = Math.max(1, Math.min(S.pages.length, +tr.querySelector('.lbFrom').value || 1)); r.style = tr.querySelector('.lbStyle').value; r.prefix = tr.querySelector('.lbPre').value; r.start = Math.max(1, +tr.querySelector('.lbStart').value || 1); }); rows[0].from = 1; };
    $('#modalCard').classList.add('wide'); render(); paintIcons($('#modalCard'));
    $('#lbRows').addEventListener('input', () => { read(); $('#lbPrev').textContent = S.pages.slice(0, 40).map((_, i) => labelOf(i, rows)).join(' · ') + (S.pages.length > 40 ? ' …' : ''); });
    $('#lbRows').addEventListener('click', e => { if (e.target.closest('.lbDel')) { read(); rows.splice(+e.target.closest('tr').dataset.i, 1); render(); } });
    $('#lbAdd').onclick = () => { read(); const last = rows[rows.length - 1]; rows.push({ from: Math.min(S.pages.length, last.from + 1), style: 'D', prefix: '', start: 1 }); render(); };
    $('#lbClear').onclick = () => { pushHistory(); S.labels = []; S.props = { ...(S.props || {}), labelStamp: { ...opts, on: false } }; afterLabels(); closeModal(); toast('Numeración quitada'); };
    $('#lbOk').onclick = () => {
      read(); pushHistory();
      S.labels = rows.sort((a, b) => a.from - b.from).filter((r, i, l) => i === 0 || r.from !== l[i - 1].from);
      S.props = { ...(S.props || {}), labelStamp: { on: $('#lbOn').checked, pos: $('#lbPos').value, size: +$('#lbSize').value || 10 } };
      afterLabels(); closeModal(); toast('Numeración aplicada: se guarda dentro del PDF', 3000);
    };
  }
  function afterLabels() { S.dirty = true; scheduleSave(); paintThumbLabels(); paintRailLabel(); }
  function paintThumbLabels() { $$('#thumbs .thumb').forEach(el => { const i = S.pages.findIndex(p => p.id === el.dataset.id), n = el.querySelector('.n'); if (n && i >= 0) { const l = labelOf(i); n.textContent = l && l !== String(i + 1) ? `${l} (${i + 1})` : String(i + 1); } }); }
  function paintRailLabel() {
    const i = S.pages.findIndex(p => p.id === S.cur), l = i >= 0 ? labelOf(i) : null, inp = $('#pageInput'); if (!inp) return;
    inp.title = l && l !== String(i + 1) ? `Página «${l}» (${i + 1} de ${S.pages.length})` : 'Página actual';
    let tag = $('#pageLabelTag');
    if (!tag) { tag = document.createElement('small'); tag.id = 'pageLabelTag'; inp.after(tag); }
    tag.textContent = l && l !== String(i + 1) ? l : '';
  }
  const _buildThumbs = window.buildThumbs;
  window.buildThumbs = function () { const r = _buildThumbs.apply(this, arguments); paintThumbLabels(); return r; };
  const _upd = window.updatePageIndicator;
  window.updatePageIndicator = function () { const r = _upd.apply(this, arguments); paintRailLabel(); return r; };

  // al guardar: /PageLabels en el catálogo y, si se pidió, el número impreso
  const prevPage = FX.exportPage;
  FX.exportPage = async (out, page, ctx, g, i, list, o, fonts) => {
    if (prevPage) await prevPage(out, page, ctx, g, i, list, o, fonts);
    const st = S.props?.labelStamp; if (!st?.on || !S.labels?.length) return;
    const idx = S.pages.indexOf(list[i]), lab = labelOf(idx < 0 ? i : idx); if (!lab) return;
    const font = await fonts({ family: 'Helvetica' }), size = st.size || 10, tw = font.widthOfTextAtSize(safeText(font, lab), size);
    const x = st.pos[1] === 'l' ? 36 : st.pos[1] === 'c' ? (g.dw - tw) / 2 : g.dw - tw - 36, y = st.pos[0] === 't' ? 24 + size : g.dh - 20;
    drawDisplayText(page, ctx, lab, x, y, size, 0, font, PDFLib.rgb(0.2, 0.2, 0.2), 1);
  };
  const prevDoc = FX.exportDoc;
  FX.exportDoc = async (out, list, o, pageRefs, pageCtx) => {
    if (prevDoc) await prevDoc(out, list, o, pageRefs, pageCtx);
    if (!S.labels?.length) return;
    // tramos según la posición de cada página exportada en el documento
    const nums = []; let prev = null;
    list.forEach((pg, k) => {
      const i = S.pages.indexOf(pg); if (i < 0) return;
      const r = [...S.labels].sort((a, b) => a.from - b.from).filter(x => x.from - 1 <= i).pop(); if (!r) return;
      const start = (r.start || 1) + i - (r.from - 1), key = `${r.style}|${r.prefix}|${start - k}`;
      if (key === prev) return; prev = key;
      const dict = { St: start };
      if (r.style) dict.S = PDFName.of(r.style);
      if (r.prefix) dict.P = PDFHexString.fromText(r.prefix);
      nums.push(k, out.context.obj(dict));
    });
    if (nums.length) out.catalog.set(PDFName.of('PageLabels'), out.context.obj({ Nums: nums }));
  };
  FX.labelsDialog = labelsDialog;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .crop-rubber{border-color:#e11d48;background:rgba(225,29,72,.06);box-shadow:0 0 0 9999px rgba(0,0,0,.28)}
    .lbtab{width:100%;border-collapse:collapse;table-layout:fixed}.lbtab input,.lbtab select{width:100%!important;max-width:none!important;min-width:0;box-sizing:border-box}.lbtab th:last-child,.lbtab td:last-child{width:34px}.lbtab th{font-size:12px;text-align:left;color:var(--muted);font-weight:600;padding:2px 4px}.lbtab td{padding:3px 4px}
    #pageLabelTag{display:block;text-align:center;font-size:11px;color:var(--muted);max-width:44px;overflow:hidden;text-overflow:ellipsis}
    #lbPrev{word-break:break-word}
  </style>`);
})();
