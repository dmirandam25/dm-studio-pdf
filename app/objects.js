/* DM Studio · PDF — superíndice y subíndice al escribir o editar texto (m², x₁, CO₂…),
   barra de símbolos, y selección de varios objetos para moverlos, copiarlos, cortarlos y pegarlos. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};

  // =================== SUPERÍNDICE Y SUBÍNDICE ===================
  // Se guardan como caracteres Unicode (se ven bien al editar) y al dibujar y guardar
  // se pintan como texto pequeño y elevado con la fuente normal (así sirve cualquier carácter).
  const SUP_SRC = '0123456789+-=()abcdefghijklmnoprstuvwxyzABDEGHIJKLMNOPRTUW';
  const SUP_DST = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁᵂ';
  const SUB_SRC = '0123456789+-=()aehijklmnoprstuvx';
  const SUB_DST = '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ';
  const mk = (a, b) => { const m = new Map(), A = [...a], B = [...b]; A.forEach((c, i) => m.set(c, B[i])); return m; };
  const TO_SUP = mk(SUP_SRC, SUP_DST), TO_SUB = mk(SUB_SRC, SUB_DST), FROM = new Map();
  TO_SUP.forEach((v, k) => FROM.set(v, { base: k, kind: 'sup' })); TO_SUB.forEach((v, k) => FROM.set(v, { base: k, kind: 'sub' }));
  FROM.set('²', { base: '2', kind: 'sup' }); FROM.set('³', { base: '3', kind: 'sup' }); FROM.set('¹', { base: '1', kind: 'sup' });
  const RUN = new RegExp(`([${[...FROM.keys()].join('').replace(/[-\]\\^]/g, '\\$&')}]+)`, 'gu');
  const hasScript = s => { RUN.lastIndex = 0; return RUN.test(s); };
  // trozos: [{ t, kind: null|'sup'|'sub' }]
  function segments(str) {
    const out = [];
    for (const ch of str) {
      const f = FROM.get(ch), kind = f ? f.kind : null, t = f ? f.base : ch, last = out[out.length - 1];
      if (last && last.kind === kind) last.t += t; else out.push({ t, kind });
    }
    return out;
  }
  FX.scriptSegments = segments;
  // pantalla: tspans elevados dentro del SVG
  const _annMarkup = window.annMarkup;
  window.annMarkup = function (a) {
    const m = _annMarkup.apply(this, arguments);
    if ((a.type !== 'text' && a.type !== 'textedit') || !hasScript(a.text || '')) return m;
    return m.replace(/(<tspan[^>]*>)([^<]*)(<\/tspan>)/g, (all, open, body, close) => {
      if (!hasScript(body)) return all;
      return open + body.replace(RUN, run => { const s = segments(run)[0]; return `<tspan baseline-shift="${s.kind === 'sup' ? 'super' : 'sub'}" font-size="62%">${segments(run).map(x => x.t).join('')}</tspan>`; }) + close;
    });
  };
  // PDF: el mismo efecto con la fuente incrustada
  const _ddt = window.drawDisplayText;
  window.drawDisplayText = function (page, ctx, str, u, v, size, angle, font, color, opacity) {
    if (!str || !hasScript(str)) return _ddt.apply(this, arguments);
    let adv = 0;
    for (const s of segments(str)) {
      const fs = s.kind ? size * 0.62 : size, dy = s.kind === 'sup' ? -size * 0.36 : s.kind === 'sub' ? size * 0.16 : 0;
      const [ox, oy] = rotV(adv, dy, angle || 0);
      _ddt.call(this, page, ctx, s.t, u + ox, v + oy, fs, angle, font, color, opacity);
      try { adv += font.widthOfTextAtSize(safeText(font, s.t), fs); } catch { adv += fs * 0.5 * s.t.length; }
    }
  };
  // convierte la selección del cuadro de texto
  function scriptify(ta, kind) {
    let a = ta.selectionStart, b = ta.selectionEnd;
    if (a === b) { if (!a) return; a = b - 1; } // sin selección: el carácter anterior
    const sel = [...ta.value.slice(a, b)], map = kind === 'sup' ? TO_SUP : TO_SUB;
    const already = sel.every(c => FROM.get(c)?.kind === kind || /\s/.test(c));
    const missing = [];
    const res = sel.map(c => {
      if (already) return FROM.get(c)?.base ?? c;
      const base = FROM.get(c)?.base ?? c, r = map.get(base); if (!r && !/\s/.test(c)) missing.push(c); return r || base;
    }).join('');
    ta.setRangeText(res, a, b, 'select');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    if (missing.length) toast(`Sin ${kind === 'sup' ? 'superíndice' : 'subíndice'} para: ${[...new Set(missing)].join(' ')}`, 3000);
  }
  const SYMBOLS = '° ± × ÷ ≤ ≥ ≈ ≠ µ Δ π √ ∞ ∑ α β γ θ λ σ Ω → ‰ €'.split(' ');
  const bar = document.createElement('div'); bar.id = 'fmtBar'; bar.className = 'fmt-bar hidden';
  bar.innerHTML = `<button data-sc="sup" title="Superíndice (Ctrl+Mayús++)">x<sup>2</sup></button><button data-sc="sub" title="Subíndice (Ctrl+=)">x<sub>2</sub></button><span class="sep"></span>${SYMBOLS.map(s => `<button data-sym="${s}" title="Insertar ${s}">${s}</button>`).join('')}`;
  document.body.appendChild(bar);
  let barTa = null;
  const placeBar = () => {
    if (!barTa || !barTa.isConnected) { bar.classList.add('hidden'); barTa = null; return; }
    const r = barTa.getBoundingClientRect(); bar.classList.remove('hidden');
    const h = bar.offsetHeight || 34;
    bar.style.left = Math.max(6, Math.min(innerWidth - bar.offsetWidth - 6, r.left)) + 'px';
    bar.style.top = (r.top - h - 6 > 50 ? r.top - h - 6 : r.bottom + 6) + 'px';
  };
  document.addEventListener('focusin', e => { if (e.target.matches?.('textarea.inline-editor')) { barTa = e.target; placeBar(); } });
  document.addEventListener('focusout', e => { if (e.target === barTa) setTimeout(() => { if (document.activeElement !== barTa) { bar.classList.add('hidden'); barTa = null; } }, 0); });
  document.addEventListener('input', e => { if (e.target === barTa) placeBar(); });
  $('#viewer').addEventListener('scroll', () => barTa && placeBar());
  bar.addEventListener('mousedown', e => e.preventDefault()); // que el editor no pierda el foco
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !barTa) return;
    if (b.dataset.sc) scriptify(barTa, b.dataset.sc);
    else if (b.dataset.sym) { barTa.setRangeText(b.dataset.sym, barTa.selectionStart, barTa.selectionEnd, 'end'); barTa.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  // atajos como en Word: Ctrl+Mayús++ superíndice, Ctrl+= subíndice
  document.addEventListener('keydown', e => {
    const ta = e.target; if (!ta.matches?.('textarea.inline-editor') || !(e.ctrlKey || e.metaKey)) return;
    if (e.code === 'Equal' || e.key === '+' || e.key === '=' || e.code === 'BracketRight') {
      e.preventDefault(); e.stopPropagation();
      scriptify(ta, e.shiftKey || e.key === '+' ? 'sup' : 'sub');
    }
  }, true);
  FX.scriptify = scriptify;

  // =================== VARIOS OBJETOS A LA VEZ ===================
  const MS = { page: null, ids: new Set() };
  let CLIP = null;
  FX.multi = MS;
  const msAnns = () => { const pg = pageById(MS.page); return pg ? pg.annots.filter(a => MS.ids.has(a.id)) : []; };
  function paintMulti() {
    $$('.msel-layer').forEach(l => l.remove());
    if (!MS.ids.size) return;
    const d = pageDiv(MS.page), pg = pageById(MS.page); if (!d || !pg) return;
    const layer = document.createElement('div'); layer.className = 'msel-layer';
    const boxes = msAnns().map(a => bbox(a)).filter(Boolean);
    layer.innerHTML = boxes.map(b => `<div class="msel" style="left:${(b.x - 3) * S.scale}px;top:${(b.y - 3) * S.scale}px;width:${(b.w + 6) * S.scale}px;height:${(b.h + 6) * S.scale}px"></div>`).join('');
    if (boxes.length > 1) {
      const x1 = Math.min(...boxes.map(b => b.x)) - 6, y1 = Math.min(...boxes.map(b => b.y)) - 6, x2 = Math.max(...boxes.map(b => b.x + b.w)) + 6, y2 = Math.max(...boxes.map(b => b.y + b.h)) + 6;
      layer.innerHTML += `<div class="msel-all" style="left:${x1 * S.scale}px;top:${y1 * S.scale}px;width:${(x2 - x1) * S.scale}px;height:${(y2 - y1) * S.scale}px"><span>${boxes.length} objetos · Ctrl+C copiar · Supr borrar</span></div>`;
    }
    d.appendChild(layer);
  }
  function setMulti(pid, ids) {
    MS.page = pid; MS.ids = new Set(ids);
    if (MS.ids.size === 1) { const [id] = MS.ids; MS.ids.clear(); select(pid, id); paintMulti(); return; }
    if (S.sel) { const old = S.sel.page; S.sel = null; drawAnnots(old); }
    paintMulti(); updButtons();
  }
  const clearMulti = () => { if (!MS.ids.size) return; MS.ids.clear(); MS.page = null; paintMulti(); };
  FX.clearMulti = clearMulti; FX.setMulti = setMulti;
  const updButtons = () => { };
  const _drawAnnots = window.drawAnnots;
  window.drawAnnots = function (pid) { const r = _drawAnnots.apply(this, arguments); if (pid === MS.page) paintMulti(); return r; };
  const _select = window.select;
  window.select = function (pid, id) { if (id || pid === null) clearMulti(); return _select.apply(this, arguments); };
  const _setTool2 = window.setTool;
  window.setTool = function (t) { if (t !== 'select') clearMulti(); return _setTool2.apply(this, arguments); };
  function shiftAnn(a, dx, dy) {
    for (const [kx, ky] of [['x', 'y'], ['ax', 'ay'], ['tx', 'ty']]) if (kx in a) { a[kx] += dx; a[ky] += dy; }
    if (a.pts) a.pts = a.pts.map(p => [p[0] + dx, p[1] + dy]);
    if (a.cover) a.cover = { ...a.cover, x: a.cover.x + dx, y: a.cover.y + dy };
  }

  // clics con el ratón (herramienta Seleccionar)
  $('#viewer').addEventListener('pointerdown', e => {
    if (S.tool !== 'select' || e.button !== 0 || document.querySelector('.inline-editor')) return;
    const d = e.target.closest('.page'); if (!d) return;
    const pg = pageById(d.dataset.id), annEl = e.target.closest('[data-ann]'), id = annEl?.dataset.ann;
    if (e.target.closest('[data-handle]')) return;
    // Mayús+clic: añadir o quitar de la selección
    if (e.shiftKey && id) {
      e.stopImmediatePropagation(); e.preventDefault();
      const ids = MS.page === pg.id ? new Set(MS.ids) : new Set();
      if (S.sel && S.sel.page === pg.id) ids.add(S.sel.ann);
      ids.has(id) ? ids.delete(id) : ids.add(id);
      if (!ids.size) { clearMulti(); select(null); return; }
      setMulti(pg.id, ids); return;
    }
    // Mayús+arrastrar en un hueco: rectángulo de selección
    if (e.shiftKey && !id) {
      e.stopImmediatePropagation(); e.preventDefault();
      const p0 = toPt(e, d), box = document.createElement('div'); box.className = 'rubber'; d.appendChild(box); let p1 = p0;
      dragLoop(ev => { p1 = toPt(ev, d); Object.assign(box.style, { left: Math.min(p0.x, p1.x) * S.scale + 'px', top: Math.min(p0.y, p1.y) * S.scale + 'px', width: Math.abs(p1.x - p0.x) * S.scale + 'px', height: Math.abs(p1.y - p0.y) * S.scale + 'px' }); }, () => {
        box.remove();
        const r = { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y), x2: Math.max(p0.x, p1.x), y2: Math.max(p0.y, p1.y) };
        const ids = pg.annots.filter(a => { const b = bbox(a); return b && b.x < r.x2 && b.x + b.w > r.x && b.y < r.y2 && b.y + b.h > r.y; }).map(a => a.id);
        if (ids.length) setMulti(pg.id, ids); else toast('No hay objetos en esa zona', 2000);
      });
      return;
    }
    // arrastrar un objeto que forma parte de la selección múltiple: se mueven todos
    if (id && MS.page === pg.id && MS.ids.has(id) && MS.ids.size > 1) {
      e.stopImmediatePropagation(); e.preventDefault();
      const list = msAnns(), orig = list.map(a => structuredClone(a)), before = snapshot(), p0 = toPt(e, d); let moved = false;
      dragLoop(ev => {
        const p = toPt(ev, d), dx = p.x - p0.x, dy = p.y - p0.y;
        if (!moved && Math.hypot(dx, dy) < 1.5) return; moved = true;
        list.forEach((a, i) => moveAnn(a, orig[i], dx, dy)); _drawAnnots(pg.id); paintMulti();
      }, () => { if (moved) { S.history.push(before); S.future = []; updateButtons(); annChanged(pg.id); } else { clearMulti(); select(pg.id, id); } });
      return;
    }
    if (MS.ids.size && (!id || MS.page !== pg.id)) clearMulti();
  }, true);

  // teclado: copiar, cortar, pegar, borrar, mover y seleccionar todo
  const current = () => (MS.ids.size ? { pid: MS.page, list: msAnns() } : S.sel ? { pid: S.sel.page, list: [findAnn(S.sel)].filter(Boolean) } : null);
  function copy(cut) {
    const c = current(); if (!c?.list.length) return false;
    CLIP = { page: c.pid, items: c.list.map(a => structuredClone(a)), n: 0 };
    if (cut) { pushHistory(); const pg = pageById(c.pid), ids = new Set(c.list.map(a => a.id)); pg.annots = pg.annots.filter(a => !ids.has(a.id)); clearMulti(); S.sel = null; annChanged(c.pid); }
    toast(`${c.list.length} objeto(s) ${cut ? 'cortado(s)' : 'copiado(s)'} · Ctrl+V para pegar`, 2200); return true;
  }
  function paste() {
    if (!CLIP) return false;
    const pg = pageById(S.cur) || S.pages[0]; if (!pg) return false;
    const off = pg.id === CLIP.page ? 18 * ++CLIP.n : 18 * CLIP.n++, g = geom(pg);
    pushHistory();
    const added = CLIP.items.map(o => {
      const a = structuredClone(o); a.id = nid('a');
      if (a.type === 'textedit') a.real = true; // la copia no lleva el recuadro que tapaba el original
      if (a.type === 'field') a.name = a.name + '_copia';
      shiftAnn(a, off, off);
      const b = bbox(a); if (b && (b.x + b.w > g.dw || b.y + b.h > g.dh)) shiftAnn(a, Math.min(0, g.dw - b.x - b.w), Math.min(0, g.dh - b.y - b.h));
      pg.annots.push(a); return a;
    });
    annChanged(pg.id);
    if (added.length > 1) setMulti(pg.id, added.map(a => a.id)); else { setTool('select'); select(pg.id, added[0].id); }
    toast(`${added.length} objeto(s) pegado(s)`, 1800); return true;
  }
  FX.objects = { copy, paste, cut: () => copy(true), selectAll: () => { const pg = pageById(S.cur); if (!pg?.annots.length) return toast('Esta página no tiene objetos añadidos'); setTool('select'); setMulti(pg.id, pg.annots.map(a => a.id)); } };
  document.addEventListener('copy', () => { CLIP = null; }); // si se copia texto normal, se pega texto normal
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input,textarea,select,[contenteditable]') || !$('#modal').classList.contains('hidden')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && (k === 'c' || k === 'x')) { if (!window.getSelection()?.toString() && copy(k === 'x')) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (mod && !e.shiftKey && k === 'v') { if (CLIP && paste()) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (mod && !e.shiftKey && k === 'a' && S.tool === 'select' && (MS.ids.size || S.sel)) { e.preventDefault(); e.stopImmediatePropagation(); FX.objects.selectAll(); return; }
    if (!MS.ids.size) return;
    if (k === 'delete' || k === 'backspace') {
      e.preventDefault(); e.stopImmediatePropagation(); pushHistory();
      const pg = pageById(MS.page); pg.annots = pg.annots.filter(a => !MS.ids.has(a.id)); const pid = MS.page, n = MS.ids.size; clearMulti(); annChanged(pid); toast(`${n} objetos eliminados · Ctrl+Z para deshacer`, 2500);
    } else if (k === 'escape') { clearMulti(); }
    else if (k.startsWith('arrow')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const st = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0;
      pushHistory(); msAnns().forEach(a => moveAnn(a, structuredClone(a), dx, dy)); annChanged(MS.page);
    }
  }, true);

  document.head.insertAdjacentHTML('beforeend', `<style>
    .fmt-bar{position:fixed;z-index:140;display:flex;flex-wrap:wrap;gap:2px;max-width:min(560px,92vw);padding:4px;border:1px solid var(--line);border-radius:10px;background:var(--panel);box-shadow:0 6px 20px rgba(0,0,0,.3)}
    .fmt-bar.hidden{display:none}
    .fmt-bar button{min-width:26px;height:26px;padding:0 5px;border-radius:6px;justify-content:center;font-size:13px}
    .fmt-bar button:hover{background:var(--hover)}
    .fmt-bar .sep{width:1px;background:var(--line);margin:3px 3px}
    .msel-layer{position:absolute;inset:0;z-index:4;pointer-events:none}
    .msel{position:absolute;border:1.5px dashed #2563eb;border-radius:2px}
    .msel-all{position:absolute;border:1px solid rgba(37,99,235,.5);border-radius:3px}
    .msel-all span{position:absolute;left:0;top:-20px;white-space:nowrap;font-size:11px;background:#2563eb;color:#fff;padding:1px 6px;border-radius:4px}
  </style>`);
})();
