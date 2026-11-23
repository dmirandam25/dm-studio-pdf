/* DM Studio · PDF — integración con DM Studio PDF.exe: abre los archivos que se le pasan al programa
   (doble clic en un PDF, «Abrir con») y anota los errores en registro.txt. Solo actúa dentro del .exe. */
'use strict';
(() => {
  if (location.port !== '5180' || !/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return;
  document.documentElement.classList.add('folio-exe');
  const log = msg => { try { fetch('/__log', { method: 'POST', body: String(msg).slice(0, 4000) }); } catch { } };
  window.FX = window.FX || {}; FX.log = log;
  window.addEventListener('error', e => log(`Error: ${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
  window.addEventListener('unhandledrejection', e => log(`Error (promesa): ${e.reason?.message || e.reason} ${e.reason?.stack ? '| ' + String(e.reason.stack).split('\n').slice(0, 3).join(' | ') : ''}`));
  log(`Inicio · ${navigator.userAgent.match(/Edg\/[\d.]+/)?.[0] || navigator.userAgent}`);

  // espera a que la app termine de arrancar (y de recuperar la sesión anterior)
  const ready = async () => { for (let i = 0; i < 100; i++) { if (typeof loadFiles === 'function' && window.FolioPDF?.S && !$('#toast')?.textContent?.includes('Recuperando')) return; await new Promise(r => setTimeout(r, 100)); } };
  let busy = false;
  async function check() {
    if (busy) return; busy = true;
    try {
      const list = await (await fetch('/__pending', { cache: 'no-store' })).json();
      if (list.length) await ready();
      for (const it of list) {
        try {
          const r = await fetch('/__file?id=' + encodeURIComponent(it.id), { cache: 'no-store' });
          if (!r.ok) { log(`No se pudo leer ${it.name}: ${r.status}`); continue; }
          const f = new File([await r.arrayBuffer()], it.name, { type: /\.pdf$/i.test(it.name) ? 'application/pdf' : '' });
          document.body.classList.remove('at-home');
          await loadFiles([f], true);
          log(`Abierto ${it.name}: ${FolioPDF.S.pages.length} página(s)`);
        } catch (e) { log(`Error al abrir ${it.name}: ${e.message} | ${String(e.stack || '').split('\n').slice(0, 4).join(' | ')}`); }
      }
    } catch { }
    busy = false;
  }
  setTimeout(check, 1500);
  setInterval(check, 1500);

  // ---------- guardar con los diálogos de Windows (los muestra DM Studio PDF.exe) ----------
  const host = window.__folioHost; if (!host?.key) return;
  const enc = encodeURIComponent;
  const call = async (url, body) => {
    const r = await fetch(url, { method: 'POST', headers: { 'X-Folio-Key': host.key }, body });
    const txt = await r.text();
    if (!r.ok) throw new Error(txt || 'Error ' + r.status);
    return txt;
  };
  const cancelled = () => { const e = new Error('Cancelado'); e.name = 'AbortError'; return e; };
  const TYPES = { pdf: 'Documento PDF', docx: 'Documento de Word', xlsx: 'Libro de Excel', pptx: 'Presentación de PowerPoint', png: 'Imagen PNG', jpg: 'Imagen JPG', zip: 'Archivo ZIP', txt: 'Texto', html: 'Página web', md: 'Markdown', rtf: 'Texto enriquecido' };
  const mode = () => localStorage.getItem('folio.saveMode') || 'ask';
  const browserCommit = FX.commitSave;
  FX.prepareSave = async (files, opt = {}) => {
    if (!opt.ask && mode() === 'download') return { kind: 'download' };
    if (files.length > 1) { // varios archivos: elegir carpeta
      const dir = await call('/__dialog/folder?title=' + enc(`Elige la carpeta para guardar los ${files.length} archivos`));
      if (!dir) throw cancelled();
      return { kind: 'hostdir', dir };
    }
    const { name } = files[0], ext = (name.split('.').pop() || 'pdf').toLowerCase();
    const path = await call(`/__dialog/save?name=${enc(name)}&ext=${enc(ext)}&desc=${enc(TYPES[ext] || 'Archivo')}`);
    if (!path) throw cancelled();
    return { kind: 'host', path };
  };
  FX.commitSave = async (t, bytes, name, mime) => {
    if (t.kind === 'host') return call('/__write?path=' + enc(t.path), bytes);
    if (t.kind === 'hostdir') return call('/__write?unique=1&path=' + enc(t.dir + '\\' + name), bytes);
    return browserCommit(t, bytes, name, mime);
  };
  log('Guardar con diálogos de Windows: activado');
})();
