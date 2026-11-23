/* DM Studio · PDF — editor de PDF en el navegador (pdf.js para ver, pdf-lib para escribir). */
'use strict';
const { PDFDocument, rgb, degrees, StandardFonts, BlendMode, LineCapStyle, PDFHexString,
  PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';

/* ---------- iconos ---------- */
const ICONS = {
  open:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  fileplus:'<path d="M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14h6"/>',
  download:'<path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/>',
  print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z"/>',
  undo:'<path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo:'<path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3"/>',
  up:'<path d="M6 15l6-6 6 6"/>', down:'<path d="M6 9l6 6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  cursor:'<path d="M5 3l6 17 2.5-7.5L21 10z"/>',
  highlight:'<path d="M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  text:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  pen:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  rect:'<rect x="3" y="5" width="18" height="14" rx="1"/>',
  ellipse:'<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  line:'<path d="M5 19L19 5"/>', arrow:'<path d="M5 19L19 5M10 5h9v9"/>',
  note:'<path d="M4 4h16v12H9l-5 4z"/>',
  sign:'<path d="M3 17c3-6 5-9 6-9s-1 8 1 8 3-5 4-5 1 3 2 3 3-1 3-1M3 21h18"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  redact:'<rect x="3" y="8" width="18" height="8" rx="1" fill="currentColor"/>',
  eraser:'<path d="M20 20H8l-5-5 10-10 8 8-6 7M6 11l7 7"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  pages:'<rect x="4" y="3" width="10" height="13" rx="1"/><path d="M10 21h9V8"/>',
  form:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h3"/>',
  rotl:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>', rotr:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  copy:'<path d="M8 8h12v12H8zM16 8V4H4v12h4"/>',
  scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M8.1 15.9L20 4"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  underline:'<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>',
  strike:'<path d="M4 12h16M16 7c-.6-1.3-2.1-2-4-2-2.4 0-4 1.2-4 3 0 1 .5 1.7 1.3 2.2M8 17c.6 1.3 2.1 2 4 2 2.4 0 4-1.2 4-3 0-.8-.3-1.4-.8-1.9"/>',
  bold:'<path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z"/>',
  italic:'<path d="M10 4h8M6 20h8M14 4l-4 16"/>',
  book:'<path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM9 7h7M9 11h5"/>',
  speak:'<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  share:'<path d="M4 13v6h16v-6M12 3v12M8 7l4-4 4 4"/>',
  replace:'<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
  right:'<path d="M9 6l6 6-6 6"/>', blank:'',
  shape:'<rect x="3" y="3" width="9" height="9" rx="1"/><circle cx="16" cy="16" r="5"/>',
  whiteout:'<rect x="3" y="5" width="18" height="14" rx="2" stroke-dasharray="3 2"/><path d="M8 14l3-4 5 5"/>',
  imgedit:'<rect x="3" y="4" width="13" height="12" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="M16 12l-3-3-7 7M14 21l1-3 5-5 2 2-5 5z"/>',
  crop:'<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
  fliph:'<path d="M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z"/>',
  flipv:'<path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z"/>',
  edittext:'<path d="M4 6V4h12v2M10 4v14M7 18h6"/><path d="M15 20l1-3 5-5 2 2-5 5z"/>',
  scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9h8M8 12h8M8 15h5"/>'
};
function paintIcons(root = document) {
  root.querySelectorAll('i[data-i]:not([data-done])').forEach(el => {
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[el.dataset.i] || ''}</svg>`;
    el.dataset.done = 1;
  });
}

/* ---------- estado ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const SWATCHES = ['#e11d48', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#6366f1', '#111827', '#ffffff'];
const S = {
  sources: [], pages: [], scale: 1, zoomMode: 'fitw', tool: 'select',
  colors: { highlight: '#facc15', default: '#e11d48' }, width: 2, fontSize: 14, opacity: 1, fill: false,
  sel: null, selPages: new Set(), cur: null, history: [], future: [], dirty: false, name: 'documento',
  pending: null, query: '', textCache: new Map(), thumbCache: new Map(),
  family: 'Helvetica', bold: false, italic: false, ocr: new Map(), ocrEmbed: true, blobs: new Map(),
  tabs: [], tab: null, view: 'one', bookmarks: [], attachments: [], fonts: []
};
let uid = 1;
const nid = p => p + (uid++);
const src = id => S.sources.find(s => s.id === id);
const pageById = id => S.pages.find(p => p.id === id);
const pageDiv = id => document.querySelector(`.page[data-id="${id}"]`);

function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
function download(bytes, name, type = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- geometría ---------- */
function geom(pg) {
  const inf = src(pg.src).info[pg.idx];
  const R = (((inf.rot + pg.rot) % 360) + 360) % 360, sw = R % 180 !== 0;
  return { W: inf.W, H: inf.H, R, dw: sw ? inf.H : inf.W, dh: sw ? inf.W : inf.H };
}
// rotar un vector (dx,dy) en pantalla (y hacia abajo) en sentido horario por a grados
function rotV(dx, dy, a) { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [dx * c - dy * s, dx * s + dy * c]; }
// pantalla (puntos, origen arriba-izq de la página mostrada) -> espacio PDF sin rotar
function mapPt(ctx, u, v) {
  const { W, H, R, ox, oy } = ctx; let x, y;
  if (R === 0) { x = u; y = H - v; } else if (R === 90) { x = v; y = u; } else if (R === 180) { x = W - u; y = v; } else { x = W - v; y = H - u; }
  return { x: x + ox, y: y + oy };
}
const measureCtx = document.createElement('canvas').getContext('2d');
const CSS_FAM = { Helvetica: "'Liberation Sans', Arial, Helvetica, sans-serif", Times: "'Liberation Serif', 'Times New Roman', Times, serif", Courier: "'Liberation Mono', 'Courier New', Courier, monospace" };
const cssFam = f => (f && f.startsWith('F:') ? `'${f}', sans-serif` : CSS_FAM[f] || CSS_FAM.Helvetica);
const FONT_BASE = { Helvetica: 'LiberationSans', Times: 'LiberationSerif', Courier: 'LiberationMono' }, fontByteCache = new Map();
// bytes de la fuente para incrustarla en el PDF (Unicode completo); null = usar las 14 estándar
async function getFontBytes(fam, b, it) {
  if (typeof fontkit === 'undefined') return null;
  if (fam && fam.startsWith('F:')) { const v = S.blobs.get(fam.slice(2)); return v instanceof Uint8Array ? v : null; }
  const url = `vendor/fonts/${FONT_BASE[fam] || FONT_BASE.Helvetica}-${b && it ? 'BoldItalic' : b ? 'Bold' : it ? 'Italic' : 'Regular'}.ttf`;
  if (!fontByteCache.has(url)) fontByteCache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(x => new Uint8Array(x)).catch(e => { fontByteCache.delete(url); throw e; }));
  return fontByteCache.get(url);
}
function fontAttrs(a) { return `font-family="${cssFam(a.family)}" font-weight="${a.bold ? 'bold' : 'normal'}" font-style="${a.italic ? 'italic' : 'normal'}"`; }
function textWidth(t, fs, a = {}) { measureCtx.font = `${a.italic ? 'italic ' : ''}${a.bold ? 'bold ' : ''}${fs}px ${cssFam(a.family)}`; return measureCtx.measureText(t).width; }
function bbox(a) {
  switch (a.type) {
    case 'highlight': case 'rect': case 'ellipse': case 'redact': case 'underline': case 'strike': case 'cover': case 'whiteout': case 'link':
      return { x: a.x, y: a.y, w: a.w, h: a.h };
    case 'line': case 'arrow': case 'ink': {
      const xs = a.pts.map(p => p[0]), ys = a.pts.map(p => p[1]), pad = a.width / 2 + 2;
      const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
      return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
    }
    case 'note': return { x: a.x - 10, y: a.y - 10, w: 20, h: 20 };
    case 'textedit': {
      const lines = a.text.split('\n'), w = Math.max(4, ...lines.map(l => textWidth(l, a.fs, a)));
      const lh = a.lh || a.fs * 1.2, cs = [[0, -a.fs * 0.9], [w, -a.fs * 0.9], [w, (lines.length - 1) * lh + a.fs * 0.25], [0, (lines.length - 1) * lh + a.fs * 0.25]]
        .map(([dx, dy]) => { const [rx, ry] = rotV(dx, dy, a.angle); return [a.tx + rx, a.ty + ry]; }).concat([[a.x, a.y], [a.x + a.w, a.y + a.h]]);
      const xs = cs.map(c => c[0]), ys = cs.map(c => c[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    case 'text': case 'image': {
      let w, h;
      if (a.type === 'text') { const lines = a.text.split('\n'); w = Math.max(10, ...lines.map(l => textWidth(l, a.fs, a))); h = lines.length * a.fs * 1.2 + a.fs * 0.25; }
      else { w = a.w; h = a.h; }
      const cs = [[0, 0], [w, 0], [w, h], [0, h]].map(([dx, dy]) => { const [rx, ry] = rotV(dx, dy, a.angle); return [a.ax + rx, a.ay + ry]; });
      const xs = cs.map(c => c[0]), ys = cs.map(c => c[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
  }
}
function moveAnn(a, o, dx, dy) {
  if (o.type === 'textedit') { a.tx = o.tx + dx; a.ty = o.ty + dy; return; } // el tapado se queda sobre el original
  if ('x' in o) { a.x = o.x + dx; a.y = o.y + dy; }
  if (o.pts) a.pts = o.pts.map(p => [p[0] + dx, p[1] + dy]);
  if ('ax' in o) { a.ax = o.ax + dx; a.ay = o.ay + dy; }
}
function rotateAnn(a, cw, dw, dh) {
  const f = cw ? (x, y) => [dh - y, x] : (x, y) => [y, dw - x];
  if (a.cover) { const c = a.cover, p1 = f(c.x, c.y), p2 = f(c.x + c.w, c.y + c.h); a.cover = { ...c, x: Math.min(p1[0], p2[0]), y: Math.min(p1[1], p2[1]), w: Math.abs(p1[0] - p2[0]), h: Math.abs(p1[1] - p2[1]) }; }
  if (a.type === 'underline' || a.type === 'strike') {
    const yy = a.type === 'underline' ? a.y + a.h : a.y + a.h / 2;
    a.pts = [[a.x, yy], [a.x + a.w, yy]]; a.width = Math.max(1, a.h * 0.08); a.type = 'line';
    delete a.x; delete a.y; delete a.w; delete a.h;
  }
  if (a.type === 'textedit') {
    [a.tx, a.ty] = f(a.tx, a.ty); a.angle = ((a.angle + (cw ? 90 : -90)) % 360 + 360) % 360;
    const p1 = f(a.x, a.y), p2 = f(a.x + a.w, a.y + a.h); a.x = Math.min(p1[0], p2[0]); a.y = Math.min(p1[1], p2[1]); a.w = Math.abs(p1[0] - p2[0]); a.h = Math.abs(p1[1] - p2[1]);
    return;
  }
  if (a.pts) a.pts = a.pts.map(p => f(p[0], p[1]));
  else if ('ax' in a) { [a.ax, a.ay] = f(a.ax, a.ay); a.angle = ((a.angle + (cw ? 90 : -90)) % 360 + 360) % 360; }
  else if (a.type === 'note') [a.x, a.y] = f(a.x, a.y);
  else { const p1 = f(a.x, a.y), p2 = f(a.x + a.w, a.y + a.h); a.x = Math.min(p1[0], p2[0]); a.y = Math.min(p1[1], p2[1]); a.w = Math.abs(p1[0] - p2[0]); a.h = Math.abs(p1[1] - p2[1]); }
}
function arrowHead(x1, y1, x2, y2, size) {
  const ang = Math.atan2(y2 - y1, x2 - x1), s = Math.max(8, size * 4);
  return [[x2 - s * Math.cos(ang - 0.45), y2 - s * Math.sin(ang - 0.45)], [x2 - s * Math.cos(ang + 0.45), y2 - s * Math.sin(ang + 0.45)]];
}

/* ---------- autoguardado en el navegador (IndexedDB) ---------- */
// Cada cambio se guarda solo; al recargar la página se recupera el trabajo.
let restoring = true, saveT = null, idbP = null;
function idb() {
  if (!idbP) idbP = new Promise((res, rej) => {
    const r = indexedDB.open('foliopdf', 2);
    r.onupgradeneeded = () => { for (const n of ['kv', 'sources', 'blobs']) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return idbP;
}
async function idbDo(store, mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode), req = fn(tx.objectStore(store));
    tx.oncomplete = () => res(req?.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
function persistSource(s) { idbDo('sources', 'readwrite', st => st.put({ id: s.id, name: s.name, bytes: s.bytes }, s.id)).catch(e => console.warn('autoguardado', e)); }
function scheduleSave() { if (restoring) return; clearTimeout(saveT); saveT = setTimeout(saveSession, 400); }
async function saveSession() {
  clearTimeout(saveT); if (restoring) return;
  try {
    stashTab();
    const tabs = S.tabs.map(t => ({ id: t.id, name: t.name, dirty: t.dirty, cur: t.cur, zoomMode: t.zoomMode, scale: t.scale, pages: t.pages, bookmarks: t.bookmarks || [], attachments: t.attachments || [], labels: t.labels || [], props: t.props || {} }));
    await idbDo('kv', 'readwrite', st => st.put({
      v: 2, uid, tab: S.tab, tabs, view: S.view, fonts: S.fonts,
      sources: S.sources.map(s => ({ id: s.id, formValues: s.formValues })), ocr: [...S.ocr], ocrEmbed: S.ocrEmbed, savedAt: Date.now()
    }, 'session'));
  } catch (e) { console.warn('autoguardado', e); }
}
async function clearSession() {
  clearTimeout(saveT);
  S.blobs = new Map();
  try { await idbDo('sources', 'readwrite', st => st.clear()); await idbDo('blobs', 'readwrite', st => st.clear()); await idbDo('kv', 'readwrite', st => st.delete('session')); } catch { }
}
async function restoreSession() {
  try {
    const meta = await idbDo('kv', 'readonly', st => st.get('session'));
    if (!meta || S.pages.length) return;
    // formato antiguo (una sola pestaña)
    const tabs = meta.v === 2 ? meta.tabs : (meta.pages?.length ? [{ id: 'tv1', name: meta.name, dirty: meta.dirty, cur: meta.cur, zoomMode: meta.zoomMode, scale: meta.scale, pages: meta.pages }] : []);
    if (!tabs.some(t => t.pages?.length)) return;
    toast('Recuperando tu trabajo…', 30000);
    const needed = new Set(tabs.flatMap(t => (t.pages || []).map(pg => pg.src)));
    for (const m of meta.sources) {
      if (!needed.has(m.id)) continue;
      const rec = await idbDo('sources', 'readonly', st => st.get(m.id)); if (!rec) continue;
      const s = await addSource(rec.bytes, rec.name, m.id, true); s.formValues = m.formValues || {};
    }
    const keys = new Set();
    tabs.forEach(t => { t.pages = (t.pages || []).filter(pg => src(pg.src)); t.pages.forEach(pg => pg.annots.forEach(a => { if (a.img) keys.add(a.img); if (a.img0) keys.add(a.img0); })); (t.attachments || []).forEach(x => keys.add(x.key)); });
    (meta.fonts || []).forEach(f => keys.add(f.key));
    for (const k of keys) { const v = await idbDo('blobs', 'readonly', st => st.get(k)); if (v) S.blobs.set(k, v); }
    S.fonts = meta.fonts || []; window.FX?.registerFonts?.();
    S.tabs = tabs.map(t => ({ ...tabDefaults(), ...t, history: [], future: [] }));
    S.tab = S.tabs.some(t => t.id === meta.tab) ? meta.tab : S.tabs[0].id;
    S.ocr = new Map(meta.ocr || []); S.ocrEmbed = meta.ocrEmbed ?? true; S.view = meta.view || 'one';
    uid = Math.max(uid, meta.uid || 0) + 1;
    loadTab(activeTab());
    rebuild(true);
    toast(S.tabs.filter(t => t.pages.length).length > 1 ? `Se recuperaron tus ${S.tabs.length} pestañas` : `Se recuperó tu trabajo: ${S.name}`, 3500);
  } catch (e) { console.warn('No se pudo recuperar la sesión', e); $('#toast').classList.add('hidden'); }
  finally { restoring = false; }
}
window.addEventListener('pagehide', () => saveSession());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSession(); });


/* ---------- pestañas: varios PDF abiertos a la vez ---------- */
const TAB_FIELDS = ['pages', 'history', 'future', 'name', 'dirty', 'cur', 'zoomMode', 'scale', 'bookmarks', 'attachments', 'labels', 'props'];
const tabDefaults = () => ({ pages: [], history: [], future: [], name: 'Nueva pestaña', dirty: false, cur: null, zoomMode: 'fitw', scale: 1, bookmarks: [], attachments: [] });
const activeTab = () => S.tabs.find(t => t.id === S.tab);
function stashTab() { const t = activeTab(); if (t) TAB_FIELDS.forEach(k => { t[k] = S[k]; }); }
function loadTab(t) { const def = tabDefaults(); TAB_FIELDS.forEach(k => { S[k] = t[k] ?? def[k]; }); S.sel = null; S.selPages = new Set(); }
function ensureTab() { if (!S.tabs.length) { const t = { id: nid('t'), ...tabDefaults() }; S.tabs.push(t); S.tab = t.id; } }
function newTab() {
  closeEditor(); stashTab();
  const t = { id: nid('t'), ...tabDefaults() }; S.tabs.push(t); S.tab = t.id; loadTab(t);
  return t;
}
function switchTab(id) {
  if (id === S.tab || !S.tabs.some(t => t.id === id)) return;
  closeEditor(); speechSynthesis?.cancel?.(); stashTab(); S.tab = id; loadTab(activeTab()); rebuild(true);
}
// quita de memoria y del autoguardado las fuentes que ya no usa ninguna pestaña
function collectSources() {
  stashTab();
  const used = new Set();
  const walk = pages => (pages || []).forEach(pg => used.add(pg.src));
  S.tabs.forEach(t => { walk(t.pages); (t.history || []).forEach(walk); (t.future || []).forEach(walk); });
  S.sources.filter(x => !used.has(x.id)).forEach(x => { try { x.pdf.destroy(); } catch { } idbDo('sources', 'readwrite', st => st.delete(x.id)).catch(() => { }); });
  S.sources = S.sources.filter(x => used.has(x.id));
}
function closeTab(id) {
  const t = S.tabs.find(x => x.id === id); if (!t) return;
  const data = t.id === S.tab ? S : t;
  if (data.dirty && data.pages.length && !confirm(`¿Cerrar «${data.name}»? Los cambios que no hayas guardado como PDF se perderán.`)) return;
  closeEditor(); stashTab();
  const i = S.tabs.indexOf(t); S.tabs.splice(i, 1);
  if (!S.tabs.length) S.tabs.push({ id: nid('t'), ...tabDefaults() });
  if (S.tab === id) { const n = S.tabs[Math.min(i, S.tabs.length - 1)]; S.tab = n.id; loadTab(n); }
  collectSources(); rebuild(true); saveSession();
}
function renderTabs() {
  const bar = $('#tabbar'); if (!bar) return;
  stashTab();
  const show = S.tabs.length > 1 || S.pages.length > 0;
  document.body.classList.toggle('has-tabs', show);
  bar.innerHTML = S.tabs.map(t => `<div class="tab${t.id === S.tab ? ' on' : ''}" data-tabid="${t.id}" title="${esc(t.name)}"><span>${esc(t.pages.length ? t.name : 'Nueva pestaña')}${t.dirty && t.pages.length ? ' •' : ''}</span><b data-closetab="${t.id}" title="Cerrar">×</b></div>`).join('')
    + '<button class="tabnew" data-act="newTab" title="Nueva pestaña (Ctrl+T)">+</button>';
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-closetab]'); if (c) { e.stopPropagation(); closeTab(c.dataset.closetab); return; }
  const t = e.target.closest('[data-tabid]'); if (t) switchTab(t.dataset.tabid);
});
document.addEventListener('auxclick', e => { const t = e.target.closest('[data-tabid]'); if (t && e.button === 1) closeTab(t.dataset.tabid); });

/* ---------- historial ---------- */
function snapshot() { return structuredClone(S.pages); }
function pushHistory() { S.history.push(snapshot()); if (S.history.length > 60) S.history.shift(); S.future = []; S.dirty = true; updateButtons(); scheduleSave(); }
function undo() { if (!S.history.length) return; S.future.push(snapshot()); S.pages = S.history.pop(); S.sel = null; rebuild(); }
function redo() { if (!S.future.length) return; S.history.push(snapshot()); S.pages = S.future.pop(); S.sel = null; rebuild(); }
function updateButtons() {
  $('[data-act=undo]').disabled = !S.history.length; $('[data-act=redo]').disabled = !S.future.length;
}

/* ---------- carga de archivos ---------- */
async function fileToBytes(f) { return new Uint8Array(await f.arrayBuffer()); }
async function imageToPng(blob, maxDim = 2400) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL('image/png'), w: c.width, h: c.height };
}
async function imageFileToPdf(file) {
  const d = await PDFDocument.create(); let img;
  if (file.type === 'image/jpeg') img = await d.embedJpg(await file.arrayBuffer());
  else img = await d.embedPng((await imageToPng(file)).dataUrl);
  const w = img.width * 0.75, h = img.height * 0.75, p = d.addPage([w, h]);
  p.drawImage(img, { x: 0, y: 0, width: w, height: h });
  return d.save();
}
async function blankPdf(w = 595.28, h = 841.89) { const d = await PDFDocument.create(); d.addPage([w, h]); return d.save(); }

async function addSource(bytes, name, fixedId, noPersist) {
  bytes = new Uint8Array(bytes);
  let pdf, password;
  const task = pdfjsLib.getDocument({ data: bytes.slice() });
  task.onPassword = (cb, reason) => {
    password = prompt(reason === 2 ? 'Contraseña incorrecta. Inténtalo de nuevo:' : `"${name}" está protegido. Contraseña:`);
    if (password === null) { task.destroy(); return; } cb(password);
  };
  pdf = await task.promise;
  const info = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const p = await pdf.getPage(i); const [x1, y1, x2, y2] = p.view;
    info.push({ W: x2 - x1, H: y2 - y1, rot: p.rotate, ox: x1, oy: y1 });
  }
  const s = { id: fixedId || nid('s'), name, bytes, pdf, info, fields: [], formValues: {}, encrypted: false };
  try {
    const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
    s.encrypted = d.isEncrypted;
    if (!s.encrypted) s.fields = d.getForm().getFields().map(f => {
      const o = { name: f.getName(), type: 'other' };
      try {
        if (f instanceof PDFTextField) { o.type = 'text'; o.value = f.getText() || ''; o.multi = f.isMultiline(); }
        else if (f instanceof PDFCheckBox) { o.type = 'check'; o.value = f.isChecked(); }
        else if (f instanceof PDFDropdown || f instanceof PDFOptionList) { o.type = 'select'; o.options = f.getOptions(); o.value = (f.getSelected() || [])[0] || ''; }
        else if (f instanceof PDFRadioGroup) { o.type = 'select'; o.options = f.getOptions(); o.value = f.getSelected() || ''; }
      } catch { }
      return o;
    }).filter(f => f.type !== 'other');
  } catch (e) { s.encrypted = true; }
  S.sources.push(s);
  if (!noPersist) persistSource(s);
  return s;
}

async function loadFiles(files, replace) {
  files = [...files]; if (!files.length) return;
  toast('Cargando…', 60000);
  const added = [];
  try {
    if (replace) { if (S.pages.length) newTab(); S.pages = []; S.history = []; S.future = []; S.selPages.clear(); S.sel = null; S.bookmarks = []; S.attachments = []; }
    else if (S.pages.length) pushHistory();
    for (let f of files) {
      let bytes;
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) bytes = await fileToBytes(f);
      else if (f.type.startsWith('image/')) bytes = await imageFileToPdf(f);
      else if (window.FX?.canConvert?.(f)) { toast(`Convirtiendo ${f.name} a PDF…`, 120000); try { bytes = await FX.convertToPdfBytes(f); } catch (er) { console.error(er); toast(`No se pudo convertir ${f.name}: ${er.message}`, 6000); continue; } f = new File([bytes], f.name.replace(/\.[^.]+$/, '') + '.pdf', { type: 'application/pdf' }); }
      else { toast(`Formato no compatible: ${f.name}`); continue; }
      const s = await addSource(bytes, f.name);
      s.info.forEach((_, i) => S.pages.push({ id: nid('p'), src: s.id, idx: i, rot: 0, annots: [] }));
      added.push(s);
    }
    if (!added.length) { $('#toast').classList.add('hidden'); if (replace && !S.pages.length && S.tabs.length > 1) closeTab(S.tab); return; }
    if (replace) { S.name = files[0].name.replace(/\.[^.]+$/, ''); S.dirty = false; S.zoomMode = 'fitw'; }
    else S.dirty = true;
    await window.FX?.afterLoad?.(added);
    $('#toast').classList.add('hidden');
    rebuild();
  } catch (e) { console.error(e); toast('No se pudo abrir el archivo: ' + e.message, 5000); }
}
async function newDocument() {
  if (S.pages.length) newTab();
  const s = await addSource(await blankPdf(), 'Nuevo.pdf');
  S.pages.push({ id: nid('p'), src: s.id, idx: 0, rot: 0, annots: [] });
  S.name = 'Nuevo documento'; S.dirty = false; S.zoomMode = 'fitw'; rebuild();
}

/* ---------- visor ---------- */
let observer;
function computeScale() {
  if (!S.pages.length) return;
  const v = $('#viewer'), gs = S.pages.map(geom), cols = S.view === 'two' && S.pages.length > 1 ? 2 : 1, avail = (v.clientWidth - 64 - (cols - 1) * 18) / cols;
  if (S.zoomMode === 'fitw') S.scale = Math.min(4, avail / Math.max(...gs.map(g => g.dw)));
  else if (S.zoomMode === 'fitp') S.scale = Math.min(avail / Math.max(...gs.map(g => g.dw)), (v.clientHeight - 48) / Math.max(...gs.map(g => g.dh)));
  $('#zoomSel').value = S.zoomMode === 'custom' ? '' : S.zoomMode;
  if (S.zoomMode === 'custom') {
    let o = [...$('#zoomSel').options].find(o => o.value === 'custom');
    if (!o) { o = new Option('', 'custom'); $('#zoomSel').add(o); }
    o.text = Math.round(S.scale * 100) + '%'; $('#zoomSel').value = 'custom';
  }
}
function rebuild(keepPage = true) {
  const curId = keepPage ? S.cur : null;
  $('#empty').classList.toggle('hidden', S.pages.length > 0);
  $('#docName').textContent = S.pages.length ? S.name + (S.dirty ? ' •' : '') : '';
  computeScale();
  const box = $('#pages'); box.innerHTML = ''; box.classList.toggle('two', S.view === 'two' && S.pages.length > 1);
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) renderPage(e.target); }), { root: $('#viewer'), rootMargin: '800px 0px' });
  S.pages.forEach((pg, i) => {
    const g = geom(pg), d = document.createElement('div');
    d.className = 'page'; d.dataset.id = pg.id;
    d.style.width = g.dw * S.scale + 'px'; d.style.height = g.dh * S.scale + 'px';
    d.innerHTML = `<div class="loading">Página ${i + 1}</div><canvas></canvas><div class="textLayer"></div><svg class="annots" viewBox="0 0 ${g.dw} ${g.dh}" preserveAspectRatio="none"></svg><span class="pnum">${i + 1}</span>`;
    box.appendChild(d); observer.observe(d); drawAnnots(pg.id);
  });
  $('#pageCount').textContent = '/ ' + S.pages.length;
  if (!pageById(curId)) S.cur = S.pages[0]?.id || null;
  buildThumbs(); buildComments(); buildForm(); updateButtons();
  if (S.cur && curId) requestAnimationFrame(() => scrollToPage(S.cur, false));
  updatePageIndicator(); scheduleSave(); renderTabs(); window.FX?.refreshPanels?.();
  if (S.pages.length && !mupdfP) setTimeout(() => getMupdf().catch(() => { }), 2500);
}
async function renderPage(d) {
  const pg = pageById(d.dataset.id); if (!pg) return;
  const g = geom(pg), key = `${S.scale}|${g.R}`;
  if (d._key === key) return; d._key = key;
  const s = src(pg.src), p = await s.pdf.getPage(pg.idx + 1);
  const vp = p.getViewport({ scale: S.scale, rotation: g.R }), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const c = d.querySelector('canvas'), tmp = document.createElement('canvas');
  tmp.width = Math.floor(vp.width * dpr); tmp.height = Math.floor(vp.height * dpr);
  if (d._task) d._task.cancel();
  d._task = p.render({ canvasContext: tmp.getContext('2d'), viewport: vp, transform: [dpr, 0, 0, dpr, 0, 0], optionalContentConfigPromise: s.occ || undefined });
  try { await d._task.promise; } catch (e) { return; }
  if (d._key !== key) return;
  c.width = tmp.width; c.height = tmp.height; c.getContext('2d').drawImage(tmp, 0, 0);
  d.querySelector('.loading')?.remove();
  // capa de texto (selección, copia y búsqueda)
  const tl = d.querySelector('.textLayer'); tl.innerHTML = '';
  tl.style.setProperty('--scale-factor', vp.scale);
  try {
    const tc = await p.getTextContent();
    await pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: vp, textDivs: [] }).promise;
    const ol = ocrLines(pg); if (ol.length) addOcrSpans(tl, ol);
    getImages(pg).catch(() => { });
    markHits(tl);
    window.FX?.afterRender?.(d, pg, p, vp);
  } catch (e) { }
}
function rerenderAll() {
  computeScale();
  $$('.page').forEach(d => {
    const g = geom(pageById(d.dataset.id));
    d.style.width = g.dw * S.scale + 'px'; d.style.height = g.dh * S.scale + 'px';
  });
  const cur = S.cur;
  requestAnimationFrame(() => { scrollToPage(cur, false); $$('.page').forEach(d => { const r = d.getBoundingClientRect(), v = $('#viewer').getBoundingClientRect(); if (r.bottom > v.top - 800 && r.top < v.bottom + 800) renderPage(d); }); });
}
function setZoom(mode, scale) {
  S.zoomMode = mode; if (mode === 'custom') S.scale = Math.max(0.2, Math.min(5, scale));
  rerenderAll();
}

/* ---------- anotaciones: dibujo SVG ---------- */
function annMarkup(a, sel) {
  const id = `data-ann="${a.id}"`, op = a.opacity ?? 1, col = a.color;
  let m = '';
  switch (a.type) {
    case 'highlight': m = `<rect class="ann" ${id} x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${col}" fill-opacity="0.38" style="mix-blend-mode:multiply"/>`; break;
    case 'redact': m = `<rect class="ann" ${id} x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="#000"/>`; break;
    case 'cover': m = `<rect class="ann" ${id} x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${a.bg}"/>`; break;
    case 'whiteout': m = `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="rgba(255,255,255,.75)" stroke="#2563eb" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`; break;
    case 'rect': m = `<rect class="ann" ${id} x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" stroke="${col}" stroke-width="${a.width}" fill="${a.fill ? col : 'transparent'}" fill-opacity="${a.fill ? 0.3 : 0}" stroke-opacity="${op}"/>`; break;
    case 'ellipse': m = `<ellipse class="ann" ${id} cx="${a.x + a.w / 2}" cy="${a.y + a.h / 2}" rx="${a.w / 2}" ry="${a.h / 2}" stroke="${col}" stroke-width="${a.width}" fill="${a.fill ? col : 'transparent'}" fill-opacity="${a.fill ? 0.3 : 0}" stroke-opacity="${op}"/>`; break;
    case 'underline': case 'strike': {
      const y = a.type === 'underline' ? a.y + a.h : a.y + a.h / 2, t = Math.max(1, a.h * 0.08);
      m = `<g class="ann" ${id}><rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="transparent"/><line x1="${a.x}" y1="${y}" x2="${a.x + a.w}" y2="${y}" stroke="${col}" stroke-width="${t}" stroke-opacity="${op}"/></g>`; break;
    }
    case 'line': case 'arrow': case 'ink': {
      let d = 'M' + a.pts.map(p => p.join(' ')).join(' L');
      if (a.type === 'arrow') { const [p1, p2] = [a.pts[0], a.pts[a.pts.length - 1]], h = arrowHead(p1[0], p1[1], p2[0], p2[1], a.width); d += ` M${h[0].join(' ')} L${p2.join(' ')} L${h[1].join(' ')}`; }
      m = `<g class="ann" ${id}><path d="${d}" stroke="transparent" stroke-width="${a.width + 10}" fill="none"/><path d="${d}" stroke="${col}" stroke-width="${a.width}" stroke-opacity="${op}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`; break;
    }
    case 'text': {
      const lines = a.text.split('\n');
      m = `<g class="ann" ${id} transform="translate(${a.ax} ${a.ay}) rotate(${a.angle})"><text ${fontAttrs(a)} font-size="${a.fs}" fill="${col}" fill-opacity="${op}" style="white-space:pre">${lines.map((l, i) => `<tspan x="0" y="${a.fs + i * a.fs * 1.2}">${esc(l) || ' '}</tspan>`).join('')}</text></g>`; break;
    }
    case 'textedit': {
      const lines = a.text.split('\n');
      m = `<g class="ann" ${id}>${a.real ? `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="transparent"/>` : `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${a.bg}"/>`}<g transform="translate(${a.tx} ${a.ty}) rotate(${a.angle})"><text ${fontAttrs(a)} font-size="${a.fs}" fill="${col}" fill-opacity="${op}" style="white-space:pre">${lines.map((l, i) => `<tspan x="0" y="${i * (a.lh || a.fs * 1.2)}">${esc(l)}</tspan>`).join('')}</text></g></g>`; break;
    }
    case 'image': m = `<g class="ann" ${id}>${a.cover ? `<rect x="${a.cover.x}" y="${a.cover.y}" width="${a.cover.w}" height="${a.cover.h}" fill="${a.cover.bg}" pointer-events="none"/>` : ''}<g transform="translate(${a.ax} ${a.ay}) rotate(${a.angle})"><image href="${imgData(a)}" width="${a.w}" height="${a.h}" preserveAspectRatio="none" opacity="${op}"/></g></g>`; break;
    case 'note': m = `<g class="ann" ${id}><title>${esc(a.text)}</title><path d="M${a.x - 9} ${a.y - 9}h18v13h-11l-7 5z" fill="${col}" stroke="#7a5b00" stroke-width="1"/><path d="M${a.x - 5} ${a.y - 4}h10M${a.x - 5} ${a.y}h7" stroke="#5a4300" stroke-width="1.2"/></g>`; break;
  }
  if (!m && window.FX?.markup) m = FX.markup(a, id, sel) || '';
  if (sel) {
    const b = bbox(a);
    m += `<rect x="${b.x - 3}" y="${b.y - 3}" width="${b.w + 6}" height="${b.h + 6}" fill="none" stroke="#2563eb" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    if (['highlight', 'rect', 'ellipse', 'redact', 'image', 'underline', 'strike', 'cover'].includes(a.type) && !(a.type === 'image' && a.angle))
      m += `<rect class="handle" data-handle="${a.id}" x="${b.x + b.w - 4}" y="${b.y + b.h - 4}" width="8" height="8" fill="#2563eb" stroke="#fff" stroke-width="1"/>`;
  }
  return m;
}
function drawAnnots(pageId) {
  const d = pageDiv(pageId), pg = pageById(pageId); if (!d || !pg) return;
  d.querySelector('svg.annots').innerHTML = pg.annots.map(a => annMarkup(a, S.sel && S.sel.ann === a.id)).join('');
}
function annChanged(pageId) { drawAnnots(pageId); updateThumbOverlay(pageId); buildCommentsSoon(); S.dirty = true; $('#docName').textContent = S.name + ' •'; scheduleSave(); }
function select(pageId, annId) {
  if (annId && S.sel && S.sel.ann === annId && S.sel.page === pageId) return; // ya seleccionada: no redibujar (rompería el doble clic)
  const old = S.sel; S.sel = annId ? { page: pageId, ann: annId } : null;
  if (old) drawAnnots(old.page); if (S.sel) drawAnnots(pageId);
  if (S.sel) { const a = findAnn(S.sel); if (a) syncPropsFrom(a); }
}
function findAnn(sel) { const pg = pageById(sel?.page); return pg?.annots.find(a => a.id === sel.ann); }
function deleteSelected() {
  if (!S.sel) return; const pg = pageById(S.sel.page); pushHistory();
  pg.annots = pg.annots.filter(a => a.id !== S.sel.ann); const p = S.sel.page; S.sel = null; annChanged(p);
}
function addAnn(pageId, a) { pushHistory(); a.id = nid('a'); pageById(pageId).annots.push(a); annChanged(pageId); return a; }

/* ---------- interacción en páginas ---------- */
function toPt(e, d) { const r = d.getBoundingClientRect(); return { x: (e.clientX - r.left) / S.scale, y: (e.clientY - r.top) / S.scale }; }
function curColor() { return S.tool === 'highlight' ? S.colors.highlight : S.colors.default; }

// tras usar una herramienta se vuelve a Seleccionar, salvo que esté fijada (doble clic en su botón)
function toolDone() { if (!S.toolLock && S.tool !== 'select') setTool('select'); }
function setTool(t, lock = false) {
  S.tool = t; S.toolLock = !!lock && t !== 'select'; if (t !== 'place') S.pending = null;
  $$('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === t); b.classList.toggle('locked', S.toolLock && b.dataset.tool === t); });
  const v = $('#viewer');
  v.classList.toggle('drawing', !['select', 'eraser', 'place'].includes(t));
  v.classList.toggle('erasing', t === 'eraser'); v.classList.toggle('placing', t === 'place'); v.classList.toggle('editing', t === 'edittext'); v.classList.toggle('imgediting', t === 'editimg');
  if (t === 'editimg') S.pages.forEach(pg => getImages(pg).catch(() => { }));
  if (t !== 'edittext' && t !== 'editimg') $$('.hoverbox').forEach(h => h.remove());
  else S.pages.forEach(pg => getLines(pg).catch(() => { }));
  if (t !== 'select') select(null);
  syncPropsUI();
}

$('#viewer').addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.target.closest('.inline-editor')) return;
  hideSelMenu();
  // un clic fuera de un editor abierto solo lo confirma (y vuelve a Seleccionar)
  if (document.querySelector('.inline-editor')) {
    closeEditor(); document.querySelector('.inline-editor')?.blur();
    if (!S.toolLock || S.tool === 'select') { e.preventDefault(); return; }
  }
  const d = e.target.closest('.page');
  if (!d) { if (S.sel) select(null); return; }
  const pg = pageById(d.dataset.id), pt = toPt(e, d);
  S.cur = pg.id; updatePageIndicator();
  const annEl = e.target.closest('[data-ann]'), handle = e.target.closest('[data-handle]');
  const t = S.tool;
  if (t === 'select') {
    if (handle) return startResize(e, d, pg, handle.dataset.handle);
    if (annEl) { select(pg.id, annEl.dataset.ann); return startMove(e, d, pg, annEl.dataset.ann); }
    if (S.sel) select(null);
    return;
  }
  if (t === 'eraser') { if (annEl) { select(pg.id, annEl.dataset.ann); deleteSelected(); toolDone(); } return; }
  e.preventDefault();
  if (t === 'place' && S.pending) {
    const P = S.pending, w = P.w, h = P.h;
    const a = addAnn(pg.id, { type: 'image', ax: pt.x - w / 2, ay: pt.y - h / 2, w, h, angle: 0, img: P.img, opacity: 1, label: P.label });
    setTool('select'); select(pg.id, a.id); $('#toast').classList.add('hidden'); return;
  }
  if (t === 'editimg') {
    const ae = annEl && pg.annots.find(x => x.id === annEl.dataset.ann);
    if (ae?.type === 'image') { toolDone(); select(pg.id, ae.id); return openImageEditor(pg, ae); }
    return dragLoop(() => { }, async () => {
      await getImages(pg).catch(() => { });
      const im = findPdfImage(pg, pt);
      if (!im) { const sh = findPdfShape(pg, pt); if (sh) return deleteShape(d, pg, sh); return toast('Aquí no hay imágenes ni formas del PDF. Pasa el ratón: se marcan en azul (imágenes) o naranja (formas).', 4000); }
      convertPdfImage(d, pg, im);
    });
  }
  if (t === 'edittext') { const whole = e.shiftKey, para = e.ctrlKey || e.metaKey; return dragLoop(() => { }, () => (para ? FX.editParagraphAt(d, pg, pt) : editLineAt(d, pg, pt, whole))); }
  if (t === 'text') return dragLoop(() => { }, () => setTimeout(() => openTextEditor(d, pg, pt), 0));
  if (t === 'note') {
    askText('Nueva nota', 'Escribe tu nota…').then(txt => { toolDone(); if (txt) addAnn(pg.id, { type: 'note', x: pt.x, y: pt.y, text: txt, color: '#fcd34d' }); }); return;
  }
  startDraw(e, d, pg, pt);
});

function dragLoop(onMove, onUp) {
  const mv = e => onMove(e), up = e => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); onUp(e); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function startMove(e, d, pg, annId) {
  const a = pg.annots.find(x => x.id === annId), o = structuredClone(a), p0 = toPt(e, d);
  const before = snapshot(); let moved = false;
  dragLoop(ev => {
    const p = toPt(ev, d), dx = p.x - p0.x, dy = p.y - p0.y;
    if (!moved && Math.hypot(dx, dy) < 1.5) return; moved = true;
    moveAnn(a, o, dx, dy); drawAnnots(pg.id);
  }, () => { if (moved) { S.history.push(before); S.future = []; updateButtons(); annChanged(pg.id); } });
}
function startResize(e, d, pg, annId) {
  e.preventDefault(); e.stopPropagation();
  const a = pg.annots.find(x => x.id === annId), before = snapshot(), ratio = a.type === 'image' ? a.w / a.h : 0;
  dragLoop(ev => {
    const p = toPt(ev, d);
    if (a.type === 'image') { a.w = Math.max(10, p.x - a.ax); a.h = ev.shiftKey ? Math.max(10, p.y - a.ay) : a.w / ratio; }
    else { a.w = Math.max(4, p.x - a.x); a.h = Math.max(4, p.y - a.y); }
    drawAnnots(pg.id);
  }, () => { S.history.push(before); S.future = []; updateButtons(); annChanged(pg.id); });
}
function startDraw(e, d, pg, p0) {
  const svg = d.querySelector('svg.annots'), t = S.tool;
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); svg.appendChild(tmp);
  const base = { color: curColor(), width: S.width, opacity: S.opacity };
  let a;
  if (t === 'ink') a = { type: 'ink', pts: [[p0.x, p0.y]], ...base };
  else if (t === 'line' || t === 'arrow') a = { type: t, pts: [[p0.x, p0.y], [p0.x, p0.y]], ...base };
  else a = { type: t, x: p0.x, y: p0.y, w: 0, h: 0, ...base, fill: S.fill };
  dragLoop(ev => {
    const p = toPt(ev, d);
    if (t === 'ink') { const l = a.pts[a.pts.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) > 0.8) a.pts.push([p.x, p.y]); }
    else if (a.pts) a.pts[1] = [p.x, p.y];
    else { a.x = Math.min(p0.x, p.x); a.y = Math.min(p0.y, p.y); a.w = Math.abs(p.x - p0.x); a.h = Math.abs(p.y - p0.y); }
    tmp.innerHTML = annMarkup(a, false);
  }, () => {
    tmp.remove();
    const b = bbox(a); if (b.w < 3 && b.h < 3) return;
    if (a.type === 'link') { toolDone(); FX.finishLink(pg, a); return; }
    if (a.type === 'whiteout') {
      const r = { x: a.x, y: a.y, w: a.w, h: a.h }, bg = ringColor(d, geom(pg), r);
      applyReal(pg, [r], { text: true, image: RED.IMG_PIXELS, lineArt: RED.ART_COVERED }).then(ok => {
        if (ok) toast('Área borrada del PDF · Ctrl+Z para deshacer'); else addAnn(pg.id, { type: 'cover', ...r, bg, label: 'Área borrada' });
      });
      toolDone(); return;
    }
    if (a.type === 'ink' && a.pts.length < 2) return;
    addAnn(pg.id, a); toolDone();
  });
}
function openTextEditor(d, pg, pt, existing) {
  closeEditor();
  const fs = existing ? existing.fs : S.fontSize, color = existing ? existing.color : S.colors.default;
  const ta = document.createElement('textarea'); ta.className = 'inline-editor';
  ta.style.left = (existing ? existing.ax : pt.x) * S.scale + 'px';
  ta.style.top = (existing ? existing.ay : pt.y) * S.scale + 'px';
  const fa = existing || { family: S.family, bold: S.bold, italic: S.italic };
  ta.style.fontFamily = cssFam(fa.family); ta.style.fontWeight = fa.bold ? 'bold' : 'normal'; ta.style.fontStyle = fa.italic ? 'italic' : 'normal';
  ta.style.fontSize = fs * S.scale + 'px'; ta.style.color = color; ta.value = existing ? existing.text : '';
  ta.rows = Math.max(1, ta.value.split('\n').length); ta.style.paddingTop = fs * 0.2 * S.scale + 'px';
  d.appendChild(ta); setTimeout(() => ta.focus(), 0);
  const fit = () => { ta.style.width = 'auto'; ta.style.width = Math.max(80, ta.scrollWidth + 12) + 'px'; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  ta.addEventListener('input', fit); fit();
  let done = false;
  const commit = save => {
    if (done) return; done = true; ta.remove();
    const txt = ta.value.replace(/\s+$/, '');
    toolDone();
    if (!save) { if (existing) drawAnnots(pg.id); return; }
    if (existing) {
      pushHistory(); const a = pg.annots.find(x => x.id === existing.id);
      if (!txt) pg.annots = pg.annots.filter(x => x.id !== existing.id); else a.text = txt;
      annChanged(pg.id);
    } else if (txt) addAnn(pg.id, { type: 'text', ax: pt.x, ay: pt.y, angle: 0, text: txt, fs, color, opacity: S.opacity, family: S.family, bold: S.bold, italic: S.italic });
  };
  ta.addEventListener('blur', () => commit(true));
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') commit(false); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(true); });
  closeEditor.fn = () => commit(true);
  if (existing) { const svgEl = d.querySelector(`[data-ann="${existing.id}"]`); if (svgEl) svgEl.style.display = 'none'; }
}
function closeEditor() { if (closeEditor.fn) { const f = closeEditor.fn; closeEditor.fn = null; f(); } }
$('#viewer').addEventListener('dblclick', e => {
  const annEl = e.target.closest('[data-ann]'), d = e.target.closest('.page'); if (!d) return;
  const pg = pageById(d.dataset.id);
  let a = annEl && pg.annots.find(x => x.id === annEl.dataset.ann);
  if (!a && S.sel?.page === pg.id) { const c = findAnn(S.sel); if (c && insideBox(toPt(e, d), bbox(c))) a = c; } // el elemento pudo redibujarse entre clics
  if (!a) return;
  if (a.type === 'text') { if (S.tool !== 'select') return; if (a.angle) { const t = prompt('Editar texto:', a.text); if (t !== null) { pushHistory(); a.text = t; annChanged(pg.id); } } else openTextEditor(d, pg, null, a); }
  if (a.type === 'textedit' && S.tool === 'select') { if (a.angle) { const t = prompt('Editar texto:', a.text); if (t !== null) { pushHistory(); a.text = t; annChanged(pg.id); } } else openLineEditor(d, pg, a, false); }
  if (a.type === 'image' && S.tool === 'select') return openImageEditor(pg, a);
  if (a.type === 'note') { const t = prompt('Editar nota:', a.text); if (t !== null) { pushHistory(); a.text = t; annChanged(pg.id); } }
});

/* ---------- edición del texto que ya trae el PDF ---------- */
// Se tapa la línea original con su color de fondo y se escribe el texto nuevo encima
// con la fuente estándar más parecida (Helvetica, Times o Courier).
const lineCache = new Map();
const lineKey = pg => `${pg.src}:${pg.idx}:${geom(pg).R}`;
function getLines(pg) {
  const key = lineKey(pg);
  if (!lineCache.has(key)) lineCache.set(key, computeLines(pg).then(l => { lineCache.set(key, l); return l; }).catch(e => { lineCache.delete(key); throw e; }));
  return Promise.resolve(lineCache.get(key));
}
function resolveFont(p, fontName, style) {
  let name = '', bold = false, italic = false, mono = false, serif = false;
  try { if (p.commonObjs.has(fontName)) { const f = p.commonObjs.get(fontName); name = f.name || ''; bold = !!(f.bold || f.black); italic = !!f.italic; mono = !!f.isMonospace; serif = !!f.isSerifFont; } } catch { }
  const n = name.replace(/^[A-Z]{6}\+/, '');
  if (/bold|black|heavy|semibold|demi/i.test(n)) bold = true;
  if (/italic|oblique/i.test(n)) italic = true;
  if (/courier|mono|consol/i.test(n) || style?.fontFamily === 'monospace') mono = true;
  else if (/sans|arial|helvet|verdana|calibri|segoe|roboto/i.test(n)) serif = false;
  else if (/times|serif|roman|georgia|garamond|minion|cambria|book/i.test(n) || (!n && style?.fontFamily === 'serif')) serif = true;
  return { family: mono ? 'Courier' : serif ? 'Times' : 'Helvetica', bold, italic, fontName: n };
}
async function computeLines(pg) {
  const g = geom(pg), p = await src(pg.src).pdf.getPage(pg.idx + 1), vp = p.getViewport({ scale: 1, rotation: g.R });
  const tc = await p.getTextContent();
  try { await p.getOperatorList(); } catch { } // asegura que las fuentes estén cargadas para leer su nombre
  const items = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(vp.transform, it.transform), fh = Math.hypot(tx[2], tx[3]);
    if (fh < 2 || tx[0] <= 0 || Math.abs(tx[1]) > 0.02 * fh) continue; // solo texto horizontal en pantalla
    const st = tc.styles[it.fontName] || {};
    items.push({ x: tx[4], base: tx[5], w: it.width, fh, str: it.str, font: it.fontName, asc: st.ascent || 0.8, desc: Math.abs(st.descent || 0.2) });
  }
  items.sort((a, b) => a.base - b.base || a.x - b.x);
  const groups = [];
  for (const it of items) {
    const ln = groups.find(l => Math.abs(l.base - it.base) < it.fh * 0.35 && Math.abs(l.fh - it.fh) < it.fh * 0.45 && it.x <= l.x2 + it.fh * 1.5 && it.x + it.w >= l.x1 - it.fh * 1.5);
    if (ln) { ln.items.push(it); ln.x1 = Math.min(ln.x1, it.x); ln.x2 = Math.max(ln.x2, it.x + it.w); }
    else groups.push({ items: [it], x1: it.x, x2: it.x + it.w, base: it.base, fh: it.fh });
  }
  const fonts = new Map(), finfo = fn => { if (!fonts.has(fn)) fonts.set(fn, resolveFont(p, fn, tc.styles[fn])); return fonts.get(fn); };
  const lines = groups.map(l => {
    l.items.sort((a, b) => a.x - b.x); let str = '', prev = null; const words = [];
    for (const it of l.items) {
      const f = finfo(it.font);
      const sep = prev && it.x - (prev.x + prev.w) > it.fh * 0.15 && !/\s$/.test(str) && !/^\s/.test(it.str) ? ' ' : '';
      str += sep; const base = str.length;
      // posición de cada palabra dentro del fragmento, proporcional al ancho real del PDF
      const k = it.w / (textWidth(it.str, it.fh, f) || 1), re = /\S+/g; let m;
      while ((m = re.exec(it.str))) {
        const x1 = it.x + textWidth(it.str.slice(0, m.index), it.fh, f) * k, x2 = it.x + textWidth(it.str.slice(0, m.index + m[0].length), it.fh, f) * k;
        const last = words[words.length - 1];
        if (last && m.index === 0 && !sep && last.end === base && x1 - last.x2 < it.fh * 0.25) { last.x2 = x2; last.str += m[0]; last.end = base + m[0].length; }
        else words.push({ x1, x2, str: m[0], start: base + m.index, end: base + m.index + m[0].length, f, fs: it.fh });
      }
      str += it.str; prev = it;
    }
    const lead = str.length - str.trimStart().length; words.forEach(w => { w.start -= lead; w.end -= lead; });
    const main = l.items.reduce((a, b) => (b.str.length > a.str.length ? b : a));
    const asc = Math.max(...l.items.map(i => i.fh * i.asc)), desc = Math.max(...l.items.map(i => i.fh * i.desc));
    return { x1: l.x1, x2: l.x2, base: l.base, top: l.base - asc, bottom: l.base + desc, fs: main.fh, str: str.trim(), words, ...finfo(main.font) };
  });
  return lines.length ? lines : ocrLines(pg);
}
function sampleColors(d, g, box) {
  const c = d.querySelector('canvas'), res = { bg: '#ffffff', fg: '#000000' };
  if (!c || !c.width) return res;
  const k = c.width / g.dw, ctx = c.getContext('2d');
  const x0 = Math.max(0, Math.floor((box.x - 1.5) * k)), y0 = Math.max(0, Math.floor((box.y - 1.5) * k));
  const x1 = Math.min(c.width, Math.ceil((box.x + box.w + 1.5) * k)), y1 = Math.min(c.height, Math.ceil((box.y + box.h + 1.5) * k));
  const w = x1 - x0, h = y1 - y0; if (w < 3 || h < 3) return res;
  const data = ctx.getImageData(x0, y0, w, h).data;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] < 128) data[i] = data[i + 1] = data[i + 2] = 255; // sin dibujar todavía = papel blanco
  const px = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const border = [];
  for (let x = 0; x < w; x++) border.push(px(x, 0), px(x, h - 1));
  for (let y = 0; y < h; y++) border.push(px(0, y), px(w - 1, y));
  const buckets = new Map();
  for (const q of border) { const key = q.map(v => v >> 4).join(','); const b = buckets.get(key) || { n: 0, s: [0, 0, 0] }; b.n++; q.forEach((v, i) => b.s[i] += v); buckets.set(key, b); }
  const best = [...buckets.values()].sort((a, b) => b.n - a.n)[0], bg = best.s.map(v => Math.round(v / best.n));
  let fg = [0, 0, 0], far = -1;
  for (let i = 0; i < data.length; i += 4) { const dd = (data[i] - bg[0]) ** 2 + (data[i + 1] - bg[1]) ** 2 + (data[i + 2] - bg[2]) ** 2; if (dd > far) { far = dd; fg = [data[i], data[i + 1], data[i + 2]]; } }
  const hex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('');
  return { bg: hex(bg), fg: far > 3600 ? hex(fg) : (bg.reduce((a, b) => a + b) > 380 ? '#000000' : '#ffffff') };
}
const insideBox = (pt, b) => pt.x >= b.x - 1 && pt.x <= b.x + b.w + 1 && pt.y >= b.y - 1 && pt.y <= b.y + b.h + 1;
const lineBox = l => ({ x: l.x1 - 1.5, y: l.top - 1, w: l.x2 - l.x1 + 3, h: l.bottom - l.top + 2 });
async function editLineAt(d, pg, pt, whole = false) {
  const ex = pg.annots.slice().reverse().find(a => a.type === 'textedit' && insideBox(pt, a));
  if (ex) {
    if (!ex.angle) return openLineEditor(d, pg, ex, false);
    askText('Editar texto', '', ex.text).then(t => { if (t !== null) { pushHistory(); ex.text = t; annChanged(pg.id); } }); return;
  }
  let lines = lineCache.get(lineKey(pg));
  try { if (!Array.isArray(lines)) { toast('Leyendo el texto de la página…', 8000); lines = await getLines(pg); $('#toast').classList.add('hidden'); } } catch (e) { return toast('No se pudo leer el texto de esta página'); }
  const ln = lines.find(l => insideBox(pt, lineBox(l)));
  if (!ln) return toast(lines.length ? 'Haz clic sobre una línea de texto' : 'Esta página no tiene texto editable (¿es un escaneo?). Usa OCR para reconocerlo.', 4000);
  if (whole || !ln.words?.length) return openLineEditor(d, pg, lineEditFrom(d, pg, ln), true);
  let i = ln.words.findIndex(w => pt.x >= w.x1 - 1.5 && pt.x <= w.x2 + 1.5);
  if (i < 0) i = ln.words.reduce((bi, w, j) => (Math.abs((w.x1 + w.x2) / 2 - pt.x) < Math.abs((ln.words[bi].x1 + ln.words[bi].x2) / 2 - pt.x) ? j : bi), 0);
  openLineEditor(d, pg, wordEditFrom(d, pg, ln, i, i), true);
}
const wordBox = (ln, w) => ({ x: w.x1 - 1, y: ln.top - 1, w: w.x2 - w.x1 + 2, h: ln.bottom - ln.top + 2 });
// edita solo las palabras i0..i1 de una línea; el resto de la línea no se toca
function wordEditFrom(d, pg, ln, i0, i1) {
  const w0 = ln.words[i0], w1 = ln.words[i1], word = ln.str.slice(w0.start, w1.end);
  return Object.assign(lineEditFrom(d, pg, ln), { x: w0.x1 - 1, w: w1.x2 - w0.x1 + 2, tx: w0.x1, text: word, orig: word, wordText: word, wordW: w1.x2 - w0.x1, tail: ln.str.slice(w1.end), lineX2: ln.x2 });
}
// si la palabra nueva cabe, solo se reescribe la palabra; si cambia mucho de ancho,
// se reescribe también lo que queda de línea para que no se monte ni quede un hueco
function fitWordEdit(a, txt) {
  a.text = txt;
  if (a.tail === undefined || a.extended || !a.tail.trim()) return a;
  const origEst = textWidth(a.wordText, a.fs, { family: a.origFamily, bold: a.origBold, italic: a.origItalic }), newEst = textWidth(txt, a.fs, a);
  if (Math.abs(newEst - origEst) > a.fs * 0.35 || newEst > a.wordW + a.fs * 0.3) {
    a.extended = true; a.text = txt + a.tail; a.orig = a.orig + a.tail; a.w = a.lineX2 + 1.5 - a.x;
  }
  return a;
}
function openLineEditor(d, pg, a, isNew) {
  if (a.para && window.FX?.openParaEditor) return FX.openParaEditor(d, pg, a, isNew);
  closeEditor(); $$('.hoverbox').forEach(h => h.remove());
  const ta = document.createElement('textarea'); ta.className = 'inline-editor line-editor'; ta.spellcheck = true; ta.lang = 'es'; ta.rows = 1;
  Object.assign(ta.style, {
    left: a.x * S.scale + 'px', top: a.y * S.scale + 'px', minWidth: a.w * S.scale + 'px', height: a.h * S.scale + 'px', lineHeight: a.h * S.scale + 'px',
    fontSize: a.fs * S.scale + 'px', fontFamily: cssFam(a.family), fontWeight: a.bold ? 'bold' : 'normal', fontStyle: a.italic ? 'italic' : 'normal', color: a.color, background: a.bg
  });
  ta.value = a.text; d.appendChild(ta);
  const fit = () => { ta.style.width = 'auto'; ta.style.width = Math.max(a.w * S.scale, ta.scrollWidth + 6) + 'px'; };
  ta.addEventListener('input', fit); fit();
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  if (!isNew) { const el = d.querySelector(`[data-ann="${a.id}"]`); if (el) el.style.display = 'none'; }
  let done = false;
  const commit = save => {
    if (done) return; done = true; ta.remove();
    toolDone();
    if (!save) { drawAnnots(pg.id); return; }
    const txt = ta.value.replace(/\n/g, ' ');
    if (isNew) {
      if (txt === a.text) return;
      const na = fitWordEdit({ ...a }, txt);
      applyReal(pg, [editRect(pg, na)], textMode(pg), () => { na.real = true; na.id = nid('a'); pg.annots.push(na); })
        .then(ok => { if (ok) toast('Texto editado en el PDF'); else addAnn(pg.id, na); });
      return;
    }
    pushHistory(); const cur = pg.annots.find(x => x.id === a.id);
    if (!cur) { annChanged(pg.id); return; }
    const unstyled = !cur.bold === !(cur.origBold ?? cur.bold) && !cur.italic === !(cur.origItalic ?? cur.italic) && (cur.family === (cur.origFamily ?? cur.family)) && cur.fs === (cur.origFs ?? cur.fs);
    const wasExt = cur.extended;
    if (txt === cur.orig && unstyled && !cur.real) pg.annots = pg.annots.filter(x => x.id !== cur.id); else fitWordEdit(cur, txt); // volver al original = quitar la edición
    if (cur.real && cur.extended && !wasExt) setTimeout(() => applyReal(pg, [editRect(pg, cur)], textMode(pg)), 0); // también hay que quitar el resto de la línea
    annChanged(pg.id);
  };
  ta.addEventListener('blur', () => commit(true));
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') commit(false); if (e.key === 'Enter') { e.preventDefault(); commit(true); } });
  closeEditor.fn = () => commit(true);
}
$('#viewer').addEventListener('pointermove', e => {
  if (S.tool !== 'edittext' || document.querySelector('.line-editor')) return;
  const d = e.target.closest('.page');
  $$('.hoverbox').forEach(h => { if (h.parentElement !== d) h.remove(); });
  if (!d) return;
  const pg = pageById(d.dataset.id), lines = lineCache.get(lineKey(pg));
  if (!Array.isArray(lines)) { getLines(pg).catch(() => { }); return; }
  const pt = toPt(e, d), ex = pg.annots.find(a => a.type === 'textedit' && insideBox(pt, a)); S.hover = { pid: pg.id, pt };
  const ln = ex ? null : lines.find(l => insideBox(pt, lineBox(l)));
  let b = ex || null;
  if (ln) {
    const w = !e.shiftKey && ln.words?.find(w => pt.x >= w.x1 - 1.5 && pt.x <= w.x2 + 1.5);
    b = w ? wordBox(ln, w) : lineBox(ln);
  }
  let hb = d.querySelector('.hoverbox');
  if (!b) { hb?.remove(); return; }
  if (!hb) { hb = document.createElement('div'); hb.className = 'hoverbox'; d.appendChild(hb); }
  Object.assign(hb.style, { left: b.x * S.scale + 'px', top: b.y * S.scale + 'px', width: b.w * S.scale + 'px', height: b.h * S.scale + 'px' });
});

/* ---------- OCR con Tesseract.js (todo local) ---------- */
const ocrKey = pg => `${pg.src}:${pg.idx}`;
function ocrLines(pg) { const o = S.ocr.get(ocrKey(pg)); return o && o.R === geom(pg).R ? o.lines : []; }
let ocrWorker = null, ocrLangs = '', ocrProgress = null;
async function getOcrWorker(langs) {
  if (typeof Tesseract === 'undefined') throw new Error('No se pudo cargar Tesseract.js');
  if (location.protocol === 'file:') throw new Error('El OCR necesita abrir la app con «Abrir DM Studio PDF.bat»');
  if (ocrWorker && ocrLangs === langs) return ocrWorker;
  if (ocrWorker) { await ocrWorker.terminate(); ocrWorker = null; }
  const base = new URL('vendor/tesseract/', location.href).href;
  ocrWorker = await Tesseract.createWorker(langs.split('+'), 1, {
    workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true,
    logger: m => ocrProgress && ocrProgress(m)
  });
  ocrLangs = langs; return ocrWorker;
}
async function ocrPage(pg, worker) {
  const g = geom(pg), p = await src(pg.src).pdf.getPage(pg.idx + 1);
  const vp = p.getViewport({ scale: 3000 / Math.max(g.dw, g.dh), rotation: g.R }); // ~300 ppp en A4
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await p.render({ canvasContext: ctx, viewport: vp }).promise;
  const { data } = await worker.recognize(c, {}, { blocks: true, text: true });
  const k = c.width / g.dw, lines = [];
  for (const b of data.blocks || []) for (const par of b.paragraphs) for (const l of par.lines) {
    const words = l.words.filter(w => w.text.trim() && w.confidence > 25); if (!words.length) continue;
    const bb = l.bbox, bl = l.baseline, hgt = bb.y1 - bb.y0;
    let base = bl && bl.has_baseline !== false && bl.y0 ? (bl.y0 + bl.y1) / 2 : bb.y1 - hgt * 0.2;
    base = Math.min(bb.y1, Math.max(bb.y0 + hgt * 0.5, base));
    lines.push({
      x1: bb.x0 / k, x2: bb.x1 / k, top: bb.y0 / k, bottom: bb.y1 / k, base: base / k, fs: Math.max(4, (base - bb.y0) / 0.75 / k),
      str: words.map(w => w.text).join(' '), family: 'Helvetica', bold: false, italic: false,
      words: (() => { let off = 0; return words.map(w => { const o = { x: w.bbox.x0 / k, y: w.bbox.y0 / k, w: (w.bbox.x1 - w.bbox.x0) / k, h: (w.bbox.y1 - w.bbox.y0) / k, base: base / k, str: w.text, x1: w.bbox.x0 / k, x2: w.bbox.x1 / k, start: off, end: off + w.text.length }; off += w.text.length + 1; return o; }); })()
    });
  }
  return { R: g.R, lines };
}
function addOcrSpans(tl, lines) {
  for (const l of lines) {
    const s = document.createElement('span'), fs = (l.bottom - l.top) * S.scale;
    s.textContent = l.str; s.style.cssText = `left:${l.x1 * S.scale}px;top:${l.top * S.scale}px;font-size:${fs}px;font-family:sans-serif;line-height:1`;
    measureCtx.font = `${fs}px sans-serif`; const w = measureCtx.measureText(l.str).width;
    if (w > 0) s.style.transform = `scaleX(${(l.x2 - l.x1) * S.scale / w})`;
    tl.appendChild(s);
  }
}
async function nativeTextLength(pg) { const p = await src(pg.src).pdf.getPage(pg.idx + 1), tc = await p.getTextContent(); return tc.items.reduce((n, it) => n + it.str.trim().length, 0); }
function openOcr() {
  if (!S.pages.length) return toast('Abre un documento primero');
  const nSel = S.pages.filter(p => S.selPages.has(p.id)).length;
  openModal(`<h2>Reconocer texto (OCR)</h2>
  <p class="hint" style="padding:0;margin-bottom:12px">Convierte páginas escaneadas o fotos en texto que puedes buscar, copiar, resaltar y editar. Todo se procesa en tu equipo.</p>
  <div class="row"><label>Páginas</label><select id="ocrScope"><option value="notext">Las que no tienen texto</option><option value="cur">Página actual</option><option value="sel" ${nSel ? '' : 'disabled'}>Seleccionadas (${nSel})</option><option value="all">Todas (${S.pages.length})</option></select></div>
  <div class="row"><label>Idioma</label><select id="ocrLang"><option value="spa+eng">Español + inglés</option><option value="spa">Español</option><option value="eng">Inglés</option></select></div>
  <div class="row"><label><input type="checkbox" id="ocrEmbed" ${S.ocrEmbed ? 'checked' : ''}> Al guardar, incluir el texto reconocido (PDF con búsqueda)</label></div>
  <div id="ocrProg" class="hint" style="padding:0;min-height:18px"></div>
  <div class="actions"><button data-close>Cerrar</button><button class="primary" id="ocrGo">Reconocer</button></div>`);
  $('#ocrEmbed').onchange = e => { S.ocrEmbed = e.target.checked; };
  $('#ocrGo').onclick = async () => {
    const btn = $('#ocrGo'), prog = $('#ocrProg'), scope = $('#ocrScope').value;
    btn.disabled = true;
    try {
      let list = scope === 'cur' ? S.pages.filter(p => p.id === S.cur) : scope === 'sel' ? S.pages.filter(p => S.selPages.has(p.id)) : S.pages.slice();
      if (scope === 'notext') { prog.textContent = 'Buscando páginas sin texto…'; const keep = []; for (const pg of list) if (await nativeTextLength(pg) < 20) keep.push(pg); list = keep; }
      if (!list.length) { prog.textContent = 'Todas las páginas ya tienen texto. Elige «Página actual» o «Todas» para forzar el OCR.'; btn.disabled = false; return; }
      let i = 0;
      ocrProgress = m => {
        const pct = Math.round((m.progress || 0) * 100);
        prog.textContent = m.status === 'recognizing text' ? `Página ${i + 1} de ${list.length} · ${pct}%` : `Preparando el motor OCR… (${m.status})`;
      };
      const worker = await getOcrWorker($('#ocrLang').value);
      let words = 0;
      for (i = 0; i < list.length; i++) {
        const pg = list[i]; prog.textContent = `Página ${i + 1} de ${list.length}…`;
        const res = await ocrPage(pg, worker); S.ocr.set(ocrKey(pg), res);
        words += res.lines.reduce((n, l) => n + l.words.length, 0);
        lineCache.delete(lineKey(pg));
        const d = pageDiv(pg.id); if (d) { d._key = null; renderPage(d); }
      }
      S.dirty = true; ocrProgress = null; scheduleSave();
      prog.textContent = `Listo: ${words} palabras reconocidas en ${list.length} página(s). Ya puedes buscar, seleccionar y editar ese texto.`;
      btn.disabled = false; btn.textContent = 'Reconocer otra vez';
    } catch (e) { console.error(e); prog.textContent = 'Error: ' + e.message; btn.disabled = false; ocrProgress = null; }
  };
}

/* ---------- borrado REAL del contenido del PDF (MuPDF) ---------- */
// MuPDF reescribe el contenido de la página y quita de verdad el texto, las formas o las
// imágenes de una zona (sin convertir la página en imagen). La página editada pasa a ser una
// fuente nueva; la anterior se conserva para poder deshacer con Ctrl+Z.
let mupdfP = null;
function getMupdf() {
  if (!mupdfP) {
    mupdfP = location.protocol === 'file:'
      ? Promise.reject(new Error('El borrado real necesita abrir la app con «Abrir DM Studio PDF.bat»'))
      : import(new URL('vendor/mupdf/mupdf.js', location.href).href);
    mupdfP.catch(e => { console.warn('MuPDF no disponible', e); setTimeout(() => { mupdfP = null; }, 0); });
  }
  return mupdfP;
}
const RED = { IMG_NONE: 0, IMG_REMOVE: 1, IMG_PIXELS: 2, ART_NONE: 0, ART_COVERED: 1 };
async function redactBytes(mu, pg, rects, mode) {
  const s = src(pg.src), inf = s.info[pg.idx], g = geom(pg);
  if (s.encrypted) throw new Error('PDF protegido');
  const doc = mu.Document.openDocument(s.bytes, 'application/pdf'), pdf = doc.asPDF();
  if (!pdf) throw new Error('No es un PDF');
  try {
    const page = pdf.loadPage(pg.idx), m = page.getTransform();
    const ctx = { W: inf.W, H: inf.H, R: g.R, ox: inf.ox || 0, oy: inf.oy || 0 };
    for (const r of rects) {
      const q = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].map(([u, v]) => {
        const p = mapPt(ctx, u, v); return [m[0] * p.x + m[2] * p.y + m[4], m[1] * p.x + m[3] * p.y + m[5]];
      });
      const xs = q.map(t => t[0]), ys = q.map(t => t[1]);
      page.createAnnotation('Redact').setRect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
    }
    page.applyRedactions(false, mode.image ?? RED.IMG_NONE, mode.lineArt ?? RED.ART_NONE, mode.text ? 0 : 1);
    const full = pdf.saveToBuffer('garbage,compress').asUint8Array().slice();
    // solo se guarda esa página como fuente nueva (más ligero que duplicar todo el documento)
    const all = await PDFDocument.load(full, { ignoreEncryption: true }), one = await PDFDocument.create();
    const [cp] = await one.copyPages(all, [pg.idx]); one.addPage(cp);
    return await one.save();
  } finally { try { doc.destroy?.(); } catch { } }
}
function pruneOcr(o, rects) {
  const hit = (x, y) => rects.some(r => x >= r.x && x <= r.x + r.w && y >= r.y - 2 && y <= r.y + r.h + 2);
  const lines = o.lines.map(l => {
    const ws = l.words.filter(w => !hit(w.x + w.w / 2, w.y + w.h / 2)); if (!ws.length) return null;
    let off = 0; const words = ws.map(w => { const n = { ...w, start: off, end: off + w.str.length }; off += w.str.length + 1; return n; });
    return { ...l, words, str: words.map(w => w.str).join(' '), x1: Math.min(...words.map(w => w.x)), x2: Math.max(...words.map(w => w.x + w.w)) };
  }).filter(Boolean);
  return { ...o, lines };
}
// aplica el borrado real a una página; after() añade anotaciones (texto recolocado, imagen editada…)
async function applyReal(pg, rects, mode, after) {
  if (!rects.length) return false;
  try {
    const mu = await getMupdf();
    toast('Borrando del PDF…', 20000);
    const bytes = await redactBytes(mu, pg, rects, mode);
    pushHistory();
    const old = src(pg.src), ocr = S.ocr.get(ocrKey(pg));
    const s = await addSource(bytes, old.name);
    pg.src = s.id; pg.idx = 0;
    if (ocr) S.ocr.set(ocrKey(pg), pruneOcr(ocr, rects));
    after?.();
    S.sel = null; rebuild(); $('#toast').classList.add('hidden');
    return true;
  } catch (e) {
    console.warn('borrado real', e);
    toast('No se pudo borrar de verdad (' + e.message + '); se ha tapado en su lugar', 5000);
    return false;
  }
}
const isOcrPage = pg => { const l = lineCache.get(lineKey(pg)); return Array.isArray(l) && l.length > 0 && l === ocrLines(pg); };
// franja que toca solo los caracteres de esa línea (no los de las líneas de arriba o abajo)
const textBand = (base, fs, x1, x2) => ({ x: x1, y: base - fs * 0.55, w: Math.max(0.5, x2 - x1), h: fs * 0.53 });
const textMode = pg => (isOcrPage(pg) ? { image: RED.IMG_PIXELS } : { text: true });
// zona a borrar para una edición de texto (palabras o línea)
function editRect(pg, a) {
  if (isOcrPage(pg)) return { x: a.x, y: a.y, w: a.w, h: a.h };
  return textBand(a.ty, a.fs, a.x + 1.3, a.x + a.w - 1.3);
}
// plan para eliminar las palabras i0..i1 de una línea: qué zona borrar y qué texto recolocar
function realDeletePlan(d, pg, ln, i0, i1) {
  const whole = !ln.words?.length || (i0 === 0 && i1 === ln.words.length - 1);
  const x1 = whole ? ln.x1 : ln.words[i0].x1;
  const tail = whole ? '' : ln.str.slice(ln.words[i1].end).replace(/^\s+/, '');
  const removed = whole ? ln.str : ln.str.slice(ln.words[i0].start, ln.words[i1].end);
  const x2 = whole || tail ? ln.x2 : ln.words[i1].x2;
  const rect = isOcrPage(pg) ? { x: x1 - 1, y: ln.top - 1, w: x2 - x1 + 2, h: ln.bottom - ln.top + 2 } : textBand(ln.base, ln.fs, x1 + 0.3, x2 - 0.3);
  // lo que había a la derecha se vuelve a escribir donde empezaba lo borrado (sin hueco)
  const annot = tail ? Object.assign(lineEditFrom(d, pg, ln), { x: x1 - 1, w: x2 - x1 + 2, tx: x1, text: tail, orig: removed, real: true, deleted: true }) : null;
  return { rect, annot };
}

/* ---------- imágenes: almacén, imágenes del PDF y editor ---------- */
// Las imágenes se guardan una sola vez en S.blobs; las anotaciones solo llevan su clave
// (así el historial de deshacer no duplica megas de datos).
function putBlob(dataUrl) {
  const key = nid('b'); S.blobs.set(key, dataUrl);
  idbDo('blobs', 'readwrite', st => st.put(dataUrl, key)).catch(e => console.warn('autoguardado', e));
  return key;
}
const imgData = a => (a.img ? S.blobs.get(a.img) || '' : a.data || '');
function loadImg(url) { const im = new Image(); im.src = url; return im.decode().then(() => im); }
async function urlToBytes(url) { return new Uint8Array(await (await fetch(url)).arrayBuffer()); }
function downloadCanvas(c, name) { c.toBlob(b => b.arrayBuffer().then(buf => download(new Uint8Array(buf), name, 'image/png')), 'image/png'); }
async function copyImageUrl(url) {
  try {
    const im = await loadImg(url), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Imagen copiada');
  } catch (e) { toast('No se pudo copiar la imagen: ' + e.message); }
}
function pickImageFile() {
  return new Promise(res => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const f = inp.files[0]; if (f) res(await imageToPng(f, 3000)); };
    inp.click();
  });
}

// --- detectar las imágenes que trae el PDF (posición en la página) ---
const pdfImgCache = new Map();
function getImages(pg) {
  const key = lineKey(pg);
  if (!pdfImgCache.has(key)) pdfImgCache.set(key, computeImages(pg).then(l => { pdfImgCache.set(key, l); return l; }).catch(e => { pdfImgCache.delete(key); throw e; }));
  return Promise.resolve(pdfImgCache.get(key));
}
async function computeImages(pg) {
  const g = geom(pg), p = await src(pg.src).pdf.getPage(pg.idx + 1), vp = p.getViewport({ scale: 1, rotation: g.R });
  const ops = await p.getOperatorList(), O = pdfjsLib.OPS, U = pdfjsLib.Util, out = [], stack = [], shapes = [];
  const FILL = new Set([O.fill, O.eoFill]), STROKE = new Set([O.stroke, O.closeStroke]), BOTH = new Set([O.fillStroke, O.eoFillStroke, O.closeFillStroke, O.closeEOFillStroke]);
  let lw = 1, path = null;
  let ctm = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], args = ops.argsArray[i];
    if (fn === O.save) stack.push(ctm);
    else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === O.transform) ctm = U.transform(ctm, args);
    else if (fn === O.paintFormXObjectBegin) { stack.push(ctm); if (args?.[0]) ctm = U.transform(ctm, args[0]); }
    else if (fn === O.paintFormXObjectEnd) ctm = stack.pop() || ctm;
    else if (fn === O.setLineWidth) lw = args[0];
    else if (fn === O.constructPath) {
      const mm = args[2];
      if (mm && isFinite(mm[0]) && isFinite(mm[3]) && mm[1] >= mm[0] && mm[3] >= mm[2]) {
        const m = U.transform(vp.transform, ctm), sc = Math.hypot(m[0], m[1]);
        // pdf.js da la caja del trazado como [minX, maxX, minY, maxY]
        const pts = [[mm[0], mm[2]], [mm[1], mm[2]], [mm[0], mm[3]], [mm[1], mm[3]]].map(([ux, uy]) => [m[0] * ux + m[2] * uy + m[4], m[1] * ux + m[3] * uy + m[5]]);
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        path = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), lw: Math.max(lw * sc, 0.5) };
      } else path = null;
    }
    else if (fn === O.endPath || fn === O.clip || fn === O.eoClip) path = null;
    else if (path && (FILL.has(fn) || STROKE.has(fn) || BOTH.has(fn))) {
      const stroke = !FILL.has(fn), pad = stroke ? path.lw / 2 : 0;
      const sh = { x: path.x - pad, y: path.y - pad, w: path.w + 2 * pad, h: path.h + 2 * pad, kind: stroke && !BOTH.has(fn) ? 'stroke' : 'fill' };
      const pageBg = sh.w >= g.dw * 0.95 && sh.h >= g.dh * 0.95;
      if (!pageBg && Math.max(sh.w, sh.h) >= 3 && shapes.length < 3000) shapes.push(sh);
      path = null;
    }
    else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintJpegXObject) {
      const m = U.transform(vp.transform, ctm);
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([ux, uy]) => [m[0] * ux + m[2] * uy + m[4], m[1] * ux + m[3] * uy + m[5]]);
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      if (w < 6 || h < 6) continue;
      out.push({ x, y, w, h, m, id: typeof args[0] === 'string' ? args[0] : null, inline: fn === O.paintInlineImageXObject ? args[0] : null });
    }
  }
  pdfShapeCache.set(lineKey(pg), shapes);
  return out;
}

// ---------- formas vectoriales del PDF: eliminarlas tapándolas con el fondo correcto ----------
const pdfShapeCache = new Map();
const inflateBox = (b, min = 5) => { const px = Math.max(0, (min - b.w) / 2), py = Math.max(0, (min - b.h) / 2); return { x: b.x - px, y: b.y - py, w: b.w + 2 * px, h: b.h + 2 * py }; };
const containsBox = (o, i, tol = 1) => i.x >= o.x - tol && i.y >= o.y - tol && i.x + i.w <= o.x + o.w + tol && i.y + i.h <= o.y + o.h + tol;
const isShapeCovered = (pg, sh) => pg.annots.some(a => (a.type === 'cover' || a.type === 'redact') && containsBox(a, sh, 1.5));
function shapesAt(pg, pt) {
  const list = pdfShapeCache.get(lineKey(pg)); if (!Array.isArray(list)) return [];
  return list.filter(sh => insideBox(pt, inflateBox(sh)) && !isShapeCovered(pg, sh)).sort((a, b) => a.w * a.h - b.w * b.h);
}
const findPdfShape = (pg, pt) => shapesAt(pg, pt)[0] || null;
// color más frecuente justo alrededor de una caja (si hay un contenedor, solo dentro de él)
function ringColor(d, g, box, clip) {
  const c = d.querySelector('canvas'); if (!c || !c.width) return '#ffffff';
  const k = c.width / g.dw, ctx = c.getContext('2d');
  const x0 = Math.max(0, Math.floor((box.x - 2.5) * k)), y0 = Math.max(0, Math.floor((box.y - 2.5) * k));
  const x1 = Math.min(c.width - 1, Math.ceil((box.x + box.w + 2.5) * k)), y1 = Math.min(c.height - 1, Math.ceil((box.y + box.h + 2.5) * k));
  if (x1 - x0 < 2 || y1 - y0 < 2) return '#ffffff';
  const data = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data, W = x1 - x0 + 1, counts = new Map();
  const ok = (x, y) => !clip || ((x0 + x) / k >= clip.x + 1 && (x0 + x) / k <= clip.x + clip.w - 1 && (y0 + y) / k >= clip.y + 1 && (y0 + y) / k <= clip.y + clip.h - 1);
  const add = (x, y) => {
    if (!ok(x, y)) return; const i = (y * W + x) * 4; let r = data[i], gg = data[i + 1], b = data[i + 2];
    if (data[i + 3] < 128) r = gg = b = 255;
    const key = (r >> 3) + ',' + (gg >> 3) + ',' + (b >> 3), e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += gg; e.b += b; counts.set(key, e);
  };
  for (let x = 0; x < W; x++) { add(x, 0); add(x, y1 - y0); }
  for (let y = 0; y <= y1 - y0; y++) { add(0, y); add(W - 1, y); }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0]; if (!best) return '#ffffff';
  return '#' + [best.r, best.g, best.b].map(v => Math.round(v / best.n).toString(16).padStart(2, '0')).join('');
}
function shapeContainer(pg, sh) {
  const list = pdfShapeCache.get(lineKey(pg)) || [];
  return list.filter(o => o !== sh && o.kind === 'fill' && o.w * o.h > sh.w * sh.h * 1.2 && containsBox(o, sh, 0.5) && !isShapeCovered(pg, o)).sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
}
async function deleteShape(d, pg, sh) {
  const box = { x: sh.x - 1, y: sh.y - 1, w: sh.w + 2, h: sh.h + 2 };
  toolDone();
  if (await applyReal(pg, [box], { lineArt: RED.ART_COVERED })) return toast('Forma eliminada del PDF · Ctrl+Z para deshacer');
  coverShape(d, pg, sh);
}
async function deleteShapesAt(d, pg, pt) {
  const hits = shapesAt(pg, pt); if (!hits.length) return toast('Aquí no hay formas');
  const x = Math.min(...hits.map(h => h.x)), y = Math.min(...hits.map(h => h.y)), box = { x: x - 1, y: y - 1, w: Math.max(...hits.map(h => h.x + h.w)) - x + 2, h: Math.max(...hits.map(h => h.y + h.h)) - y + 2 };
  if (await applyReal(pg, [box], { lineArt: RED.ART_COVERED })) return toast(`${hits.length} forma(s) eliminada(s) del PDF · Ctrl+Z para deshacer`);
  addAnn(pg.id, { type: 'cover', ...box, bg: ringColor(d, geom(pg), box), label: 'Formas eliminadas' });
}
// respaldo si MuPDF no está disponible: tapar con el color del fondo
function coverShape(d, pg, sh) {
  const cont = shapeContainer(pg, sh);
  let box = { x: sh.x - 1, y: sh.y - 1, w: sh.w + 2, h: sh.h + 2 };
  if (cont) { const x2 = Math.min(box.x + box.w, cont.x + cont.w), y2 = Math.min(box.y + box.h, cont.y + cont.h); box.x = Math.max(box.x, cont.x); box.y = Math.max(box.y, cont.y); box.w = x2 - box.x; box.h = y2 - box.y; }
  addAnn(pg.id, { type: 'cover', ...box, bg: ringColor(d, geom(pg), sh, cont), label: 'Forma eliminada' });
}
const nearBox = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.w - b.w) < 3 && Math.abs(a.h - b.h) < 3;
const isImgCovered = (pg, im) => pg.annots.some(a => (a.type === 'cover' && nearBox(a, im)) || (a.cover && nearBox(a.cover, im)));
function findPdfImage(pg, pt) {
  const list = pdfImgCache.get(lineKey(pg)); if (!Array.isArray(list)) return null;
  const hits = list.filter(im => insideBox(pt, im) && !isImgCovered(pg, im));
  return hits.sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
}
function imgObjToCanvas(o) {
  if (!o) return null;
  const c = document.createElement('canvas');
  if (o.bitmap) { c.width = o.bitmap.width; c.height = o.bitmap.height; c.getContext('2d').drawImage(o.bitmap, 0, 0); return c; }
  if (!o.data || !o.width) return null;
  const { width: w, height: h, data, kind } = o; c.width = w; c.height = h;
  const ctx = c.getContext('2d'), id = ctx.createImageData(w, h), px = id.data;
  if (kind === 3) px.set(data.subarray(0, w * h * 4));
  else if (kind === 2) for (let i = 0, j = 0; i < w * h; i++, j += 3) { px[i * 4] = data[j]; px[i * 4 + 1] = data[j + 1]; px[i * 4 + 2] = data[j + 2]; px[i * 4 + 3] = 255; }
  else return null;
  ctx.putImageData(id, 0, 0); return c;
}
// saca la imagen con su resolución original (si no se puede, la recorta del renderizado)
async function extractPdfImage(pg, im) {
  const p = await src(pg.src).pdf.getPage(pg.idx + 1);
  let srcC = null;
  try {
    let obj = im.inline;
    if (!obj && im.id) {
      const store = im.id.startsWith('g_') ? p.commonObjs : p.objs;
      obj = await Promise.race([new Promise(r => store.get(im.id, r)), new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo agotado')), 4000))]);
    }
    srcC = imgObjToCanvas(obj);
  } catch (e) { console.warn('extraer imagen', e); }
  if (srcC) {
    const W = srcC.width, H = srcC.height, s = Math.min(4000 / Math.max(im.w, im.h), Math.max(W / im.w, H / im.h, 1));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.w * s)); c.height = Math.max(1, Math.round(im.h * s));
    const [a, b, cc, d, e, f] = im.m, x = c.getContext('2d');
    x.setTransform(s * a / W, s * b / W, -s * cc / H, -s * d / H, s * (cc + e - im.x), s * (d + f - im.y));
    x.drawImage(srcC, 0, 0); return c;
  }
  const g = geom(pg), s = Math.min(3, 3000 / Math.max(im.w, im.h)), vp = p.getViewport({ scale: s, rotation: g.R });
  const full = document.createElement('canvas'); full.width = Math.ceil(vp.width); full.height = Math.ceil(vp.height);
  await p.render({ canvasContext: full.getContext('2d'), viewport: vp }).promise;
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.w * s)); c.height = Math.max(1, Math.round(im.h * s));
  c.getContext('2d').drawImage(full, im.x * s, im.y * s, im.w * s, im.h * s, 0, 0, c.width, c.height); return c;
}
const canvasToUrl = c => (c.width * c.height > 2e6 ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png'));
// modo para quitar una imagen: si otra imagen comparte la zona, solo se borran esos píxeles
function imageMode(pg, im, r) {
  const others = (pdfImgCache.get(lineKey(pg)) || []).filter(o => o !== im && !(o.x > r.x + r.w || o.x + o.w < r.x || o.y > r.y + r.h || o.y + o.h < r.y));
  return { image: others.length ? RED.IMG_PIXELS : RED.IMG_REMOVE };
}
// convierte una imagen del PDF en editable: se quita la original del PDF y se coloca la copia editable
async function convertPdfImage(d, pg, im) {
  toast('Preparando la imagen…', 20000);
  try {
    const c = await extractPdfImage(pg, im), key = putBlob(canvasToUrl(c)), r = { x: im.x - 0.5, y: im.y - 0.5, w: im.w + 1, h: im.h + 1 };
    const a = { type: 'image', ax: im.x, ay: im.y, w: im.w, h: im.h, angle: 0, img: key, img0: key, opacity: 1, label: 'Imagen del PDF' };
    toolDone();
    const ok = await applyReal(pg, [r], imageMode(pg, im, r), () => { a.id = nid('a'); pg.annots.push(a); });
    if (!ok) { a.cover = { x: im.x - 1, y: im.y - 1, w: im.w + 2, h: im.h + 2, bg: sampleColors(d, geom(pg), im).bg }; addAnn(pg.id, a); }
    select(pg.id, a.id);
    toast('Imagen editable: arrástrala, cambia su tamaño o haz doble clic para editarla', 4000);
    return a;
  } catch (e) { console.error(e); toast('No se pudo preparar la imagen: ' + e.message); }
}
async function deletePdfImage(d, pg, im) {
  const r = { x: im.x - 0.5, y: im.y - 0.5, w: im.w + 1, h: im.h + 1 };
  if (await applyReal(pg, [r], imageMode(pg, im, r))) return toast('Imagen eliminada del PDF · Ctrl+Z para deshacer');
  addAnn(pg.id, { type: 'cover', x: im.x - 1, y: im.y - 1, w: im.w + 2, h: im.h + 2, bg: sampleColors(d, geom(pg), im).bg, label: 'Imagen eliminada' });
}
async function extractAllImages(pg) {
  const list = await getImages(pg).catch(() => []);
  if (!list.length) return toast('Esta página no tiene imágenes');
  const n = S.pages.indexOf(pg) + 1;
  for (let i = 0; i < list.length; i++) { downloadCanvas(await extractPdfImage(pg, list[i]), `${S.name}_p${n}_imagen${i + 1}.png`); await new Promise(r => setTimeout(r, 250)); }
  toast(`${list.length} imagen(es) descargada(s)`);
}

// --- editor de imágenes: recorte, giro, volteo, filtros, quitar fondo ---
const ORI = { rotr: [0, 1, -1, 0], rotl: [0, -1, 1, 0], fliph: [-1, 0, 0, 1], flipv: [1, 0, 0, -1] };
const mulM = (o, m) => [o[0] * m[0] + o[2] * m[1], o[1] * m[0] + o[3] * m[1], o[0] * m[2] + o[2] * m[3], o[1] * m[2] + o[3] * m[3]];
function cropOp(c, op) {
  if (op === 'rotr') return { x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w };
  if (op === 'rotl') return { x: c.y, y: 1 - c.x - c.w, w: c.h, h: c.w };
  if (op === 'fliph') return { ...c, x: 1 - c.x - c.w };
  return { ...c, y: 1 - c.y - c.h };
}
const IMG_DEF = () => ({ m: [1, 0, 0, 1], crop: null, bright: 100, contrast: 100, sat: 100, gray: false, white: 0 });
function renderImg(base, P, maxDim, cropIt = true) {
  const W = base.naturalWidth || base.width, H = base.naturalHeight || base.height, k = Math.min(1, maxDim / Math.max(W, H)), sw = P.m[0] === 0;
  let c = document.createElement('canvas'); c.width = Math.max(1, Math.round((sw ? H : W) * k)); c.height = Math.max(1, Math.round((sw ? W : H) * k));
  const x = c.getContext('2d');
  x.filter = `brightness(${P.bright}%) contrast(${P.contrast}%) saturate(${P.sat}%)${P.gray ? ' grayscale(1)' : ''}`;
  x.setTransform(P.m[0], P.m[1], P.m[2], P.m[3], c.width / 2, c.height / 2);
  x.drawImage(base, -W * k / 2, -H * k / 2, W * k, H * k);
  x.setTransform(1, 0, 0, 1, 0, 0); x.filter = 'none';
  if (P.white > 0) { // fondo blanco → transparente (útil para firmas y logotipos escaneados)
    const id = x.getImageData(0, 0, c.width, c.height), d = id.data, thr = 255 - P.white * 1.4;
    for (let i = 0; i < d.length; i += 4) { const mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mn >= thr) d[i + 3] = 0; else if (mn > thr - 25) d[i + 3] = Math.min(d[i + 3], Math.round(255 * (thr - mn) / 25)); }
    x.putImageData(id, 0, 0);
  }
  if (cropIt && P.crop) {
    const cr = P.crop, cx = Math.round(cr.x * c.width), cy = Math.round(cr.y * c.height), cw = Math.max(1, Math.round(cr.w * c.width)), ch = Math.max(1, Math.round(cr.h * c.height));
    const o = document.createElement('canvas'); o.width = cw; o.height = ch; o.getContext('2d').drawImage(c, cx, cy, cw, ch, 0, 0, cw, ch); c = o;
  }
  return c;
}
function ensureImgKey(a) { if (!a.img && a.data) { a.img = putBlob(a.data); delete a.data; } }
// aplica el resultado a la anotación (mismo centro y misma área, nueva proporción)
function commitImage(pg, a, base, P, origKey, opacity) {
  const out = renderImg(base, P, 3000, true), url = P.white === 0 ? canvasToUrl(out) : out.toDataURL('image/png');
  pushHistory();
  a.img0 = origKey; a.img = putBlob(url); a.edit = P; a.opacity = opacity;
  const asp = out.width / out.height;
  if (!a.angle) { const area = a.w * a.h, cx = a.ax + a.w / 2, cy = a.ay + a.h / 2; a.w = Math.sqrt(area * asp); a.h = a.w / asp; a.ax = cx - a.w / 2; a.ay = cy - a.h / 2; }
  else a.h = a.w / asp;
  annChanged(pg.id); select(pg.id, a.id);
}
async function quickImageOp(pg, a, op) {
  ensureImgKey(a);
  const origKey = a.img0 || a.img, base = await loadImg(S.blobs.get(origKey));
  const P = Object.assign(IMG_DEF(), structuredClone(a.edit || {}));
  P.m = mulM(ORI[op], P.m); if (P.crop) P.crop = cropOp(P.crop, op);
  commitImage(pg, a, base, P, origKey, a.opacity ?? 1);
}
async function replaceImage(pg, a) {
  const r = await pickImageFile(); ensureImgKey(a);
  const key = putBlob(r.dataUrl); pushHistory();
  a.img = a.img0 = key; delete a.edit;
  const asp = r.w / r.h; if (!a.angle) { const cx = a.ax + a.w / 2, cy = a.ay + a.h / 2; a.h = a.w / asp; a.ay = cy - a.h / 2; a.ax = cx - a.w / 2; } else a.h = a.w / asp;
  annChanged(pg.id); select(pg.id, a.id); toast('Imagen reemplazada');
}
async function openImageEditor(pg, a) {
  ensureImgKey(a);
  let origKey = a.img0 || a.img, base = await loadImg(S.blobs.get(origKey));
  let P = Object.assign(IMG_DEF(), structuredClone(a.edit || {})), opacity = Math.round((a.opacity ?? 1) * 100), cropping = false, prev = null;
  const slider = (id, label, min, max) => `<label class="sl">${label} <output id="${id}O"></output><input type="range" id="${id}" min="${min}" max="${max}"></label>`;
  openModal(`<h2>Editar imagen</h2>
  <div class="imged">
    <div class="imged-stage"><canvas id="ieCanvas"></canvas></div>
    <div class="imged-side">
      <div class="ie-btns">
        <button data-ie="rotl" title="Girar a la izquierda"><i data-i="rotl"></i></button>
        <button data-ie="rotr" title="Girar a la derecha"><i data-i="rotr"></i></button>
        <button data-ie="fliph" title="Voltear horizontal"><i data-i="fliph"></i></button>
        <button data-ie="flipv" title="Voltear vertical"><i data-i="flipv"></i></button>
        <button data-ie="crop" title="Recortar: arrastra sobre la imagen"><i data-i="crop"></i> Recortar</button>
        <button data-ie="nocrop" title="Quitar recorte">Sin recorte</button>
      </div>
      ${slider('ieBright', 'Brillo', 0, 200)}${slider('ieContrast', 'Contraste', 0, 200)}${slider('ieSat', 'Saturación', 0, 200)}
      ${slider('ieOpacity', 'Opacidad', 10, 100)}${slider('ieWhite', 'Quitar fondo blanco', 0, 100)}
      <label class="chk"><input type="checkbox" id="ieGray"> Blanco y negro</label>
      <div class="ie-btns"><button data-ie="replace"><i data-i="image"></i> Reemplazar…</button><button data-ie="download"><i data-i="download"></i> Descargar</button></div>
    </div>
  </div>
  <div class="actions"><button data-ie="reset">Restablecer</button><span style="flex:1"></span><button data-close>Cancelar</button><button class="primary" id="ieOk">Aplicar</button></div>`);
  $('#modalCard').classList.add('wide');
  const cv = $('#ieCanvas'), ctx = cv.getContext('2d');
  const draw = tmp => {
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.globalAlpha = opacity / 100; ctx.drawImage(prev, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1;
    const cr = tmp || P.crop; if (!cr) return;
    const x = cr.x * cv.width, y = cr.y * cv.height, w = cr.w * cv.width, h = cr.h * cv.height;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, cv.width, y); ctx.fillRect(0, y + h, cv.width, cv.height - y - h); ctx.fillRect(0, y, x, h); ctx.fillRect(x + w, y, cv.width - x - w, h);
    ctx.strokeStyle = '#fff'; ctx.setLineDash([5, 4]); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.setLineDash([]);
  };
  const refresh = () => { prev = renderImg(base, P, 900, false); const k = Math.min(520 / prev.width, 360 / prev.height, 2); cv.width = Math.round(prev.width * k); cv.height = Math.round(prev.height * k); draw(); };
  const fields = [['ieBright', 'bright'], ['ieContrast', 'contrast'], ['ieSat', 'sat'], ['ieWhite', 'white'], ['ieOpacity', 'opacity']];
  const syncUI = () => { fields.forEach(([id, k]) => { const v = k === 'opacity' ? opacity : P[k]; $('#' + id).value = v; $('#' + id + 'O').textContent = v + (k === 'white' ? '' : '%'); }); $('#ieGray').checked = P.gray; };
  fields.forEach(([id, k]) => $('#' + id).addEventListener('input', e => {
    const v = +e.target.value; if (k === 'opacity') opacity = v; else P[k] = v;
    $('#' + id + 'O').textContent = v + (k === 'white' ? '' : '%'); k === 'opacity' ? draw() : refresh();
  }));
  $('#ieGray').onchange = e => { P.gray = e.target.checked; refresh(); };
  $('.imged').addEventListener('click', async e => {
    const b = e.target.closest('[data-ie]'); if (!b) return; const op = b.dataset.ie;
    if (ORI[op]) { P.m = mulM(ORI[op], P.m); if (P.crop) P.crop = cropOp(P.crop, op); refresh(); }
    else if (op === 'crop') { cropping = !cropping; b.classList.toggle('on', cropping); cv.style.cursor = cropping ? 'crosshair' : 'default'; }
    else if (op === 'nocrop') { P.crop = null; draw(); }
    else if (op === 'replace') { const r = await pickImageFile(); origKey = putBlob(r.dataUrl); base = await loadImg(r.dataUrl); P = IMG_DEF(); syncUI(); refresh(); }
    else if (op === 'download') downloadCanvas(renderImg(base, P, 4000, true), (a.label || 'imagen').replace(/\s+/g, '_') + '.png');
  });
  $('[data-ie=reset]').onclick = () => { P = IMG_DEF(); opacity = 100; syncUI(); refresh(); };
  cv.addEventListener('pointerdown', e => {
    if (!cropping) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect(), nrm = ev => ({ x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) });
    const s0 = nrm(e); let tmp = null;
    const mv = ev => { const s1 = nrm(ev); tmp = { x: Math.min(s0.x, s1.x), y: Math.min(s0.y, s1.y), w: Math.abs(s1.x - s0.x), h: Math.abs(s1.y - s0.y) }; draw(tmp); };
    const up = () => {
      cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up);
      if (tmp && tmp.w > 0.02 && tmp.h > 0.02) P.crop = tmp;
      cropping = false; $('[data-ie=crop]').classList.remove('on'); cv.style.cursor = 'default'; draw();
    };
    cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up);
  });
  $('#ieOk').onclick = () => { closeModal(); commitImage(pg, a, base, P, origKey, opacity / 100); toast('Imagen actualizada'); };
  syncUI(); refresh();
}
$('#viewer').addEventListener('pointermove', e => {
  if (S.tool !== 'editimg') return;
  const d = e.target.closest('.page');
  $$('.hoverbox').forEach(h => { if (h.parentElement !== d) h.remove(); });
  if (!d) return;
  const pg = pageById(d.dataset.id);
  if (!Array.isArray(pdfImgCache.get(lineKey(pg)))) { getImages(pg).catch(() => { }); return; }
  const pt = toPt(e, d), img = findPdfImage(pg, pt), sh = img ? null : findPdfShape(pg, pt), im = img || (sh && inflateBox(sh, 3)); let hb = d.querySelector('.hoverbox');
  if (!im) { hb?.remove(); return; }
  if (!hb) { hb = document.createElement('div'); hb.className = 'hoverbox'; d.appendChild(hb); }
  hb.classList.toggle('shape', !img); hb.title = img ? 'Clic: editar imagen' : 'Clic: eliminar forma';
  Object.assign(hb.style, { left: im.x * S.scale + 'px', top: im.y * S.scale + 'px', width: im.w * S.scale + 'px', height: im.h * S.scale + 'px' });
});
function pdfImageMenu(d, pg, im) {
  return { label: 'Imagen del PDF', icon: 'imgedit', sub: [
    { label: 'Mover o cambiar tamaño', icon: 'cursor', action: () => convertPdfImage(d, pg, im) },
    { label: 'Editar imagen (recortar, girar, filtros)…', icon: 'imgedit', action: async () => { const a = await convertPdfImage(d, pg, im); if (a) openImageEditor(pg, a); } },
    { label: 'Reemplazar imagen…', icon: 'image', action: async () => { const a = await convertPdfImage(d, pg, im); if (a) replaceImage(pg, a); } },
    '-',
    { label: 'Descargar imagen', icon: 'download', action: async () => downloadCanvas(await extractPdfImage(pg, im), `${S.name}_imagen.png`) },
    { label: 'Copiar imagen', icon: 'copy', action: async () => copyImageUrl((await extractPdfImage(pg, im)).toDataURL('image/png')) },
    '-',
    { label: 'Eliminar imagen', icon: 'trash', danger: true, action: () => deletePdfImage(d, pg, im) }
  ] };
}
function imageAnnotItems(pg, a) {
  return [
    { label: 'Editar imagen…', icon: 'imgedit', action: () => openImageEditor(pg, a) },
    { label: 'Imagen', icon: 'image', sub: [
      { label: 'Girar a la derecha', icon: 'rotr', action: () => quickImageOp(pg, a, 'rotr') },
      { label: 'Girar a la izquierda', icon: 'rotl', action: () => quickImageOp(pg, a, 'rotl') },
      { label: 'Voltear horizontal', icon: 'fliph', action: () => quickImageOp(pg, a, 'fliph') },
      { label: 'Voltear vertical', icon: 'flipv', action: () => quickImageOp(pg, a, 'flipv') },
      '-',
      { label: 'Reemplazar imagen…', icon: 'image', action: () => replaceImage(pg, a) },
      { label: 'Descargar imagen', icon: 'download', action: async () => download(await urlToBytes(imgData(a)), (a.label || 'imagen').replace(/\s+/g, '_') + (imgData(a).startsWith('data:image/jpeg') ? '.jpg' : '.png'), 'image/*') },
      { label: 'Copiar imagen', icon: 'copy', action: () => copyImageUrl(imgData(a)) },
      a.cover && '-',
      a.cover && { label: 'Restaurar la imagen original del PDF', icon: 'undo', action: () => { pushHistory(); pg.annots = pg.annots.filter(x => x !== a); S.sel = null; annChanged(pg.id); } }
    ] }
  ];
}

/* ---------- selección de texto: barra rápida (clic izquierdo) y acciones ---------- */
function hideSelMenu() { $('#selMenu').classList.add('hidden'); }
let selCtx = null; // selección capturada al abrir un menú (los diálogos la borran)
function selectionInfo() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount || !sel.anchorNode?.parentElement?.closest('.textLayer')) return null;
  const text = sel.toString().trim(); if (!text) return null;
  const rects = [...sel.getRangeAt(0).getClientRects()].filter(r => r.width > 1 && r.height > 1);
  const byPage = new Map();
  for (const r of rects) {
    const d = $$('.page').find(p => { const b = p.getBoundingClientRect(); return r.top + r.height / 2 >= b.top && r.top + r.height / 2 <= b.bottom && r.left + 1 >= b.left && r.left <= b.right; });
    if (!d) continue; const b = d.getBoundingClientRect();
    const box = { x: (r.left - b.left) / S.scale, y: (r.top - b.top) / S.scale, w: r.width / S.scale, h: r.height / S.scale };
    const list = byPage.get(d.dataset.id) || []; byPage.set(d.dataset.id, list);
    const same = list.find(o => Math.abs(o.y - box.y) < box.h * 0.5 && Math.abs(o.h - box.h) < box.h * 0.6 && box.x <= o.x + o.w + 3 && box.x + box.w >= o.x - 3);
    if (same) { const x2 = Math.max(same.x + same.w, box.x + box.w), y2 = Math.max(same.y + same.h, box.y + box.h); same.x = Math.min(same.x, box.x); same.y = Math.min(same.y, box.y); same.w = x2 - same.x; same.h = y2 - same.y; }
    else list.push(box);
  }
  return byPage.size ? { text, byPage } : null;
}
function askText(title, placeholder, initial = '', okLabel = 'Aceptar') {
  return new Promise(res => {
    openModal(`<h2>${esc(title)}</h2><div class="row"><textarea id="askIn" rows="3" placeholder="${esc(placeholder)}">${esc(initial)}</textarea></div>
      <p class="hint" style="padding:0">Enter para aceptar · Shift+Enter para salto de línea</p>
      <div class="actions"><button data-close>Cancelar</button><button class="primary" id="askOk">${esc(okLabel)}</button></div>`);
    const inp = $('#askIn'); setTimeout(() => { inp.focus(); inp.select(); }, 0);
    let done = false;
    const fin = v => { if (done) return; done = true; modalOnClose = null; closeModal(); res(v); };
    modalOnClose = () => fin(null);
    $('#askOk').onclick = () => fin(inp.value.trim() || null);
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fin(inp.value.trim() || null); } if (e.key === 'Escape') fin(null); };
  });
}
function addMarkup(info, kind, color, extra = {}) {
  pushHistory(); let last = null;
  for (const [pid, boxes] of info.byPage) {
    const pg = pageById(pid);
    boxes.forEach(b => { last = { id: nid('a'), type: kind, ...b, color, opacity: 1, text: '', ...extra }; pg.annots.push(last); last._page = pid; });
    annChanged(pid);
  }
  if (last) { last.text = info.text.slice(0, 300); delete last._page; }
  buildCommentsSoon(); return last;
}
function firstBox(info) { const [pid, boxes] = [...info.byPage][0]; return { pid, box: boxes[0], last: boxes[boxes.length - 1] }; }
function lineEditFrom(d, pg, ln) {
  const box = lineBox(ln), { bg, fg } = sampleColors(d, geom(pg), box);
  return { type: 'textedit', ...box, tx: ln.x1, ty: ln.base, angle: 0, text: ln.str, orig: ln.str, fs: Math.round(ln.fs * 10) / 10, family: ln.family, bold: ln.bold, italic: ln.italic, origBold: ln.bold, origItalic: ln.italic, origFamily: ln.family, origFs: Math.round(ln.fs * 10) / 10, color: fg, bg, opacity: 1 };
}
// aplica negrita, cursiva, fuente o tamaño solo a las palabras seleccionadas
function wordsInBox(ln, b) { return (ln.words || []).map((w, i) => [(w.x1 + w.x2) / 2, i]).filter(([m]) => m >= b.x - 1 && m <= b.x + b.w + 1).map(([, i]) => i); }
async function styleLines(info, prop, value) {
  const todo = [];
  for (const [pid, boxes] of info.byPage) {
    const pg = pageById(pid), d = pageDiv(pid); let lines;
    try { lines = await getLines(pg); } catch { continue; }
    for (const b of boxes) {
      const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const ex = pg.annots.find(a => a.type === 'textedit' && insideBox(c, a));
      if (ex) { if (!todo.some(t => t.a === ex)) todo.push({ pg, a: ex }); continue; }
      const ln = lines.find(l => insideBox(c, lineBox(l))); if (!ln) continue;
      const idx = wordsInBox(ln, b);
      if (idx.length) todo.push({ pg, d, ln, i0: Math.min(...idx), i1: Math.max(...idx) });
      else if (!ln.words?.length) todo.push({ pg, d, ln });
    }
  }
  if (!todo.length) return toast('No hay texto editable en la selección (si es un escaneo, usa OCR primero)', 4000);
  const cur = t => (t.a || t.ln)[prop];
  const on = value !== undefined ? value : !todo.every(t => cur(t));
  const fresh = new Map();
  if (todo.some(t => t.a)) pushHistory();
  for (const t of todo) {
    const a = t.a || Object.assign(t.i0 !== undefined ? wordEditFrom(t.d, t.pg, t.ln, t.i0, t.i1) : lineEditFrom(t.d, t.pg, t.ln), { id: nid('a') });
    if (prop === 'fsDelta') a.fs = Math.max(4, Math.round((a.fs + value) * 10) / 10); else a[prop] = on;
    fitWordEdit(a, a.text);
    if (!t.a) { const l = fresh.get(t.pg) || []; l.push(a); fresh.set(t.pg, l); }
  }
  [...new Set(todo.filter(t => t.a).map(t => t.pg.id))].forEach(id => annChanged(id));
  for (const [pg, list] of fresh) {
    const ok = await applyReal(pg, list.map(a => editRect(pg, a)), textMode(pg), () => list.forEach(a => { a.real = true; pg.annots.push(a); }));
    if (!ok) { list.forEach(a => pg.annots.push(a)); annChanged(pg.id); }
  }
  const names = { bold: 'Negrita', italic: 'Cursiva', family: 'Fuente', fsDelta: 'Tamaño' };
  toast(`${names[prop]} ${prop === 'bold' || prop === 'italic' ? (on ? 'aplicada' : 'quitada') : 'cambiado'}`);
}
// ---------- eliminar texto del PDF ----------
// Tapa las palabras con el color del fondo; si hay texto a su derecha en la misma línea,
// lo recoloca para que no quede un hueco.
function deleteEditFrom(d, pg, ln, i0, i1) {
  const whole = !ln.words?.length || (i0 === 0 && i1 === ln.words.length - 1);
  if (whole) return Object.assign(lineEditFrom(d, pg, ln), { text: '', deleted: true });
  const a = wordEditFrom(d, pg, ln, i0, i1), tail = a.tail.replace(/^\s+/, '');
  if (tail) { a.extended = true; a.text = tail; a.orig = a.orig + a.tail; a.w = a.lineX2 + 1.5 - a.x; } else a.text = '';
  a.deleted = true; return a;
}
async function deleteText(info) {
  const todo = [];
  for (const [pid, boxes] of info.byPage) {
    const pg = pageById(pid), d = pageDiv(pid); let lines;
    try { lines = await getLines(pg); } catch { continue; }
    for (const b of boxes) {
      const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const ex = pg.annots.find(a => a.type === 'textedit' && insideBox(c, a));
      if (ex) { if (!todo.some(t => t.a === ex)) todo.push({ pg, a: ex }); continue; }
      const ln = lines.find(l => insideBox(c, lineBox(l))); if (!ln) continue;
      const idx = wordsInBox(ln, b);
      if (idx.length) todo.push({ pg, d, ln, i0: Math.min(...idx), i1: Math.max(...idx) });
      else if (!ln.words?.length) todo.push({ pg, d, ln, i0: 0, i1: 0 });
    }
  }
  if (!todo.length) return toast('No hay texto que eliminar en la selección (si es un escaneo, usa OCR primero)', 4000);
  // ediciones anteriores dentro de la selección: se vacían
  const prev = todo.filter(t => t.a);
  if (prev.length) { pushHistory(); prev.forEach(t => { t.a.text = ''; t.a.deleted = true; annChanged(t.pg.id); }); }
  const byPg = new Map();
  todo.filter(t => !t.a).forEach(t => { const l = byPg.get(t.pg) || []; l.push(realDeletePlan(t.d, t.pg, t.ln, t.i0, t.i1)); byPg.set(t.pg, l); });
  let real = 0;
  for (const [pg, plans] of byPg) {
    const ok = await applyReal(pg, plans.map(x => x.rect), textMode(pg), () => plans.forEach(x => { if (x.annot) { x.annot.id = nid('a'); pg.annots.push(x.annot); } }));
    if (ok) real++;
    else { const d = pageDiv(pg.id); todo.filter(t => t.pg === pg && !t.a).forEach(t => pg.annots.push(Object.assign(deleteEditFrom(d, pg, t.ln, t.i0, t.i1), { id: nid('a') }))); annChanged(pg.id); }
  }
  if (real || !byPg.size) toast('Texto eliminado del PDF · Ctrl+Z para deshacer');
}
async function deleteTextAt(d, pg, pt, whole) {
  const ex = pg.annots.slice().reverse().find(a => a.type === 'textedit' && insideBox(pt, a));
  if (ex) { pushHistory(); ex.text = ''; ex.deleted = true; annChanged(pg.id); return toast('Texto eliminado · Ctrl+Z para deshacer'); }
  let lines;
  try { lines = lineCache.get(lineKey(pg)); if (!Array.isArray(lines)) lines = await getLines(pg); } catch { return toast('No se pudo leer el texto de esta página'); }
  const ln = lines.find(l => insideBox(pt, lineBox(l)));
  if (!ln) return toast(lines.length ? 'Aquí no hay texto' : 'Esta página no tiene texto (¿es un escaneo?). Usa OCR primero.', 3500);
  let i0 = 0, i1 = Math.max(0, (ln.words?.length || 1) - 1);
  if (!whole && ln.words?.length) {
    const i = ln.words.findIndex(w => pt.x >= w.x1 - 1.5 && pt.x <= w.x2 + 1.5);
    if (i < 0) return toast('Pon el ratón sobre una palabra');
    i0 = i1 = i;
  }
  $$('.hoverbox').forEach(h => h.remove());
  const plan = realDeletePlan(d, pg, ln, i0, i1);
  const ok = await applyReal(pg, [plan.rect], textMode(pg), () => { if (plan.annot) { plan.annot.id = nid('a'); pg.annots.push(plan.annot); } });
  if (!ok) { pushHistory(); pg.annots.push(Object.assign(deleteEditFrom(d, pg, ln, i0, i1), { id: nid('a') })); annChanged(pg.id); return; }
  toast((whole ? 'Línea eliminada' : 'Palabra eliminada') + ' del PDF · Ctrl+Z para deshacer');
}
async function selAction(kind, info = selCtx) {
  hideSelMenu(); closeMenus();
  if (!info) return;
  const clear = () => getSelection().removeAllRanges();
  switch (kind) {
    case 'copy': await navigator.clipboard.writeText(info.text).catch(() => document.execCommand('copy')); toast('Texto copiado'); return;
    case 'highlight': addMarkup(info, 'highlight', S.colors.highlight); break;
    case 'underline': addMarkup(info, 'underline', S.colors.default); break;
    case 'strike': addMarkup(info, 'strike', S.colors.default); break;
    case 'redact': addMarkup(info, 'redact', '#000000'); toast('Texto censurado: se elimina de verdad al guardar'); break;
    case 'comment': case 'note': {
      const txt = await askText(kind === 'comment' ? 'Comentario' : 'Nota sobre el texto', 'Escribe tu comentario…'); if (!txt) return;
      const a = addMarkup(info, kind === 'comment' ? 'highlight' : 'underline', kind === 'comment' ? S.colors.highlight : S.colors.default, { comment: txt });
      const { pid, last } = firstBox(info), pg = pageById(pid);
      pg.annots.push({ id: nid('a'), type: 'note', x: last.x + last.w + 10, y: last.y + 2, text: txt, color: '#fcd34d' }); annChanged(pid);
      break;
    }
    case 'replace': {
      const txt = await askText('Comentario para reemplazar texto', 'Texto nuevo…', info.text, 'Añadir'); if (txt === null) return;
      addMarkup(info, 'strike', '#dc2626');
      const { pid, last } = firstBox(info), pg = pageById(pid);
      pg.annots.push({ id: nid('a'), type: 'note', x: last.x + last.w + 10, y: last.y + 2, text: `Reemplazar «${info.text}» por «${txt}»`, color: '#fca5a5' }); annChanged(pid);
      break;
    }
    case 'delete': await deleteText(info); break;
    case 'bold': case 'italic': await styleLines(info, kind); break;
    case 'serif': await styleLines(info, 'family', 'Times'); break;
    case 'sans': await styleLines(info, 'family', 'Helvetica'); break;
    case 'mono': await styleLines(info, 'family', 'Courier'); break;
    case 'bigger': await styleLines(info, 'fsDelta', 1); break;
    case 'smaller': await styleLines(info, 'fsDelta', -1); break;
    case 'edit': {
      const { pid, box } = firstBox(info), pg = pageById(pid), d = pageDiv(pid), c = { x: box.x + box.w / 2, y: box.y + box.h / 2 }; clear();
      let lines; try { lines = await getLines(pg); } catch { lines = []; }
      const ln = lines.find(l => insideBox(c, lineBox(l))), idx = ln ? wordsInBox(ln, box) : [];
      if (!idx.length) return editLineAt(d, pg, { x: box.x + 2, y: c.y });
      return openLineEditor(d, pg, wordEditFrom(d, pg, ln, Math.min(...idx), Math.max(...idx)), true);
    }
    case 'export': download(new TextEncoder().encode(info.text), (S.name || 'texto') + '_seleccion.txt', 'text/plain;charset=utf-8'); toast('Texto exportado'); return;
    case 'search': $('[data-tab=search]').click(); $('#searchInput').value = info.text.slice(0, 80); $('#searchForm').requestSubmit(); return;
    case 'define': window.open('https://dle.rae.es/' + encodeURIComponent(info.text.split(/\s+/).slice(0, 3).join(' ')), '_blank', 'noopener'); return;
    case 'speak': speechSynthesis.cancel(); { const u = new SpeechSynthesisUtterance(info.text); u.lang = 'es-ES'; speechSynthesis.speak(u); } return;
    case 'whatsapp': window.open('https://wa.me/?text=' + encodeURIComponent(info.text), '_blank', 'noopener'); return;
  }
  clear();
}
// barra rápida al soltar el ratón con texto seleccionado
const SEL_ROW = [['comment', 'note', 'Comentario'], ['highlight', 'highlight', 'Resaltar'], ['underline', 'underline', 'Subrayar'], ['strike', 'strike', 'Tachar'], ['redact', 'redact', 'Censurar (redactar)'], '|', ['bold', 'bold', 'Negrita'], ['italic', 'italic', 'Cursiva']];
const SEL_LIST = [['copy', 'copy', 'Copiar texto', 'Ctrl+C'], ['edit', 'edittext', 'Editar texto'], ['delete', 'trash', 'Eliminar texto', 'Supr'], '-', ['search', 'search', 'Buscar en el documento'], ['define', 'book', 'Definir (RAE)'], ['speak', 'speak', 'Leer en voz alta'], ['whatsapp', 'share', 'Compartir en WhatsApp']];
$('#selMenu').innerHTML = `<div class="selrow">${SEL_ROW.map(b => b === '|' ? '<span class="vsep"></span>' : `<button data-sa="${b[0]}" title="${b[2]}"><i data-i="${b[1]}"></i></button>`).join('')}</div>` +
  SEL_LIST.map(b => b === '-' ? '<div class="msep"></div>' : `<button class="mitem" data-sa="${b[0]}"><i data-i="${b[1]}"></i><span>${b[2]}</span>${b[3] ? `<kbd>${b[3]}</kbd>` : ''}</button>`).join('');
paintIcons($('#selMenu'));
$('#viewer').addEventListener('mouseup', e => {
  if (S.tool !== 'select' || e.button !== 0) return;
  setTimeout(() => {
    const info = selectionInfo(); if (!info) return hideSelMenu();
    selCtx = info; closeMenus();
    const r = getSelection().getRangeAt(0).getBoundingClientRect(), m = $('#selMenu');
    m.classList.remove('hidden');
    const h = m.offsetHeight, w = m.offsetWidth;
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    m.style.top = (r.bottom + h + 10 < innerHeight ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + 'px';
  }, 10);
});
$('#selMenu').addEventListener('mousedown', e => e.preventDefault());
$('#selMenu').addEventListener('click', e => { const b = e.target.closest('[data-sa]'); if (b) selAction(b.dataset.sa); });

/* ---------- menús contextuales (clic derecho) ---------- */
// menuSubs: submenús abiertos, uno por nivel (un submenú puede tener otro dentro)
let menuRoot = null, menuSubs = [];
function closeSubs(from) { menuSubs.splice(from).forEach(m => m.remove()); }
function closeMenus() { menuRoot?.remove(); closeSubs(0); menuRoot = null; }
function buildMenu(items, level = 0) {
  const m = document.createElement('div'); m.className = 'ctxmenu';
  m.addEventListener('mousedown', e => e.preventDefault());
  for (const it of items) {
    if (!it) continue;
    if (it === '-') { m.insertAdjacentHTML('beforeend', '<div class="msep"></div>'); continue; }
    if (it.swatches) {
      const row = document.createElement('div'); row.className = 'mswatches';
      row.innerHTML = `<span class="mlabel">${esc(it.label)}</span>` + SWATCHES.map(c => `<span data-c="${c}" style="background:${c}" title="${c}"></span>`).join('');
      row.addEventListener('click', e => { const c = e.target.dataset.c; if (c) { closeMenus(); it.action(c); } });
      m.appendChild(row); continue;
    }
    const b = document.createElement('button'); b.className = 'mitem'; b.disabled = !!it.disabled;
    b.innerHTML = `<i data-i="${it.icon || 'blank'}"></i><span>${esc(it.label)}</span>${it.key ? `<kbd>${it.key}</kbd>` : ''}${it.sub ? '<i data-i="right" class="chev"></i>' : ''}`;
    if (it.danger) b.classList.add('danger');
    if (it.label && it.label.length > 38) b.title = it.label; // nombre completo al pasar el ratón
    if (it.sub) { b.addEventListener('mouseenter', () => openSub(b, it.sub, level)); b.addEventListener('click', e => { e.stopPropagation(); openSub(b, it.sub, level); }); }
    else {
      b.addEventListener('click', () => { closeMenus(); it.action(); });
      b.addEventListener('mouseenter', () => closeSubs(level)); // cierra solo los submenús más profundos
    }
    m.appendChild(b);
  }
  return m;
}
function placeMenu(m, x, y) {
  document.body.appendChild(m); paintIcons(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 6)) + 'px';
  m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 6)) + 'px';
}
function showMenu(x, y, items) { closeMenus(); hideSelMenu(); menuRoot = buildMenu(items, 0); placeMenu(menuRoot, x, y); }
function openSub(btn, items, level = 0) {
  if (menuSubs[level]?._from === btn) return; // ya está abierto
  closeSubs(level);
  const m = buildMenu(items, level + 1); m._from = btn; menuSubs[level] = m;
  const r = btn.getBoundingClientRect(); document.body.appendChild(m); paintIcons(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  // a la derecha si cabe; si no, a la izquierda; y si tampoco, pegado al borde (nunca fuera de la ventana)
  const left = r.right + w + 2 < innerWidth ? r.right + 2 : r.left - w - 2 >= 4 ? r.left - w - 2 : Math.max(4, innerWidth - w - 4);
  m.style.left = left + 'px';
  m.style.top = Math.max(4, Math.min(r.top - 5, innerHeight - h - 6)) + 'px';
  if (h > innerHeight - 8) { m.style.top = '4px'; m.style.maxHeight = (innerHeight - 8) + 'px'; m.style.overflowY = 'auto'; } // menús muy largos: con barra
}
document.addEventListener('mousedown', e => { if (!e.target.closest('.ctxmenu')) closeMenus(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); }, true);
$('#viewer').addEventListener('scroll', closeMenus);
window.addEventListener('blur', closeMenus);

function selectionMenuItems(info) {
  const a = k => () => selAction(k, info);
  return [
    { label: 'Copiar', icon: 'copy', key: 'Ctrl+C', action: a('copy') },
    '-',
    { label: 'Editar texto', icon: 'edittext', action: a('edit') },
    { label: 'Eliminar texto', icon: 'trash', key: 'Supr', action: a('delete') },
    { label: 'Negrita, cursiva y más', icon: 'bold', sub: [
      { label: 'Negrita', icon: 'bold', action: a('bold') },
      { label: 'Cursiva', icon: 'italic', action: a('italic') },
      '-',
      { label: 'Fuente sans (Helvetica)', icon: 'text', action: a('sans') },
      { label: 'Fuente serif (Times)', icon: 'text', action: a('serif') },
      { label: 'Fuente mono (Courier)', icon: 'text', action: a('mono') },
      '-',
      { label: 'Aumentar tamaño', icon: 'plus', action: a('bigger') },
      { label: 'Reducir tamaño', icon: 'minus', action: a('smaller') }
    ] },
    { label: 'Exportar el texto seleccionado', icon: 'download', action: a('export') },
    '-',
    { label: 'Texto censurado', icon: 'redact', action: a('redact') },
    '-',
    { label: 'Resaltar texto', icon: 'highlight', action: a('highlight') },
    { label: 'Subrayar texto', icon: 'underline', action: a('underline') },
    { label: 'Texto tachado', icon: 'strike', action: a('strike') },
    { label: 'Añadir comentario para reemplazar texto', icon: 'replace', action: a('replace') },
    { label: 'Agregar nota al texto', icon: 'note', action: a('note') },
    '-',
    { label: 'Buscar en el documento', icon: 'search', action: a('search') },
    { label: 'Definir (RAE)', icon: 'book', action: a('define') },
    { label: 'Leer en voz alta', icon: 'speak', action: a('speak') }
  ];
}
function annotationMenuItems(pg, a) {
  const editable = ['text', 'textedit', 'note'].includes(a.type);
  const reorder = toFront => { pushHistory(); pg.annots = pg.annots.filter(x => x !== a); toFront ? pg.annots.push(a) : pg.annots.unshift(a); annChanged(pg.id); };
  const edit = () => {
    const d = pageDiv(pg.id);
    if (a.type === 'textedit' && !a.angle) return openLineEditor(d, pg, a, false);
    if (a.type === 'text' && !a.angle) return openTextEditor(d, pg, null, a);
    askText(a.type === 'note' ? 'Editar nota' : 'Editar texto', '', a.text).then(t => { if (t !== null) { pushHistory(); a.text = t; annChanged(pg.id); } });
  };
  return [
    ...(a.type === 'image' ? imageAnnotItems(pg, a) : []),
    editable && { label: a.type === 'note' ? 'Editar nota' : 'Editar texto', icon: 'edittext', action: edit },
    (a.text || a.comment) && { label: 'Copiar texto', icon: 'copy', action: () => { navigator.clipboard.writeText(a.comment || a.text); toast('Texto copiado'); } },
    ...(window.FX?.annItems?.(pg, a) || []),
    a.type === 'textedit' && !a.real && { label: 'Restaurar texto original', icon: 'undo', action: () => { pushHistory(); pg.annots = pg.annots.filter(x => x !== a); S.sel = null; annChanged(pg.id); } },
    !['image', 'redact', 'note'].includes(a.type) && { label: 'Color', swatches: true, action: c => { pushHistory(); a.color = c; annChanged(pg.id); } },
    (a.type === 'text' || a.type === 'textedit') && { label: 'Estilo', icon: 'bold', sub: [
      { label: a.bold ? 'Quitar negrita' : 'Negrita', icon: 'bold', action: () => { pushHistory(); a.bold = !a.bold; annChanged(pg.id); } },
      { label: a.italic ? 'Quitar cursiva' : 'Cursiva', icon: 'italic', action: () => { pushHistory(); a.italic = !a.italic; annChanged(pg.id); } },
      '-',
      ...['Helvetica', 'Times', 'Courier'].map(f => ({ label: (a.family || 'Helvetica') === f ? `✓ ${f}` : f, icon: 'text', action: () => { pushHistory(); a.family = f; annChanged(pg.id); } })),
      '-',
      { label: 'Aumentar tamaño', icon: 'plus', action: () => { pushHistory(); a.fs += 1; annChanged(pg.id); } },
      { label: 'Reducir tamaño', icon: 'minus', action: () => { pushHistory(); a.fs = Math.max(4, a.fs - 1); annChanged(pg.id); } }
    ] },
    '-',
    a.type !== 'textedit' && { label: 'Duplicar', icon: 'copy', action: () => { const c = structuredClone(a); moveAnn(c, structuredClone(a), 12, 12); const n = addAnn(pg.id, c); select(pg.id, n.id); } },
    { label: 'Traer al frente', icon: 'up', action: () => reorder(true) },
    { label: 'Enviar atrás', icon: 'down', action: () => reorder(false) },
    '-',
    { label: 'Eliminar', icon: 'trash', key: 'Supr', danger: true, action: () => { S.sel = { page: pg.id, ann: a.id }; deleteSelected(); } }
  ];
}
function pageActions(pg) {
  const only = () => { S.selPages.clear(); S.selPages.add(pg.id); S.cur = pg.id; };
  return [
    { label: 'Girar a la derecha', icon: 'rotr', action: () => { only(); rotatePages(true); } },
    { label: 'Girar a la izquierda', icon: 'rotl', action: () => { only(); rotatePages(false); } },
    { label: 'Duplicar página', icon: 'copy', action: () => { only(); duplicatePages(); } },
    { label: 'Insertar página en blanco después', icon: 'fileplus', action: () => { only(); insertBlank(); } },
    { label: 'Extraer esta página…', icon: 'scissors', action: () => { only(); openExport({ scope: 'sel' }); } },
    '-',
    { label: 'Eliminar página', icon: 'trash', danger: true, action: () => { only(); deletePages(); } }
  ];
}
function pageMenuItems(d, pg, pt) {
  const im = findPdfImage(pg, pt), hasImgs = (pdfImgCache.get(lineKey(pg)) || []).length > 0, shs = shapesAt(pg, pt);
  return [
    im && pdfImageMenu(d, pg, im),
    shs.length > 0 && { label: 'Forma del PDF', icon: 'shape', sub: [
      { label: 'Eliminar esta forma', icon: 'trash', action: () => deleteShape(d, pg, shs[0]) },
      shs.length > 1 && { label: `Eliminar todas las formas aquí (${shs.length})`, icon: 'trash', action: () => deleteShapesAt(d, pg, pt) }
    ] },
    (im || shs.length > 0) && '-',
    { label: 'Editar palabra aquí', icon: 'edittext', action: () => editLineAt(d, pg, pt) },
    { label: 'Editar línea completa aquí', icon: 'edittext', action: () => editLineAt(d, pg, pt, true) },
    { label: 'Editar párrafo aquí (reajusta las líneas)', icon: 'edittext', action: () => FX.editParagraphAt(d, pg, pt) },
    { label: 'Eliminar palabra aquí', icon: 'trash', action: () => deleteTextAt(d, pg, pt, false) },
    { label: 'Eliminar línea de texto aquí', icon: 'trash', action: () => deleteTextAt(d, pg, pt, true) },
    { label: 'Añadir texto aquí', icon: 'text', action: () => openTextEditor(d, pg, pt) },
    { label: 'Añadir nota aquí', icon: 'note', action: () => askText('Nueva nota', 'Escribe tu nota…').then(t => t && addAnn(pg.id, { type: 'note', x: pt.x, y: pt.y, text: t, color: '#fcd34d' })) },
    { label: 'Firmar aquí…', icon: 'sign', action: () => { S.placeAt = { page: pg.id, pt }; openSignature(); } },
    { label: 'Insertar imagen aquí…', icon: 'image', action: () => { S.placeAt = { page: pg.id, pt }; $('#fileImage').click(); } },
    '-',
    { label: 'Seleccionar el texto de la página', icon: 'cursor', action: () => { setTool('select'); const r = document.createRange(); r.selectNodeContents(d.querySelector('.textLayer')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } },
    { label: 'Copiar el texto de la página', icon: 'copy', action: async () => { const t = await pageText(pg); await navigator.clipboard.writeText(t); toast(t.trim() ? 'Texto de la página copiado' : 'La página no tiene texto (prueba el OCR)'); } },
    { label: 'Reconocer texto (OCR)…', icon: 'scan', action: () => { S.cur = pg.id; openOcr(); } },
    hasImgs && { label: 'Descargar todas las imágenes de la página', icon: 'download', action: () => extractAllImages(pg) },
    '-',
    { label: 'Página', icon: 'pages', sub: pageActions(pg) },
    '-',
    { label: 'Acercar', icon: 'plus', key: 'Ctrl +', action: ACTIONS.zoomIn },
    { label: 'Alejar', icon: 'minus', key: 'Ctrl -', action: ACTIONS.zoomOut },
    { label: 'Ajustar al ancho', icon: 'pages', action: () => setZoom('fitw') },
    '-',
    { label: 'Deshacer', icon: 'undo', key: 'Ctrl+Z', disabled: !S.history.length, action: undo },
    { label: 'Imprimir…', icon: 'print', key: 'Ctrl+P', action: printDoc }
  ];
}
$('#viewer').addEventListener('contextmenu', e => {
  const d = e.target.closest('.page'); if (!d) return;
  e.preventDefault(); closeEditor();
  const pg = pageById(d.dataset.id), pt = toPt(e, d);
  const info = selectionInfo();
  if (info) { selCtx = info; return showMenu(e.clientX, e.clientY, selectionMenuItems(info)); }
  const annEl = e.target.closest('[data-ann]');
  if (annEl) {
    const a = pg.annots.find(x => x.id === annEl.dataset.ann);
    if (a) { if (S.tool !== 'select') setTool('select'); select(pg.id, a.id); return showMenu(e.clientX, e.clientY, annotationMenuItems(pg, a)); }
  }
  S.cur = pg.id; updatePageIndicator();
  showMenu(e.clientX, e.clientY, pageMenuItems(d, pg, pt));
});
$('#thumbs').addEventListener('contextmenu', e => {
  const el = e.target.closest('.thumb'); if (!el) return;
  e.preventDefault();
  const id = el.dataset.id;
  if (!S.selPages.has(id)) { S.selPages.clear(); S.selPages.add(id); }
  S.cur = id; $$('.thumb').forEach(t => t.classList.toggle('sel', S.selPages.has(t.dataset.id)));
  const n = S.selPages.size;
  showMenu(e.clientX, e.clientY, [
    { label: 'Girar a la derecha', icon: 'rotr', action: () => rotatePages(true) },
    { label: 'Girar a la izquierda', icon: 'rotl', action: () => rotatePages(false) },
    { label: n > 1 ? `Duplicar ${n} páginas` : 'Duplicar', icon: 'copy', action: duplicatePages },
    { label: 'Insertar página en blanco después', icon: 'fileplus', action: insertBlank },
    { label: n > 1 ? `Extraer ${n} páginas…` : 'Extraer…', icon: 'scissors', action: () => openExport({ scope: 'sel' }) },
    { label: 'Reconocer texto (OCR)…', icon: 'scan', action: openOcr },
    '-',
    { label: n > 1 ? `Eliminar ${n} páginas` : 'Eliminar', icon: 'trash', danger: true, action: deletePages }
  ]);
});

/* ---------- propiedades ---------- */
function syncPropsUI() {
  $('#colorInput').value = curColor(); $('#widthInput').value = S.width; $('#widthOut').value = S.width;
  $('#fontInput').value = S.fontSize; $('#famInput').value = S.family; $('#boldInput').checked = S.bold; $('#italicInput').checked = S.italic; $('#opacityInput').value = Math.round(S.opacity * 100); $('#fillInput').checked = S.fill;
  $$('#swatches span').forEach(s => s.classList.toggle('on', s.dataset.c === curColor()));
}
function syncPropsFrom(a) {
  if (a.color && a.type !== 'note') { if (a.type === 'highlight') S.colors.highlight = a.color; else S.colors.default = a.color; }
  $('#colorInput').value = a.color || curColor();
  if (a.width) { $('#widthInput').value = a.width; $('#widthOut').value = a.width; }
  if (a.fs) { const fi = $('#fontInput'), v = String(Math.round(a.fs)); if (![...fi.options].some(o => o.value === v)) fi.add(new Option(v, v)); fi.value = v; }
  if (a.family) { $('#famInput').value = a.family; $('#boldInput').checked = !!a.bold; $('#italicInput').checked = !!a.italic; }
  $$('#swatches span').forEach(s => s.classList.toggle('on', s.dataset.c === a.color));
}
function applyToSelected(fn) {
  const a = findAnn(S.sel); if (!a) return; pushHistory(); fn(a); annChanged(S.sel.page);
}
function setColor(c) {
  if (S.tool === 'highlight') S.colors.highlight = c; else S.colors.default = c;
  applyToSelected(a => { if (a.type !== 'redact' && a.type !== 'image') a.color = c; });
  syncPropsUI(); if (S.sel) syncPropsFrom(findAnn(S.sel) || {});
}
$('#swatches').innerHTML = SWATCHES.map(c => `<span data-c="${c}" style="background:${c}" title="${c}"></span>`).join('');
$('#swatches').addEventListener('click', e => { if (e.target.dataset.c) setColor(e.target.dataset.c); });
$('#colorInput').addEventListener('input', e => setColor(e.target.value));
$('#widthInput').addEventListener('input', e => { S.width = +e.target.value; $('#widthOut').value = S.width; });
$('#widthInput').addEventListener('change', () => applyToSelected(a => { if ('width' in a) a.width = S.width; }));
$('#fontInput').addEventListener('change', e => { S.fontSize = +e.target.value; applyToSelected(a => { if (a.type === 'text' || a.type === 'textedit') a.fs = S.fontSize; }); });
$('#famInput').addEventListener('change', e => { S.family = e.target.value; applyToSelected(a => { if (a.type === 'text' || a.type === 'textedit') a.family = S.family; }); });
$('#boldInput').addEventListener('change', e => { S.bold = e.target.checked; applyToSelected(a => { if (a.type === 'text' || a.type === 'textedit') a.bold = S.bold; }); });
$('#italicInput').addEventListener('change', e => { S.italic = e.target.checked; applyToSelected(a => { if (a.type === 'text' || a.type === 'textedit') a.italic = S.italic; }); });
$('#opacityInput').addEventListener('change', e => { S.opacity = e.target.value / 100; applyToSelected(a => { if ('opacity' in a) a.opacity = S.opacity; }); });
$('#fillInput').addEventListener('change', e => { S.fill = e.target.checked; applyToSelected(a => { if (a.type === 'rect' || a.type === 'ellipse') a.fill = S.fill; }); });

/* ---------- miniaturas y gestión de páginas ---------- */
let thumbQueue = Promise.resolve();
function buildThumbs() {
  const box = $('#thumbs'); box.innerHTML = '';
  S.pages.forEach((pg, i) => {
    const g = geom(pg), w = 120, h = Math.round(w * g.dh / g.dw);
    const el = document.createElement('div'); el.className = 'thumb'; el.dataset.id = pg.id; el.draggable = true;
    el.classList.toggle('sel', S.selPages.has(pg.id)); el.classList.toggle('cur', S.cur === pg.id);
    el.innerHTML = `<div class="tw" style="width:${w}px;height:${h}px"><canvas width="${w * 2}" height="${h * 2}" style="width:${w}px;height:${h}px"></canvas><svg viewBox="0 0 ${g.dw} ${g.dh}" preserveAspectRatio="none"></svg></div><div class="n">${i + 1}</div>`;
    box.appendChild(el); updateThumbOverlay(pg.id);
    const key = `${pg.src}:${pg.idx}:${g.R}`, canvas = el.querySelector('canvas');
    if (S.thumbCache.has(key)) canvas.getContext('2d').drawImage(S.thumbCache.get(key), 0, 0, canvas.width, canvas.height);
    else thumbQueue = thumbQueue.then(async () => {
      if (!canvas.isConnected) return;
      const p = await src(pg.src).pdf.getPage(pg.idx + 1), vp = p.getViewport({ scale: (w * 2) / g.dw, rotation: g.R });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      S.thumbCache.set(key, c); canvas.getContext('2d').drawImage(c, 0, 0, canvas.width, canvas.height);
    }).catch(() => { });
  });
}
function updateThumbOverlay(pageId) {
  const el = document.querySelector(`.thumb[data-id="${pageId}"] svg`), pg = pageById(pageId);
  if (el && pg) el.innerHTML = pg.annots.map(a => annMarkup(a, false)).join('');
}
let lastClicked = null;
$('#thumbs').addEventListener('click', e => {
  const el = e.target.closest('.thumb'); if (!el) return; const id = el.dataset.id;
  if (e.ctrlKey || e.metaKey) { S.selPages.has(id) ? S.selPages.delete(id) : S.selPages.add(id); }
  else if (e.shiftKey && lastClicked) {
    const ids = S.pages.map(p => p.id), a = ids.indexOf(lastClicked), b = ids.indexOf(id);
    ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => S.selPages.add(x));
  } else { S.selPages.clear(); S.selPages.add(id); scrollToPage(id); }
  lastClicked = id;
  $$('.thumb').forEach(t => t.classList.toggle('sel', S.selPages.has(t.dataset.id)));
});
let dragId = null;
$('#thumbs').addEventListener('dragstart', e => { const el = e.target.closest('.thumb'); dragId = el?.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
$('#thumbs').addEventListener('dragover', e => {
  if (!dragId) return; e.preventDefault();
  $$('.thumb').forEach(t => t.classList.remove('drop-before', 'drop-after'));
  const el = e.target.closest('.thumb'); if (!el || el.dataset.id === dragId) return;
  const r = el.getBoundingClientRect(); el.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
});
$('#thumbs').addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation();
  const el = $('.thumb.drop-before, .thumb.drop-after'); if (!el || !dragId) return;
  const after = el.classList.contains('drop-after'), targetId = el.dataset.id;
  const ids = S.selPages.has(dragId) ? S.pages.filter(p => S.selPages.has(p.id)).map(p => p.id) : [dragId];
  if (ids.includes(targetId)) return;
  pushHistory();
  const moving = S.pages.filter(p => ids.includes(p.id)), rest = S.pages.filter(p => !ids.includes(p.id));
  const at = rest.findIndex(p => p.id === targetId) + (after ? 1 : 0);
  rest.splice(at, 0, ...moving); S.pages = rest; dragId = null; rebuild();
});
$('#thumbs').addEventListener('dragend', () => { dragId = null; $$('.thumb').forEach(t => t.classList.remove('drop-before', 'drop-after')); });

function targetPages() { const s = S.pages.filter(p => S.selPages.has(p.id)); return s.length ? s : S.pages.filter(p => p.id === S.cur); }
function rotatePages(cw) {
  const list = targetPages(); if (!list.length) return; pushHistory();
  list.forEach(pg => { const g = geom(pg); pg.annots.forEach(a => rotateAnn(a, cw, g.dw, g.dh)); pg.rot = (pg.rot + (cw ? 90 : 270)) % 360; });
  rebuild();
}
function deletePages() {
  const list = targetPages(); if (!list.length) return;
  if (list.length === S.pages.length) return toast('No puedes eliminar todas las páginas');
  if (!confirm(`¿Eliminar ${list.length} página(s)?`)) return;
  pushHistory(); const ids = new Set(list.map(p => p.id));
  S.pages = S.pages.filter(p => !ids.has(p.id)); S.selPages.clear(); rebuild();
}
function duplicatePages() {
  const list = targetPages(); if (!list.length) return; pushHistory();
  const last = S.pages.indexOf(list[list.length - 1]);
  const copies = list.map(p => ({ ...structuredClone(p), id: nid('p'), annots: p.annots.map(a => ({ ...structuredClone(a), id: nid('a') })) }));
  S.pages.splice(last + 1, 0, ...copies); rebuild();
}
async function insertBlank() {
  const ref = pageById(S.cur), g = ref ? geom(ref) : { dw: 595.28, dh: 841.89 };
  const s = await addSource(await blankPdf(g.dw, g.dh), 'En blanco'); pushHistory();
  const at = ref ? S.pages.indexOf(ref) + 1 : S.pages.length, pg = { id: nid('p'), src: s.id, idx: 0, rot: 0, annots: [] };
  S.pages.splice(at, 0, pg); S.cur = pg.id; rebuild();
}

/* ---------- navegación ---------- */
function scrollToPage(id, smooth = false) {
  const d = pageDiv(id), v = $('#viewer');
  if (d) {
    const vr = v.getBoundingClientRect(), r = d.getBoundingClientRect(), o = { top: Math.max(0, v.scrollTop + r.top - vr.top - 12), behavior: smooth ? 'smooth' : 'auto' };
    if (r.left < vr.left || r.right > vr.right) o.left = Math.max(0, v.scrollLeft + r.left - vr.left - 12); // vistas en horizontal
    jumpUntil = performance.now() + 250; v.scrollTo(o);
  }
  S.cur = id; updatePageIndicator();
}
function updatePageIndicator() {
  const i = S.pages.findIndex(p => p.id === S.cur);
  const inp = $('#pageInput');
  if (!pageDirty) { inp.value = i + 1 || 0; if (document.activeElement === inp) inp.select(); } // no pisar un número a medio escribir
  $$('.thumb').forEach(t => t.classList.toggle('cur', t.dataset.id === S.cur));
}
let scrollRaf; var jumpUntil = 0;
$('#viewer').addEventListener('scroll', () => {
  cancelAnimationFrame(scrollRaf);
  scrollRaf = requestAnimationFrame(() => {
    if (performance.now() < jumpUntil) { hideSelMenu(); return; } // recién saltó a una página: se respeta la elegida
    // página actual = la primera que muestra al menos media página (o media ventana)
    const vr = $('#viewer').getBoundingClientRect();
    const d = $$('.page').find(p => { const r = p.getBoundingClientRect(); return r.bottom > vr.top + Math.min(r.height * 0.5, vr.height * 0.5); });
    if (d && d.dataset.id !== S.cur) {
      S.cur = d.dataset.id; updatePageIndicator();
      document.querySelector(`.thumb[data-id="${S.cur}"]`)?.scrollIntoView({ block: 'nearest' });
    }
    hideSelMenu();
  });
});
// ir a una página escribiendo su número: el primer dígito siempre reemplaza al número que había
const pageIn = $('#pageInput');
// pageDirty = hay un número escrito que todavía no se ha aplicado
let pageTyping; var pageDirty = false;
const pageGo = (now = false) => {
  clearTimeout(pageTyping);
  const n = parseInt(pageIn.value, 10);
  if (!n || !S.pages.length) { if (now) { pageDirty = false; updatePageIndicator(); } return; }
  const k = Math.min(Math.max(n, 1), S.pages.length); // un número mayor lleva a la última
  const go = () => { pageDirty = false; scrollToPage(S.pages[k - 1].id); };
  if (now) go(); else pageTyping = setTimeout(go, 500);
};
pageIn.addEventListener('change', () => { if (pageDirty) pageGo(true); });
pageIn.addEventListener('input', () => { pageIn.value = pageIn.value.replace(/\D/g, '').slice(0, 5); pageDirty = true; pageGo(); });
pageIn.addEventListener('keydown', e => {
  e.stopPropagation();
  // la primera cifra reemplaza al número mostrado, aunque no estuviera seleccionado
  if (/^\d$/.test(e.key) && !pageDirty && !e.ctrlKey && !e.altKey) { e.preventDefault(); pageIn.value = e.key; pageDirty = true; pageGo(); return; }
  if (e.key === 'Enter') { e.preventDefault(); pageGo(true); }
  if (e.key === 'Escape') { pageDirty = false; clearTimeout(pageTyping); updatePageIndicator(); pageIn.blur(); }
});
for (const ev of ['focus', 'click']) pageIn.addEventListener(ev, () => { if (!pageDirty) pageIn.select(); });
pageIn.addEventListener('blur', () => { if (pageDirty) pageGo(true); });
function step(d) {
  let i = Math.max(0, S.pages.findIndex(p => p.id === S.cur));
  const per = $('#pages').classList.contains('two') ? 2 : 1;
  i = (Math.floor(i / per) + d) * per;
  if (i < 0 || i >= S.pages.length) return;
  scrollToPage(S.pages[i].id);
}
$('#viewer').addEventListener('wheel', e => {
  if (!e.ctrlKey || !S.pages.length) return; e.preventDefault();
  setZoom('custom', S.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });
$('#zoomSel').addEventListener('change', e => { const v = e.target.value; if (v === 'fitw' || v === 'fitp') setZoom(v); else if (v !== 'custom') setZoom('custom', +v); });
let resizeT; window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (S.zoomMode !== 'custom') rerenderAll(); }, 200); });

/* ---------- comentarios ---------- */
const TYPE_LABEL = { cover: 'Imagen eliminada', textedit: 'Texto editado', highlight: 'Resaltado', underline: 'Subrayado', strike: 'Tachado', text: 'Texto', ink: 'Dibujo', rect: 'Rectángulo', ellipse: 'Elipse', line: 'Línea', arrow: 'Flecha', note: 'Nota', image: 'Imagen', redact: 'Redacción' };
let cmtT; function buildCommentsSoon() { clearTimeout(cmtT); cmtT = setTimeout(buildComments, 150); }
function buildComments() {
  const box = $('#commentList'); let html = '';
  S.pages.forEach((pg, i) => pg.annots.forEach(a => {
    const label = a.type === 'image' ? (a.label || 'Imagen') : a.deleted ? 'Texto eliminado' : a.type === 'cover' ? (a.label || TYPE_LABEL.cover) : TYPE_LABEL[a.type];
    const shown = a.deleted ? `«${a.orig}»` : a.text;
    html += `<div class="citem" data-p="${pg.id}" data-a="${a.id}"><span class="dot" style="background:${a.type === 'redact' ? '#000' : a.color || '#999'}"></span><div class="body"><small>Pág. ${i + 1} · ${label}</small>${shown ? `<p${a.deleted ? ' style="text-decoration:line-through"' : ''}>${esc(shown)}</p>` : ''}</div><button data-del title="Eliminar"><i data-i="x"></i></button></div>`;
  }));
  box.innerHTML = html || '<p class="hint">Aún no hay anotaciones. Usa las herramientas de arriba o selecciona texto para resaltarlo.</p>';
  paintIcons(box);
}
$('#commentList').addEventListener('click', e => {
  const it = e.target.closest('.citem'); if (!it) return;
  if (e.target.closest('[data-del]')) { S.sel = { page: it.dataset.p, ann: it.dataset.a }; deleteSelected(); return; }
  setTool('select'); scrollToPage(it.dataset.p); select(it.dataset.p, it.dataset.a);
});

/* ---------- búsqueda ---------- */
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
async function pageText(pg) {
  const key = `${pg.src}:${pg.idx}`;
  if (!S.textCache.has(key)) {
    const p = await src(pg.src).pdf.getPage(pg.idx + 1), tc = await p.getTextContent();
    S.textCache.set(key, tc.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join(''));
  }
  return S.textCache.get(key) + ocrLines(pg).map(l => '\n' + l.str).join('');
}
$('#searchForm').addEventListener('submit', async e => {
  e.preventDefault(); const q = $('#searchInput').value.trim(); S.query = q;
  const out = $('#searchResults'); out.innerHTML = ''; $$('.textLayer').forEach(markHits);
  if (!q) { $('#searchInfo').textContent = ''; return; }
  const nq = norm(q); let total = 0, html = '';
  for (let i = 0; i < S.pages.length; i++) {
    const t = await pageText(S.pages[i]), nt = norm(t); let k = nt.indexOf(nq);
    while (k !== -1 && total < 500) {
      total++;
      const a = Math.max(0, k - 30), b = Math.min(t.length, k + nq.length + 40);
      html += `<div class="sres" data-p="${S.pages[i].id}"><small>Página ${i + 1}</small><div>${a ? '…' : ''}${esc(t.slice(a, k))}<mark>${esc(t.slice(k, k + nq.length))}</mark>${esc(t.slice(k + nq.length, b))}…</div></div>`;
      k = nt.indexOf(nq, k + nq.length);
    }
  }
  $('#searchInfo').textContent = total ? `${total} resultado(s)` : 'Sin resultados (si es un escaneo, el PDF no tiene texto).';
  out.innerHTML = html;
});
$('#searchResults').addEventListener('click', e => { const r = e.target.closest('.sres'); if (r) scrollToPage(r.dataset.p); });
function markHits(tl) {
  const q = norm(S.query || '');
  tl.querySelectorAll('span').forEach(s => s.classList.toggle('hit', !!q && norm(s.textContent).includes(q)));
}

/* ---------- formularios ---------- */
function buildForm() {
  const box = $('#formFields'); let html = '';
  S.sources.forEach(s => {
    if (!s.fields.length || !S.pages.some(p => p.src === s.id)) return;
    html += `<p class="hint"><b>${esc(s.name)}</b></p>`;
    s.fields.forEach((f, i) => {
      const v = f.name in s.formValues ? s.formValues[f.name] : f.value, at = `data-s="${s.id}" data-f="${i}"`;
      html += `<div class="field"><label>${esc(f.name)}</label>`;
      if (f.type === 'text') html += f.multi ? `<textarea ${at} rows="3">${esc(v)}</textarea>` : `<input type="text" ${at} value="${esc(v)}">`;
      else if (f.type === 'check') html += `<input type="checkbox" ${at} ${v ? 'checked' : ''}>`;
      else html += `<select ${at}><option value=""></option>${f.options.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      html += '</div>';
    });
  });
  box.innerHTML = html ? html + '<p class="hint">Los valores se escriben en el PDF al guardar (el formulario queda aplanado).</p>' : '<p class="hint">Este documento no tiene campos de formulario. Usa la herramienta Texto (T) para escribir sobre cualquier PDF.</p>';
}
$('#formFields').addEventListener('input', e => {
  const el = e.target; if (!el.dataset.s) return;
  const s = src(el.dataset.s), f = s.fields[+el.dataset.f];
  s.formValues[f.name] = el.type === 'checkbox' ? el.checked : el.value; S.dirty = true; scheduleSave();
});

