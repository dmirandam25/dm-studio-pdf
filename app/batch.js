/* DM Studio · PDF — procesar muchos archivos a la vez (OCR, comprimir, convertir, marca de agua…)
   y exportar a RTF y Markdown. */
'use strict';
(() => {
  const FX = window.FX = window.FX || {};
  const enc = new TextEncoder();
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // =================== EXPORTAR A MARKDOWN Y RTF ===================
  const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 12; };
  async function pagesParas(pages) {
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const lines = await FX.allLines(pages[i]);
      out.push({ pg: pages[i], g: geom(pages[i]), paras: FX.paragraphsOf(lines), lines });
    }
    const fsMed = median(out.flatMap(p => p.lines.map(l => l.fs)));
    return { out, fsMed };
  }
  const LIST = /^\s*([•·▪●◦■□➢►\-–])\s*/;
  async function toMarkdown(pages = S.pages) {
    const { out, fsMed } = await pagesParas(pages), md = [];
    const escMd = t => t.replace(/([\\`*_[\]])/g, '\\$1').replace(/^(#+|>|\d+\.)(\s)/, '\\$1$2');
    out.forEach((p, i) => {
      if (i) md.push('---');
      for (const pl of p.paras) {
        const l0 = pl[0], raw = FX.joinLines(pl).trim(); if (!raw) continue;
        if (l0.fs > fsMed * 1.6) md.push('# ' + escMd(raw));
        else if (l0.fs > fsMed * 1.25) md.push('## ' + escMd(raw));
        else if (l0.bold && pl.length === 1 && raw.length < 90 && !/[.:;,]$/.test(raw)) md.push('### ' + escMd(raw));
        else if (LIST.test(raw)) md.push('- ' + escMd(raw.replace(LIST, '')));
        else if (/^\d+[.)]\s/.test(raw)) md.push(raw.replace(/^(\d+)[.)]\s+/, '$1. ') );
        else { let t = escMd(raw); if (l0.bold) t = `**${t}**`; else if (l0.italic) t = `*${t}*`; md.push(t); }
      }
    });
    return md.join('\n\n') + '\n';
  }
  function rtfEsc(s) {
    let o = '';
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (ch === '\\' || ch === '{' || ch === '}') o += '\\' + ch;
      else if (ch === '\t') o += '\\tab ';
      else if (c < 128) o += ch;
      else if (c > 0xffff) { const h = Math.floor((c - 0x10000) / 0x400) + 0xd800, l = ((c - 0x10000) % 0x400) + 0xdc00; o += `\\u${h - 65536}?\\u${l - 65536}?`; }
      else o += `\\u${c > 32767 ? c - 65536 : c}?`;
    }
    return o;
  }
  async function toRtf(pages = S.pages) {
    const { out } = await pagesParas(pages);
    const W = out[0]?.g.dw || 595, H = out[0]?.g.dh || 842, tw = v => Math.round(v * 20);
    let r = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082{\\fonttbl{\\f0\\fswiss Arial;}{\\f1\\froman Times New Roman;}{\\f2\\fmodern Courier New;}}\n{\\info{\\title ${rtfEsc(S.name)}}{\\author DM Studio · PDF}}\n\\paperw${tw(W)}\\paperh${tw(H)}\\margl1080\\margr1080\\margt1080\\margb1080${W > H ? '\\landscape' : ''}\n`;
    out.forEach((p, i) => {
      if (i) r += '\\page\n';
      for (const pl of p.paras) {
        const l0 = pl[0], text = FX.joinLines(pl).trim(); if (!text) continue;
        const f = l0.family === 'Times' ? 1 : l0.family === 'Courier' ? 2 : 0, centered = FX.isCentered?.(pl, p.g);
        const list = LIST.test(text);
        r += `{\\pard\\sa120${centered ? '\\qc' : ''}${list ? '\\fi-280\\li560' : ''}\\f${f}\\fs${Math.max(12, Math.round(l0.fs * 2))}${l0.bold ? '\\b' : ''}${l0.italic ? '\\i' : ''} ${rtfEsc(list ? '•\t' + text.replace(LIST, '') : text)}\\par}\n`;
      }
    });
    return r + '}';
  }
  FX.toMarkdown = toMarkdown; FX.toRtf = toRtf;
  async function runExport(kind) {
    if (!S.pages.length) return toast('Abre un documento primero');
    const ext = kind === 'md' ? 'md' : 'rtf', mime = kind === 'md' ? 'text/markdown;charset=utf-8' : 'application/rtf', name = FX.baseName() + '.' + ext;
    let target; try { target = await FX.prepareSave([{ name, mime }]); } catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; }
    toast(kind === 'md' ? 'Convirtiendo a Markdown…' : 'Convirtiendo a RTF…', 60000);
    try { const txt = kind === 'md' ? await toMarkdown() : await toRtf(); toast(FX.savedMsg(await FX.commitSave(target, enc.encode(txt), name, mime)), 4000); }
    catch (e) { console.error(e); toast('No se pudo convertir: ' + e.message, 6000); }
  }
  FX.exportMarkdown = () => runExport('md'); FX.exportRtf = () => runExport('rtf');
  // en el menú y el panel Convertir
  const prevItems = FX.convertItems;
  FX.convertItems = () => {
    const items = prevItems(), i = items.findIndex(x => x && /HTML \(página web\)/.test(x.label));
    items.splice(i + 1, 0, { label: 'PDF a Markdown (.md)', icon: 'text', action: FX.exportMarkdown }, { label: 'PDF a RTF (.rtf)', icon: 'text', action: FX.exportRtf }, { label: 'Procesar varios archivos a la vez…', icon: 'pages', action: () => openBatch() });
    return items;
  };

  // =================== PROCESAR VARIOS ARCHIVOS ===================
  const OPS = {
    ocr: { label: 'Reconocer texto (OCR): PDF buscables', ext: 'pdf', suffix: '_ocr' },
    compress: { label: 'Comprimir', ext: 'pdf', suffix: '_comprimido' },
    topdf: { label: 'Convertir a PDF (Word, Excel, PowerPoint, imágenes…)', ext: 'pdf', suffix: '' },
    watermark: { label: 'Añadir marca de agua', ext: 'pdf', suffix: '_marca' },
    word: { label: 'Convertir a Word (.docx)', ext: 'docx', suffix: '' },
    text: { label: 'Convertir a texto (.txt)', ext: 'txt', suffix: '' },
    md: { label: 'Convertir a Markdown (.md)', ext: 'md', suffix: '' },
    rtf: { label: 'Convertir a RTF (.rtf)', ext: 'rtf', suffix: '' },
    html: { label: 'Convertir a HTML (.html)', ext: 'html', suffix: '' }
  };
  const MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain;charset=utf-8', md: 'text/markdown;charset=utf-8', rtf: 'application/rtf', html: 'text/html;charset=utf-8', zip: 'application/zip' };
  const stemOf = n => n.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_');

  // abre un archivo sin mostrarlo y ejecuta fn con él como documento actual
  async function withFile(file, fn) {
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      if (!FX.canConvert?.(file)) throw new Error('formato no compatible');
      bytes = new Uint8Array(await FX.convertToPdfBytes(file));
    }
    const s = await addSource(bytes, file.name, undefined, true);
    const pages = s.info.map((_, i) => ({ id: nid('p'), src: s.id, idx: i, rot: 0, annots: [] }));
    const keep = {}; ['pages', 'name', 'cur', 'bookmarks', 'attachments', 'labels', 'props'].forEach(k => { keep[k] = S[k]; });
    Object.assign(S, { pages, name: stemOf(file.name), cur: pages[0]?.id, bookmarks: [], attachments: [], labels: [], props: {} });
    const wasRestoring = restoring; restoring = true; // que el autoguardado no guarde este documento temporal
    try { return await fn(pages, s); }
    finally {
      Object.assign(S, keep); restoring = wasRestoring;
      pages.forEach(pg => S.ocr.delete(ocrKey(pg)));
      const i = S.sources.indexOf(s); if (i >= 0) S.sources.splice(i, 1);
      try { s.pdf.destroy(); } catch { }
    }
  }
  async function processOne(file, op, opt, log) {
    return withFile(file, async pages => {
      const title = S.name;
      if (op === 'ocr') {
        const worker = await getOcrWorker(opt.lang);
        for (let i = 0; i < pages.length; i++) {
          if (await nativeTextLength(pages[i]) >= 20) continue;
          log(`OCR página ${i + 1} de ${pages.length}…`);
          S.ocr.set(ocrKey(pages[i]), await ocrPage(pages[i], worker));
        }
        const keepEmbed = S.ocrEmbed; S.ocrEmbed = true;
        try { return await buildPdf(pages, { title }); } finally { S.ocrEmbed = keepEmbed; }
      }
      if (op === 'compress') {
        const before = await buildPdf(pages, { title }), { out } = await FX.optimizeBytes(before, opt.level, m => log(m));
        return out.length < before.length ? out : before;
      }
      if (op === 'topdf') return buildPdf(pages, { title });
      if (op === 'watermark') return buildPdf(pages, { title, watermark: opt.wm || 'CONFIDENCIAL', wmColor: opt.wmColor || '#d6293e', wmOpacity: 0.2 });
      if (op === 'word') return FX.toDocx();
      if (op === 'text') return enc.encode(await FX.toText());
      if (op === 'md') return enc.encode(await toMarkdown(pages));
      if (op === 'rtf') return enc.encode(await toRtf(pages));
      if (op === 'html') return enc.encode(await FX.toHtml());
      throw new Error('operación desconocida');
    });
  }
  function openBatch() {
    let files = [];
    openModal(`<h2>Procesar varios archivos a la vez</h2>
      <div class="row"><button id="btPick" class="primary"><i data-i="open"></i> Elegir archivos…</button><span id="btCount" class="hint" style="padding:0">Ningún archivo elegido</span></div>
      <div id="btList" class="bt-list"></div>
      <div class="row"><label>Qué hacer</label><select id="btOp">${Object.entries(OPS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
      <div class="row bt-ocr"><label>Idioma</label><select id="btLang"><option value="spa+eng">Español + inglés</option><option value="spa">Español</option><option value="eng">Inglés</option></select></div>
      <div class="row bt-cmp"><label>Nivel</label><select id="btLvl"><option value="1000|0.6">Máxima compresión</option><option value="1600|0.72" selected>Equilibrado</option><option value="2400|0.85">Alta calidad</option></select></div>
      <div class="row bt-wm"><label>Texto</label><input type="text" id="btWm" value="CONFIDENCIAL"><input type="color" id="btWmC" value="#d6293e"></div>
      <p class="hint" style="padding:0">Los archivos se procesan uno a uno y se guardan con su mismo nombre (en la carpeta que elijas, o en un .zip si guardas en Descargas). El documento que tienes abierto no se toca.</p>
      <div id="btLog" class="bt-log"></div>
      <div class="actions"><button data-close>Cerrar</button><button class="primary" id="btGo" disabled>Procesar</button></div>`);
    paintIcons($('#modalCard'));
    const sync = () => { const op = $('#btOp').value; $$('.bt-ocr').forEach(x => x.style.display = op === 'ocr' ? '' : 'none'); $$('.bt-cmp').forEach(x => x.style.display = op === 'compress' ? '' : 'none'); $$('.bt-wm').forEach(x => x.style.display = op === 'watermark' ? '' : 'none'); };
    $('#btOp').onchange = sync; sync();
    const showFiles = () => {
      $('#btCount').textContent = files.length ? `${files.length} archivo(s)` : 'Ningún archivo elegido';
      $('#btList').innerHTML = files.map((f, i) => `<div data-f="${i}"><span>${esc(f.name)}</span><small>${(f.size / 1048576).toFixed(2)} MB</small><b class="st"></b></div>`).join('');
      $('#btGo').disabled = !files.length;
    };
    $('#btPick').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.docx,.xlsx,.pptx,.csv,.txt,.md,.html,.htm,image/*';
      inp.onchange = () => { files = files.concat([...inp.files].filter(f => !files.some(x => x.name === f.name && x.size === f.size))); showFiles(); };
      inp.click();
    };
    $('#btGo').onclick = async () => {
      const op = $('#btOp').value, o = OPS[op], [maxDim, q] = $('#btLvl').value.split('|').map(Number);
      const opt = { lang: $('#btLang').value, level: { maxDim, q }, wm: $('#btWm').value.trim(), wmColor: $('#btWmC').value };
      const names = files.map(f => stemOf(f.name) + o.suffix + '.' + o.ext);
      let target; try { target = await FX.prepareSave(names.map(n => ({ name: n, mime: MIME[o.ext] }))); } catch (e) { if (!FX.isCancel(e)) toast(e.message, 5000); return; }
      const btn = $('#btGo'), logEl = $('#btLog'); btn.disabled = true; $('#btPick').disabled = true;
      const zipFiles = [], useZip = target.kind === 'download' && files.length > 1; let ok = 0;
      for (let i = 0; i < files.length; i++) {
        const row = document.querySelector(`#btList [data-f="${i}"] .st`), log = m => { logEl.textContent = `${files[i].name}: ${m}`; };
        row.textContent = '⏳'; log('procesando…'); await sleep(0);
        try {
          const bytes = new Uint8Array(await processOne(files[i], op, opt, log));
          if (useZip) zipFiles.push({ name: names[i], data: bytes });
          else await FX.commitSave(target, bytes, names[i], MIME[o.ext]);
          row.textContent = '✓'; row.title = 'Listo'; ok++;
        } catch (e) { console.error(e); row.textContent = '✗'; row.title = e.message; logEl.textContent = `${files[i].name}: error, ${e.message}`; }
      }
      if (useZip && zipFiles.length) await FX.commitSave(target, await FX.zip(zipFiles), 'DMStudio_lote_' + op + '.zip', MIME.zip);
      logEl.textContent = `Terminado: ${ok} de ${files.length} archivo(s)` + (target.kind === 'dir' ? ` guardados en «${target.dir.name}»` : useZip ? ' en un .zip en Descargas' : '');
      toast(logEl.textContent, 5000); $('#btPick').disabled = false;
    };
  }
  FX.openBatch = openBatch; FX.batchProcess = processOne;
  document.head.insertAdjacentHTML('beforeend', `<style>
    .bt-list{max-height:180px;overflow:auto;border:1px solid var(--line);border-radius:8px;margin:6px 0 10px}
    .bt-list:empty{display:none}
    .bt-list>div{display:flex;gap:10px;align-items:center;padding:5px 10px;border-bottom:1px solid var(--line)}
    .bt-list>div:last-child{border-bottom:0}.bt-list span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt-list small{color:var(--muted)}
    .bt-list .st{width:18px;text-align:center}
    .bt-log{min-height:18px;font-size:12.5px;color:var(--muted);margin-top:6px}
  </style>`);
})();
