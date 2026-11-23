/* DM Studio · PDF — funciones de "Ver y leer" y "Editar":
   vista de dos páginas, modo lectura, leer en voz alta, marcadores, adjuntos, capas,
   fuentes propias, editar párrafos, buscar y reemplazar, ortografía, enlaces,
   encabezado/pie, numeración Bates y fondo de página. */
'use strict';
(() => {
  const { PDFName, PDFString, PDFArray, pushGraphicsState, popGraphicsState, setFillingRgbColor, rectangle, fill } = PDFLib;
  const FX = window.FX = window.FX || {};

  // ---------- utilidades ----------
  function putBin(bytes) {
    const key = nid('b'); S.blobs.set(key, bytes);
    idbDo('blobs', 'readwrite', st => st.put(bytes, key)).catch(e => console.warn('autoguardado', e));
    return key;
  }
  FX.putBin = putBin;
  const hexParts = h => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const fmtSize = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  FX.sleep = sleep;

  // ---------- iconos nuevos ----------
  Object.assign(ICONS, {
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    clip: '<path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    spell: '<path d="M4 16l4-11 4 11M5.5 12h5"/><path d="M13 17l3 3 5-7"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    book2: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>', stop: '<rect x="6" y="6" width="12" height="12"/>',
    convert: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>', compare: '<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/><path d="M12 2v20"/>'
  });

  // ---------- barra superior: vista, lectura y voz ----------
  const zoomGroup = $('#zoomSel').closest('.group');
  const viewGroup = document.createElement('div'); viewGroup.className = 'group'; viewGroup.id = 'viewGroup';
  viewGroup.innerHTML = `<select id="viewSel" title="Vista"><option value="one">Una página</option><option value="two">Dos páginas</option></select>
    <button data-act="reading" title="Modo lectura a pantalla completa (F11)"><i data-i="expand"></i></button>
    <button data-act="readAloud" id="readBtn" title="Leer en voz alta"><i data-i="speak"></i></button>`;
  ($('#viewHost') ? $('#viewHost').replaceWith(viewGroup) : zoomGroup.after(viewGroup));
  FX.addTopButton = (html) => { const host = $('#topActions'), ref = host.querySelector('[data-act=export]'); ref.insertAdjacentHTML('beforebegin', html); paintIcons(host); };
  $('#viewSel').addEventListener('change', e => { S.view = e.target.value; rebuild(true); scheduleSave(); });
  FX.refreshViewSel = () => { $('#viewSel').value = S.view; };

  // modo lectura
  function toggleReading(force) {
    const on = force ?? !document.body.classList.contains('reading');
    document.body.classList.toggle('reading', on);
    if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => { });
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
    setTimeout(() => rerenderAll(), 150);
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('reading')) toggleReading(false); });

  // leer en voz alta
  const RA = { on: false, token: 0, idx: 0, rate: 1, single: false };
  const voiceEs = () => { const vs = speechSynthesis.getVoices(); return vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null; };
  async function pageSpeech(pg) { try { return (await getLines(pg)).map(l => l.str).join('\n'); } catch { return ''; } }
  function chunks(text) {
    const parts = text.replace(/-\n(?=\p{Ll})/gu, '').split(/(?<=[.!?:;])\s+|\n{2,}/u).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean), out = [];
    for (const p of parts) { if (out.length && (out[out.length - 1] + ' ' + p).length < 220) out[out.length - 1] += ' ' + p; else out.push(p); }
    return out;
  }
  async function readPage() {
    const tok = RA.token, pg = S.pages[RA.idx];
    if (!RA.on || !pg) return stopRead();
    scrollToPage(pg.id);
    const list = chunks(await pageSpeech(pg));
    if (tok !== RA.token) return;
    const next = () => { if (tok !== RA.token || !RA.on) return; if (RA.single) return stopRead(); RA.idx++; readPage(); };
    if (!list.length) return next();
    list.forEach((c, k) => {
      const u = new SpeechSynthesisUtterance(c); u.lang = 'es-ES'; u.rate = RA.rate; const v = voiceEs(); if (v) u.voice = v;
      if (k === list.length - 1) u.onend = next;
      speechSynthesis.speak(u);
    });
  }
  function startRead(single) {
    if (!('speechSynthesis' in window)) return toast('Este navegador no puede leer en voz alta');
    if (!S.pages.length) return toast('Abre un documento primero');
    speechSynthesis.cancel(); RA.token++; RA.on = true; RA.single = single;
    RA.idx = Math.max(0, S.pages.findIndex(p => p.id === S.cur)); readPage(); updateReadBtn();
  }
  function stopRead() { RA.on = false; RA.token++; speechSynthesis.cancel(); updateReadBtn(); }
  function updateReadBtn() { const b = $('#readBtn'); b.classList.toggle('active', RA.on); b.innerHTML = `<i data-i="${RA.on ? 'stop' : 'speak'}"></i>`; paintIcons(b); }
  function readMenu() {
    if (RA.on) {
      const paused = speechSynthesis.paused;
      return showMenuAt('#readBtn', [
        { label: paused ? 'Reanudar' : 'Pausa', icon: paused ? 'play' : 'pause', action: () => (paused ? speechSynthesis.resume() : speechSynthesis.pause()) },
        { label: 'Detener', icon: 'stop', action: stopRead }
      ]);
    }
    showMenuAt('#readBtn', [
      { label: 'Leer desde esta página', icon: 'play', action: () => startRead(false) },
      { label: 'Leer solo esta página', icon: 'speak', action: () => startRead(true) },
      '-',
      ...[0.8, 1, 1.25, 1.5].map(r => ({ label: `${RA.rate === r ? '✓ ' : ''}Velocidad ${r}×`, icon: 'blank', action: () => { RA.rate = r; } }))
    ]);
  }
  function showMenuAt(sel, items) { const r = $(sel).getBoundingClientRect(); showMenu(r.left, r.bottom + 4, items); }
  FX.showMenuAt = showMenuAt;
  Object.assign(ACTIONS, { reading: () => toggleReading(), readAloud: readMenu });
  document.addEventListener('keydown', e => { if (e.key === 'F11' && S.pages.length) { e.preventDefault(); toggleReading(); } });

  // ---------- paneles laterales nuevos ----------
  const tabsNav = $('#sidebar .tabs');
  tabsNav.insertAdjacentHTML('beforeend', `
    <button data-tab="bookmarks" title="Marcadores"><i data-i="bookmark"></i></button>
    <button data-tab="attachments" title="Archivos adjuntos"><i data-i="clip"></i></button>
    <button data-tab="layers" title="Capas"><i data-i="layers"></i></button>
    <button data-tab="spell" title="Ortografía"><i data-i="spell"></i></button>`);
  $('#sidebar').insertAdjacentHTML('beforeend', `
    <section data-panel="bookmarks" class="panel">
      <div class="panel-head"><b>Marcadores</b><div class="mini"><button id="bmAdd" title="Añadir marcador en la página actual"><i data-i="plus"></i></button></div></div>
      <p class="hint">Se guardan dentro del PDF. Doble clic para renombrar.</p><div id="bmList" class="plist"></div>
    </section>
    <section data-panel="attachments" class="panel">
      <div class="panel-head"><b>Archivos adjuntos</b><div class="mini"><button id="attAdd" title="Adjuntar archivo"><i data-i="plus"></i></button></div></div>
      <div id="attList" class="plist"></div>
    </section>
    <section data-panel="layers" class="panel">
      <div class="panel-head"><b>Capas</b></div><p class="hint">Muestra u oculta las capas del PDF (solo en pantalla).</p><div id="layerList" class="plist"></div>
    </section>
    <section data-panel="spell" class="panel">
      <div class="panel-head"><b>Ortografía</b></div>
      <div style="padding:0 10px"><button id="spellRun" class="primary" style="width:100%;justify-content:center">Revisar el documento</button></div>
      <p class="hint" id="spellInfo">Busca palabras que no están en el diccionario español.</p><div id="spellList" class="plist"></div>
    </section>`);
  paintIcons($('#sidebar'));

  // marcadores
  const pageNum = id => S.pages.findIndex(p => p.id === id) + 1;
  function bmWalk(list, fn, parent = null) { for (const b of list) { if (fn(b, list, parent) === false) return false; if (bmWalk(b.children || [], fn, b) === false) return false; } }
  function bmFind(id) { let r = null; bmWalk(S.bookmarks, (b, list) => { if (b.id === id) { r = { b, list }; return false; } }); return r; }
  function renderBookmarks() {
    const html = (list, lvl) => list.map(b => `<div class="bm" data-bm="${b.id}" style="padding-left:${6 + lvl * 14}px"><span class="bm-t">${esc(b.title)}</span><small>${pageNum(b.page) || '—'}</small><button data-bmact="child" title="Añadir submarcador">+</button><button data-bmact="del" title="Eliminar">×</button></div>` + html(b.children || [], lvl + 1)).join('');
    $('#bmList').innerHTML = S.bookmarks.length ? html(S.bookmarks, 0) : '<p class="hint">No hay marcadores. Pulsa + para añadir uno en la página actual.</p>';
  }
  async function addBookmark(parent) {
    if (!S.pages.length) return;
    const t = await askText('Nuevo marcador', 'Título del marcador', `Página ${pageNum(S.cur)}`); if (!t) return;
    const b = { id: nid('k'), title: t, page: S.cur, children: [] };
    (parent ? (parent.children = parent.children || []) : S.bookmarks).push(b);
    S.dirty = true; renderBookmarks(); scheduleSave();
  }
  $('#bmAdd').onclick = () => addBookmark(null);
  $('#bmList').addEventListener('click', e => {
    const row = e.target.closest('[data-bm]'); if (!row) return; const f = bmFind(row.dataset.bm); if (!f) return;
    const act = e.target.dataset.bmact;
    if (act === 'del') { f.list.splice(f.list.indexOf(f.b), 1); S.dirty = true; renderBookmarks(); scheduleSave(); }
    else if (act === 'child') addBookmark(f.b);
    else if (pageById(f.b.page)) scrollToPage(f.b.page);
  });
  $('#bmList').addEventListener('dblclick', async e => {
    const row = e.target.closest('[data-bm]'); if (!row) return; const f = bmFind(row.dataset.bm);
    const t = await askText('Renombrar marcador', '', f.b.title); if (t) { f.b.title = t; S.dirty = true; renderBookmarks(); scheduleSave(); }
  });

  // adjuntos
  function renderAttachments() {
    $('#attList').innerHTML = S.attachments.length ? S.attachments.map(a => `<div class="att" data-att="${a.id}"><i data-i="clip"></i><span title="${esc(a.name)}">${esc(a.name)}</span><small>${fmtSize(a.size || 0)}</small><button data-attact="get" title="Descargar"><i data-i="download"></i></button><button data-attact="del" title="Quitar">×</button></div>`).join('')
      : '<p class="hint">Este PDF no lleva archivos adjuntos. Pulsa + para adjuntar uno (por ejemplo, una hoja de cálculo o una foto).</p>';
    paintIcons($('#attList'));
  }
  $('#attAdd').onclick = () => {
    if (!S.pages.length) return toast('Abre un documento primero');
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
    inp.onchange = async () => { for (const f of inp.files) { const by = new Uint8Array(await f.arrayBuffer()); S.attachments.push({ id: nid('f'), name: f.name, key: putBin(by), size: by.length, type: f.type }); } S.dirty = true; renderAttachments(); scheduleSave(); toast('Adjunto añadido: se guardará dentro del PDF'); };
    inp.click();
  };
  $('#attList').addEventListener('click', e => {
    const row = e.target.closest('[data-att]'); if (!row) return; const a = S.attachments.find(x => x.id === row.dataset.att);
    const act = e.target.closest('[data-attact]')?.dataset.attact;
    if (act === 'del') { S.attachments = S.attachments.filter(x => x !== a); S.dirty = true; renderAttachments(); scheduleSave(); }
    else if (act === 'get') { const by = S.blobs.get(a.key); if (by) download(by, a.name, a.type || 'application/octet-stream'); }
  });

  // capas (contenido opcional)
  async function renderLayers() {
    const box = $('#layerList'); let html = '';
    for (const s of [...new Set(S.pages.map(p => p.src))].map(src).filter(Boolean)) {
      try {
        if (!s.occ) s.occ = s.pdf.getOptionalContentConfig();
        const cfg = await s.occ, groups = cfg?.getGroups?.(); if (!groups) continue;
        const ids = Object.keys(groups); if (!ids.length) continue;
        html += `<p class="hint"><b>${esc(s.name)}</b></p>` + ids.map(id => `<label class="layer"><input type="checkbox" data-src="${s.id}" data-ocg="${esc(id)}" ${groups[id].visible ? 'checked' : ''}> ${esc(groups[id].name || id)}</label>`).join('');
      } catch { }
    }
    box.innerHTML = html || '<p class="hint">Este documento no tiene capas.</p>';
  }
  $('#layerList').addEventListener('change', async e => {
    const el = e.target; if (!el.dataset.ocg) return; const s = src(el.dataset.src); const cfg = await s.occ;
    cfg.setVisibility(el.dataset.ocg, el.checked);
    $$('.page').forEach(d => { if (pageById(d.dataset.id)?.src === s.id) { d._key = null; renderPage(d); } });
  });

  FX.refreshPanels = () => { renderBookmarks(); renderAttachments(); if ($('[data-panel=layers]').classList.contains('active')) renderLayers(); FX.refreshViewSel(); refreshFontOptions(); };
  tabsNav.addEventListener('click', e => { if (e.target.closest('[data-tab=layers]')) renderLayers(); });

  // al abrir un PDF: leer sus marcadores y adjuntos
  FX.afterLoad = async sources => {
    for (const s of sources) {
      try {
        const outline = await s.pdf.getOutline();
        const pageOf = async dest => {
          try {
            if (typeof dest === 'string') dest = await s.pdf.getDestination(dest);
            if (!Array.isArray(dest)) return null;
            const ref = dest[0], idx = typeof ref === 'object' && ref ? await s.pdf.getPageIndex(ref) : Number.isInteger(ref) ? ref : null;
            return S.pages.find(p => p.src === s.id && p.idx === idx)?.id || null;
          } catch { return null; }
        };
        const map = async items => { const out = []; for (const it of items || []) { const page = await pageOf(it.dest), children = await map(it.items); if (page || children.length) out.push({ id: nid('k'), title: it.title || 'Sin título', page: page || children[0]?.page, children }); } return out; };
        if (outline?.length) S.bookmarks.push(...(await map(outline)));
      } catch (e) { console.warn('marcadores', e); }
      try {
        const at = await s.pdf.getAttachments();
        if (at) for (const [k, v] of Object.entries(at)) if (v?.content) S.attachments.push({ id: nid('f'), name: v.filename || k, key: putBin(v.content), size: v.content.length });
      } catch (e) { console.warn('adjuntos', e); }
    }
  };

  // ---------- fuentes: Liberation + fuentes propias (archivo o instaladas en el equipo) ----------
  ['Liberation Sans', 'Liberation Serif', 'Liberation Mono'].forEach(f => { document.fonts.load(`16px '${f}'`).catch(() => { }); document.fonts.load(`bold 16px '${f}'`).catch(() => { }); });
  const famSel = $('#famInput');
  function refreshFontOptions() {
    const cur = famSel.value;
    famSel.innerHTML = '<option value="Helvetica">Sans (Arial)</option><option value="Times">Serif (Times)</option><option value="Courier">Mono (Courier)</option>'
      + S.fonts.map(f => `<option value="F:${f.key}">${esc(f.name)}</option>`).join('') + '<option value="__add">➕ Añadir fuente…</option>';
    famSel.value = [...famSel.options].some(o => o.value === cur) && cur !== '__add' ? cur : S.family;
  }
  FX.registerFonts = () => {
    for (const f of S.fonts) {
      const by = S.blobs.get(f.key); if (!(by instanceof Uint8Array)) continue;
      new FontFace('F:' + f.key, by).load().then(ff => document.fonts.add(ff)).catch(e => console.warn('fuente', f.name, e));
    }
    refreshFontOptions();
  };
  async function addFont(name, bytes) {
    const key = putBin(bytes);
    try { const ff = await new FontFace('F:' + key, bytes).load(); document.fonts.add(ff); }
    catch (e) { toast('Ese archivo no es una fuente válida'); return; }
    S.fonts.push({ key, name }); refreshFontOptions(); famSel.value = 'F:' + key; famSel.dispatchEvent(new Event('change')); scheduleSave();
    toast(`Fuente añadida: ${name}`);
  }
  famSel.addEventListener('change', e => {
    if (famSel.value !== '__add') return;
    e.stopImmediatePropagation(); famSel.value = S.family;
    openModal(`<h2>Añadir fuente</h2>
      <p class="hint" style="padding:0">La fuente se incrusta en el PDF al guardar, así se ve igual en cualquier equipo.</p>
      <div class="row"><label>Desde un archivo</label><input type="file" id="fontFile" accept=".ttf,.otf,font/ttf,font/otf"></div>
      ${'queryLocalFonts' in window ? `<div class="row"><label>Instaladas</label><button id="fontLocal">Elegir una fuente de mi equipo…</button></div><div id="fontLocalList" class="plist" style="max-height:260px"></div>` : '<p class="hint" style="padding:0">Tu navegador no permite usar las fuentes instaladas; sube el archivo .ttf u .otf.</p>'}
      <div class="actions"><button data-close>Cerrar</button></div>`);
    $('#fontFile').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; await addFont(f.name.replace(/\.(ttf|otf)$/i, ''), new Uint8Array(await f.arrayBuffer())); closeModal(); };
    $('#fontLocal')?.addEventListener('click', async () => {
      let list; try { list = await window.queryLocalFonts(); } catch (er) { return toast('No se dio permiso para ver las fuentes'); }
      const box = $('#fontLocalList');
      const draw = q => { box.innerHTML = list.filter(f => !q || f.fullName.toLowerCase().includes(q)).slice(0, 300).map((f, i) => `<div class="fontopt" data-fi="${list.indexOf(f)}" style="font-family:'${esc(f.family)}'">${esc(f.fullName)}</div>`).join(''); };
      box.insertAdjacentHTML('beforebegin', '<input id="fontQ" placeholder="Buscar fuente…" style="width:100%;margin-bottom:6px">'); draw('');
      $('#fontQ').oninput = ev => draw(ev.target.value.toLowerCase());
      box.onclick = async ev => { const it = ev.target.closest('[data-fi]'); if (!it) return; const f = list[+it.dataset.fi]; const by = new Uint8Array(await (await f.blob()).arrayBuffer()); await addFont(f.fullName, by); closeModal(); };
    });
  }, true);
  refreshFontOptions();

  // ---------- editar párrafos completos (el texto se reajusta a lo ancho) ----------
  function wrapText(raw, width, fs, a) {
    const out = [];
    for (const para of raw.split('\n')) {
      const words = para.split(/\s+/).filter(Boolean); let line = '';
      if (!words.length) { out.push(''); continue; }
      for (const w of words) { const t = line ? line + ' ' + w : w; if (line && textWidth(t, fs, a) > width + 0.5) { out.push(line); line = w; } else line = t; }
      out.push(line);
    }
    return out.join('\n');
  }
  FX.wrapText = wrapText;
  function findParagraph(lines, ln) {
    const same = (a, b) => Math.abs(a.fs - b.fs) < a.fs * 0.15 && a.family === b.family && !!a.bold === !!b.bold;
    const overlap = (a, b) => !(b.x1 > a.x2 || b.x2 < a.x1);
    const step = (from, dir, gap) => lines.filter(l => l !== from && same(from, l) && overlap(from, l) && dir * (l.base - from.base) >= from.fs * 0.9 && dir * (l.base - from.base) <= from.fs * 2.0 && (!gap || Math.abs(dir * (l.base - from.base) - gap) <= gap * 0.3))
      .sort((a, b) => dir * (a.base - b.base))[0];
    const para = [ln]; let gap = null, l;
    while ((l = step(para[0], -1, gap))) { gap = gap ?? para[0].base - l.base; para.unshift(l); }
    while ((l = step(para[para.length - 1], 1, gap))) { gap = gap ?? l.base - para[para.length - 1].base; para.push(l); }
    return { lines: para, gap: gap || ln.fs * 1.2 };
  }
  FX.findParagraph = findParagraph;
  const joinLines = ls => ls.reduce((t, l) => (!t ? l.str : /-$/.test(t) && /^\p{Ll}/u.test(l.str) ? t.slice(0, -1) + l.str : t + ' ' + l.str), '');
  FX.joinLines = joinLines;
  FX.editParagraphAt = async (d, pg, pt) => {
    const ex = pg.annots.slice().reverse().find(a => a.type === 'textedit' && insideBox(pt, a));
    if (ex) return openLineEditor(d, pg, ex, false);
    let lines; try { lines = await getLines(pg); } catch { return toast('No se pudo leer el texto'); }
    const ln = lines.find(l => insideBox(pt, lineBox(l)));
    if (!ln) return toast(lines.length ? 'Haz clic sobre un párrafo' : 'Esta página no tiene texto editable (usa OCR primero)', 3500);
    const { lines: pl, gap } = findParagraph(lines, ln);
    const x1 = Math.min(...pl.map(l => l.x1)), x2 = Math.max(...pl.map(l => l.x2)), top = pl[0].top, bottom = pl[pl.length - 1].bottom;
    const box = { x: x1 - 1.5, y: top - 1, w: x2 - x1 + 3, h: bottom - top + 2 }, text = joinLines(pl);
    const a = Object.assign(lineEditFrom(d, pg, pl[0]), box, { tx: x1, ty: pl[0].base, text, orig: text, raw: text, para: true, wrapW: x2 - x1, lh: gap, bg: sampleColors(d, geom(pg), box).bg });
    a.origRects = pl.map(l => (isOcrPage(pg) ? lineBox(l) : textBand(l.base, l.fs, l.x1 + 0.3, l.x2 - 0.3)));
    FX.openParaEditor(d, pg, a, true);
  };
  FX.openParaEditor = (d, pg, a, isNew) => {
    closeEditor(); $$('.hoverbox').forEach(h => h.remove());
    const ta = document.createElement('textarea'); ta.className = 'inline-editor para-editor'; ta.spellcheck = true; ta.lang = 'es';
    Object.assign(ta.style, {
      left: (a.tx - 1) * S.scale + 'px', top: (a.ty - a.fs * 0.95) * S.scale + 'px', width: (a.wrapW + 4) * S.scale + 'px',
      fontSize: a.fs * S.scale + 'px', lineHeight: a.lh * S.scale + 'px', fontFamily: cssFam(a.family), fontWeight: a.bold ? 'bold' : 'normal', fontStyle: a.italic ? 'italic' : 'normal', color: a.color, background: a.bg
    });
    ta.value = a.raw ?? a.text; d.appendChild(ta);
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 4 + 'px'; };
    ta.addEventListener('input', fit); fit(); ta.focus();
    if (!isNew) { const el = d.querySelector(`[data-ann="${a.id}"]`); if (el) el.style.display = 'none'; }
    let done = false;
    const commit = save => {
      if (done) return; done = true; ta.remove(); toolDone();
      if (!save) { drawAnnots(pg.id); return; }
      const raw = ta.value.replace(/[ \t]+\n/g, '\n').trim(), text = wrapText(raw, a.wrapW, a.fs, a);
      if (isNew) {
        if (raw === a.orig) return;
        const na = { ...a, raw, text }; delete na.origRects;
        applyReal(pg, a.origRects, textMode(pg), () => { na.real = true; na.id = nid('a'); pg.annots.push(na); })
          .then(ok => { if (ok) toast('Párrafo editado en el PDF'); else addAnn(pg.id, na); });
        return;
      }
      pushHistory(); const cur = pg.annots.find(x => x.id === a.id); if (cur) { cur.raw = raw; cur.text = text; } annChanged(pg.id);
    };
    ta.addEventListener('blur', () => commit(true));
    ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') commit(false); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(true); });
    closeEditor.fn = () => commit(true);
    toast('Edita el párrafo · Ctrl+Enter o clic fuera para aplicar · Esc para cancelar', 3500);
  };

  // ---------- buscar y reemplazar ----------
  $('#searchForm').insertAdjacentHTML('afterend', `
    <div class="replace-box">
      <div class="replace-row"><input id="replaceInput" placeholder="Reemplazar por…"><button id="replaceAll" title="Reemplazar todas las apariciones en el PDF">Reemplazar todo</button></div>
      <label><input type="checkbox" id="matchCase"> Mayúsculas y minúsculas</label> <label><input type="checkbox" id="wholeWord"> Palabra completa</label>
    </div>`);
  FX.replaceAll = async (q, r, opt = {}) => {
    if (!q) return 0;
    const escq = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pat = opt.whole ? `(?<![\\p{L}\\p{N}])${escq}(?![\\p{L}\\p{N}])` : escq, flags = 'gu' + (opt.matchCase ? '' : 'i');
    let count = 0, touched = 0;
    toast('Reemplazando…', 60000);
    for (const pg of [...S.pages]) {
      let lines; try { lines = await getLines(pg); } catch { continue; }
      const d = pageDiv(pg.id), edits = [];
      for (const ln of lines) {
        if (!ln.words?.length) continue;
        const ms = [...ln.str.matchAll(new RegExp(pat, flags))]; if (!ms.length) continue;
        const s0 = ms[0].index, e0 = ms[ms.length - 1].index + ms[ms.length - 1][0].length;
        const i0 = ln.words.findIndex(w => w.end > s0); let i1 = -1; ln.words.forEach((w, i) => { if (w.start < e0) i1 = i; });
        if (i0 < 0 || i1 < i0) continue;
        const c = { x: (ln.words[i0].x1 + ln.words[i0].x2) / 2, y: (ln.top + ln.bottom) / 2 };
        if (pg.annots.some(a => a.type === 'textedit' && insideBox(c, a))) continue;
        const seg = ln.str.slice(ln.words[i0].start, ln.words[i1].end), nseg = seg.replace(new RegExp(pat, flags), r);
        if (nseg === seg) continue;
        const a = wordEditFrom(d, pg, ln, i0, i1); fitWordEdit(a, nseg); a.id = nid('a'); edits.push(a); count += ms.length;
      }
      if (!edits.length) continue;
      touched++;
      const ok = await applyReal(pg, edits.map(a => editRect(pg, a)), textMode(pg), () => edits.forEach(a => { a.real = true; pg.annots.push(a); }));
      if (!ok) { pushHistory(); edits.forEach(a => pg.annots.push(a)); annChanged(pg.id); }
    }
    toast(count ? `${count} reemplazo(s) en ${touched} página(s) · Ctrl+Z para deshacer` : 'No se encontró el texto', 4000);
    return count;
  };
  $('#replaceAll').onclick = async () => {
    const q = $('#searchInput').value.trim(), r = $('#replaceInput').value;
    if (!q) return toast('Escribe arriba el texto que quieres buscar');
    await FX.replaceAll(q, r, { matchCase: $('#matchCase').checked, whole: $('#wholeWord').checked });
    $('#searchForm').requestSubmit();
  };

  // ---------- ortografía ----------
  let typoP = null;
  const getTypo = () => {
    if (!typoP) typoP = Promise.all(['vendor/dict/es.aff', 'vendor/dict/es.dic'].map(u => fetch(u).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })))
      .then(([aff, dic]) => new Typo('es_ES', aff, dic));
    typoP.catch(() => { typoP = null; });
    return typoP;
  };
  const ignored = new Set(JSON.parse(localStorage.getItem('folio.ignore') || '[]'));
  let spellResults = [];
  function renderSpell() {
    $('#spellList').innerHTML = spellResults.filter(r => !ignored.has(r.w.toLowerCase())).map(r => `<div class="spell" data-w="${esc(r.w)}"><div><b>${esc(r.w)}</b> <small>${r.n}× · pág. ${[...r.pages].slice(0, 4).join(', ')}</small></div>
      <div class="sugs"></div><div class="spell-act"><button data-sp="sug">Sugerencias</button><button data-sp="find">Ver</button><button data-sp="ign">Ignorar</button></div></div>`).join('')
      || (spellResults.length ? '<p class="hint">Todo revisado.</p>' : '');
  }
  $('#spellRun').onclick = async () => {
    if (!S.pages.length) return toast('Abre un documento primero');
    $('#spellInfo').textContent = 'Cargando el diccionario…';
    let typo; try { typo = await getTypo(); } catch (e) { $('#spellInfo').textContent = 'No se pudo cargar el diccionario (abre la app con «Abrir DM Studio PDF.bat»).'; return; }
    $('#spellInfo').textContent = 'Revisando…'; await sleep(20);
    const found = new Map(), seen = new Map();
    for (let i = 0; i < S.pages.length; i++) {
      let lines; try { lines = await getLines(S.pages[i]); } catch { continue; }
      for (const l of lines) for (const m of l.str.matchAll(/\p{L}+/gu)) {
        const w = m[0]; if (w.length < 3 || /^\p{Lu}+$/u.test(w)) continue;
        const k = w.toLowerCase();
        if (!seen.has(k)) seen.set(k, typo.check(w) || typo.check(k) || typo.check(k[0].toUpperCase() + k.slice(1)));
        if (seen.get(k)) continue;
        const r = found.get(k) || { w, n: 0, pages: new Set() }; r.n++; r.pages.add(i + 1); found.set(k, r);
      }
    }
    spellResults = [...found.values()].sort((a, b) => b.n - a.n);
    $('#spellInfo').textContent = spellResults.length ? `${spellResults.length} palabra(s) dudosa(s). Pulsa «Sugerencias» para corregirlas en todo el documento.` : 'No se encontraron faltas.';
    renderSpell();
  };
  $('#spellList').addEventListener('click', async e => {
    const row = e.target.closest('[data-w]'); if (!row) return; const w = row.dataset.w, act = e.target.dataset.sp;
    if (act === 'ign') { ignored.add(w.toLowerCase()); localStorage.setItem('folio.ignore', JSON.stringify([...ignored])); renderSpell(); }
    else if (act === 'find') { $('[data-tab=search]').click(); $('#searchInput').value = w; $('#searchForm').requestSubmit(); }
    else if (act === 'sug') {
      const box = row.querySelector('.sugs'); box.textContent = 'Buscando…'; await sleep(10);
      const typo = await getTypo(), sugs = typo.suggest(w, 6);
      box.innerHTML = sugs.length ? sugs.map(s => `<button data-fix="${esc(s)}">${esc(s)}</button>`).join('') : '<small>Sin sugerencias</small>';
    } else if (e.target.dataset.fix) {
      const n = await FX.replaceAll(w, e.target.dataset.fix, { matchCase: true, whole: true });
      if (n) { spellResults = spellResults.filter(r => r.w !== w); renderSpell(); }
    }
  });

  // ---------- enlaces ----------
  const toolsBox = $('.tools'), eraserBtn = $('[data-tool=eraser]');
  eraserBtn.insertAdjacentHTML('beforebegin', '<button data-tool="link" title="Enlace (U): dibuja un rectángulo y elige una web o una página"><i data-i="link"></i></button>');
  paintIcons(toolsBox);
  document.addEventListener('keydown', e => { if (!e.target.closest?.('input,textarea,select') && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'u' && S.pages.length) setTool('link'); });
  function linkDialog(a, onOk) {
    const isPage = !!a.target, n = isPage ? pageNum(a.target) : '';
    openModal(`<h2>Enlace</h2>
      <div class="row"><label><input type="radio" name="lk" value="url" ${isPage ? '' : 'checked'}> Página web</label><input type="text" id="lkUrl" placeholder="https://…" value="${esc(a.url || '')}"></div>
      <div class="row"><label><input type="radio" name="lk" value="page" ${isPage ? 'checked' : ''}> Ir a la página</label><input type="number" id="lkPage" min="1" max="${S.pages.length}" value="${n}" style="max-width:100px"> de ${S.pages.length}</div>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="lkOk">Aceptar</button></div>`);
    $('#lkUrl').onfocus = () => { document.querySelector('[name=lk][value=url]').checked = true; };
    $('#lkPage').onfocus = () => { document.querySelector('[name=lk][value=page]').checked = true; };
    $('#lkOk').onclick = () => {
      const kind = document.querySelector('[name=lk]:checked').value;
      if (kind === 'url') { let u = $('#lkUrl').value.trim(); if (!u) return toast('Escribe la dirección'); if (!/^[a-z]+:/i.test(u)) u = (u.includes('@') && !u.includes('/') ? 'mailto:' : 'https://') + u; onOk({ url: u, target: null }); }
      else { const p = S.pages[(+$('#lkPage').value || 0) - 1]; if (!p) return toast('Ese número de página no existe'); onOk({ url: null, target: p.id }); }
      closeModal();
    };
  }
  FX.finishLink = (pg, a) => linkDialog({}, r => addAnn(pg.id, { type: 'link', x: a.x, y: a.y, w: a.w, h: a.h, ...r, label: r.url || `Página ${pageNum(r.target)}` }));
  function followLink(url, pageId) {
    if (url) { if (confirm(`¿Abrir este enlace?\n\n${url}`)) window.open(url, '_blank', 'noopener'); }
    else if (pageId && pageById(pageId)) scrollToPage(pageId);
  }
  FX.markup = (a, id) => {
    if (a.type === 'link') return `<g class="ann" ${id}><title>${esc(a.url || 'Ir a la página ' + pageNum(a.target))}</title><rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="rgba(37,99,235,.10)" stroke="#2563eb" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/></g>`;
    return '';
  };
  FX.annItems = (pg, a) => (a.type !== 'link' ? [] : [
    { label: a.url ? 'Abrir enlace' : `Ir a la página ${pageNum(a.target)}`, icon: 'link', action: () => followLink(a.url, a.target) },
    { label: 'Cambiar destino…', icon: 'edittext', action: () => linkDialog(a, r => { pushHistory(); Object.assign(a, r, { label: r.url || `Página ${pageNum(r.target)}` }); annChanged(pg.id); }) },
    '-'
  ]);
  TYPE_LABEL.link = 'Enlace';
  // enlaces que ya trae el PDF: se pueden pulsar en el visor
  FX.afterRender = async (d, pg, p, vp) => {
    d.querySelectorAll('.pdflink').forEach(x => x.remove());
    let anns; try { anns = await p.getAnnotations({ intent: 'display' }); } catch { return; }
    const s = src(pg.src);
    for (const an of anns) {
      if (an.subtype !== 'Link' || !(an.url || an.dest)) continue;
      const [x1, y1, x2, y2] = vp.convertToViewportRectangle(an.rect);
      const el = document.createElement('a'); el.className = 'pdflink'; el.title = an.url || 'Ir a otra página';
      Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
      el.addEventListener('click', async ev => {
        ev.preventDefault(); ev.stopPropagation();
        if (an.url) return followLink(an.url);
        try {
          let dest = an.dest; if (typeof dest === 'string') dest = await s.pdf.getDestination(dest);
          const ref = dest?.[0], idx = typeof ref === 'object' && ref ? await s.pdf.getPageIndex(ref) : ref;
          const target = S.pages.find(x => x.src === s.id && x.idx === idx); if (target) scrollToPage(target.id); else toast('La página de destino ya no está en el documento');
        } catch { toast('No se pudo seguir el enlace'); }
      });
      d.appendChild(el);
    }
  };

  // ---------- exportación: encabezado/pie, Bates, fondo, marcadores, adjuntos, enlaces ----------
  const HF_KEY = 'folio.hf';
  FX.exportFields = () => {
    const v = JSON.parse(localStorage.getItem(HF_KEY) || '{}'), val = k => esc(v[k] ?? '');
    return `<fieldset><legend>Encabezado, pie de página y numeración Bates</legend>
      <div class="hfgrid"><span></span><small>Izquierda</small><small>Centro</small><small>Derecha</small>
        <small>Arriba</small><input id="hfTL" value="${val('tl')}"><input id="hfTC" value="${val('tc')}"><input id="hfTR" value="${val('tr')}">
        <small>Abajo</small><input id="hfBL" value="${val('bl')}"><input id="hfBC" value="${val('bc')}"><input id="hfBR" value="${val('br')}"></div>
      <div class="row" style="margin-top:8px"><button type="button" id="hfNum">Numerar páginas</button><button type="button" id="hfBates">Añadir Bates</button><button type="button" id="hfClear">Vaciar</button>
        Tamaño <input type="number" id="hfSize" value="${v.size || 10}" min="5" max="40" style="max-width:64px"> Empezar en <input type="number" id="hfStart" value="${v.start || 1}" min="1" style="max-width:70px"></div>
      <div class="row"><label>Bates</label>Prefijo <input id="bPre" value="${esc(v.bpre ?? 'DOC')}" style="max-width:90px"> Nº inicial <input type="number" id="bStart" value="${v.bstart || 1}" min="0" style="max-width:90px"> Dígitos <input type="number" id="bDig" value="${v.bdig || 6}" min="1" max="12" style="max-width:60px"> Sufijo <input id="bSuf" value="${esc(v.bsuf ?? '')}" style="max-width:70px"></div>
      <p class="hint" style="padding:0">Códigos: <b>{n}</b> nº de página · <b>{t}</b> total · <b>{fecha}</b> · <b>{archivo}</b> · <b>{bates}</b></p>
    </fieldset>
    <fieldset><legend>Fondo de página</legend><div class="row"><label><input type="checkbox" id="bgOn" ${v.bgOn ? 'checked' : ''}> Color de fondo</label><input type="color" id="bgCol" value="${v.bgCol || '#fff8e1'}"></div></fieldset>`;
  };
  document.addEventListener('click', e => {
    if (e.target.id === 'hfNum') { if (!$('#hfBC').value) $('#hfBC').value = 'Página {n} de {t}'; }
    if (e.target.id === 'hfBates') { if (!$('#hfBR').value) $('#hfBR').value = '{bates}'; }
    if (e.target.id === 'hfClear') ['TL', 'TC', 'TR', 'BL', 'BC', 'BR'].forEach(k => { $('#hf' + k).value = ''; });
  });
  FX.readExportFields = () => {
    if (!$('#hfTL')) return {};
    const v = { tl: $('#hfTL').value, tc: $('#hfTC').value, tr: $('#hfTR').value, bl: $('#hfBL').value, bc: $('#hfBC').value, br: $('#hfBR').value, size: +$('#hfSize').value || 10, start: +$('#hfStart').value || 1,
      bpre: $('#bPre').value, bstart: +$('#bStart').value || 0, bdig: +$('#bDig').value || 6, bsuf: $('#bSuf').value, bgOn: $('#bgOn').checked, bgCol: $('#bgCol').value };
    localStorage.setItem(HF_KEY, JSON.stringify(v));
    return { hf: v, bg: v.bgOn ? v.bgCol : null };
  };
  function prependBackground(out, page, color) {
    const [r, g, b] = hexParts(color), cb = page.getCropBox();
    const ref = out.context.register(out.context.contentStream([pushGraphicsState(), setFillingRgbColor(r, g, b), rectangle(cb.x, cb.y, cb.width, cb.height), fill(), popGraphicsState()]));
    const key = PDFName.of('Contents'), cur = page.node.get(key);
    if (cur instanceof PDFArray) cur.insert(0, ref);
    else if (cur) page.node.set(key, out.context.obj([ref, cur]));
    else page.node.set(key, ref);
  }
  FX.exportPage = async (out, page, ctx, g, i, list, o, fonts) => {
    if (o.bg) prependBackground(out, page, o.bg);
    const hf = o.hf; if (!hf || !['tl', 'tc', 'tr', 'bl', 'bc', 'br'].some(k => hf[k])) return;
    const font = await fonts({ family: 'Helvetica' }), size = hf.size || 10, n = i + (hf.start || 1), t = list.length + (hf.start || 1) - 1;
    const bates = (hf.bpre || '') + String((hf.bstart || 0) + i).padStart(hf.bdig || 6, '0') + (hf.bsuf || '');
    const fill = s => s.replace(/\{n\}/g, n).replace(/\{t\}/g, t).replace(/\{fecha\}/g, new Date().toLocaleDateString('es-ES')).replace(/\{archivo\}/g, S.name).replace(/\{bates\}/g, bates);
    for (const [k, txt] of Object.entries(hf)) {
      if (!['tl', 'tc', 'tr', 'bl', 'bc', 'br'].includes(k) || !txt) continue;
      const str = fill(txt), tw = font.widthOfTextAtSize(safeText(font, str), size);
      const x = k[1] === 'l' ? 36 : k[1] === 'c' ? (g.dw - tw) / 2 : g.dw - tw - 36, y = k[0] === 't' ? 24 + size : g.dh - 20;
      drawDisplayText(page, ctx, str, x, y, size, 0, font, rgb(0.2, 0.2, 0.2), 1);
    }
  };
  function writeOutline(out, items, refOf) {
    const ctx = out.context;
    const prune = list => list.flatMap(b => { const kids = prune(b.children || []), r = refOf(b.page); return r ? [{ ...b, children: kids, ref: r }] : kids; });
    const tree = prune(items); if (!tree.length) return;
    const rootRef = ctx.nextRef();
    const build = (list, parentRef) => {
      const refs = list.map(() => ctx.nextRef()); let total = 0;
      list.forEach((b, i) => {
        const kids = b.children.length ? build(b.children, refs[i]) : null;
        const dct = { Title: PDFHexString.fromText(b.title || 'Sin título'), Parent: parentRef, Dest: [b.ref, PDFName.of('Fit')] };
        if (i > 0) dct.Prev = refs[i - 1]; if (i < list.length - 1) dct.Next = refs[i + 1];
        if (kids) { dct.First = kids.first; dct.Last = kids.last; dct.Count = kids.count; }
        ctx.assign(refs[i], ctx.obj(dct)); total += 1 + (kids ? kids.count : 0);
      });
      return { first: refs[0], last: refs[refs.length - 1], count: total };
    };
    const top = build(tree, rootRef);
    ctx.assign(rootRef, ctx.obj({ Type: 'Outlines', First: top.first, Last: top.last, Count: top.count }));
    out.catalog.set(PDFName.of('Outlines'), rootRef); out.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
  }
  FX.exportDoc = async (out, list, o, pageRefs, pageCtx) => {
    // enlaces creados en Folio
    for (const { page, ctx, pg } of pageCtx) for (const a of pg.annots) {
      if (a.type !== 'link') continue;
      const p1 = mapPt(ctx, a.x, a.y), p2 = mapPt(ctx, a.x + a.w, a.y + a.h);
      const dct = { Type: 'Annot', Subtype: 'Link', Rect: [Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.max(p1.x, p2.x), Math.max(p1.y, p2.y)], Border: [0, 0, 0], F: 4 };
      if (a.url) dct.A = out.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(a.url) });
      else if (pageRefs.get(a.target)) dct.Dest = [pageRefs.get(a.target), PDFName.of('Fit')];
      else continue;
      page.node.addAnnot(out.context.register(out.context.obj(dct)));
    }
    try { writeOutline(out, S.bookmarks || [], id => pageRefs.get(id)); } catch (e) { console.warn('marcadores', e); }
    for (const at of S.attachments || []) {
      const by = S.blobs.get(at.key); if (!(by instanceof Uint8Array)) continue;
      try { await out.attach(by, at.name, { mimeType: at.type || 'application/octet-stream', description: at.name }); } catch (e) { console.warn('adjunto', e); }
    }
  };

  paintIcons();
  FX.refreshViewSel();
})();
