/* DM Studio · PDF — barra de menús clásica (Archivo, Edición, Ver, Firmar, Ventana, Ayuda),
   propiedades del documento y las herramientas nuevas en los paneles. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const add = (k, v) => { if (!ICONS[k]) ICONS[k] = v; };
  add('check', '<path d="M5 12l5 5 9-10"/>');
  add('hash', '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>');
  add('menu', '<path d="M4 7h16M4 12h16M4 17h16"/>');
  add('info', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>');
  add('batch', '<rect x="7" y="3" width="13" height="15" rx="1.5"/><path d="M4 7v13a1 1 0 0 0 1 1h11"/>');
  add('sup', '<path d="M4 18l7-9M4 9l7 9"/><path d="M15 6.5a2 2 0 1 1 3.5 1.3L15 11h4"/>');
  add('radio', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>');

  const need = () => { if (!S.pages.length) { toast('Abre un documento primero'); return false; } return true; };
  const N = fn => () => { if (need()) fn(); };
  const convItems = () => FX.convertItems?.() || [];
  const group = n => { const g = [[]]; convItems().forEach(i => { if (i === '-') g.push([]); else if (i) g[g.length - 1].push(i); }); return g[n] || []; };

  // ---------- propiedades del documento ----------
  async function propsDialog() {
    if (!need()) return;
    const pg = pageById(S.cur) || S.pages[0], s = src(pg.src), g = geom(pg), meta = S.props?.meta || {};
    let info = {}; try { info = (await s.pdf.getMetadata()).info || {}; } catch { }
    const date = d => { const m = /D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5] || '00'}` : ''}` : '—'; };
    const mm = v => Math.round(v * 25.4 / 72);
    const paper = (() => { const a = [mm(g.dw), mm(g.dh)].sort((x, y) => x - y), near = (w, h) => Math.abs(a[0] - w) < 3 && Math.abs(a[1] - h) < 3; return near(210, 297) ? 'A4' : near(216, 279) ? 'Carta' : near(216, 356) ? 'Oficio' : near(297, 420) ? 'A3' : near(148, 210) ? 'A5' : ''; })();
    const size = S.sources.filter(x => S.pages.some(p => p.src === x.id)).reduce((n, x) => n + x.bytes.length, 0);
    const v = k => esc(meta[k] ?? info[k[0].toUpperCase() + k.slice(1)] ?? '');
    openModal(`<h2>Propiedades del documento</h2>
      <fieldset><legend>Descripción (se guarda en el PDF)</legend>
        <div class="row"><label>Título</label><input type="text" id="ppTitle" value="${v('title') || esc(S.name)}"></div>
        <div class="row"><label>Autor</label><input type="text" id="ppAuthor" value="${v('author')}"></div>
        <div class="row"><label>Asunto</label><input type="text" id="ppSubject" value="${v('subject')}"></div>
        <div class="row"><label>Palabras clave</label><input type="text" id="ppKeywords" value="${v('keywords')}" placeholder="separadas por comas"></div>
      </fieldset>
      <fieldset><legend>Información</legend><table class="pp-info">
        <tr><td>Archivo</td><td>${esc(s.name)}</td></tr>
        <tr><td>Páginas</td><td>${S.pages.length}</td></tr>
        <tr><td>Tamaño de página</td><td>${mm(g.dw)} × ${mm(g.dh)} mm ${paper ? `(${paper})` : ''} · ${Math.round(g.dw)} × ${Math.round(g.dh)} pt</td></tr>
        <tr><td>Tamaño del archivo</td><td>${(size / 1048576).toFixed(2)} MB</td></tr>
        <tr><td>Versión PDF</td><td>${esc(info.PDFFormatVersion || '—')}</td></tr>
        <tr><td>Creado</td><td>${date(info.CreationDate)}</td></tr>
        <tr><td>Modificado</td><td>${date(info.ModDate)}</td></tr>
        <tr><td>Aplicación</td><td>${esc(info.Creator || '—')}</td></tr>
        <tr><td>Productor PDF</td><td>${esc(info.Producer || '—')}</td></tr>
        <tr><td>Seguridad</td><td>${s.encrypted ? 'Protegido con contraseña' : 'Sin protección'}</td></tr>
        <tr><td>Formulario</td><td>${s.fields?.length ? s.fields.length + ' campo(s)' : 'No'}</td></tr>
      </table></fieldset>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="ppOk">Aplicar</button></div>`);
    $('#ppOk').onclick = () => {
      pushHistory();
      S.props = { ...(S.props || {}), meta: { title: $('#ppTitle').value.trim(), author: $('#ppAuthor').value.trim(), subject: $('#ppSubject').value.trim(), keywords: $('#ppKeywords').value.trim() } };
      S.dirty = true; scheduleSave(); closeModal(); toast('Propiedades guardadas: se escriben en el PDF al guardarlo', 3000);
    };
  }
  FX.propsDialog = propsDialog;

  // ---------- Guardar como: el diálogo de Windows directamente ----------
  async function saveAs() {
    if (!need()) return;
    closeEditor();
    const name = (S.name || 'documento') + '.pdf';
    let t;
    try { t = await FX.prepareSave([{ name, mime: 'application/pdf' }], { ask: true }); }
    catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; }
    toast('Guardando…', 60000);
    try {
      const where = await FX.commitSave(t, await buildPdf(S.pages, { title: S.name }), name, 'application/pdf');
      const saved = t.path || t.handle?.name;
      if (saved) S.name = saved.split(/[\\/]/).pop().replace(/\.pdf$/i, '');
      S.dirty = false; $('#docName').textContent = S.name; renderTabs?.(); scheduleSave();
      toast(FX.savedMsg(where), 4000);
    } catch (e) { console.error(e); toast('No se pudo guardar: ' + e.message, 6000); }
  }
  FX.saveAs = saveAs;

  const prevDoc = FX.exportDoc;
  FX.exportDoc = async (out, list, o, pageRefs, pageCtx) => {
    if (prevDoc) await prevDoc(out, list, o, pageRefs, pageCtx);
    const m = S.props?.meta; if (!m) return;
    if (m.title) o.title = m.title; if (m.author && !o.author) o.author = m.author;
    if (m.subject) out.setSubject(m.subject);
    if (m.keywords) out.setKeywords(m.keywords.split(',').map(x => x.trim()).filter(Boolean));
  };

  // ---------- menús ----------
  const recentItems = () => {
    const r = FX.getRecents?.() || [];
    return r.length ? r.slice(0, 12).map(x => ({ label: x.name, icon: 'pages', action: () => FX.openRecent(x) })) : [{ label: 'No hay archivos recientes', icon: 'blank', disabled: true, action: () => { } }];
  };
  const tabSwitch = d => { if (S.tabs.length < 2) return; const i = S.tabs.findIndex(t => t.id === S.tab); switchTab(S.tabs[(i + d + S.tabs.length) % S.tabs.length].id); };
  const setSel = (sel, val) => { const el = $(sel); if (!el) return; el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); };
  const revert = () => {
    if (!need()) return; if (!S.history.length) return toast('No hay cambios que deshacer');
    if (!confirm('¿Deshacer todos los cambios hechos desde que abriste el documento?')) return;
    S.future = []; S.pages = S.history[0]; S.history = []; S.sel = null; S.dirty = true; rebuild(true); updateButtons(); scheduleSave(); toast('Documento restaurado');
  };
  const closeAll = () => { for (const t of [...S.tabs]) { const before = S.tabs.length; closeTab(t.id); if (S.tabs.length === before && S.tabs.some(x => x.id === t.id)) break; } };
  const pageItems = () => [
    { label: 'Recortar páginas…', icon: 'crop', action: () => FX.crop.start() },
    { label: 'Quitar márgenes blancos…', icon: 'crop', action: () => FX.crop.margins() },
    { label: 'Numeración de páginas (i, ii, 1, 2…)…', icon: 'hash', action: () => FX.labelsDialog() },
    '-',
    { label: 'Girar a la derecha', icon: 'rotl', action: N(() => ACTIONS.rotR()) },
    { label: 'Insertar página en blanco', icon: 'fileplus', action: N(() => ACTIONS.blank()) },
    { label: 'Duplicar página', icon: 'copy', action: N(() => ACTIONS.dup()) },
    { label: 'Eliminar página', icon: 'trash', action: N(() => ACTIONS.delPages()) },
    { label: 'Invertir el orden', icon: 'pages', action: () => FX.T?.reversePages?.() },
    { label: 'Dividir cada N páginas…', icon: 'scissors', action: () => FX.T?.splitEvery?.() },
    { label: 'Organizar páginas', icon: 'pages', action: N(() => FX.openSide?.('pages')) }
  ];
  const MENUS = {
    Archivo: () => [
      { label: 'Nuevo PDF en blanco', icon: 'fileplus', action: () => ACTIONS.newDoc() },
      { label: 'Abrir…', icon: 'open', key: 'Ctrl+O', action: () => ACTIONS.open() },
      { label: 'Abrir recientes', icon: 'pages', sub: recentItems() },
      { label: 'Anclar carpeta en Inicio…', icon: 'open', action: () => { FX.goHome?.(); setTimeout(() => $('#pinDirBtn')?.click(), 0); } },
      '-',
      { label: 'Combinar archivos…', icon: 'fileplus', action: () => ACTIONS.add() },
      { label: 'Crear', icon: 'fileplus', sub: [{ label: 'Documento en blanco', icon: 'fileplus', action: () => ACTIONS.newDoc() }, '-', ...group(1)] },
      '-',
      { label: 'Guardar', icon: 'download', key: 'Ctrl+S', action: () => quickSave() },
      { label: 'Guardar como…', icon: 'download', key: 'Ctrl+Mayús+S', action: () => saveAs() },
      { label: 'Exportar con opciones…', icon: 'download', action: () => openExport() },
      { label: 'Deshacer todos los cambios', icon: 'undo', disabled: !S.history.length, action: revert },
      '-',
      { label: 'Cerrar archivo', icon: 'x', key: 'Ctrl+W', action: () => closeTab(S.tab) },
      { label: 'Cerrar todo', icon: 'x', key: 'Ctrl+Mayús+W', action: closeAll },
      '-',
      { label: 'Reducir tamaño del archivo…', icon: 'download', action: N(() => FX.openCompress()) },
      { label: 'Exportar', icon: 'convert', sub: [...group(0).filter(i => !/Comprimir/.test(i.label)), '-', { label: 'Procesar varios archivos a la vez…', icon: 'batch', action: () => FX.openBatch() }] },
      { label: 'Proteger', icon: 'lock', sub: [
        { label: 'Proteger con contraseña…', icon: 'lock', action: N(() => FX.T.protect()) },
        { label: 'Quitar la contraseña', icon: 'unlock', action: N(() => FX.T.unprotect()) },
        { label: 'Quitar información oculta…', icon: 'eyeoff', action: N(() => FX.T.sanitize()) },
        { label: 'Auditar redacciones', icon: 'shield', action: N(() => FX.T.auditRedactions()) },
        { label: 'Redactar información', icon: 'redact', action: N(() => setTool('redact')) }
      ] },
      '-',
      { label: 'Propiedades del documento…', icon: 'info', key: 'Ctrl+D', action: propsDialog },
      { label: 'Recuento de palabras…', icon: 'count', action: N(() => FX.T.wordCount()) },
      '-',
      { label: 'Imprimir…', icon: 'print', key: 'Ctrl+P', action: () => printDoc() },
      '-',
      { label: 'Salir al inicio', icon: 'home', action: () => FX.goHome?.() }
    ],
    'Edición': () => [
      { label: 'Deshacer', icon: 'undo', key: 'Ctrl+Z', disabled: !S.history.length, action: () => undo() },
      { label: 'Rehacer', icon: 'redo', key: 'Ctrl+Y', disabled: !S.future.length, action: () => redo() },
      '-',
      { label: 'Cortar', icon: 'scissors', key: 'Ctrl+X', action: () => FX.objects.cut() || toast('Selecciona uno o varios objetos (Mayús+clic)') },
      { label: 'Copiar', icon: 'copy', key: 'Ctrl+C', action: () => FX.objects.copy() || toast('Selecciona uno o varios objetos (Mayús+clic)') },
      { label: 'Pegar', icon: 'copy', key: 'Ctrl+V', action: () => FX.objects.paste() || toast('No hay objetos copiados') },
      { label: 'Seleccionar todos los objetos de la página', icon: 'cursor', key: 'Ctrl+A', action: N(() => FX.objects.selectAll()) },
      '-',
      { label: 'Buscar…', icon: 'search', key: 'Ctrl+F', action: N(() => $('[data-tab=search]')?.click()) },
      { label: 'Buscar y reemplazar…', icon: 'replace', action: N(() => { FX.openSide?.('search'); setTimeout(() => $('#replaceInput')?.focus(), 60); }) },
      { label: 'Revisar la ortografía', icon: 'spell', action: N(() => FX.openSide?.('spell')) },
      '-',
      { label: 'Editar texto', icon: 'edittext', key: 'K', action: N(() => setTool('edittext')) },
      { label: 'Editar imágenes y formas', icon: 'imgedit', key: 'J', action: N(() => setTool('editimg')) },
      { label: 'Añadir texto', icon: 'text', key: 'T', action: N(() => setTool('text')) },
      { label: 'Añadir imagen…', icon: 'image', key: 'I', action: () => ACTIONS.image() },
      { label: 'Páginas', icon: 'pages', sub: pageItems() },
      '-',
      { label: 'Preferencias', icon: 'cursor', sub: [
        { label: 'Dónde guardar los archivos…', icon: 'open', action: () => FX.openSaveSettings?.() },
        { label: 'Cambiar tema claro / oscuro', icon: 'moon', action: () => ACTIONS.theme() }
      ] }
    ],
    Ver: () => [
      { label: 'Acercar', icon: 'plus', key: 'Ctrl++', action: N(() => ACTIONS.zoomIn()) },
      { label: 'Alejar', icon: 'minus', key: 'Ctrl+-', action: N(() => ACTIONS.zoomOut()) },
      { label: 'Tamaño real (100 %)', icon: 'search', action: N(() => setSel('#zoomSel', '1')) },
      { label: 'Ajustar al ancho', icon: 'expand', action: N(() => setSel('#zoomSel', 'fitw')) },
      { label: 'Ajustar a la página', icon: 'expand', action: N(() => setSel('#zoomSel', 'fitp')) },
      '-',
      ...[...($('#viewSel')?.options || [])].map(o => ({ label: `${S.view === o.value ? '✓ ' : ''}${o.textContent}`, icon: 'pages', action: () => setSel('#viewSel', o.value) })),
      '-',
      { label: 'Modo lectura', icon: 'expand', key: 'F11', action: N(() => ACTIONS.reading?.()) },
      { label: 'Leer en voz alta', icon: 'speak', action: N(() => ACTIONS.readAloud?.()) },
      { label: 'Paneles', icon: 'pages', sub: [['pages', 'Páginas'], ['bookmarks', 'Marcadores'], ['comments', 'Comentarios'], ['search', 'Buscar'], ['attachments', 'Archivos adjuntos'], ['layers', 'Capas'], ['form', 'Formulario']].map(([k, l]) => ({ label: l, icon: 'pages', action: N(() => FX.openSide?.(k)) })) },
      '-',
      { label: 'Pantalla completa', icon: 'expand', action: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()) },
      { label: 'Tema claro / oscuro', icon: 'moon', action: () => ACTIONS.theme() }
    ],
    Firmar: () => [
      { label: 'Añadir firma…', icon: 'sign', action: N(() => ACTIONS.signature()) },
      { label: 'Añadir iniciales…', icon: 'sign', action: N(() => ACTIONS.signature()) },
      { label: 'Añadir un sello…', icon: 'stamp', action: () => FX.T?.stamps?.() },
      '-',
      { label: 'Rellenar formulario', icon: 'form', action: N(() => FX.openSide?.('form')) },
      { label: 'Crear formulario', icon: 'form', sub: FX.formMenu() },
      '-',
      { label: 'Proteger con contraseña…', icon: 'lock', action: N(() => FX.T.protect()) }
    ],
    Ventana: () => [
      { label: 'Nueva pestaña', icon: 'plus', key: 'Ctrl+T', action: () => ACTIONS.newTab() },
      { label: 'Cerrar pestaña', icon: 'x', key: 'Ctrl+W', action: () => closeTab(S.tab) },
      { label: 'Pestaña siguiente', icon: 'right', key: 'Ctrl+Tab', disabled: S.tabs.length < 2, action: () => tabSwitch(1) },
      { label: 'Pestaña anterior', icon: 'right', key: 'Ctrl+Mayús+Tab', disabled: S.tabs.length < 2, action: () => tabSwitch(-1) },
      '-',
      ...S.tabs.map(t => { const data = t.id === S.tab ? S : t; return { label: `${t.id === S.tab ? '✓ ' : ''}${data.name || 'Sin título'}${data.dirty ? ' •' : ''}`, icon: 'pages', action: () => { document.body.classList.remove('at-home'); switchTab(t.id); } }; }),
      '-',
      { label: 'Inicio', icon: 'home', action: () => FX.goHome?.() }
    ],
    Ayuda: () => [
      { label: 'Buscar herramientas…', icon: 'search', key: 'Ctrl+K', action: () => $('#tsBtn')?.click() },
      { label: 'Atajos de teclado', icon: 'cursor', action: () => FX.shortcuts?.() },
      '-',
      { label: 'Acerca de DM Studio · PDF', icon: 'info', action: about }
    ]
  };
  function about() {
    openModal(`<div class="about-logo"><img src="img/logo-completo.png" alt="DM Studio · PDF"></div>
      <p>Editor de PDF que funciona en el navegador, sin cuenta y sin enviar tus archivos a ningún sitio.</p>
      <p class="hint" style="padding:0">Usa pdf.js (Mozilla) para mostrar, pdf-lib para escribir, MuPDF (AGPL) para borrar de verdad y cifrar, y Tesseract.js para el OCR.</p>
      <div class="actions"><button class="primary" data-close>Cerrar</button></div>`);
  }
  FX.MENUS = MENUS;

  // ---------- barra ----------
  const bar = document.createElement('nav'); bar.id = 'menubar';
  bar.innerHTML = `<button class="mb-burger" data-mb="*" title="Menú"><i data-i="menu"></i></button>` + Object.keys(MENUS).map(k => `<button data-mb="${k}">${k}</button>`).join('');
  $('#modeTabs').before(bar); paintIcons(bar);
  let openBtn = null;
  function openMenu(btn) {
    const k = btn.dataset.mb, r = btn.getBoundingClientRect();
    const items = k === '*' ? Object.keys(MENUS).map(n => ({ label: n, icon: 'right', sub: MENUS[n]() })) : MENUS[k]();
    showMenu(r.left, r.bottom + 2, items); openBtn = btn;
    $$('#menubar button').forEach(b => b.classList.toggle('on', b === btn));
  }
  const menuOpen = () => !!document.querySelector('.ctxmenu');
  bar.addEventListener('mousedown', e => {
    const b = e.target.closest('[data-mb]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (openBtn === b && menuOpen()) { closeMenus(); openBtn = null; b.classList.remove('on'); return; }
    openMenu(b);
  });
  bar.addEventListener('mouseover', e => { const b = e.target.closest('[data-mb]'); if (b && openBtn && b !== openBtn && menuOpen()) openMenu(b); });
  setInterval(() => { if (openBtn && !menuOpen()) { openBtn.classList.remove('on'); openBtn = null; } }, 300);
  // atajos nuevos
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input,textarea,select')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && k === 'd') { e.preventDefault(); e.stopImmediatePropagation(); propsDialog(); }
    else if (mod && e.shiftKey && k === 'w') { e.preventDefault(); e.stopImmediatePropagation(); closeAll(); }
  }, true);

  // ---------- herramientas nuevas en los paneles ----------
  const P = FX.PANELS;
  if (P) {
    const sec = (p, title) => p.sections.find(s => s[0] === title);
    const oAll = P.all, oEdit = P.edit, oSign = P.sign;
    P.all = () => {
      const p = oAll();
      sec(p, 'Organizar')?.[2].push(['crop', 'Recortar páginas', () => FX.crop.start(), 'NUEVO'], ['hash', 'Numeración de páginas', () => need() && FX.labelsDialog(), 'NUEVO'], ['batch', 'Procesar varios archivos', () => FX.openBatch(), 'NUEVO']);
      p.sections.splice(2, 0, ['Formularios', 'c1', [['form', 'Crear un formulario', () => need() && FX.forms.detectFields(), 'NUEVO'], ['form', 'Añadir campo de texto', () => FX.forms.startField('text')], ['check', 'Añadir casilla', () => FX.forms.startField('check')], ['form', 'Rellenar formulario', () => need() && FX.openSide?.('form')]]]);
      sec(p, 'Lo más usado')?.[2].push(['info', 'Propiedades del documento', propsDialog]);
      return p;
    };
    P.edit = () => {
      const p = oEdit();
      sec(p, 'Páginas')?.[2].splice(0, 0, ['crop', 'Recortar página', () => FX.crop.start(), 'NUEVO'], ['crop', 'Quitar márgenes blancos', () => FX.crop.margins()], ['hash', 'Numeración de páginas', () => need() && FX.labelsDialog(), 'NUEVO']);
      sec(p, 'Contenido')?.[2].push(['cursor', 'Seleccionar varios objetos', () => { if (!need()) return; setTool('select'); toast('Mayús+clic en cada objeto, o Mayús+arrastrar para rodearlos. Luego Ctrl+C / Ctrl+V, flechas o Supr.', 6000); }, 'NUEVO'], ['sup', 'Superíndice y subíndice', () => toast('Mientras escribes o editas texto aparece una barra con x² y x₂ (o Ctrl+Mayús++ y Ctrl+=)', 6000), 'NUEVO']);
      return p;
    };
    P.sign = () => {
      const p = oSign();
      p.sections.push(['Crear formulario', 'c2', [
        ['scan', 'Detectar campos automáticamente', () => need() && FX.forms.detectFields(), 'NUEVO'],
        ['form', 'Campo de texto', () => FX.forms.startField('text')], ['form', 'Párrafo (varias líneas)', () => FX.forms.startField('multi')],
        ['check', 'Casilla de verificación', () => FX.forms.startField('check')], ['radio', 'Botón de opción', () => FX.forms.startField('radio')],
        ['form', 'Lista desplegable', () => FX.forms.startField('combo')], ['calendar', 'Campo de fecha', () => FX.forms.startField('date')]]]);
      return p;
    };
    FX.renderPanel?.();
  }

  document.head.insertAdjacentHTML('beforeend', `<style>
    #menubar{display:flex;align-items:center;gap:0;margin:0 6px 0 4px;padding-right:8px;border-right:1px solid var(--line)}
    #menubar button{padding:6px 9px;border-radius:6px;font-size:13.5px;color:var(--text)}
    #menubar button:hover,#menubar button.on{background:var(--hover)}
    #menubar .mb-burger{display:none;padding:6px}
    @media (max-width:1900px){body #tsBtn span,body #tsBtn kbd{display:none!important}body #tsBtn{min-width:0;padding:7px}#topActions [data-act=compare]{font-size:0;gap:0;padding:7px}}
    @media (max-width:1700px){#menubar button:not(.mb-burger){display:none}#menubar .mb-burger{display:inline-flex}}
    .ctxmenu{max-width:min(440px,calc(100vw - 8px))}
    .ctxmenu .mitem>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand .logo-img{width:30px;height:30px;border-radius:8px;display:block;flex:none}
    .home-brand{display:flex;align-items:center;gap:16px}.home-brand img{width:56px;height:56px;border-radius:14px}
    .about-logo{background:#fff;border-radius:12px;padding:14px;text-align:center;margin-bottom:12px}.about-logo img{max-width:100%;height:120px;object-fit:contain}
    .pp-info td{padding:3px 8px 3px 0;vertical-align:top}.pp-info td:first-child{color:var(--muted);white-space:nowrap}
  </style>`);
})();
