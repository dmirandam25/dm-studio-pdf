/* DM Studio · PDF — bloques de texto movibles en el modo Editar texto (como PdfCraft)
   · Con la herramienta "Editar texto" cada párrafo se marca con un recuadro.
   · Arrastrar un bloque lo mueve: el texto original se borra de verdad del PDF
     y se vuelve a escribir en el sitio nuevo. Un clic sin arrastrar edita, como siempre. */
(() => {
  const MIN_DRAG = 4; // píxeles de pantalla antes de considerar que es un arrastre

  // ---------- agrupar las líneas de la página en párrafos ----------
  const blockCache = new WeakMap();
  function blocksOf(pg, lines) {
    const hit = blockCache.get(lines); if (hit) return hit;
    // un bloque = líneas seguidas del mismo tamaño y fuente, que se solapan en horizontal y con el mismo interlineado
    const open = [];
    for (const ln of [...lines].sort((a, b) => a.base - b.base || a.x1 - b.x1)) {
      const fit = open.find(bk => {
        const last = bk.lines[bk.lines.length - 1], step = ln.base - last.base;
        if (Math.abs(ln.fs - last.fs) > last.fs * 0.06 || ln.family !== last.family) return false;
        if (ln.x1 > bk.x2 + 2 || ln.x2 < bk.x1 - 2) return false;
        if (step < last.fs * 0.9 || step > last.fs * 1.9) return false;
        return !bk.gap || Math.abs(step - bk.gap) <= bk.gap * 0.25;
      });
      if (fit) { fit.gap = fit.gap || ln.base - fit.lines[fit.lines.length - 1].base; fit.lines.push(ln); fit.x1 = Math.min(fit.x1, ln.x1); fit.x2 = Math.max(fit.x2, ln.x2); }
      else open.push({ lines: [ln], x1: ln.x1, x2: ln.x2, gap: 0 });
    }
    const out = [];
    for (const { lines: pl, gap: g } of open) {
      const gap = g || pl[0].fs * 1.2;
      const x1 = Math.min(...pl.map(l => l.x1)), x2 = Math.max(...pl.map(l => l.x2)), top = Math.min(...pl.map(l => l.top)), bottom = Math.max(...pl.map(l => l.bottom));
      out.push({ lines: pl, gap, x1, x2, top, bottom, box: { x: x1 - 1.5, y: top - 1, w: x2 - x1 + 3, h: bottom - top + 2 } });
    }
    blockCache.set(lines, out); return out;
  }
  const covered = (pg, b) => pg.annots.some(a => a.type === 'textedit' && insideBox({ x: b.box.x + b.box.w / 2, y: b.box.y + b.box.h / 2 }, a));
  const cachedLines = pg => { const l = lineCache.get(lineKey(pg)); return Array.isArray(l) ? l : null; };
  function blockAt(pg, pt) {
    const lines = cachedLines(pg); if (!lines) return null;
    const ln = lines.find(l => insideBox(pt, lineBox(l))); if (!ln) return null;
    const b = blocksOf(pg, lines).find(b => b.lines.includes(ln));
    return b && !covered(pg, b) ? b : null;
  }
  const editAt = (pg, pt) => pg.annots.slice().reverse().find(a => a.type === 'textedit' && !a.angle && insideBox(pt, a));

  // ---------- recuadros de los bloques ----------
  async function paintBlocks(pid) {
    const d = pageDiv(pid), pg = pageById(pid); if (!d || !pg) return;
    d.querySelector('.blk-layer')?.remove();
    if (S.tool !== 'edittext') return;
    let lines; try { lines = await getLines(pg); } catch { return; }
    if (S.tool !== 'edittext' || !d.isConnected) return;
    d.querySelector('.blk-layer')?.remove();
    const layer = document.createElement('div'); layer.className = 'blk-layer';
    const boxes = blocksOf(pg, lines).filter(b => !covered(pg, b)).map(b => b.box)
      .concat(pg.annots.filter(a => a.type === 'textedit' && !a.angle).map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h, moved: true })));
    layer.innerHTML = boxes.map(b => `<div class="blk${b.moved ? ' blk-ed' : ''}" style="left:${b.x * S.scale}px;top:${b.y * S.scale}px;width:${b.w * S.scale}px;height:${b.h * S.scale}px"></div>`).join('');
    d.appendChild(layer);
  }
  const paintAll = () => S.pages.forEach(pg => paintBlocks(pg.id));
  FX.paintBlocks = paintAll;

  const _drawAnnots = window.drawAnnots;
  window.drawAnnots = function (pid) { const r = _drawAnnots.apply(this, arguments); paintBlocks(pid); return r; };
  const _setTool = window.setTool;
  window.setTool = function (t) { const was = S.tool, r = _setTool.apply(this, arguments); if ((was === 'edittext') !== (t === 'edittext')) paintAll(); return r; };

  // al mover un texto ya editado (borrado de verdad) también se mueve su zona de clic
  const _moveAnn = window.moveAnn;
  window.moveAnn = function (a, o, dx, dy) { _moveAnn(a, o, dx, dy); if (o.type === 'textedit' && o.real) { a.x = o.x + dx; a.y = o.y + dy; } };

  // ---------- fantasma que sigue al ratón ----------
  function ghostFor(d, pg, b) {
    const c = d.querySelector('canvas'), g = geom(pg), k = c.width / g.dw, r = b.box;
    const gh = document.createElement('div'); gh.className = 'blk-ghost';
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(r.w * k)); cv.height = Math.max(1, Math.round(r.h * k));
    cv.getContext('2d').drawImage(c, r.x * k, r.y * k, r.w * k, r.h * k, 0, 0, cv.width, cv.height);
    cv.style.cssText = 'width:100%;height:100%;display:block';
    gh.appendChild(cv);
    const bg = sampleColors(d, g, r).bg;
    const hole = document.createElement('div'); hole.className = 'blk-hole';
    for (const el of [hole, gh]) Object.assign(el.style, { left: r.x * S.scale + 'px', top: r.y * S.scale + 'px', width: r.w * S.scale + 'px', height: r.h * S.scale + 'px' });
    hole.style.background = bg;
    d.append(hole, gh);
    return { gh, hole, bg, move: (dx, dy) => { gh.style.transform = `translate(${dx * S.scale}px,${dy * S.scale}px)`; }, remove: () => { gh.remove(); hole.remove(); } };
  }

  // mueve el párrafo b de la página dx,dy puntos: se borra el original y se escribe en el sitio nuevo
  // cada línea conserva su posición, fuente y tamaño; las líneas del bloque quedan agrupadas
  function dropBlock(d, pg, b, dx, dy, bg) {
    const gid = b.lines.length > 1 ? nid('g') : undefined;
    const anns = b.lines.map(l => Object.assign(lineEditFrom(d, pg, l), { bg, group: gid }));
    anns.forEach(a => { a.tx += dx; a.ty += dy; });
    const rects = b.lines.map(l => (isOcrPage(pg) ? lineBox(l) : textBand(l.base, l.fs, l.x1 + 0.3, l.x2 - 0.3)));
    const v = $('#viewer'), top = v.scrollTop, left = v.scrollLeft; // que la vista no salte al principio
    const keep = () => { v.scrollTop = top; v.scrollLeft = left; };
    applyReal(pg, rects, textMode(pg), () => { anns.forEach(a => { a.x += dx; a.y += dy; a.real = true; a.id = nid('a'); pg.annots.push(a); }); requestAnimationFrame(keep); setTimeout(keep, 120); })
      .then(ok => {
        keep();
        if (ok) return toast('Bloque movido · Ctrl+Z para deshacer', 2500);
        pushHistory(); anns.forEach(a => { a.id = nid('a'); pg.annots.push(a); }); annChanged(pg.id); // sin MuPDF: se tapa el original
      });
  }
  // arrastra un texto ya editado/movido (y todo su grupo)
  function dragAnns(d, pg, ann, x0, y0) {
    const list = ann.group ? pg.annots.filter(a => a.group === ann.group) : [ann];
    const orig = list.map(a => structuredClone(a)), before = snapshot();
    return {
      move: (dx, dy) => { list.forEach((a, i) => moveAnn(a, orig[i], dx, dy)); _drawAnnots(pg.id); },
      end: () => { S.history.push(before); S.future = []; updateButtons(); annChanged(pg.id); }
    };
  }

  // ---------- arrastrar con la herramienta Editar texto ----------
  $('#viewer').addEventListener('pointerdown', e => {
    if (S.tool !== 'edittext' || e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('.inline-editor') || e.target.closest('.inline-editor')) return;
    const d = e.target.closest('.page'); if (!d) return;
    const pg = pageById(d.dataset.id), pt = toPt(e, d);
    const ann = editAt(pg, pt), blk = ann ? null : blockAt(pg, pt);
    if (!ann && !blk) return; // sin bloque: lo de siempre
    e.stopImmediatePropagation(); e.preventDefault(); hideSelMenu?.();
    S.cur = pg.id; updatePageIndicator();
    const x0 = e.clientX, y0 = e.clientY, shift = e.shiftKey;
    let drag = null;
    const mv = ev => {
      const dx = (ev.clientX - x0) / S.scale, dy = (ev.clientY - y0) / S.scale;
      if (!drag) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < MIN_DRAG) return;
        $$('.hoverbox').forEach(h => h.remove());
        d.querySelector('.blk-layer')?.remove();
        drag = ann ? dragAnns(d, pg, ann) : ghostFor(d, pg, blk);
      }
      drag.move(dx, dy);
    };
    const up = ev => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      if (!drag) return ann ? openLineEditor(d, pg, ann, false) : editLineAt(d, pg, pt, shift); // clic: editar como siempre
      if (drag.end) { drag.end(); return; }
      const dx = (ev.clientX - x0) / S.scale, dy = (ev.clientY - y0) / S.scale;
      drag.remove();
      dropBlock(d, pg, blk, dx, dy, drag.bg);
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }, true);

  // ---------- estilos ----------
  document.head.insertAdjacentHTML('beforeend', `<style>
    .blk-layer{position:absolute;inset:0;z-index:3;pointer-events:none}
    .blk{position:absolute;border:1px solid rgba(37,99,235,.55);border-radius:2px}
    .blk-ed{border-color:rgba(16,185,129,.8);border-style:dashed}
    #viewer.editing .page:hover .blk{border-color:rgba(37,99,235,.8)}
    .blk-hole{position:absolute;z-index:5;pointer-events:none}
    .blk-ghost{position:absolute;z-index:6;pointer-events:none;outline:1.5px solid #2563eb;box-shadow:0 6px 18px rgba(0,0,0,.25);background:#fff;opacity:.92}
  </style>`);
})();
