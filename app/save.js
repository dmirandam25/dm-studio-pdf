/* DM Studio · PDF — dónde guardar: elegir carpeta y nombre (explorador de Windows), guardar directamente
   en una carpeta de trabajo, o usar las Descargas del navegador.
   El destino se pide en el momento del clic (el navegador lo exige) y el archivo se escribe al terminar. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  // algunos navegadores integrados (el de la app de Claude, Electron) tienen la función pero
  // cancelan al instante sin mostrar la ventana: ahí se usa el selector clásico y las Descargas
  FX.nativePickers = 'showOpenFilePicker' in window && !/Electron|Claude\//.test(navigator.userAgent) && localStorage.getItem('folio.noPicker') !== '1';
  FX.pickerAbortedFast = (e, t0) => { if (e?.name === 'AbortError' && performance.now() - t0 < 250) { localStorage.setItem('folio.noPicker', '1'); FX.nativePickers = false; return true; } return false; };
  const supported = FX.nativePickers && 'showSaveFilePicker' in window && 'showDirectoryPicker' in window;
  let workDir = null;
  idbDo('kv', 'readonly', st => st.get('workDir')).then(h => { workDir = h || null; refreshUI(); }).catch(() => { });

  const getMode = () => (supported ? localStorage.getItem('folio.saveMode') || 'ask' : 'download');
  const setMode = m => { localStorage.setItem('folio.saveMode', m); refreshUI(); };
  async function ensurePerm(h) {
    const o = { mode: 'readwrite' };
    if ((await h.queryPermission(o)) === 'granted') return true;
    return (await h.requestPermission(o)) === 'granted';
  }
  async function chooseWorkDir() {
    const h = await window.showDirectoryPicker({ id: 'folio-trabajo', mode: 'readwrite', startIn: workDir || 'documents' });
    workDir = h; await idbDo('kv', 'readwrite', st => st.put(h, 'workDir')); setMode('dir');
    toast(`Carpeta de trabajo: ${h.name}`); return h;
  }
  FX.chooseWorkDir = chooseWorkDir;
  const TYPES = { pdf: 'Documento PDF', docx: 'Documento de Word', xlsx: 'Libro de Excel', pptx: 'Presentación de PowerPoint', png: 'Imagen PNG', jpg: 'Imagen JPG', zip: 'Archivo ZIP', txt: 'Texto', html: 'Página web' };
  async function freeName(dir, name) {
    const dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 2; i < 1000; i++) { const n = `${base} (${i})${ext}`; try { await dir.getFileHandle(n); } catch { return n; } }
    return `${base} (${Date.now()})${ext}`;
  }

  // Paso 1 (dentro del clic): decidir el destino. files = [{ name, mime }]
  FX.prepareSave = async (files, opt = {}) => {
    const m = opt.ask && supported ? 'ask' : getMode();
    if (m === 'download') return { kind: 'download' };
    if (m === 'dir') {
      if (!workDir) await chooseWorkDir();
      if (!(await ensurePerm(workDir))) throw new Error('No se dio permiso para escribir en la carpeta de trabajo');
      return { kind: 'dir', dir: workDir };
    }
    if (files.length > 1) { const d = await window.showDirectoryPicker({ id: 'folio-guardar', mode: 'readwrite', startIn: workDir || 'documents' }); return { kind: 'dir', dir: d, ask: true }; }
    const { name, mime } = files[0], ext = (name.split('.').pop() || '').toLowerCase();
    const h = await window.showSaveFilePicker({ id: 'folio-guardar', suggestedName: name, startIn: workDir || 'documents', types: [{ description: TYPES[ext] || 'Archivo', accept: { [(mime || 'application/octet-stream').split(';')[0]]: ['.' + ext] } }] });
    return { kind: 'file', handle: h };
  };
  // Paso 2: escribir los bytes. Devuelve dónde quedó guardado (para el aviso)
  FX.commitSave = async (t, bytes, name, mime) => {
    if (t.kind === 'download') { download(bytes, name, mime); return 'Descargas'; }
    if (t.kind === 'file') { const w = await t.handle.createWritable(); await w.write(bytes); await w.close(); return t.handle.name; }
    let fname = name;
    try { await t.dir.getFileHandle(fname); if (!confirm(`Ya existe «${fname}» en la carpeta «${t.dir.name}».\n\n¿Reemplazarlo?  (Cancelar = guardarlo con otro nombre)`)) fname = await freeName(t.dir, name); } catch { /* no existe */ }
    const fh = await t.dir.getFileHandle(fname, { create: true }), w = await fh.createWritable(); await w.write(bytes); await w.close();
    return `${t.dir.name}\\${fname}`;
  };
  FX.isCancel = e => e?.name === 'AbortError';
  // guardar un solo archivo de principio a fin (para usos sencillos)
  FX.saveBytes = async (bytesOrFn, name, mime) => {
    let t; try { t = await FX.prepareSave([{ name, mime }]); } catch (e) { if (FX.isCancel(e)) return null; throw e; }
    const bytes = typeof bytesOrFn === 'function' ? await bytesOrFn() : bytesOrFn;
    return FX.commitSave(t, bytes, name, mime);
  };
  FX.savedMsg = where => (where === 'Descargas' ? 'Guardado en Descargas ✓' : `Guardado en ${where} ✓`);

  // ---------- opciones: en el diálogo de guardar y en el menú ----------
  function fieldHtml() {
    const m = getMode();
    if (!supported) return `<fieldset><legend>Dónde guardar</legend><p class="hint" style="padding:0">Este navegador solo permite guardar en Descargas. En <b>Chrome o Edge</b> podrás elegir la carpeta o fijar una carpeta de trabajo.</p></fieldset>`;
    return `<fieldset class="savefs"><legend>Dónde guardar</legend>
      <label class="saveopt"><input type="radio" name="saveMode" value="ask" ${m === 'ask' ? 'checked' : ''}> Preguntar cada vez (elegir carpeta y nombre)</label>
      <label class="saveopt"><input type="radio" name="saveMode" value="dir" ${m === 'dir' ? 'checked' : ''}> Directamente en mi carpeta de trabajo:
        <b class="wd-name">${workDir ? esc(workDir.name) : 'sin elegir'}</b> <button type="button" class="wd-pick">${workDir ? 'Cambiar…' : 'Elegir carpeta…'}</button></label>
      <label class="saveopt"><input type="radio" name="saveMode" value="download" ${m === 'download' ? 'checked' : ''}> En Descargas del navegador</label>
    </fieldset>`;
  }
  function refreshUI() {
    document.querySelectorAll('.savefs').forEach(fs => { const m = getMode(); fs.querySelectorAll('[name=saveMode]').forEach(r => { r.checked = r.value === m; }); fs.querySelector('.wd-name').textContent = workDir ? workDir.name : 'sin elegir'; fs.querySelector('.wd-pick').textContent = workDir ? 'Cambiar…' : 'Elegir carpeta…'; });
    const b = $('[data-act=export]'); if (b) b.title = 'Guardar (Ctrl+S) · ' + (getMode() === 'dir' && workDir ? `en la carpeta «${workDir.name}»` : getMode() === 'ask' ? 'eligiendo dónde' : 'en Descargas');
  }
  document.addEventListener('change', e => { if (e.target.name === 'saveMode') { if (e.target.value === 'dir' && !workDir) { chooseWorkDir().catch(er => { if (!FX.isCancel(er)) toast(er.message); setMode('ask'); }); } else setMode(e.target.value); } });
  document.addEventListener('click', e => { if (e.target.closest('.wd-pick')) chooseWorkDir().catch(er => { if (!FX.isCancel(er)) toast(er.message); }); });
  const prev = FX.exportFields;
  FX.exportFields = () => fieldHtml() + (prev ? prev() : '');
  FX.openSaveSettings = () => { openModal(`<h2>Dónde guardar los archivos</h2>${fieldHtml()}<p class="hint" style="padding:0">Se aplica al guardar el PDF (también con Ctrl+S) y a todas las conversiones.</p><div class="actions"><button class="primary" data-close>Listo</button></div>`); };
  refreshUI();
})();