/* ---------- firma ---------- */
function getSigs() { try { return JSON.parse(localStorage.getItem('folio.sigs') || '[]'); } catch { return []; } }
function trimCanvas(c) {
  const ctx = c.getContext('2d'), { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x1 = width, y1 = height, x2 = -1, y2 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 10) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  if (x2 < 0) return null;
  const o = document.createElement('canvas'); o.width = x2 - x1 + 8; o.height = y2 - y1 + 8;
  o.getContext('2d').drawImage(c, x1 - 4, y1 - 4, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}
function placeImage(data, pxW, pxH, label, targetW = 160) {
  const w = Math.min(targetW, pxW * 0.75), h = w * pxH / pxW;
  if (S.placeAt && pageById(S.placeAt.page)) {
    const { page, pt } = S.placeAt; S.placeAt = null; setTool('select');
    const a = addAnn(page, { type: 'image', ax: pt.x, ay: pt.y - h / 2, w, h, angle: 0, img: putBlob(data), opacity: 1, label }); select(page, a.id); return;
  }
  S.pending = { img: putBlob(data), w, h, label }; setTool('place'); toast('Haz clic en la página donde quieras colocarla');
}
function openSignature() {
  if (!S.pages.length) return toast('Abre un documento primero');
  const sigs = getSigs();
  openModal(`<h2>Firmar</h2>
  <div class="sigtabs"><button class="active" data-st="draw">Dibujar</button><button data-st="type">Escribir</button><button data-st="upload">Subir imagen</button></div>
  <div data-sp="draw"><canvas id="sigPad"></canvas><div class="row" style="margin-top:8px"><label>Color</label>
    <select id="sigColor"><option value="#111827">Negro</option><option value="#1d4ed8">Azul</option><option value="#b91c1c">Rojo</option></select><button id="sigClear">Limpiar</button></div></div>
  <div data-sp="type" class="hidden"><div class="row"><input type="text" id="typedSig" placeholder="Tu nombre" style="width:100%"></div></div>
  <div data-sp="upload" class="hidden"><div class="row"><input type="file" id="sigFile" accept="image/*"></div><p class="hint">Consejo: una imagen PNG con fondo transparente queda mejor.</p></div>
  ${sigs.length ? `<fieldset><legend>Firmas guardadas</legend><div class="saved-sigs">${sigs.map((s, i) => `<div data-sig="${i}"><img src="${s}"><b data-delsig="${i}">×</b></div>`).join('')}</div></fieldset>` : ''}
  <div class="row"><label><input type="checkbox" id="sigSave" checked> Guardar esta firma en este navegador</label></div>
  <div class="actions"><button data-close>Cancelar</button><button class="primary" id="sigOk">Colocar firma</button></div>`);
  const pad = $('#sigPad'), ctx = pad.getContext('2d'); let mode = 'draw', drawing = false, has = false;
  const dpr = 2; pad.width = pad.clientWidth * dpr; pad.height = pad.clientHeight * dpr; ctx.scale(dpr, dpr);
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = 2.4;
  pad.onpointerdown = e => { drawing = true; has = true; pad.setPointerCapture(e.pointerId); ctx.strokeStyle = $('#sigColor').value; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
  pad.onpointermove = e => { if (!drawing) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); };
  pad.onpointerup = () => drawing = false;
  $('#sigClear').onclick = () => { ctx.clearRect(0, 0, pad.width, pad.height); has = false; };
  $$('[data-st]').forEach(b => b.onclick = () => { mode = b.dataset.st; $$('[data-st]').forEach(x => x.classList.toggle('active', x === b)); $$('[data-sp]').forEach(p => p.classList.toggle('hidden', p.dataset.sp !== mode)); });
  $('#modalCard').addEventListener('click', e => {
    if (e.target.dataset.delsig) { e.stopPropagation(); const s = getSigs(); s.splice(+e.target.dataset.delsig, 1); localStorage.setItem('folio.sigs', JSON.stringify(s)); closeModal(); openSignature(); return; }
    const sd = e.target.closest('[data-sig]'); if (sd) { const img = sd.querySelector('img'); closeModal(); placeImage(img.src, img.naturalWidth, img.naturalHeight, 'Firma'); }
  });
  $('#sigOk').onclick = async () => {
    let c;
    if (mode === 'draw') { if (!has) return toast('Dibuja tu firma primero'); c = trimCanvas(pad); }
    else if (mode === 'type') {
      const t = $('#typedSig').value.trim(); if (!t) return toast('Escribe tu nombre');
      c = document.createElement('canvas'); c.width = 1200; c.height = 260; const x = c.getContext('2d');
      x.font = '140px "Brush Script MT","Segoe Script","Lucida Handwriting",cursive'; x.fillStyle = $('#sigColor').value; x.textBaseline = 'middle'; x.fillText(t, 20, 130);
      c = trimCanvas(c);
    } else {
      const f = $('#sigFile').files[0]; if (!f) return toast('Elige una imagen');
      const r = await imageToPng(f, 1200), img = new Image(); img.src = r.dataUrl; await img.decode();
      c = document.createElement('canvas'); c.width = r.w; c.height = r.h; c.getContext('2d').drawImage(img, 0, 0);
    }
    if (!c) return;
    const data = c.toDataURL('image/png');
    if ($('#sigSave').checked) { const s = getSigs(); s.unshift(data); localStorage.setItem('folio.sigs', JSON.stringify(s.slice(0, 6))); }
    closeModal(); placeImage(data, c.width, c.height, 'Firma');
  };
}

/* ---------- modal ---------- */
function openModal(html) { $('#modalCard').innerHTML = html; $('#modal').classList.remove('hidden'); paintIcons($('#modalCard')); }
let modalOnClose = null;
function closeModal() { $('#modalCard').classList.remove('wide'); $('#modal').classList.add('hidden'); $('#modalCard').innerHTML = ''; if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); } }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });

