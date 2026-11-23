/* DM Studio · PDF — herramientas extra: proteger con contraseña, quitarla, quitar información oculta,
   auditar redacciones falsas, sellos, marcadores desde títulos, contar palabras, invertir páginas,
   dividir cada N páginas y convertir direcciones web en enlaces. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const { PDFName, PDFDict, PDFArray } = PDFLib;
  const need = () => { if (!S.pages.length) { toast('Abre un documento primero'); return false; } return true; };
  const base = () => (S.name || 'documento').replace(/[\\/:*?"<>|]+/g, '_');
  Object.assign(ICONS, {
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3.2 3.8M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6c1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    stamp: '<path d="M9 3h6v6l2 3H7l2-3zM5 14h14v4H5zM4 21h16"/>',
    reverse: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
    count: '<path d="M4 7h4M6 5v4M10 17h4M4 19l4-4M15 5l4 4M19 5l-4 4M14 14h6"/>'
  });

  // ---------- proteger con contraseña (MuPDF, AES-256) ----------
  function protect() {
    if (!need()) return;
    openModal(`<h2>Proteger con contraseña</h2>
      <p class="hint" style="padding:0;margin-bottom:10px">El PDF se cifra con AES de 256 bits. Guarda bien la contraseña: sin ella no se podrá abrir.</p>
      <div class="row"><label>Para abrir</label><input type="password" id="pwOpen" placeholder="Contraseña para abrir el PDF"></div>
      <div class="row"><label>Repetir</label><input type="password" id="pwOpen2" placeholder="Repite la contraseña"></div>
      <fieldset><legend>Permisos (opcional)</legend>
        <div class="row"><label>Contraseña de permisos</label><input type="password" id="pwOwner" placeholder="Para cambiar los permisos (si la dejas vacía, se usa la de abrir)"></div>
        <label class="saveopt"><input type="checkbox" id="pmPrint" checked> Permitir imprimir</label>
        <label class="saveopt"><input type="checkbox" id="pmCopy" checked> Permitir copiar texto</label>
        <label class="saveopt"><input type="checkbox" id="pmEdit"> Permitir modificar</label>
        <label class="saveopt"><input type="checkbox" id="pmNotes" checked> Permitir comentar y rellenar formularios</label>
      </fieldset>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="pwGo"><i data-i="lock"></i> Proteger y guardar</button></div>`);
    $('#pwGo').onclick = async () => {
      const u = $('#pwOpen').value, u2 = $('#pwOpen2').value, o = $('#pwOwner').value || u;
      if (!u && !$('#pwOwner').value) return toast('Escribe al menos una contraseña');
      if (u !== u2) return toast('Las contraseñas no coinciden');
      if (/[,]/.test(u + o)) return toast('La contraseña no puede llevar comas');
      let perm = 0; if ($('#pmPrint').checked) perm |= 4 | 2048; if ($('#pmEdit').checked) perm |= 8 | 1024; if ($('#pmCopy').checked) perm |= 16 | 512; if ($('#pmNotes').checked) perm |= 32 | 256;
      const name = base() + '_protegido.pdf';
      let target; try { target = await FX.prepareSave([{ name, mime: 'application/pdf' }]); } catch (e) { if (!FX.isCancel(e)) toast(e.message); return; }
      const btn = $('#pwGo'); btn.disabled = true; btn.textContent = 'Cifrando…';
      try {
        const mu = await getMupdf(), bytes = await buildPdf(S.pages, { title: S.name });
        const d = mu.Document.openDocument(bytes, 'application/pdf').asPDF();
        const out = d.saveToBuffer(`encrypt=aes-256,user-password=${u},owner-password=${o},permissions=${perm},garbage`).asUint8Array().slice(); d.destroy?.();
        const where = await FX.commitSave(target, out, name, 'application/pdf');
        closeModal(); toast(FX.savedMsg(where) + ' · protegido con contraseña', 5000);
      } catch (e) { console.error(e); toast('No se pudo cifrar: ' + e.message + ' (abre la app con «Abrir DM Studio PDF.bat»)', 6000); btn.disabled = false; btn.textContent = 'Proteger y guardar'; }
    };
  }
  // ---------- quitar la contraseña ----------
  async function unprotect() {
    if (!need()) return;
    const locked = [...new Set(S.pages.map(p => p.src))].map(src).filter(s => s?.encrypted);
    if (!locked.length) return toast('Este documento no tiene contraseña');
    let mu; try { mu = await getMupdf(); } catch (e) { return toast(e.message, 5000); }
    for (const s of locked) {
      const doc = mu.Document.openDocument(s.bytes, 'application/pdf');
      if (doc.needsPassword()) {
        const pw = await askText(`Contraseña de «${s.name}»`, 'Contraseña', '', 'Quitar protección'); if (pw === null) { doc.destroy?.(); continue; }
        if (!doc.authenticatePassword(pw)) { doc.destroy?.(); toast('Contraseña incorrecta'); continue; }
      }
      const clean = doc.asPDF().saveToBuffer('decrypt,garbage').asUint8Array().slice(); doc.destroy?.();
      pushHistory();
      const ns = await addSource(clean, s.name.replace(/\.pdf$/i, '') + '.pdf');
      S.pages.forEach(pg => { if (pg.src === s.id) pg.src = ns.id; });
      rebuild(); toast(`«${s.name}» ya no tiene contraseña. Guárdalo para conservarlo así.`, 5000);
    }
  }
  // ---------- quitar información oculta ----------
  function sanitize() {
    if (!need()) return;
    openModal(`<h2>Quitar información oculta</h2>
      <p class="hint" style="padding:0;margin-bottom:10px">Crea una copia limpia del PDF, lista para compartir. Tu documento abierto no cambia.</p>
      <label class="saveopt"><input type="checkbox" id="snMeta" checked> Metadatos: autor, título, programa, fechas y datos XMP</label>
      <label class="saveopt"><input type="checkbox" id="snAtt" checked> Archivos adjuntos</label>
      <label class="saveopt"><input type="checkbox" id="snNotes" checked> Comentarios y notas</label>
      <label class="saveopt"><input type="checkbox" id="snJs" checked> JavaScript y acciones automáticas</label>
      <label class="saveopt"><input type="checkbox" id="snBm"> Marcadores</label>
      <label class="saveopt"><input type="checkbox" id="snForms"> Campos de formulario (los convierte en texto fijo)</label>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="snGo"><i data-i="eyeoff"></i> Limpiar y guardar</button></div>`);
    $('#snGo').onclick = async () => {
      const opt = { meta: $('#snMeta').checked, att: $('#snAtt').checked, notes: $('#snNotes').checked, js: $('#snJs').checked, bm: $('#snBm').checked, forms: $('#snForms').checked };
      const name = base() + '_limpio.pdf';
      let target; try { target = await FX.prepareSave([{ name, mime: 'application/pdf' }]); } catch (e) { if (!FX.isCancel(e)) toast(e.message); return; }
      const btn = $('#snGo'); btn.disabled = true; btn.textContent = 'Limpiando…';
      const saved = { att: S.attachments, bm: S.bookmarks };
      try {
        if (opt.att) S.attachments = []; if (opt.bm) S.bookmarks = [];
        let bytes = await buildPdf(S.pages, { title: opt.meta ? '' : S.name });
        S.attachments = saved.att; S.bookmarks = saved.bm;
        const d = await PDFDocument.load(bytes, { updateMetadata: false }), cat = d.catalog, removed = [];
        if (opt.meta) {
          d.setTitle(''); d.setAuthor(''); d.setSubject(''); d.setKeywords([]); d.setProducer(''); d.setCreator('');
          const info = d.context.trailerInfo.Info; if (info) { const dict = d.context.lookup(info); dict?.keys?.().forEach(k => dict.delete(k)); }
          cat.delete(PDFName.of('Metadata')); removed.push('metadatos');
        }
        const names = cat.lookup(PDFName.of('Names'));
        if (opt.att && names instanceof PDFDict) { names.delete(PDFName.of('EmbeddedFiles')); removed.push('adjuntos'); }
        if (opt.js) { if (names instanceof PDFDict) names.delete(PDFName.of('JavaScript')); cat.delete(PDFName.of('OpenAction')); cat.delete(PDFName.of('AA')); removed.push('JavaScript y acciones'); }
        if (opt.bm) { cat.delete(PDFName.of('Outlines')); removed.push('marcadores'); }
        if (opt.forms) { try { d.getForm().flatten(); removed.push('formularios'); } catch { } }
        for (const p of d.getPages()) {
          if (opt.js) p.node.delete(PDFName.of('AA'));
          const annots = p.node.lookup(PDFName.of('Annots'));
          if (annots instanceof PDFArray && (opt.notes || opt.att || opt.js)) {
            const keep = annots.asArray().filter(r => { const a = d.context.lookup(r), st = a?.lookup?.(PDFName.of('Subtype'))?.toString(); if (opt.notes && /\/(Text|Popup|FreeText|Highlight|Underline|StrikeOut|Squiggly|Ink|Square|Circle|Line|Polygon|PolyLine|Stamp|Caret|Sound)$/.test(st || '')) return false; if (opt.att && st === '/FileAttachment') return false; if (opt.js && a?.lookup?.(PDFName.of('A'))?.lookup?.(PDFName.of('S'))?.toString() === '/JavaScript') return false; return true; });
            p.node.set(PDFName.of('Annots'), d.context.obj(keep));
          }
        }
        if (opt.notes) removed.push('comentarios');
        bytes = await d.save({ useObjectStreams: true, updateFieldAppearances: false });
        try { const mu = await getMupdf(), md = mu.Document.openDocument(bytes, 'application/pdf').asPDF(); bytes = md.saveToBuffer('garbage=compact,compress').asUint8Array().slice(); md.destroy?.(); } catch { } // quita los objetos que ya no usa nadie
        const where = await FX.commitSave(target, bytes, name, 'application/pdf');
        closeModal(); toast(`${FX.savedMsg(where)} · quitado: ${removed.join(', ') || 'nada'}`, 6000);
      } catch (e) { S.attachments = saved.att; S.bookmarks = saved.bm; console.error(e); toast('No se pudo limpiar: ' + e.message, 6000); btn.disabled = false; btn.textContent = 'Limpiar y guardar'; }
    };
  }
  // ---------- auditar redacciones falsas ----------
  async function auditRedactions() {
    if (!need()) return;
    toast('Revisando las redacciones…', 60000);
    const found = [];
    for (let i = 0; i < S.pages.length; i++) {
      const pg = S.pages[i]; let lines; try { lines = await getLines(pg); await getImages(pg); } catch { continue; }
      const shapes = (pdfShapeCache.get(lineKey(pg)) || []).filter(s => s.kind === 'fill' && s.w > 6 && s.h > 5);
      if (!shapes.length) continue;
      const c = await FX.renderPageCanvas(pg, 1), ctx = c.getContext('2d'), k = c.width / geom(pg).dw;
      for (const s of shapes) {
        const px = ctx.getImageData(Math.max(0, Math.floor((s.x + s.w / 2) * k)), Math.max(0, Math.floor((s.y + s.h / 2) * k)), 1, 1).data;
        if ((px[0] + px[1] + px[2]) / 3 > 60) continue; // solo recuadros negros o muy oscuros
        const under = lines.flatMap(l => (l.words || []).filter(w => { const cx = (w.x1 + w.x2) / 2, cy = (l.top + l.bottom) / 2; return cx > s.x && cx < s.x + s.w && cy > s.y && cy < s.y + s.h; }));
        if (under.length) found.push({ pg, i, box: { x: s.x, y: s.y, w: s.w, h: s.h }, text: under.map(w => w.str).join(' ') });
      }
    }
    $('#toast').classList.add('hidden');
    if (!found.length) return openModal(`<h2>Auditoría de redacciones</h2><p>✅ No se encontró texto escondido bajo recuadros negros.</p><div class="actions"><button class="primary" data-close>Cerrar</button></div>`);
    openModal(`<h2>Auditoría de redacciones</h2>
      <p>⚠️ Hay <b>${found.length}</b> recuadro(s) negro(s) que <b>tapan texto que sigue en el archivo</b>: cualquiera puede copiarlo o buscarlo.</p>
      <div class="plist" style="max-height:260px">${found.map((f, j) => `<div class="att" data-af="${j}" style="cursor:pointer"><i data-i="redact"></i><span title="${esc(f.text)}">Pág. ${f.i + 1}: «${esc(f.text.slice(0, 60))}»</span></div>`).join('')}</div>
      <div class="actions"><button data-close>Cerrar</button><button class="primary" id="afFix">Borrar de verdad ese texto</button></div>`);
    $('#modalCard').addEventListener('click', e => { const it = e.target.closest('[data-af]'); if (it) { closeModal(); scrollToPage(found[+it.dataset.af].pg.id); } });
    $('#afFix').onclick = async () => {
      closeModal();
      for (const pg of [...new Set(found.map(f => f.pg))]) await applyReal(pg, found.filter(f => f.pg === pg).map(f => f.box), { text: true });
      toast('Texto oculto eliminado del PDF · Ctrl+Z para deshacer', 5000);
    };
  }
  // ---------- sellos ----------
  const STAMPS = [['APROBADO', '#15803d'], ['REVISADO', '#1d4ed8'], ['CONFIDENCIAL', '#b91c1c'], ['BORRADOR', '#525252'], ['URGENTE', '#c2410c'], ['COPIA', '#6d28d9'], ['RECIBIDO', '#0e7490'], ['PAGADO', '#15803d'], ['RECHAZADO', '#b91c1c']];
  function stampCanvas(text, color, withDate) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), fs = 64, sub = withDate ? new Date().toLocaleDateString('es-ES') : '';
    x.font = `bold ${fs}px 'Liberation Sans', Arial, sans-serif`; const w = Math.max(x.measureText(text).width, sub ? x.measureText(sub).width * 0.45 : 0) + 60, h = sub ? 150 : 110;
    c.width = Math.ceil(w); c.height = h;
    x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 7;
    x.beginPath(); x.roundRect(6, 6, c.width - 12, h - 12, 18); x.stroke();
    x.font = `bold ${fs}px 'Liberation Sans', Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, c.width / 2, sub ? 58 : h / 2 + 2);
    if (sub) { x.font = `bold 30px 'Liberation Sans', Arial, sans-serif`; x.fillText(sub, c.width / 2, 112); }
    return c;
  }
  function stamps() {
    if (!need()) return;
    openModal(`<h2>Añadir un sello</h2>
      <div class="stampgrid">${STAMPS.map(([t, c], i) => `<button data-st="${i}"><img src="${stampCanvas(t, c, false).toDataURL()}" alt="${t}"></button>`).join('')}</div>
      <div class="row" style="margin-top:12px"><label><input type="checkbox" id="stDate"> Añadir la fecha de hoy</label></div>
      <div class="row"><label>Sello propio</label><input type="text" id="stTxt" placeholder="Escribe un texto…"><input type="color" id="stCol" value="#b91c1c"><button id="stOwn">Usar</button></div>
      <div class="actions"><button data-close>Cancelar</button></div>`);
    const place = (t, col) => { const c = stampCanvas(t.toUpperCase(), col, $('#stDate').checked); closeModal(); placeImage(c.toDataURL('image/png'), c.width, c.height, 'Sello ' + t, Math.min(200, c.width * 0.42)); };
    $('#modalCard').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) { const [t, c] = STAMPS[+b.dataset.st]; place(t, c); } });
    $('#stOwn').onclick = () => { const t = $('#stTxt').value.trim(); if (!t) return toast('Escribe el texto del sello'); place(t, $('#stCol').value); };
  }
  // ---------- marcadores a partir de los títulos ----------
  async function autoBookmarks() {
    if (!need()) return;
    const all = [];
    for (const pg of S.pages) { try { (await getLines(pg)).forEach(l => all.push({ pg, l })); } catch { } }
    const fsList = all.map(x => x.l.fs).sort((a, b) => a - b), body = fsList[Math.floor(fsList.length / 2)] || 11;
    const heads = all.filter(({ l }) => l.str.length > 1 && l.str.length < 110 && !/[.,;:]$/.test(l.str) && (l.fs >= body * 1.18 || (l.bold && l.fs >= body * 1.02 && l.str.length < 80)));
    if (!heads.length) return toast('No encontré títulos en el documento');
    // un título partido en varias líneas es un solo marcador
    heads.sort((a, b) => S.pages.indexOf(a.pg) - S.pages.indexOf(b.pg) || a.l.base - b.l.base);
    for (let i = heads.length - 1; i > 0; i--) {
      const a = heads[i - 1], b = heads[i];
      if (a.pg === b.pg && Math.round(a.l.fs) === Math.round(b.l.fs) && b.l.base - a.l.base < a.l.fs * 1.6 && b.l.x1 < a.l.x2 && b.l.x2 > a.l.x1) { a.l = { ...a.l, str: a.l.str + ' ' + b.l.str }; heads.splice(i, 1); }
    }
    const sizes = [...new Set(heads.map(h => Math.round(h.l.fs)))].sort((a, b) => b - a).slice(0, 3);
    const out = [], stack = [];
    heads.sort((a, b) => S.pages.indexOf(a.pg) - S.pages.indexOf(b.pg) || a.l.base - b.l.base).forEach(({ pg, l }) => {
      let lvl = sizes.indexOf(Math.round(l.fs)); if (lvl < 0) lvl = sizes.length - 1;
      const b = { id: nid('k'), title: l.str, page: pg.id, children: [] };
      while (stack.length > lvl) stack.pop();
      (stack.length ? stack[stack.length - 1].children : out).push(b); stack.push(b);
    });
    const n = heads.length;
    if (S.bookmarks.length && !confirm(`Se encontraron ${n} títulos. ¿Reemplazar los marcadores que ya tiene el documento?\n\n(Cancelar = añadirlos al final)`)) S.bookmarks.push(...out); else S.bookmarks = out;
    S.dirty = true; FX.refreshPanels?.(); scheduleSave(); FX.openSide?.('bookmarks');
    toast(`${n} marcador(es) creados a partir de los títulos`, 4000);
  }
  // ---------- contar palabras ----------
  async function wordCount() {
    if (!need()) return;
    let words = 0, chars = 0; const per = [];
    for (const pg of S.pages) { let w = 0; try { for (const l of await getLines(pg)) { const m = l.str.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) || []; w += m.length; chars += l.str.replace(/\s/g, '').length; } } catch { } words += w; per.push(w); }
    openModal(`<h2>Contar palabras</h2><table class="keys"><tr><td>Páginas</td><td><b>${S.pages.length}</b></td></tr><tr><td>Palabras</td><td><b>${words.toLocaleString('es-ES')}</b></td></tr><tr><td>Caracteres (sin espacios)</td><td><b>${chars.toLocaleString('es-ES')}</b></td></tr><tr><td>Tiempo de lectura</td><td><b>${Math.max(1, Math.round(words / 230))} min</b></td></tr></table>
      <p class="hint" style="padding:0;margin-top:8px">Por página: ${per.map((w, i) => `p${i + 1}: ${w}`).join(' · ')}</p><div class="actions"><button class="primary" data-close>Cerrar</button></div>`);
  }
  // ---------- invertir el orden y dividir cada N ----------
  function reversePages() { if (!need()) return; pushHistory(); S.pages.reverse(); rebuild(); toast('Orden de páginas invertido · Ctrl+Z para deshacer'); }
  function splitEvery() {
    if (!need()) return;
    openModal(`<h2>Dividir el PDF</h2>
      <div class="row"><label><input type="radio" name="spm" value="every" checked> Cada</label><input type="number" id="spN" value="2" min="1" max="${S.pages.length}" style="max-width:80px"> páginas</div>
      <div class="row"><label><input type="radio" name="spm" value="before"> Antes de las páginas</label><input type="text" id="spB" placeholder="p. ej. 3, 7"></div>
      <div id="spInfo" class="hint" style="padding:0"></div>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="spGo">Dividir y guardar</button></div>`);
    const groups = () => {
      const n = S.pages.length;
      if (document.querySelector('[name=spm]:checked').value === 'every') { const k = Math.max(1, +$('#spN').value || 1), g = []; for (let i = 0; i < n; i += k) g.push(S.pages.slice(i, i + k)); return g; }
      const cuts = [...new Set($('#spB').value.split(/[,\s]+/).map(Number).filter(v => v > 1 && v <= n))].sort((a, b) => a - b), g = []; let start = 0;
      for (const c of cuts) { g.push(S.pages.slice(start, c - 1)); start = c - 1; } g.push(S.pages.slice(start)); return g.filter(x => x.length);
    };
    const info = () => { const g = groups(); $('#spInfo').textContent = `Se crearán ${g.length} archivo(s): ` + g.map(x => `${S.pages.indexOf(x[0]) + 1}–${S.pages.indexOf(x[x.length - 1]) + 1}`).join(', '); };
    $('#modalCard').addEventListener('input', info); info();
    $('#spGo').onclick = async () => {
      const g = groups(), files = g.map((x, i) => ({ name: `${base()}_parte${i + 1}.pdf`, mime: 'application/pdf' }));
      let target; try { target = await FX.prepareSave(files); } catch (e) { if (!FX.isCancel(e)) toast(e.message); return; }
      closeModal(); toast('Dividiendo…', 60000);
      try { for (let i = 0; i < g.length; i++) { await FX.commitSave(target, await buildPdf(g[i], { title: S.name }), files[i].name, 'application/pdf'); if (target.kind === 'download') await new Promise(r => setTimeout(r, 250)); } toast(`${g.length} archivos guardados ✓`, 4000); }
      catch (e) { console.error(e); toast('Error al dividir: ' + e.message, 6000); }
    };
  }
  // ---------- direcciones web del texto → enlaces ----------
  async function autoLinks() {
    if (!need()) return;
    let n = 0; pushHistory();
    for (const pg of S.pages) {
      let lines; try { lines = await getLines(pg); } catch { continue; }
      for (const l of lines) for (const w of l.words || []) {
        const s = w.str.replace(/[),.;:]+$/, ''); let url = null;
        if (/^https?:\/\/\S+/i.test(s)) url = s; else if (/^www\.\S+\.\S+/i.test(s)) url = 'https://' + s; else if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s)) url = 'mailto:' + s;
        if (!url || pg.annots.some(a => a.type === 'link' && Math.abs(a.x - w.x1) < 2 && Math.abs(a.y - l.top) < 2)) continue;
        pg.annots.push({ id: nid('a'), type: 'link', x: w.x1, y: l.top, w: w.x2 - w.x1, h: l.bottom - l.top, url, label: url }); n++;
      }
      drawAnnots(pg.id);
    }
    if (!n) { S.history.pop(); updateButtons(); return toast('No encontré direcciones web ni correos en el texto'); }
    buildComments(); scheduleSave(); toast(`${n} enlace(s) creados · se guardan dentro del PDF`, 4000);
  }

  FX.T = { protect, unprotect, sanitize, auditRedactions, stamps, autoBookmarks, wordCount, reversePages, splitEvery, autoLinks };
})();
