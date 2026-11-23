/* DM Studio · PDF — Comparar dos PDF: diferencias de texto (palabra a palabra) y de aspecto (píxeles). */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------- diff de Myers sobre secuencias (devuelve operaciones eq/del/ins) ----------
  // guarda solo la ventana [-d-1, d+1] de cada paso (memoria ~ 4·D² bytes)
  function myers(a, b, eq = (x, y) => x === y, maxD = 3000) {
    const n = a.length, m = b.length, max = n + m, off = max + 1, trace = [], v = new Int32Array(2 * max + 3);
    for (let d = 0; d <= Math.min(max, maxD); d++) {
      trace.push(v.slice(off - d - 1, off + d + 2));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
        while (x < n && y < m && eq(a[x], b[y])) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) return backtrack(trace, a, b, d);
      }
    }
    return null; // demasiado distintos
  }
  function backtrack(trace, a, b, D) {
    let x = a.length, y = b.length; const ops = [];
    for (let d = D; d > 0; d--) {
      const t = trace[d], get = k => t[k + d + 1], k = x - y;
      const down = k === -d || (k !== d && get(k - 1) < get(k + 1)), pk = down ? k + 1 : k - 1;
      const px = get(pk), sx = down ? px : px + 1, sy = sx - k;
      while (x > sx && y > sy) ops.push({ t: 'eq', a: --x, b: --y });
      if (down) ops.push({ t: 'ins', b: --y }); else ops.push({ t: 'del', a: --x });
    }
    while (x > 0 && y > 0) ops.push({ t: 'eq', a: --x, b: --y });
    return ops.reverse();
  }

  // ---------- palabras con posición de un conjunto de páginas ----------
  async function wordsOf(pages) {
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      let lines; try { lines = await getLines(pages[i]); } catch { lines = []; }
      for (const l of [...lines].sort((a, b) => a.base - b.base || a.x1 - b.x1))
        for (const w of l.words || []) out.push({ t: w.str, n: w.str.normalize('NFC'), p: i, x: w.x1, y: l.top, w: w.x2 - w.x1, h: l.bottom - l.top });
    }
    return out;
  }
  async function textDiff(pa, pb, report) {
    report('Leyendo el texto de los dos documentos…');
    const A = await wordsOf(pa), B = await wordsOf(pb);
    report(`Comparando ${A.length} y ${B.length} palabras…`); await sleep(20);
    let ops = myers(A, B, (x, y) => x.n === y.n);
    if (!ops) { // muy distintos: comparación aproximada página a página
      ops = []; let ia = 0, ib = 0;
      for (let p = 0; p < Math.max(pa.length, pb.length); p++) {
        const a = A.filter(w => w.p === p), b = B.filter(w => w.p === p), o = myers(a, b, (x, y) => x.n === y.n, 3000) || [...a.map((_, i) => ({ t: 'del', a: i })), ...b.map((_, i) => ({ t: 'ins', b: i }))];
        o.forEach(op => ops.push({ t: op.t, a: op.a !== undefined ? op.a + ia : undefined, b: op.b !== undefined ? op.b + ib : undefined })); ia += a.length; ib += b.length;
      }
    }
    // agrupar en cambios
    const changes = []; let cur = null;
    for (const op of ops) {
      if (op.t === 'eq') { cur = null; continue; }
      if (!cur) { cur = { del: [], ins: [] }; changes.push(cur); }
      if (op.t === 'del') cur.del.push(A[op.a]); else cur.ins.push(B[op.b]);
    }
    changes.forEach(c => { c.type = c.del.length && c.ins.length ? 'chg' : c.del.length ? 'del' : 'ins'; c.pa = c.del[0]?.p ?? null; c.pb = c.ins[0]?.p ?? null; });
    // ubicar en la otra columna los cambios de un solo lado (junto a la palabra anterior)
    return { A, B, changes };
  }
  async function pixelDiff(pa, pb, scale, report) {
    const res = [];
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
      report(`Comparando el aspecto: página ${i + 1}…`); await sleep(0);
      const ca = await FX.renderPageCanvas(pa[i], scale), cb = await FX.renderPageCanvas(pb[i], scale);
      const w = Math.min(ca.width, cb.width), h = Math.min(ca.height, cb.height); if (!w || !h) { res.push([]); continue; }
      const da = ca.getContext('2d').getImageData(0, 0, w, h).data, db = cb.getContext('2d').getImageData(0, 0, w, h).data, cell = 8, boxes = [];
      for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
        let diff = 0;
        for (let yy = y; yy < Math.min(h, y + cell); yy += 2) for (let xx = x; xx < Math.min(w, x + cell); xx += 2) { const k = (yy * w + xx) * 4; if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 90) diff++; }
        if (diff > 1) boxes.push({ x: x / scale, y: y / scale, w: cell / scale, h: cell / scale });
      }
      res.push(boxes);
    }
    return res;
  }

  // ---------- interfaz ----------
  function pickSecond() {
    return new Promise(res => {
      const others = S.tabs.filter(t => t.id !== S.tab && t.pages?.length);
      openModal(`<h2>Comparar dos PDF</h2>
        <p class="hint" style="padding:0;margin-bottom:10px">Se compara <b>${esc(S.name)}</b> (original) con otra versión, y se marcan las diferencias.</p>
        <div class="row"><label>Comparar con</label><select id="cmpWith">${others.map(t => `<option value="${t.id}">${esc(t.name)} (pestaña)</option>`).join('')}<option value="__file">Elegir un archivo PDF…</option></select></div>
        <div class="row"><label>Tipo</label><select id="cmpMode"><option value="text">Texto (palabras añadidas, quitadas y cambiadas)</option><option value="both">Texto y aspecto visual</option><option value="pixel">Solo aspecto visual (píxeles)</option></select></div>
        <div class="actions"><button data-close>Cancelar</button><button class="primary" id="cmpOk">Comparar</button></div>`);
      modalOnClose = () => res(null);
      $('#cmpOk').onclick = () => {
        const w = $('#cmpWith').value, mode = $('#cmpMode').value; modalOnClose = null; closeModal();
        if (w !== '__file') return res({ pages: S.tabs.find(t => t.id === w).pages, name: S.tabs.find(t => t.id === w).name, mode });
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf';
        inp.onchange = async () => { const f = inp.files[0]; if (!f) return res(null); const s = await addSource(new Uint8Array(await f.arrayBuffer()), f.name, undefined, true); res({ pages: s.info.map((_, i) => ({ id: 'cmp' + s.id + '_' + i, src: s.id, idx: i, rot: 0, annots: [] })), name: f.name.replace(/\.pdf$/i, ''), mode, temp: s }); };
        inp.click();
      };
    });
  }
  async function openCompare() {
    if (!S.pages.length) return toast('Abre primero el documento original');
    closeEditor();
    const other = await pickSecond(); if (!other) return;
    const pa = S.pages, pb = other.pages, report = m => toast(m, 120000);
    try {
      const td = other.mode !== 'pixel' ? await textDiff(pa, pb, report) : null;
      const px = other.mode !== 'text' ? await pixelDiff(pa, pb, 1.2, report) : null;
      $('#toast').classList.add('hidden');
      showView(pa, pb, other.name, td, px, other.temp);
    } catch (e) { console.error(e); toast('No se pudo comparar: ' + e.message, 6000); }
  }
  function showView(pa, pb, nameB, td, px, temp) {
    const ch = td?.changes || [], nIns = ch.filter(c => c.type === 'ins').length, nDel = ch.filter(c => c.type === 'del').length, nChg = ch.filter(c => c.type === 'chg').length;
    const v = document.createElement('div'); v.id = 'cmpView';
    v.innerHTML = `<div class="cmp-bar"><b>Comparación</b>
        <span class="cmp-sum">${td ? `${ch.length} diferencia(s): <i class="k ins"></i>${nIns} añadidas · <i class="k del"></i>${nDel} quitadas · <i class="k chg"></i>${nChg} cambiadas` : ''}${px ? ` · ${px.reduce((n, b) => n + (b.length ? 1 : 0), 0)} página(s) con cambios visuales` : ''}</span>
        <span style="flex:1"></span><button id="cmpPrev">↑ Anterior</button><button id="cmpNext">Siguiente ↓</button><button id="cmpReport">Descargar informe</button><button id="cmpClose" class="primary">Cerrar</button></div>
      <div class="cmp-body"><div class="cmp-list">${ch.length ? ch.map((c, i) => `<div class="cmp-item ${c.type}" data-ci="${i}"><small>${c.type === 'ins' ? 'Añadido' : c.type === 'del' ? 'Quitado' : 'Cambiado'} · pág. ${(c.pa ?? c.pb) + 1}</small>${c.del.length ? `<div class="d">${esc(c.del.map(w => w.t).join(' ').slice(0, 200))}</div>` : ''}${c.ins.length ? `<div class="a">${esc(c.ins.map(w => w.t).join(' ').slice(0, 200))}</div>` : ''}</div>`).join('') : `<p class="hint">${td ? 'El texto de los dos documentos es idéntico.' : 'Comparación visual: las zonas distintas se marcan en magenta.'}</p>`}</div>
        <div class="cmp-col" id="cmpA"><div class="cmp-h">Original: ${esc(S.name)}</div></div><div class="cmp-col" id="cmpB"><div class="cmp-h">Comparado: ${esc(nameB)}</div></div></div>`;
    document.body.appendChild(v);
    const colW = () => ($('#cmpA').clientWidth - 30);
    const draw = async (pages, colSel, side) => {
      const col = $(colSel);
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i], g = geom(pg), sc = colW() / g.dw;
        const wrap = document.createElement('div'); wrap.className = 'cmp-page'; wrap.dataset.p = i; wrap.style.width = g.dw * sc + 'px'; wrap.style.height = g.dh * sc + 'px';
        const marks = [];
        if (td) for (const [ci, c] of ch.entries()) for (const w of (side === 'a' ? c.del : c.ins)) if (w.p === i) marks.push(`<div class="mk ${c.type}" data-ci="${ci}" style="left:${w.x * sc - 1}px;top:${w.y * sc - 1}px;width:${w.w * sc + 2}px;height:${w.h * sc + 2}px"></div>`);
        if (px && side === 'b') for (const b of px[i] || []) marks.push(`<div class="mk px" style="left:${b.x * sc}px;top:${b.y * sc}px;width:${b.w * sc}px;height:${b.h * sc}px"></div>`);
        wrap.innerHTML = `<canvas></canvas>${marks.join('')}<span class="cmp-n">${i + 1}</span>`;
        col.appendChild(wrap);
        FX.renderPageCanvas(pg, sc * Math.min(window.devicePixelRatio || 1, 2)).then(c => { const cv = wrap.querySelector('canvas'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); }).catch(() => { });
        if (i % 3 === 2) await sleep(0);
      }
    };
    draw(pa, '#cmpA', 'a'); draw(pb, '#cmpB', 'b');
    let curI = -1;
    const go = i => {
      if (!ch.length) return; curI = (i + ch.length) % ch.length; const c = ch[curI];
      v.querySelectorAll('.cmp-item.on,.mk.on').forEach(e => e.classList.remove('on'));
      v.querySelector(`.cmp-item[data-ci="${curI}"]`)?.classList.add('on'); v.querySelector(`.cmp-item[data-ci="${curI}"]`)?.scrollIntoView({ block: 'nearest' });
      v.querySelectorAll(`.mk[data-ci="${curI}"]`).forEach(e => e.classList.add('on'));
      const scrollTo = (colSel, sideWords, pageIdx) => { const col = $(colSel), mk = col.querySelector(`.mk[data-ci="${curI}"]`) || col.querySelector(`.cmp-page[data-p="${pageIdx}"]`); if (mk) col.scrollTo({ top: mk.offsetTop + (mk.closest('.cmp-page')?.offsetTop || 0) * (mk.classList.contains('mk') ? 1 : 0) - 80, behavior: 'smooth' }); };
      scrollTo('#cmpA', c.del, c.pa ?? c.pb); scrollTo('#cmpB', c.ins, c.pb ?? c.pa);
    };
    v.addEventListener('click', e => { const it = e.target.closest('[data-ci]'); if (it) go(+it.dataset.ci); });
    $('#cmpNext').onclick = () => go(curI + 1); $('#cmpPrev').onclick = () => go(curI - 1);
    const close = () => { v.remove(); document.removeEventListener('keydown', key, true); if (temp) { try { temp.pdf.destroy(); } catch { } S.sources = S.sources.filter(s => s !== temp); } };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    $('#cmpClose').onclick = close;
    // sincronizar el desplazamiento de las dos columnas
    let lock = false; const sync = (a, b) => a.addEventListener('scroll', () => { if (lock) return; lock = true; b.scrollTop = a.scrollTop * (b.scrollHeight - b.clientHeight) / Math.max(1, a.scrollHeight - a.clientHeight); requestAnimationFrame(() => { lock = false; }); });
    sync($('#cmpA'), $('#cmpB')); sync($('#cmpB'), $('#cmpA'));
    $('#cmpReport').onclick = () => {
      const rows = ch.map((c, i) => `<tr class="${c.type}"><td>${i + 1}</td><td>${c.type === 'ins' ? 'Añadido' : c.type === 'del' ? 'Quitado' : 'Cambiado'}</td><td>${(c.pa ?? '-') === '-' ? '-' : c.pa + 1}</td><td>${(c.pb ?? '-') === '-' ? '-' : c.pb + 1}</td><td class="d">${esc(c.del.map(w => w.t).join(' '))}</td><td class="a">${esc(c.ins.map(w => w.t).join(' '))}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Comparación</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;vertical-align:top;font-size:13px}th{background:#f2f2f2}.d{background:#fde2e2;text-decoration:line-through}.a{background:#dcfce7}</style></head><body><h1>Comparación de documentos</h1><p><b>Original:</b> ${esc(S.name)}<br><b>Comparado:</b> ${esc(nameB)}<br><b>Fecha:</b> ${new Date().toLocaleString('es-ES')}</p><p>${ch.length} diferencia(s): ${nIns} añadidas, ${nDel} quitadas, ${nChg} cambiadas.</p><table><tr><th>#</th><th>Tipo</th><th>Pág. original</th><th>Pág. comparado</th><th>Texto original</th><th>Texto nuevo</th></tr>${rows}</table></body></html>`;
      download(new TextEncoder().encode(html), 'comparacion.html', 'text/html;charset=utf-8');
    };
    if (ch.length) setTimeout(() => go(0), 400);
  }
  FX.addTopButton('<button data-act="compare" title="Comparar dos PDF"><i data-i="compare"></i><span>Comparar</span></button>');
  ACTIONS.compare = openCompare;
  Object.assign(FX, { myers, textDiff, openCompare });
})();