/* ---------- exportación ---------- */
function parseRange(str, n) {
  const out = [];
  for (const part of str.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)?\s*-\s*(\d+)?$/);
    if (m) { const a = +(m[1] || 1), b = +(m[2] || n); for (let i = a; i <= Math.min(b, n); i++) out.push(i - 1); }
    else if (/^\d+$/.test(part) && +part >= 1 && +part <= n) out.push(+part - 1);
  }
  return [...new Set(out)];
}
function safeText(font, s) {
  try { font.encodeText(s); return s; } catch { return [...s].map(ch => { try { font.encodeText(ch); return ch; } catch { return '?'; } }).join(''); }
}
async function annotsToCanvasImage(pg, g, w, h, skipNotes = true) {
  const markup = pg.annots.filter(a => !(skipNotes && a.type === 'note')).map(a => annMarkup(a, false)).join('');
  if (!markup) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${g.dw} ${g.dh}" preserveAspectRatio="none">${markup}</svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode(); return img;
}
async function rasterizePage(pg, quality, scale) {
  const g = geom(pg), p = await src(pg.src).pdf.getPage(pg.idx + 1), vp = p.getViewport({ scale, rotation: g.R });
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await p.render({ canvasContext: ctx, viewport: vp }).promise;
  const ov = await annotsToCanvasImage(pg, g, c.width, c.height); if (ov) ctx.drawImage(ov, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
  return new Uint8Array(await blob.arrayBuffer());
}
function drawDisplayText(page, ctx, str, u, v, size, angle, font, color, opacity) {
  const p = mapPt(ctx, u, v);
  page.drawText(safeText(font, str), { x: p.x, y: p.y, size, font, color, opacity, rotate: degrees(ctx.R - angle) });
}
async function drawAnnotsPdf(out, page, pg, ctx, fonts, imgCache, onlyNotes) {
  for (const a of pg.annots) {
    if (onlyNotes && a.type !== 'note') continue;
    const color = a.color ? hexToRgb(a.color) : rgb(0, 0, 0), opacity = a.opacity ?? 1;
    const rectOf = () => { const p1 = mapPt(ctx, a.x, a.y), p2 = mapPt(ctx, a.x + a.w, a.y + a.h); return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p1.x - p2.x), height: Math.abs(p1.y - p2.y) }; };
    const seg = (p1, p2, thickness) => { const s = mapPt(ctx, p1[0], p1[1]), e = mapPt(ctx, p2[0], p2[1]); page.drawLine({ start: s, end: e, thickness, color, opacity, lineCap: LineCapStyle.Round }); };
    switch (a.type) {
      case 'highlight': page.drawRectangle({ ...rectOf(), color, opacity: 0.38, blendMode: BlendMode.Multiply }); break;
      case 'redact': page.drawRectangle({ ...rectOf(), color: rgb(0, 0, 0) }); break;
      case 'cover': page.drawRectangle({ ...rectOf(), color: hexToRgb(a.bg) }); break;
      case 'rect': page.drawRectangle({ ...rectOf(), borderColor: color, borderWidth: a.width, borderOpacity: opacity, ...(a.fill ? { color, opacity: 0.3 } : {}) }); break;
      case 'ellipse': { const r = rectOf(); page.drawEllipse({ x: r.x + r.width / 2, y: r.y + r.height / 2, xScale: r.width / 2, yScale: r.height / 2, borderColor: color, borderWidth: a.width, borderOpacity: opacity, ...(a.fill ? { color, opacity: 0.3 } : {}) }); break; }
      case 'underline': case 'strike': { const y = a.type === 'underline' ? a.y + a.h : a.y + a.h / 2; seg([a.x, y], [a.x + a.w, y], Math.max(1, a.h * 0.08)); break; }
      case 'line': case 'arrow': case 'ink': {
        for (let i = 1; i < a.pts.length; i++) seg(a.pts[i - 1], a.pts[i], a.width);
        if (a.type === 'arrow') { const p1 = a.pts[0], p2 = a.pts[a.pts.length - 1], h = arrowHead(p1[0], p1[1], p2[0], p2[1], a.width); seg(h[0], p2, a.width); seg(h[1], p2, a.width); }
        break;
      }
      case 'text': case 'textedit': {
        if (a.type === 'textedit' && !a.real) page.drawRectangle({ ...rectOf(), color: hexToRgb(a.bg) });
        const f = await fonts(a), lines = a.text.split('\n'), ox = a.type === 'text' ? a.ax : a.tx, oy = a.type === 'text' ? a.ay : a.ty, first = a.type === 'text' ? a.fs : 0;
        lines.forEach((line, i) => {
          if (!line) return; const [dx, dy] = rotV(0, first + i * (a.lh || a.fs * 1.2), a.angle);
          drawDisplayText(page, ctx, line, ox + dx, oy + dy, a.fs, a.angle, f, color, opacity);
        });
        break;
      }
      case 'image': {
        if (a.cover) { const c = a.cover, p1 = mapPt(ctx, c.x, c.y), p2 = mapPt(ctx, c.x + c.w, c.y + c.h); page.drawRectangle({ x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p1.x - p2.x), height: Math.abs(p1.y - p2.y), color: hexToRgb(c.bg) }); }
        const data = imgData(a); if (!data) break;
        if (!imgCache.has(data)) imgCache.set(data, data.startsWith('data:image/jpeg') ? await out.embedJpg(data) : await out.embedPng(data));
        const [dx, dy] = rotV(0, a.h, a.angle), p = mapPt(ctx, a.ax + dx, a.ay + dy);
        page.drawImage(imgCache.get(data), { x: p.x, y: p.y, width: a.w, height: a.h, rotate: degrees(ctx.R - a.angle), opacity });
        break;
      }
      case 'note': {
        const p = mapPt(ctx, a.x, a.y);
        const ref = out.context.register(out.context.obj({
          Type: 'Annot', Subtype: 'Text', Rect: [p.x - 10, p.y - 10, p.x + 10, p.y + 10],
          Contents: PDFHexString.fromText(a.text), T: PDFHexString.fromText('DM Studio · PDF'), Name: 'Comment', C: [0.99, 0.83, 0.3], F: 4
        }));
        page.node.addAnnot(ref); break;
      }
    }
  }
}
async function buildPdf(list, o) {
  const out = await PDFDocument.create(), font = await out.embedFont(StandardFonts.Helvetica), bold = await out.embedFont(StandardFonts.HelveticaBold);
  const libDocs = new Map(), imgCache = new Map(), stdFonts = new Map(), pageRefs = new Map(), pageCtx = [];
  if (typeof fontkit !== 'undefined') out.registerFontkit(fontkit);
  const fonts = async a => {
    const fam = a.family || 'Helvetica', b = !!a.bold, it = !!a.italic, key = fam + b + it;
    if (!stdFonts.has(key)) {
      try { const by = await getFontBytes(fam, b, it); if (by) { stdFonts.set(key, await out.embedFont(by, { subset: true })); return stdFonts.get(key); } } catch (e) { console.warn('fuente', fam, e); }
      const name = fam === 'Times' ? (b && it ? 'TimesRomanBoldItalic' : b ? 'TimesRomanBold' : it ? 'TimesRomanItalic' : 'TimesRoman')
        : fam === 'Courier' ? (b && it ? 'CourierBoldOblique' : b ? 'CourierBold' : it ? 'CourierOblique' : 'Courier')
          : (b && it ? 'HelveticaBoldOblique' : b ? 'HelveticaBold' : it ? 'HelveticaOblique' : 'Helvetica');
      stdFonts.set(key, await out.embedFont(StandardFonts[name]));
    }
    return stdFonts.get(key);
  };
  const libDoc = async s => {
    if (!libDocs.has(s.id)) {
      const d = await PDFDocument.load(s.bytes, { ignoreEncryption: true });
      if (Object.keys(s.formValues).length) {
        const form = d.getForm();
        for (const [n, v] of Object.entries(s.formValues)) {
          try {
            const f = form.getField(n);
            if (f instanceof PDFTextField) f.setText(String(v)); else if (f instanceof PDFCheckBox) v ? f.check() : f.uncheck();
            else if (v && (f instanceof PDFDropdown || f instanceof PDFOptionList || f instanceof PDFRadioGroup)) f.select(v);
          } catch (e) { console.warn('Campo', n, e); }
        }
        try { form.flatten(); } catch (e) { console.warn('flatten', e); }
      }
      libDocs.set(s.id, d);
    }
    return libDocs.get(s.id);
  };
  for (let i = 0; i < list.length; i++) {
    const pg = list[i], s = src(pg.src), g = geom(pg);
    const raster = o.raster || s.encrypted || pg.annots.some(a => a.type === 'redact');
    let page, ctx;
    if (raster) {
      const q = o.raster ? o.quality : 0.92, sc = o.raster ? o.rscale : 2.5;
      const img = await out.embedJpg(await rasterizePage(pg, q, sc));
      page = out.addPage([g.dw, g.dh]); page.drawImage(img, { x: 0, y: 0, width: g.dw, height: g.dh });
      ctx = { W: g.dw, H: g.dh, R: 0, ox: 0, oy: 0 };
      await drawAnnotsPdf(out, page, pg, ctx, fonts, imgCache, true);
    } else {
      const [cp] = await out.copyPages(await libDoc(s), [pg.idx]); page = out.addPage(cp);
      page.setRotation(degrees(g.R));
      const cb = page.getCropBox(); ctx = { W: cb.width, H: cb.height, R: g.R, ox: cb.x, oy: cb.y };
      await drawAnnotsPdf(out, page, pg, ctx, fonts, imgCache, false);
    }
    // texto OCR invisible: el PDF guardado se puede buscar y copiar
    if (S.ocrEmbed && o.ocr !== false) {
      const covers = pg.annots.filter(a => a.type === 'textedit' || a.type === 'redact');
      for (const l of ocrLines(pg)) for (const w of l.words) {
        const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
        if (covers.some(a => cx >= a.x && cx <= a.x + a.w && cy >= a.y && cy <= a.y + a.h)) continue; // no filtrar texto tapado o redactado
        const str = safeText(font, w.str), w1 = font.widthOfTextAtSize(str, 1); if (!w1) continue;
        drawDisplayText(page, ctx, str + ' ', w.x, w.base, Math.max(w.h * 0.5, Math.min(w.h * 2, w.w / w1)), 0, font, rgb(0, 0, 0), 0);
      }
    }
    if (o.watermark) {
      const size = Math.min(g.dw, g.dh) / Math.max(4, o.watermark.length * 0.55), tw = bold.widthOfTextAtSize(safeText(bold, o.watermark), size), a = -Math.atan2(g.dh, g.dw) * 180 / Math.PI;
      const [cx, cy] = rotV(tw / 2, -size * 0.35, a);
      drawDisplayText(page, ctx, o.watermark, g.dw / 2 - cx, g.dh / 2 - cy, size, a, bold, hexToRgb(o.wmColor), o.wmOpacity);
    }
    pageRefs.set(pg.id, page.ref); pageCtx.push({ page, ctx, pg });
    if (window.FX?.exportPage) await FX.exportPage(out, page, ctx, g, i, list, o, fonts);
  }
  if (window.FX?.exportDoc) await FX.exportDoc(out, list, o, pageRefs, pageCtx);
  out.setTitle(o.title || S.name); if (o.author) out.setAuthor(o.author);
  out.setProducer('DM Studio · PDF'); out.setCreator('DM Studio · PDF'); out.setModificationDate(new Date());
  return out.save({ useObjectStreams: true });
}
function openExport(preset = {}) {
  if (!S.pages.length) return toast('No hay documento abierto');
  closeEditor();
  const nSel = S.pages.filter(p => S.selPages.has(p.id)).length;
  openModal(`<h2>Guardar / Exportar PDF</h2>
  <div class="row"><label>Nombre</label><input type="text" id="exName" value="${esc(S.name)}"></div>
  <fieldset><legend>Páginas</legend>
    <div class="row"><label><input type="radio" name="scope" value="all" ${preset.scope !== 'sel' ? 'checked' : ''}> Todas (${S.pages.length})</label>
    <label><input type="radio" name="scope" value="sel" ${preset.scope === 'sel' ? 'checked' : ''} ${nSel ? '' : 'disabled'}> Seleccionadas (${nSel})</label>
    <label><input type="radio" name="scope" value="range"> Rango</label><input type="text" id="exRange" placeholder="1-3, 5, 8-" style="max-width:130px"></div>
    <div class="row"><label><input type="checkbox" id="exSplit"> Dividir: un PDF por página</label></div>
  </fieldset>
  <fieldset><legend>Extras</legend>
    <div class="row"><label>Marca de agua</label><input type="text" id="exWm" placeholder="p. ej. CONFIDENCIAL"><input type="color" id="exWmColor" value="#d6293e"><input type="number" id="exWmOp" value="20" min="5" max="100" style="max-width:70px" title="Opacidad %"></div>
  </fieldset>
  ${window.FX?.exportFields?.() || ''}
  <fieldset><legend>Optimización</legend>
    <div class="row"><label><input type="checkbox" id="exRaster"> Comprimir rasterizando</label>
      <select id="exQ" style="max-width:220px"><option value="0.5|1.2">Máxima compresión</option><option value="0.7|1.6" selected>Equilibrado</option><option value="0.85|2.2">Alta calidad</option></select></div>
    <p class="hint">Ideal para escaneos pesados. Convierte las páginas en imágenes (el texto deja de ser seleccionable). Las páginas con redacción siempre se rasterizan para eliminar de verdad el contenido oculto.</p>
  </fieldset>
  <fieldset><legend>Propiedades</legend>
    <div class="row"><label>Título</label><input type="text" id="exTitle" value="${esc(S.name)}"></div>
    <div class="row"><label>Autor</label><input type="text" id="exAuthor"></div>
  </fieldset>
  <div class="actions"><button data-close>Cancelar</button><button class="primary" id="exGo"><i data-i="download"></i> Guardar PDF</button></div>`);
  $('#exRange').addEventListener('focus', () => document.querySelector('[name=scope][value=range]').checked = true);
  $('#exGo').onclick = async () => {
    const scope = document.querySelector('[name=scope]:checked').value;
    let list = scope === 'sel' ? S.pages.filter(p => S.selPages.has(p.id)) : scope === 'range' ? parseRange($('#exRange').value, S.pages.length).map(i => S.pages[i]) : S.pages;
    if (!list.length) return toast('El rango no contiene páginas');
    const [q, rs] = $('#exQ').value.split('|').map(Number);
    const o = {
      raster: $('#exRaster').checked, quality: q, rscale: rs, title: $('#exTitle').value, author: $('#exAuthor').value,
      watermark: $('#exWm').value.trim(), wmColor: $('#exWmColor').value, wmOpacity: (+$('#exWmOp').value || 20) / 100,
      ...(window.FX?.readExportFields?.() || {})
    };
    const name = ($('#exName').value.trim() || 'documento').replace(/\.pdf$/i, '');
    const btn = $('#exGo'), split = $('#exSplit').checked;
    const files = split ? list.map(pg => ({ name: `${name}_p${S.pages.indexOf(pg) + 1}.pdf`, mime: 'application/pdf' })) : [{ name: name + '.pdf', mime: 'application/pdf' }];
    let target;
    try { target = await FX.prepareSave(files); } catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; } // primero el destino (lo exige el navegador)
    btn.disabled = true; btn.textContent = 'Generando…';
    try {
      let where = '';
      if (split) { for (let i = 0; i < list.length; i++) { where = await FX.commitSave(target, await buildPdf([list[i]], o), files[i].name, 'application/pdf'); if (target.kind === 'download') await new Promise(r => setTimeout(r, 250)); } }
      else where = await FX.commitSave(target, await buildPdf(list, o), files[0].name, 'application/pdf');
      if (scope === 'all' && !split) { S.dirty = false; S.name = name; $('#docName').textContent = S.name; }
      closeModal(); toast(split && target.kind === 'dir' ? `${files.length} PDF guardados en ${target.dir.name} ✓` : FX.savedMsg(where), 4000);
    } catch (e) { console.error(e); toast('Error al guardar el PDF: ' + e.message, 6000); btn.disabled = false; btn.textContent = 'Guardar PDF'; }
  };
}
async function quickSave() {
  if (!S.pages.length) return; closeEditor();
  let target;
  try { target = await FX.prepareSave([{ name: S.name + '.pdf', mime: 'application/pdf' }]); } catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; }
  toast('Generando PDF…', 30000);
  try { const where = await FX.commitSave(target, await buildPdf(S.pages, { title: S.name }), S.name + '.pdf', 'application/pdf'); S.dirty = false; $('#docName').textContent = S.name; toast(FX.savedMsg(where), 4000); }
  catch (e) { console.error(e); toast('Error: ' + e.message, 6000); }
}
async function printDoc() {
  if (!S.pages.length) return; closeEditor(); toast('Preparando impresión…', 30000);
  try {
    const url = URL.createObjectURL(new Blob([await buildPdf(S.pages, { title: S.name })], { type: 'application/pdf' }));
    let f = $('#printFrame'); if (f) f.remove();
    f = document.createElement('iframe'); f.id = 'printFrame'; f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    f.src = url; document.body.appendChild(f);
    f.onload = () => { $('#toast').classList.add('hidden'); setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { window.open(url); } }, 300); };
  } catch (e) { toast('Error: ' + e.message, 6000); }
}

