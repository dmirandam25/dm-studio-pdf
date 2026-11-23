/* DM Studio · PDF — interfaz: modos (Todas las herramientas, Leer, Editar, Convertir, Firmar),
   panel de herramientas, barra derecha con paneles, menús del documento y «Más opciones». */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  Object.assign(ICONS, {
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    word: '<path d="M14 3H6v18h12V7zM14 3v4h4"/><path d="M8 11l1.5 6 1.5-4 1.5 4 1.5-6"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>'
  });

  // ---------- qué herramientas de la barra flotante salen en cada modo ----------
  const M = {
    select: 'all read edit convert sign', note: 'all read sign', highlight: 'all read', ink: 'all read', text: 'all edit sign',
    edittext: 'edit', rect: 'edit', ellipse: 'edit', line: 'edit', arrow: 'edit', editimg: 'edit', whiteout: 'edit', redact: 'edit', link: 'edit',
    eraser: 'all edit sign', signature: 'all sign', image: 'edit', undo: 'all read edit convert sign', redo: 'all read edit convert sign', sep: 'all edit sign'
  };
  const tagTools = () => $$('#toolbar .tools > *').forEach(el => { const k = el.dataset.tool || el.dataset.act || (el.classList.contains('sep') ? 'sep' : ''); el.dataset.m = M[k] || ''; });

  // ---------- acciones del panel ----------
  const need = () => { if (!S.pages.length) { toast('Abre un documento primero'); return false; } return true; };
  const act = n => () => ACTIONS[n]?.();
  const tool = (t, mode) => () => { if (!need()) return; if (mode) setMode(mode); setTool(t); };
  const panel = name => () => { if (need()) openSide(name); };
  const T = n => () => { if (n !== 'stamps' && !need()) return; FX.T?.[n]?.(); };
  const conv = prefix => () => (FX.convertItems?.() || []).find(i => i && i.label && i.label.startsWith(prefix))?.action();
  function insertText(text, msg) {
    if (!need()) return;
    const pg = pageById(S.cur) || S.pages[0], d = pageDiv(pg.id), r = d.getBoundingClientRect(), v = $('#viewer').getBoundingClientRect(), g = geom(pg);
    const y = Math.min(g.dh - 40, Math.max(40, (v.top + v.height / 2 - r.top) / S.scale));
    const a = addAnn(pg.id, { type: 'text', ax: g.dw / 2 - 50, ay: y, angle: 0, text, fs: S.fontSize, color: S.colors.default, opacity: 1, family: S.family, bold: S.bold, italic: S.italic });
    setTool('select'); select(pg.id, a.id); toast(msg);
  }
  const PANELS = {
    all: () => ({
      title: 'Todas las herramientas', sub: 'Edita, convierte, firma y mucho más.',
      cta: !S.pages.length,
      sections: [
        ['Lo más usado', 'c1', [['open', 'Abrir un archivo', act('open')], ['fileplus', 'Combinar archivos', act('add')], ['edittext', 'Editar texto e imágenes', () => setMode('edit')], ['sign', 'Rellenar y firmar', () => setMode('sign')], ['convert', 'Exportar un PDF', () => setMode('convert')], ['word', 'PDF a Word', conv('PDF a Word')], ['image', 'PDF a JPG', conv('PDF a imágenes')], ['fileplus', 'Convertir a PDF', () => setMode('convert')]]],
        ['Revisar', 'c3', [['note', 'Añadir comentarios', tool('note')], ['highlight', 'Resaltar', tool('highlight')], ['pen', 'Dibujar', tool('ink')], ['compare', 'Comparar archivos', act('compare'), 'NUEVO'], ['stamp', 'Añadir un sello', T('stamps')], ['count', 'Contar palabras', T('wordCount')]]],
        ['Organizar', 'c4', [['pages', 'Organizar páginas', panel('pages')], ['scissors', 'Dividir o extraer páginas', () => need() && openExport()], ['download', 'Comprimir un PDF', conv('Comprimir')], ['scan', 'Reconocer texto (OCR)', act('ocr')], ['bookmark', 'Marcadores', panel('bookmarks')], ['bookmark', 'Marcadores desde los títulos', T('autoBookmarks'), 'NUEVO'], ['reverse', 'Invertir el orden de páginas', T('reversePages')], ['scissors', 'Dividir cada N páginas', T('splitEvery')], ['clip', 'Archivos adjuntos', panel('attachments')]]],
        ['Proteger', 'c2', [['lock', 'Proteger con contraseña', T('protect')], ['unlock', 'Quitar la contraseña', T('unprotect')], ['eyeoff', 'Quitar información oculta', T('sanitize')], ['shield', 'Auditar redacciones', T('auditRedactions'), 'NUEVO'], ['redact', 'Redactar información', tool('redact', 'edit')], ['whiteout', 'Borrar un área', tool('whiteout', 'edit')]]],
        ['Leer', 'c5', [['speak', 'Leer en voz alta', act('readAloud')], ['expand', 'Modo lectura', act('reading')], ['spell', 'Revisar la ortografía', panel('spell')]]]
      ]
    }),
    edit: () => ({
      title: 'Editar', sub: 'Cambia el texto, las imágenes y las páginas del PDF.',
      sections: [
        ['Contenido', 'c3', [['edittext', 'Editar texto', tool('edittext')], ['text', 'Añadir texto', tool('text')], ['image', 'Añadir imagen', act('image')], ['imgedit', 'Editar imágenes y formas', tool('editimg')], ['whiteout', 'Borrar un área', tool('whiteout')], ['link', 'Añadir enlace', tool('link')], ['link', 'Convertir direcciones web en enlaces', T('autoLinks')], ['search', 'Buscar y reemplazar', () => { if (!need()) return; openSide('search'); setTimeout(() => $('#replaceInput')?.focus(), 60); }], ['spell', 'Ortografía', panel('spell')]]],
        ['Formas', 'c1', [['rect', 'Rectángulo', tool('rect')], ['ellipse', 'Elipse', tool('ellipse')], ['line', 'Línea', tool('line')], ['arrow', 'Flecha', tool('arrow')]]],
        ['Páginas', 'c4', [['rotr', 'Girar página', act('rotR')], ['fileplus', 'Insertar página en blanco', act('blank')], ['copy', 'Duplicar página', act('dup')], ['trash', 'Eliminar página', act('delPages')], ['pages', 'Organizar páginas', panel('pages')]]],
        ['Al guardar', 'c5', [['text', 'Encabezado, pie y Bates', () => need() && openExport()], ['rect', 'Marca de agua y fondo', () => need() && openExport()]]],
        ['Proteger', 'c2', [['redact', 'Redactar', tool('redact')]]]
      ]
    }),
    convert: () => {
      const items = FX.convertItems?.() || [], groups = [[]];
      items.forEach(i => { if (i === '-') groups.push([]); else if (i) groups[groups.length - 1].push([i.icon === 'convert' && /Word/.test(i.label) ? 'word' : i.icon, i.label.replace(/…$/, ''), i.action]); });
      return { title: 'Convertir', sub: 'Exporta tu PDF a otros formatos o crea un PDF a partir de otros archivos.', sections: [['Exportar un PDF', 'c2', groups[0] || []], ['Crear un PDF', 'c1', groups[1] || []], ['Opciones', 'c4', groups[2] || []]] };
    },
    sign: () => ({
      title: 'Rellenar y firmar', sub: 'Firma, escribe en formularios y añade la fecha.',
      sections: [
        ['Firmar', 'c5', [['sign', 'Añadir firma', act('signature')], ['sign', 'Añadir iniciales', act('signature')], ['stamp', 'Añadir un sello', T('stamps')]]],
        ['Rellenar', 'c1', [['text', 'Escribir texto', tool('text')], ['calendar', 'Añadir la fecha de hoy', () => insertText(new Date().toLocaleDateString('es-ES'), 'Fecha añadida: arrástrala a su sitio')], ['form', 'Rellenar formulario', panel('form')], ['note', 'Añadir nota', tool('note')]]]
      ]
    })
  };
  let items = [];
  function renderPanel() {
    const box = $('#toolsPanel'), mk = PANELS[document.body.dataset.mode]; if (!mk) { box.innerHTML = ''; return; }
    const p = mk(); items = [];
    let html = `<div class="tp-head"><h2>${esc(p.title)}</h2><button data-tp-close title="Cerrar el panel"><i data-i="x"></i></button></div><p class="tp-sub">${esc(p.sub)}</p>`;
    if (p.cta) html += `<div class="tp-cta"><button data-act="open">Abrir un archivo</button><small>Todo funciona sin conexión y sin cuenta.</small></div>`;
    for (const [title, color, list] of p.sections) {
      if (!list.length) continue;
      html += `<div class="tp-sec">${esc(title)}</div>` + list.map(([icon, label, run, badge]) => { items.push(run); return `<button class="tp-item" data-ti="${items.length - 1}" style="--c:var(--tp-${color})"><i data-i="${icon}"></i><span>${esc(label)}</span>${badge ? `<b class="tp-badge">${badge}</b>` : ''}</button>`; }).join('');
    }
    box.innerHTML = html; paintIcons(box);
  }
  $('#toolsPanel').addEventListener('click', e => {
    if (e.target.closest('[data-tp-close]')) { document.body.classList.add('tools-closed'); localStorage.setItem('folio.tools', 'closed'); relayout(); return; }
    const b = e.target.closest('[data-ti]'); if (b) items[+b.dataset.ti]?.();
  });

  // ---------- modos ----------
  function relayout() { if (S.pages.length && S.zoomMode !== 'custom') setTimeout(() => rerenderAll(), 40); }
  function setMode(m) {
    const same = document.body.dataset.mode === m;
    document.body.dataset.mode = m; localStorage.setItem('folio.mode', m);
    $$('#modeTabs [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    if (same && m !== 'read' && document.body.classList.contains('tools-closed')) { document.body.classList.remove('tools-closed'); localStorage.removeItem('folio.tools'); }
    else if (same && m !== 'read') { document.body.classList.add('tools-closed'); localStorage.setItem('folio.tools', 'closed'); }
    else if (!same && m !== 'read') { document.body.classList.remove('tools-closed'); localStorage.removeItem('folio.tools'); }
    const allowed = ($('#toolbar .tools [data-tool="' + S.tool + '"]')?.dataset.m || '').split(' ');
    if (!allowed.includes(m) && S.tool !== 'select') setTool('select');
    renderPanel(); relayout();
  }
  FX.setMode = setMode;
  $('#modeTabs').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });

  // ---------- paneles de la derecha (miniaturas, comentarios, buscar…) ----------
  const nav = $('#sidebar .tabs'), railBox = $('#rail .rail-panels');
  function buildRail() {
    railBox.innerHTML = [...nav.querySelectorAll('[data-tab]')].map(b => `<button data-rail="${b.dataset.tab}" title="${esc(b.title)}">${b.innerHTML}</button>`).join('');
    syncRail();
  }
  function syncRail() {
    const open = !document.body.classList.contains('side-closed'), cur = nav.querySelector('[data-tab].active')?.dataset.tab;
    railBox.querySelectorAll('[data-rail]').forEach(b => b.classList.toggle('on', open && b.dataset.rail === cur));
  }
  function openSide(name) { document.body.classList.remove('side-closed'); localStorage.setItem('folio.side', 'open'); nav.querySelector(`[data-tab="${name}"]`)?.click(); syncRail(); relayout(); }
  function closeSide() { document.body.classList.add('side-closed'); localStorage.setItem('folio.side', 'closed'); syncRail(); relayout(); }
  FX.openSide = openSide;
  railBox.addEventListener('click', e => {
    const b = e.target.closest('[data-rail]'); if (!b) return;
    if (b.classList.contains('on')) closeSide(); else openSide(b.dataset.rail);
  });
  // cualquier otra forma de abrir un panel (Ctrl+F, menús…) también muestra la barra lateral
  nav.addEventListener('click', e => { if (e.target.closest('[data-tab]') && document.body.classList.contains('side-closed')) { document.body.classList.remove('side-closed'); localStorage.setItem('folio.side', 'open'); relayout(); } setTimeout(syncRail, 0); }, true);

  // ---------- menús: documento y «Más opciones» ----------
  $('#docMenuBtn').addEventListener('click', () => {
    if (!S.pages.length) return toast('No hay ningún documento abierto');
    FX.showMenuAt('#docMenuBtn', [
      { label: 'Cambiar el nombre…', icon: 'edittext', action: async () => { const n = await askText('Nombre del documento', '', S.name); if (n) { S.name = n.replace(/\.pdf$/i, ''); S.dirty = true; $('#docName').textContent = S.name; renderTabs(); scheduleSave(); } } },
      { label: 'Guardar como…', icon: 'download', action: () => (FX.saveAs ? FX.saveAs() : openExport()) },
      { label: 'Imprimir…', icon: 'print', action: printDoc },
      '-',
      { label: `${S.pages.length} página(s)`, icon: 'pages', disabled: true, action: () => { } },
      { label: 'Contar palabras', icon: 'count', action: () => FX.T?.wordCount() },
      { label: 'Proteger con contraseña…', icon: 'lock', action: () => FX.T?.protect() },
      '-',
      { label: 'Cerrar el documento', icon: 'x', action: () => closeTab(S.tab) }
    ]);
  });
  ACTIONS.moreMenu = () => FX.showMenuAt('[data-act=moreMenu]', [
    { label: 'Abrir un archivo…', icon: 'open', key: 'Ctrl+O', action: ACTIONS.open },
    { label: 'Combinar archivos…', icon: 'fileplus', action: ACTIONS.add },
    { label: 'Documento en blanco', icon: 'fileplus', action: ACTIONS.newDoc },
    { label: 'Nueva pestaña', icon: 'plus', key: 'Ctrl+T', action: ACTIONS.newTab },
    '-',
    { label: 'Convertir…', icon: 'convert', action: () => setMode('convert') },
    { label: 'Comparar archivos…', icon: 'compare', action: () => ACTIONS.compare?.() },
    { label: 'Reconocer texto (OCR)…', icon: 'scan', action: ACTIONS.ocr },
    '-',
    { label: 'Dónde guardar los archivos…', icon: 'open', action: () => FX.openSaveSettings?.() },
    { label: document.documentElement.dataset.theme === 'dark' ? 'Tema claro' : 'Tema oscuro', icon: 'moon', action: ACTIONS.theme },
    { label: 'Atajos de teclado', icon: 'cursor', action: shortcuts }
  ]);
  ACTIONS.searchPanel = () => { if (!need()) return; openSide('search'); setTimeout(() => $('#searchInput')?.focus(), 60); };
  function shortcuts() {
    const rows = [['Ctrl+O', 'Abrir'], ['Ctrl+S', 'Guardar'], ['Ctrl+P', 'Imprimir'], ['Ctrl+Z / Ctrl+Y', 'Deshacer / rehacer'], ['Ctrl+F', 'Buscar'], ['Ctrl+T / Ctrl+W', 'Nueva pestaña / cerrar'], ['V', 'Seleccionar'], ['K', 'Editar texto'], ['T', 'Añadir texto'], ['H', 'Resaltar'], ['D', 'Dibujar'], ['N', 'Nota'], ['S', 'Firmar'], ['J', 'Editar imágenes y formas'], ['W', 'Borrar área'], ['U', 'Enlace'], ['X', 'Redactar'], ['Supr', 'Eliminar lo seleccionado'], ['F11', 'Modo lectura'], ['Esc', 'Volver a Seleccionar']];
    openModal(`<h2>Atajos de teclado</h2><table class="keys">${rows.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')}</table><div class="actions"><button class="primary" data-close>Cerrar</button></div>`);
  }

  // ---------- barra de propiedades flotante: solo cuando hace falta ----------
  const PROPS = new Set(['highlight', 'ink', 'rect', 'ellipse', 'line', 'arrow', 'text', 'note', 'link']);
  const updProps = () => document.body.classList.toggle('show-props', PROPS.has(S.tool) || !!S.sel);
  const _setTool = window.setTool, _select = window.select;
  window.setTool = function (t, l) { const r = _setTool(t, l); updProps(); return r; };
  window.select = function (p, a) { const r = _select(p, a); updProps(); return r; };

  // ---------- buscador de herramientas (Ctrl+K) ----------
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function registry() {
    const list = [];
    for (const m of ['all', 'edit', 'convert', 'sign']) PANELS[m]().sections.forEach(([sec, color, its]) => its.forEach(([icon, label, run]) => { if (!list.some(x => x.label === label)) list.push({ icon, label, run, sec, color }); }));
    [['open', 'Abrir un archivo', act('open'), 'Archivo'], ['plus', 'Nueva pestaña', act('newTab'), 'Archivo'], ['fileplus', 'Documento en blanco', act('newDoc'), 'Archivo'], ['download', 'Guardar', act('export'), 'Archivo'], ['print', 'Imprimir', act('print'), 'Archivo'],
      ['open', 'Dónde guardar los archivos', () => FX.openSaveSettings?.(), 'Opciones'], ['moon', 'Cambiar tema claro / oscuro', act('theme'), 'Opciones'], ['cursor', 'Atajos de teclado', shortcuts, 'Ayuda'], ['pages', 'Ir al inicio', goHome, 'Ver'],
      ['search', 'Buscar en el documento', act('searchPanel'), 'Ver'], ['book2', 'Ver dos páginas', () => { S.view = 'two'; rebuild(true); scheduleSave(); }, 'Ver'], ['pages', 'Ver una página', () => { S.view = 'one'; rebuild(true); scheduleSave(); }, 'Ver']]
      .forEach(([icon, label, run, sec]) => list.push({ icon, label, run, sec, color: 'c1' }));
    return list;
  }
  function openPalette(mode = 'run') {
    closeMenus?.();
    let pal = $('#palette'); if (pal) pal.remove();
    pal = document.createElement('div'); pal.id = 'palette';
    pal.innerHTML = `<div class="pal-card"><div class="pal-in"><i data-i="search"></i><input id="palInput" placeholder="${mode === 'pin' ? 'Elige una herramienta para anclarla…' : 'Buscar herramientas y comandos…'}" autocomplete="off"><kbd>Esc</kbd></div><div class="pal-list" id="palList"></div></div>`;
    document.body.appendChild(pal); paintIcons(pal);
    const all = registry(); let shown = [], sel = 0;
    const draw = () => {
      const q = norm($('#palInput').value.trim());
      shown = all.filter(x => !q || norm(x.label + ' ' + x.sec).includes(q)).slice(0, 40); sel = Math.min(sel, Math.max(0, shown.length - 1));
      $('#palList').innerHTML = shown.length ? shown.map((x, i) => `<button class="pal-item${i === sel ? ' on' : ''}" data-pi="${i}" style="--c:var(--tp-${x.color})"><i data-i="${x.icon}"></i><span>${esc(x.label)}</span><small>${esc(x.sec)}</small></button>`).join('') : '<p class="hint">Sin resultados</p>';
      paintIcons($('#palList'));
    };
    const close = () => pal.remove();
    const pick = i => { const x = shown[i]; if (!x) return; close(); if (mode === 'pin') pinTool(x.label); else x.run(); };
    $('#palInput').addEventListener('input', () => { sel = 0; draw(); });
    $('#palInput').addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); $('#palList .on')?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); $('#palList .on')?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
    });
    pal.addEventListener('mousedown', e => { if (e.target === pal) close(); });
    $('#palList').addEventListener('click', e => { const b = e.target.closest('[data-pi]'); if (b) pick(+b.dataset.pi); });
    draw(); $('#palInput').focus();
  }
  FX.openPalette = openPalette;
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); } }, true);
  $('#tsBtn').addEventListener('click', () => openPalette());

  // ---------- inicio: recomendadas, ancladas, carpeta y recientes ----------
  const pins = () => JSON.parse(localStorage.getItem('folio.pins') || '[]');
  function pinTool(label) { const p = pins(); if (!p.includes(label)) p.push(label); localStorage.setItem('folio.pins', JSON.stringify(p)); renderHome(); toast(`Anclada: ${label}`); }
  let recents = [], pinDir = null, dirFiles = null;
  idbDo('kv', 'readonly', st => st.get('recents')).then(v => { recents = v || []; renderHome(); }).catch(() => { });
  idbDo('kv', 'readonly', st => st.get('pinDir')).then(v => { pinDir = v || null; renderHome(); }).catch(() => { });
  const saveRecents = () => idbDo('kv', 'readwrite', st => st.put(recents, 'recents')).catch(() => { });
  const pendingHandles = new Map();
  const stem = n => (n || '').replace(/\.[^.]+$/, '').toLowerCase();
  const prevAfterLoad = FX.afterLoad;
  FX.afterLoad = async sources => {
    await prevAfterLoad?.(sources);
    for (const s of sources) {
      const h = pendingHandles.get(s.name) || [...pendingHandles.entries()].find(([n]) => stem(n) === stem(s.name))?.[1] || null;
      recents = [{ name: s.name, pages: s.info.length, size: s.bytes.length, date: Date.now(), handle: h }, ...recents.filter(r => r.name !== s.name)].slice(0, 15);
    }
    pendingHandles.clear(); saveRecents();
  };
  const OPEN_TYPES = [{ description: 'Documentos', accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'], 'text/html': ['.html', '.htm'], 'text/plain': ['.txt', '.md', '.csv'] } }];
  async function openHandles(hs) { const files = await Promise.all(hs.map(h => h.getFile())); hs.forEach((h, i) => pendingHandles.set(files[i].name, h)); document.body.classList.remove('at-home'); await loadFiles(files, true); }
  ACTIONS.open = async () => {
    if (!FX.nativePickers) return $('#fileOpen').click();
    const t0 = performance.now();
    try { await openHandles(await window.showOpenFilePicker({ multiple: true, id: 'folio-abrir', types: OPEN_TYPES })); }
    catch (e) {
      if (FX.pickerAbortedFast(e, t0)) { $('#fileOpen').click(); return toast('Si no se abrió la ventana, pulsa «Abrir» otra vez', 4000); }
      if (e.name !== 'AbortError') $('#fileOpen').click();
    }
  };
  async function openRecent(r) {
    const tab = S.tabs.find(t => t.pages.length && (t.name === stem(r.name) || t.name + '.pdf' === r.name || t.name === r.name.replace(/\.[^.]+$/, '')));
    if (tab) { document.body.classList.remove('at-home'); switchTab(tab.id); rebuild(true); return; }
    if (!r.handle) return toast('Ábrelo de nuevo con «Abrir un archivo» (el navegador no guardó el acceso a este archivo)', 5000);
    try { if ((await r.handle.queryPermission({ mode: 'read' })) !== 'granted' && (await r.handle.requestPermission({ mode: 'read' })) !== 'granted') return; await openHandles([r.handle]); }
    catch (e) { toast('No se pudo abrir: ' + e.message, 5000); }
  }
  async function listDir() {
    if (!pinDir) return null;
    if ((await pinDir.queryPermission({ mode: 'read' })) !== 'granted') return 'perm';
    const out = [];
    for await (const [name, h] of pinDir.entries()) { if (h.kind !== 'file' || !/\.(pdf|docx|xlsx|pptx|png|jpe?g)$/i.test(name)) continue; try { const f = await h.getFile(); out.push({ name, h, size: f.size, date: f.lastModified }); } catch { } if (out.length > 300) break; }
    return out.sort((a, b) => b.date - a.date).slice(0, 12);
  }
  const fmtSize = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const fmtDate = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const REC = [
    ['pages', 'c4', 'Organizar páginas', 'Miniaturas · Girar · Eliminar · Reordenar', () => openSide('pages')],
    ['note', 'c5', 'Añadir comentarios', 'Nota adhesiva · Resaltar · Dibujar · Sellos', () => setTool('note')],
    ['edittext', 'c3', 'Editar un PDF', 'Texto e imágenes · Párrafos · Enlaces', () => setMode('edit')],
    ['convert', 'c2', 'Convertir', 'Word · Excel · PowerPoint · Imágenes', () => setMode('convert')],
    ['shield', 'c1', 'Proteger un PDF', 'Contraseña · Información oculta · Redacciones', () => FX.T?.protect()]
  ];
  async function renderHome() {
    const box = $('#home'); if (!box) return;
    if (!document.body.classList.contains('at-home') && S.pages.length) return;
    const reg = registry(), pinned = pins().map(l => reg.find(x => x.label === l)).filter(Boolean);
    box.innerHTML = `<div class="home-wrap">
      <div class="home-brand"><img src="img/icono-128.png" alt=""><h1>Te damos la bienvenida a DM Studio · PDF</h1></div><p class="home-sub">Tu banco de trabajo PDF: local, privado y sin cuenta.</p>
      <section class="home-card"><h3>Herramientas recomendadas</h3><div class="rec-grid">
        ${REC.map(([ic, c, t, d], i) => `<button class="rec" data-rec="${i}" style="--c:var(--tp-${c})"><b><i data-i="${ic}"></i>${t}</b><small>${d}</small><span>Usar ahora</span></button>`).join('')}
        <button class="rec rec-open" data-act="open"><i data-i="open"></i><b>Abrir archivo</b></button></div></section>
      <section class="home-sec"><div class="home-h"><h3>Herramientas ancladas</h3><button id="pinToolBtn"><i data-i="plus"></i> Anclar una herramienta…</button></div>
        ${pinned.length ? `<div class="pin-row">${pinned.map(x => `<button class="pin" data-pin="${esc(x.label)}" style="--c:var(--tp-${x.color})"><i data-i="${x.icon}"></i>${esc(x.label)}<b data-unpin="${esc(x.label)}" title="Quitar">×</b></button>`).join('')}</div>` : '<p class="hint" style="padding:0">Ancla tus herramientas favoritas para tenerlas a mano.</p>'}</section>
      <section class="home-sec"><div class="home-h"><h3>Carpeta de trabajo</h3><button id="pinDirBtn"><i data-i="open"></i> ${pinDir ? 'Cambiar carpeta…' : 'Anclar una carpeta…'}</button></div><div id="dirList"><p class="hint" style="padding:0">${pinDir ? 'Cargando…' : 'Ancla una carpeta para ver aquí sus documentos más recientes, por ejemplo donde guardas tus trabajos o donde deja los archivos tu escáner.'}</p></div></section>
      <section class="home-sec"><div class="home-h"><h3>Recientes</h3>${recents.length ? '<button id="clearRec"><i data-i="trash"></i> Borrar</button>' : ''}</div>
        ${recents.length ? `<div class="file-list">${recents.map((r, i) => `<button class="file" data-rec-file="${i}"><i data-i="pages"></i><span>${esc(r.name)}</span><small>${r.pages} pág. · ${fmtSize(r.size)} · ${fmtDate(r.date)}</small></button>`).join('')}</div>` : '<p class="hint" style="padding:0">Aquí aparecerán los documentos que abras.</p>'}</section>
    </div>`;
    paintIcons(box);
    if (pinDir) {
      const files = await listDir(), el = $('#dirList'); if (!el) return;
      if (files === 'perm') el.innerHTML = `<p class="hint" style="padding:0">El navegador necesita tu permiso para leer «${esc(pinDir.name)}».</p><button id="dirPerm" class="primary" style="margin-top:6px">Permitir acceso</button>`;
      else { dirFiles = files; el.innerHTML = files?.length ? `<p class="hint" style="padding:0;margin-bottom:6px">${esc(pinDir.name)}</p><div class="file-list">${files.map((f, i) => `<button class="file" data-dir-file="${i}"><i data-i="pages"></i><span>${esc(f.name)}</span><small>${fmtSize(f.size)} · ${fmtDate(f.date)}</small></button>`).join('')}</div>` : `<p class="hint" style="padding:0">«${esc(pinDir.name)}» no tiene documentos todavía.</p>`; paintIcons(el); }
    }
  }
  $('#home').addEventListener('click', async e => {
    const t = e.target;
    const un = t.closest('[data-unpin]'); if (un) { e.stopPropagation(); localStorage.setItem('folio.pins', JSON.stringify(pins().filter(l => l !== un.dataset.unpin))); return renderHome(); }
    const rc = t.closest('[data-rec]'); if (rc) { if (!S.pages.length) return ACTIONS.open(); document.body.classList.remove('at-home'); return REC[+rc.dataset.rec][4](); }
    const pn = t.closest('[data-pin]'); if (pn) { const x = registry().find(r => r.label === pn.dataset.pin); if (x) { if (S.pages.length) document.body.classList.remove('at-home'); x.run(); } return; }
    if (t.closest('#pinToolBtn')) return openPalette('pin');
    if (t.closest('#pinDirBtn') && !FX.nativePickers) return toast('Este navegador no permite anclar carpetas. Abre DM Studio · PDF en Chrome o Edge (con «Abrir DM Studio PDF.bat»).', 5000);
    if (t.closest('#pinDirBtn')) { try { pinDir = await window.showDirectoryPicker({ id: 'folio-carpeta', mode: 'read' }); await idbDo('kv', 'readwrite', st => st.put(pinDir, 'pinDir')); renderHome(); } catch (er) { if (er.name !== 'AbortError') toast(er.message); } return; }
    if (t.closest('#dirPerm')) { if ((await pinDir.requestPermission({ mode: 'read' })) === 'granted') renderHome(); return; }
    if (t.closest('#clearRec')) { recents = []; saveRecents(); return renderHome(); }
    const rf = t.closest('[data-rec-file]'); if (rf) return openRecent(recents[+rf.dataset.recFile]);
    const df = t.closest('[data-dir-file]'); if (df && dirFiles) return openHandles([dirFiles[+df.dataset.dirFile].h]);
  });
  FX.openRecent = openRecent; FX.getRecents = () => recents; FX.shortcuts = shortcuts; FX.PANELS = PANELS; FX.renderPanel = renderPanel;
  function goHome() { document.body.classList.add('at-home'); renderHome(); }
  FX.goHome = goHome;
  $('#homeBtn').addEventListener('click', () => { if (document.body.classList.contains('at-home') && S.pages.length) { document.body.classList.remove('at-home'); relayout(); } else goHome(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-tabid]') || e.target.closest('#modeTabs [data-mode]')) { if (S.pages.length) document.body.classList.remove('at-home'); } }, true);

  // iconos que se dibujaron antes de existir (inicio, más opciones…): se vuelven a pintar
  $$('i[data-i]').forEach(el => { if (!el.querySelector('svg *')) el.removeAttribute('data-done'); });
  // ---------- arranque ----------
  tagTools(); buildRail();
  if (localStorage.getItem('folio.side') !== 'open') document.body.classList.add('side-closed');
  if (localStorage.getItem('folio.tools') === 'closed') document.body.classList.add('tools-closed');
  document.body.dataset.mode = localStorage.getItem('folio.mode') || 'all';
  $$('#modeTabs [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === document.body.dataset.mode));
  document.body.classList.toggle('no-doc', !S.pages.length);
  renderPanel(); syncRail(); updProps(); renderHome(); paintIcons();
  // el panel «Todas las herramientas» cambia cuando se abre o cierra un documento
  const _rebuild = window.rebuild;
  window.rebuild = function (...a) { const r = _rebuild.apply(this, a); document.body.classList.toggle('no-doc', !S.pages.length); if (S.pages.length && !a.length) document.body.classList.remove('at-home'); renderPanel(); syncRail(); renderHome(); return r; };
  setTimeout(relayout, 300);
})();
