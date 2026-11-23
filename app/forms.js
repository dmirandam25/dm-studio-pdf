/* DM Studio · PDF — crear formularios: añadir campos (texto, párrafo, casilla, opción, lista, fecha)
   y detectarlos solos en formularios impresos. Al guardar se convierten en campos PDF de verdad. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const { PDFName, PDFString } = PDFLib;
  const TYPES = {
    text: { label: 'Texto', w: 160, h: 20, icon: 'T' },
    multi: { label: 'Párrafo (varias líneas)', w: 240, h: 60, icon: '¶' },
    check: { label: 'Casilla de verificación', w: 14, h: 14, icon: '✓' },
    radio: { label: 'Botón de opción', w: 14, h: 14, icon: '◉' },
    combo: { label: 'Lista desplegable', w: 140, h: 20, icon: '▾' },
    date: { label: 'Fecha', w: 100, h: 20, icon: '📅' }
  };
  FX.FIELD_TYPES = TYPES;
  S.fieldType = 'text';

  // ---------- nombres únicos ----------
  const allFields = () => S.pages.flatMap(pg => pg.annots.filter(a => a.type === 'field'));
  function uniqueName(base, except) {
    base = (base || 'Campo').replace(/[.\s]+/g, '_').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 40) || 'Campo';
    const used = new Set(allFields().filter(a => a !== except).map(a => a.name));
    if (!used.has(base)) return base;
    for (let i = 2; ; i++) if (!used.has(`${base}_${i}`)) return `${base}_${i}`;
  }

  // ---------- dibujo en el visor ----------
  const prevMarkup = FX.markup;
  FX.markup = (a, id, sel) => {
    if (a.type !== 'field') return prevMarkup ? prevMarkup(a, id, sel) : '';
    const t = TYPES[a.ftype] || TYPES.text, round = a.ftype === 'radio';
    const fs = Math.min(a.h * 0.7, 9), lab = esc(a.name) + (a.required ? ' *' : '');
    let m = `<g class="ann field" ${id}><title>${esc(t.label)}: ${lab}</title>`;
    m += round ? `<ellipse cx="${a.x + a.w / 2}" cy="${a.y + a.h / 2}" rx="${a.w / 2}" ry="${a.h / 2}" fill="rgba(37,99,235,.10)" stroke="#2563eb" stroke-width="1" vector-effect="non-scaling-stroke"/>`
      : `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="rgba(37,99,235,.10)" stroke="#2563eb" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    if (a.ftype === 'check' || a.ftype === 'radio') { if (a.value) m += `<text x="${a.x + a.w / 2}" y="${a.y + a.h * 0.78}" font-size="${a.h * 0.85}" text-anchor="middle" fill="#1e3a8a">${round ? '●' : '✓'}</text>`; }
    else {
      m += `<text x="${a.x + 3}" y="${a.y + Math.min(a.h, 20) / 2 + fs * 0.35}" font-size="${fs}" fill="${a.value ? '#111' : '#2563eb'}" font-family="Liberation Sans, Arial" style="white-space:pre">${a.value ? esc(String(a.value).split('\n')[0]) : lab}</text>`;
      if (a.ftype === 'combo') m += `<path d="M${a.x + a.w - 11} ${a.y + a.h / 2 - 2}l4 4 4-4" stroke="#2563eb" fill="none" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
    }
    if (sel) m += `<rect class="handle" data-handle="${a.id}" x="${a.x + a.w - 4}" y="${a.y + a.h - 4}" width="8" height="8" fill="#2563eb" stroke="#fff" stroke-width="1"/>`;
    return m + '</g>';
  };
  const _bbox = window.bbox;
  window.bbox = a => (a.type === 'field' ? { x: a.x, y: a.y, w: a.w, h: a.h } : _bbox(a));
  TYPE_LABEL.field = 'Campo de formulario';

  // ---------- herramienta: arrastrar para crear un campo ----------
  $('#viewer').addEventListener('pointerdown', e => {
    if (S.tool !== 'field' || e.button !== 0) return;
    const d = e.target.closest('.page'); if (!d) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const pg = pageById(d.dataset.id), p0 = toPt(e, d), box = document.createElement('div');
    box.className = 'rubber'; d.appendChild(box);
    let p1 = p0;
    const draw = () => Object.assign(box.style, { left: Math.min(p0.x, p1.x) * S.scale + 'px', top: Math.min(p0.y, p1.y) * S.scale + 'px', width: Math.abs(p1.x - p0.x) * S.scale + 'px', height: Math.abs(p1.y - p0.y) * S.scale + 'px' });
    dragLoop(ev => { p1 = toPt(ev, d); draw(); }, () => {
      box.remove();
      const t = TYPES[S.fieldType] || TYPES.text, dragged = Math.abs(p1.x - p0.x) > 4 && Math.abs(p1.y - p0.y) > 4;
      const r = dragged ? { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y), w: Math.abs(p1.x - p0.x), h: Math.abs(p1.y - p0.y) } : { x: p0.x, y: p0.y - t.h / 2, w: t.w, h: t.h };
      if (S.fieldType === 'check' || S.fieldType === 'radio') { const s = Math.max(8, Math.min(r.w, r.h)); r.w = r.h = s; }
      const a = addAnn(pg.id, { type: 'field', ftype: S.fieldType, name: uniqueName(TYPES[S.fieldType].label.split(' ')[0]), ...r, value: '', options: S.fieldType === 'combo' ? ['Opción 1', 'Opción 2'] : [], group: S.fieldType === 'radio' ? 'Grupo1' : '', required: false, fs: 0 });
      toolDone(); select(pg.id, a.id); fieldDialog(pg, a, true);
    });
  }, true);

  // ---------- propiedades de un campo ----------
  function fieldDialog(pg, a, isNew) {
    openModal(`<h2>${isNew ? 'Nuevo campo' : 'Propiedades del campo'}</h2>
      <div class="row"><label>Tipo</label><select id="fdType">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${k === a.ftype ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
      <div class="row"><label>Nombre</label><input type="text" id="fdName" value="${esc(a.name)}"></div>
      <div class="row fd-radio"><label>Grupo</label><input type="text" id="fdGroup" value="${esc(a.group || '')}" placeholder="Las opciones del mismo grupo se excluyen"></div>
      <div class="row fd-opts"><label>Opciones</label><textarea id="fdOpts" rows="4" placeholder="Una por línea">${esc((a.options || []).join('\n'))}</textarea></div>
      <div class="row fd-val"><label>Valor inicial</label><input type="text" id="fdVal" value="${esc(typeof a.value === 'string' ? a.value : '')}"></div>
      <div class="row fd-chk"><label><input type="checkbox" id="fdOn" ${a.value ? 'checked' : ''}> Marcada al abrir</label></div>
      <div class="row fd-txt"><label>Tamaño de letra</label><select id="fdFs"><option value="0">Automático</option>${[8, 9, 10, 11, 12, 14, 16].map(n => `<option ${a.fs === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="row"><label><input type="checkbox" id="fdReq" ${a.required ? 'checked' : ''}> Obligatorio</label></div>
      <p class="hint" style="padding:0">El campo se puede rellenar en Acrobat, en el navegador o en DM Studio (Firmar ▸ Rellenar formulario) después de guardar el PDF.</p>
      <div class="actions">${isNew ? '' : '<button id="fdDel" class="danger">Eliminar</button>'}<button data-close>${isNew ? 'Listo' : 'Cancelar'}</button><button class="primary" id="fdOk">Aplicar</button></div>`);
    const sync = () => {
      const t = $('#fdType').value;
      document.querySelectorAll('.fd-radio').forEach(x => x.style.display = t === 'radio' ? '' : 'none');
      document.querySelectorAll('.fd-opts').forEach(x => x.style.display = t === 'combo' ? '' : 'none');
      document.querySelectorAll('.fd-val,.fd-txt').forEach(x => x.style.display = ['text', 'multi', 'combo', 'date'].includes(t) ? '' : 'none');
      document.querySelectorAll('.fd-chk').forEach(x => x.style.display = ['check', 'radio'].includes(t) ? '' : 'none');
    };
    $('#fdType').onchange = sync; sync();
    $('#fdOk').onclick = () => {
      pushHistory();
      const cur = pg.annots.find(x => x.id === a.id) || a, t = $('#fdType').value;
      Object.assign(cur, {
        ftype: t, name: uniqueName($('#fdName').value.trim() || 'Campo', cur), group: $('#fdGroup').value.trim() || 'Grupo1', required: $('#fdReq').checked, fs: +$('#fdFs').value || 0,
        options: $('#fdOpts').value.split('\n').map(s => s.trim()).filter(Boolean),
        value: ['check', 'radio'].includes(t) ? $('#fdOn').checked : $('#fdVal').value
      });
      if (['check', 'radio'].includes(t) && Math.abs(cur.w - cur.h) > 2) { const s = Math.min(cur.w, cur.h, 18); cur.w = cur.h = s; }
      annChanged(pg.id); closeModal();
    };
    $('#fdDel')?.addEventListener('click', () => { pushHistory(); pg.annots = pg.annots.filter(x => x.id !== a.id); S.sel = null; annChanged(pg.id); closeModal(); });
  }
  FX.fieldDialog = fieldDialog;
  $('#viewer').addEventListener('dblclick', e => {
    const el = e.target.closest('[data-ann]'), d = e.target.closest('.page'); if (!el || !d) return;
    const pg = pageById(d.dataset.id), a = pg?.annots.find(x => x.id === el.dataset.ann);
    if (a?.type === 'field') { e.stopImmediatePropagation(); fieldDialog(pg, a, false); }
  }, true);
  const prevItems = FX.annItems;
  FX.annItems = (pg, a) => (a.type === 'field' ? [{ label: 'Propiedades del campo…', icon: 'form', action: () => fieldDialog(pg, a, false) }, '-'] : prevItems ? prevItems(pg, a) : []);

  // ---------- detección automática ----------
  async function detectPage(pg) {
    const found = [], lines = await getLines(pg).catch(() => []);
    await getImages(pg).catch(() => { });
    const shapes = pdfShapeCache.get(lineKey(pg)) || [];
    const label = (ln, x) => { const before = ln.words?.filter(w => w.x2 <= x + 1).map(w => w.str).join(' ') || ''; return before.replace(/[_.…:]+$/g, '').trim().split(/\s{2,}/).pop().slice(-40); };
    const textAt = r => lines.some(l => l.x2 > r.x + 2 && l.x1 < r.x + r.w - 2 && l.bottom > r.y + 1 && l.top < r.y + r.h - 1 && !/^[_.…\s□☐]+$/.test(l.str));
    for (const ln of lines) {
      // rayas o puntos para escribir: «Nombre: ________»
      for (const w of ln.words || []) {
        const m = /_{3,}|\.{5,}|…{2,}/.exec(w.str); if (!m) continue;
        const k = (w.x2 - w.x1) / w.str.length, x = w.x1 + m.index * k, wd = m[0].length * k;
        if (wd < 25) continue;
        found.push({ ftype: 'text', name: label(ln, x) || 'Campo', x, y: ln.bottom - Math.max(14, ln.fs * 1.3), w: wd, h: Math.max(14, ln.fs * 1.3) });
      }
      // casillas dibujadas con caracteres: ☐ □
      for (const w of ln.words || []) if (/^[☐□▢❏]$/.test(w.str)) {
        const s = Math.max(8, ln.fs * 0.8), nxt = ln.words[ln.words.indexOf(w) + 1];
        found.push({ ftype: 'check', name: nxt?.str || 'Casilla', x: w.x1, y: ln.base - s * 0.85, w: s, h: s });
      }
    }
    for (const sh of shapes) {
      // cuadraditos vacíos = casillas
      if (sh.kind === 'stroke' && sh.w >= 6 && sh.w <= 20 && Math.abs(sh.w - sh.h) < 2.5 && !textAt(sh)) {
        const ln = lines.find(l => l.x1 > sh.x + sh.w && l.x1 - (sh.x + sh.w) < 30 && Math.abs((l.top + l.bottom) / 2 - (sh.y + sh.h / 2)) < sh.h);
        found.push({ ftype: 'check', name: ln ? ln.str.slice(0, 40) : 'Casilla', x: sh.x, y: sh.y, w: sh.w, h: sh.h }); continue;
      }
      // recuadros vacíos = campos de texto
      if (sh.kind === 'stroke' && sh.w >= 40 && sh.h >= 12 && sh.h <= 120 && !textAt(sh)) {
        const ln = lines.filter(l => l.bottom <= sh.y + 2 && sh.y - l.bottom < 16 && l.x1 < sh.x + sh.w && l.x2 > sh.x).pop() || lines.filter(l => Math.abs((l.top + l.bottom) / 2 - (sh.y + sh.h / 2)) < sh.h / 2 && l.x2 <= sh.x + 2).pop();
        found.push({ ftype: sh.h > 30 ? 'multi' : 'text', name: ln ? ln.str.replace(/[:_.]+$/, '').slice(-40) : 'Campo', x: sh.x + 1, y: sh.y + 1, w: sh.w - 2, h: sh.h - 2 }); continue;
      }
      // líneas horizontales sueltas = renglón para escribir encima
      if (sh.h <= 2.5 && sh.w >= 50) {
        const r = { x: sh.x, y: sh.y - 16, w: sh.w, h: 15 };
        if (textAt(r)) continue;
        const ln = lines.filter(l => Math.abs(l.base - sh.y) < 6 && l.x2 <= sh.x + 3).pop();
        found.push({ ftype: 'text', name: ln ? ln.str.replace(/[:_.]+$/, '').slice(-40) : 'Campo', ...r });
      }
    }
    // sin duplicados ni campos encima de otros ya puestos
    const out = [];
    for (const f of found) {
      const ov = b => !(f.x + f.w < b.x + 2 || b.x + b.w < f.x + 2 || f.y + f.h < b.y + 2 || b.y + b.h < f.y + 2);
      if (out.some(ov) || pg.annots.some(a => a.type === 'field' && ov(a))) continue;
      out.push(f);
    }
    return out;
  }
  async function detectFields() {
    if (!S.pages.length) return toast('Abre un documento primero');
    toast('Buscando dónde se rellena el formulario…', 30000);
    pushHistory(); let n = 0;
    for (const pg of S.pages) {
      const list = await detectPage(pg);
      for (const f of list) { pg.annots.push({ type: 'field', ...f, name: uniqueName(f.name), value: '', options: [], group: 'Grupo1', required: false, fs: 0, id: nid('a') }); n++; }
      if (list.length) annChanged(pg.id);
    }
    if (!n) { S.history.pop(); updateButtons(); return toast('No encontré espacios para rellenar (rayas, casillas o recuadros vacíos). Añade los campos con «Añadir campo».', 6000); }
    toast(`${n} campo(s) detectado(s). Revísalos: doble clic para cambiar nombre o tipo, Supr para borrar los que sobren.`, 7000);
  }

  // ---------- guardar: campos PDF reales ----------
  const prevDoc = FX.exportDoc;
  FX.exportDoc = async (out, list, o, pageRefs, pageCtx) => {
    if (prevDoc) await prevDoc(out, list, o, pageRefs, pageCtx);
    const items = pageCtx.flatMap(pc => pc.pg.annots.filter(a => a.type === 'field').map(a => ({ a, pc })));
    if (!items.length) return;
    const form = out.getForm(), used = new Set(form.getFields().map(f => f.getName())), radios = new Map();
    const helv = await out.embedFont(PDFLib.StandardFonts.Helvetica);
    const nameOf = n => { let k = n, i = 2; while (used.has(k)) k = `${n}_${i++}`; used.add(k); return k; };
    for (const { a, pc } of items) {
      const p1 = mapPt(pc.ctx, a.x, a.y), p2 = mapPt(pc.ctx, a.x + a.w, a.y + a.h);
      const rect = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p1.x - p2.x), height: Math.abs(p1.y - p2.y) };
      const look = { ...rect, borderColor: PDFLib.rgb(0.55, 0.6, 0.7), borderWidth: 0.8, backgroundColor: PDFLib.rgb(0.93, 0.95, 1) };
      try {
        let f;
        if (a.ftype === 'check') { f = form.createCheckBox(nameOf(a.name)); f.addToPage(pc.page, look); if (a.value) f.check(); }
        else if (a.ftype === 'radio') {
          const g = a.group || 'Grupo1';
          if (!radios.has(g)) radios.set(g, form.createRadioGroup(nameOf(g)));
          const rg = radios.get(g), opt = a.name || 'Opción'; rg.addOptionToPage(opt, pc.page, look); if (a.value) rg.select(opt); f = rg;
        } else if (a.ftype === 'combo') {
          f = form.createDropdown(nameOf(a.name)); f.addOptions(a.options?.length ? a.options : ['']); f.addToPage(pc.page, { ...look, font: helv });
          if (a.value && a.options?.includes(a.value)) f.select(a.value);
        } else {
          f = form.createTextField(nameOf(a.name));
          if (a.ftype === 'multi') f.enableMultiline();
          if (a.value) f.setText(String(a.value));
          f.addToPage(pc.page, { ...look, font: helv });
          f.setFontSize(a.fs || 0);
          if (a.ftype === 'date') { // formato y comprobación de fecha (Acrobat y lectores compatibles)
            const w = f.acroField.getWidgets()[0];
            f.acroField.dict.set(PDFName.of('AA'), out.context.obj({
              F: { S: 'JavaScript', JS: PDFString.of('AFDate_FormatEx("dd/mm/yyyy");') },
              K: { S: 'JavaScript', JS: PDFString.of('AFDate_KeystrokeEx("dd/mm/yyyy");') }
            }));
            if (w) f.acroField.dict.set(PDFName.of('TU'), PDFString.of('Fecha (dd/mm/aaaa)'));
          }
        }
        if (a.required && f?.enableRequired) f.enableRequired();
      } catch (e) { console.warn('campo', a.name, e); }
    }
    try { form.updateFieldAppearances(helv); } catch (e) { console.warn('apariencias', e); }
  };

  // ---------- panel de herramienta: elegir el tipo de campo ----------
  function startField(type) {
    if (!S.pages.length) return toast('Abre un documento primero');
    S.fieldType = type; setTool('field');
    toast(`Haz clic o arrastra en la página para poner: ${TYPES[type].label}`, 3500);
  }
  FX.forms = { startField, detectFields, fieldDialog, TYPES };
  FX.formMenu = () => [
    { label: 'Detectar campos automáticamente', icon: 'scan', action: detectFields },
    '-',
    ...Object.entries(TYPES).map(([k, t]) => ({ label: `Añadir campo: ${t.label}`, icon: k === 'check' || k === 'radio' ? 'check' : 'form', action: () => startField(k) }))
  ];
  document.head.insertAdjacentHTML('beforeend', `<style>
    #viewer.field-mode .page{cursor:crosshair}
    .rubber{position:absolute;z-index:8;border:1.5px dashed #2563eb;background:rgba(37,99,235,.08);pointer-events:none}
    .field text{pointer-events:none}
  </style>`);
  const _setTool = window.setTool;
  window.setTool = function (t) { const r = _setTool.apply(this, arguments); $('#viewer').classList.toggle('field-mode', t === 'field'); return r; };
})();