/* ---------- acciones y atajos ---------- */
const ACTIONS = {
  open: () => $('#fileOpen').click(), add: () => $('#fileAdd').click(), export: () => openExport(), print: printDoc,
  undo, redo, prev: () => step(-1), next: () => step(1), newDoc: newDocument,
  newTab: () => { newTab(); rebuild(); },
  zoomIn: () => setZoom('custom', S.scale * 1.2), zoomOut: () => setZoom('custom', S.scale / 1.2),
  theme: () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('folio.theme', t); },
  signature: () => { S.placeAt = null; openSignature(); }, ocr: openOcr,
  image: () => { if (!S.pages.length) return toast('Abre un documento primero'); S.placeAt = null; $('#fileImage').click(); },
  rotL: () => rotatePages(false), rotR: () => rotatePages(true), dup: duplicatePages, blank: insertBlank, delPages: deletePages,
  extract: () => { if (!S.selPages.size) return toast('Selecciona páginas en el panel (Ctrl+clic)'); openExport({ scope: 'sel' }); }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (b && ACTIONS[b.dataset.act]) { ACTIONS[b.dataset.act](); return; }
  const t = e.target.closest('[data-tool]'); if (t) { if (!S.pages.length) return toast('Abre un documento primero'); setTool(t.dataset.tool); return; }
  const tab = e.target.closest('[data-tab]');
  if (tab) { $$('[data-tab]').forEach(x => x.classList.toggle('active', x === tab)); $$('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab)); if (tab.dataset.tab === 'search') $('#searchInput').focus(); }
});
$('#toolbar').addEventListener('dblclick', e => {
  const t = e.target.closest('[data-tool]'); if (!t || !S.pages.length || t.dataset.tool === 'select') return;
  setTool(t.dataset.tool, true); toast('Herramienta fijada: se queda activa hasta pulsar Esc o elegir otra');
});
$('#fileOpen').addEventListener('change', e => { loadFiles(e.target.files, true); e.target.value = ''; });
$('#fileAdd').addEventListener('change', e => { loadFiles(e.target.files, !S.pages.length); e.target.value = ''; });
$('#fileImage').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = await imageToPng(f, 1800); placeImage(r.dataUrl, r.w, r.h, 'Imagen', 220);
});
// arrastrar y soltar archivos
['dragenter', 'dragover'].forEach(ev => $('#viewer').addEventListener(ev, e => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); $('.drop').classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('#viewer').addEventListener(ev, () => $('.drop').classList.remove('over')));
$('#viewer').addEventListener('drop', e => { if (!e.dataTransfer?.files.length) return; e.preventDefault(); loadFiles(e.dataTransfer.files, !S.pages.length); });
// pegar imágenes desde el portapapeles
document.addEventListener('paste', async e => {
  if (!S.pages.length || e.target.closest('input,textarea')) return;
  const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/')); if (!item) return;
  const r = await imageToPng(item.getAsFile(), 1800); placeImage(r.dataUrl, r.w, r.h, 'Imagen', 220);
});
const KEYS = { w: 'whiteout', j: 'editimg', k: 'edittext', v: 'select', h: 'highlight', t: 'text', d: 'ink', r: 'rect', e: 'ellipse', l: 'line', a: 'arrow', n: 'note', x: 'redact', b: 'eraser' };
document.addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea,select')) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'o') { e.preventDefault(); ACTIONS.open(); }
  else if (mod && k === 't') { e.preventDefault(); ACTIONS.newTab(); }
  else if (mod && k === 'w' && S.tabs.length) { e.preventDefault(); closeTab(S.tab); }
  else if (mod && e.key === 'Tab' && S.tabs.length > 1) { e.preventDefault(); const i = S.tabs.findIndex(t => t.id === S.tab); switchTab(S.tabs[(i + (e.shiftKey ? -1 : 1) + S.tabs.length) % S.tabs.length].id); }
  else if (mod && k === 's') { e.preventDefault(); e.shiftKey ? (FX.saveAs ? FX.saveAs() : openExport()) : quickSave(); }
  else if (mod && k === 'p') { e.preventDefault(); printDoc(); }
  else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (mod && k === 'f') { e.preventDefault(); $('[data-tab=search]').click(); }
  else if (mod && (k === '=' || k === '+')) { e.preventDefault(); ACTIONS.zoomIn(); }
  else if (mod && k === '-') { e.preventDefault(); ACTIONS.zoomOut(); }
  else if (mod) return;
  else if ((k === 'delete' || k === 'backspace') && !S.sel && S.tool === 'select' && selectionInfo()) { e.preventDefault(); selAction('delete', selectionInfo()); }
  else if ((k === 'delete' || k === 'backspace') && S.tool === 'edittext' && S.hover && pageDiv(S.hover.pid)) { e.preventDefault(); deleteTextAt(pageDiv(S.hover.pid), pageById(S.hover.pid), S.hover.pt, e.shiftKey); }
  else if ((k === 'delete' || k === 'backspace') && S.sel) { e.preventDefault(); deleteSelected(); }
  else if (k === 'escape') { setTool('select'); select(null); hideSelMenu(); }
  else if (S.sel && k.startsWith('arrow')) {
    e.preventDefault(); const a = findAnn(S.sel), o = structuredClone(a), st = e.shiftKey ? 10 : 1;
    pushHistory(); moveAnn(a, o, k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0); annChanged(S.sel.page);
  }
  else if (k === 'pagedown') { e.preventDefault(); step(1); } else if (k === 'pageup') { e.preventDefault(); step(-1); }
  else if (!S.pages.length) return;
  else if (KEYS[k]) setTool(KEYS[k]);
  else if (k === 's') openSignature(); else if (k === 'i') ACTIONS.image();
  else if (k === '+') ACTIONS.zoomIn(); else if (k === '-') ACTIONS.zoomOut();
});
// ya no hace falta avisar al salir: el trabajo se guarda solo y se recupera al volver

/* ---------- inicio ---------- */
document.documentElement.dataset.theme = localStorage.getItem('folio.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
ensureTab(); paintIcons(); setTool('select'); syncPropsUI(); updateButtons(); rebuild(); restoreSession();
window.FolioPDF = { S, buildPdf, loadFiles }; // para depuración
