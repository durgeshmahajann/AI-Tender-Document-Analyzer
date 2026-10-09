/* TenderLens front-end — vanilla JS, no build step */
(() => {
  'use strict';

  /* ------------------------------------------------------------ helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const P = {
    logo: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    upload: '<path d="M12 16V4m0 0L8 8m4-4l4 4"/><path d="M4 16v2.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V16"/>',
    file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    wallet: '<path d="M3 7.5A2.5 2.5 0 015.5 5H18a1 1 0 011 1v2"/><path d="M3 7.5V18a2 2 0 002 2h14a1 1 0 001-1v-9a1 1 0 00-1-1H5.5A2.5 2.5 0 013 7.5z"/><circle cx="16" cy="14.5" r="1.1"/>',
    tag: '<path d="M20.5 12.5l-8 8a1.5 1.5 0 01-2.1 0L3 13V4h9l8.5 8.4a1.5 1.5 0 010 2.1z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    bank: '<path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2.5 9.5L12 4l9.5 5.5"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.2-4.2"/>',
    sparkle: '<path d="M12 3l1.9 5.4L19.5 10l-5.6 1.7L12 17l-1.9-5.3L4.5 10l5.6-1.6z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    download: '<path d="M12 4v11m0 0l-4-4m4 4l4-4"/><path d="M4 16v2.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M5 12h14m0 0l-6-6m6 6l-6 6"/>',
    chat: '<path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4A8 8 0 1120 12z"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 118 0v3"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.1"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l.8.8L6.2 5.4M4 12l.8.8 1.4-1.4M4 18l.8.8 1.4-1.4"/>',
  };
  const ic = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;

  const CATS = [
    { key: 'eligibility', label: 'Eligibility', icon: 'shield', c: '#5b5bf0' },
    { key: 'documents_required', label: 'Documents required', icon: 'file', c: '#0ea5e9' },
    { key: 'technical_requirements', label: 'Technical requirements', icon: 'cog', c: '#f59e0b' },
    { key: 'deliverables', label: 'Deliverables', icon: 'box', c: '#10b981' },
  ];
  const STATS = [
    { key: 'submission_deadline', label: 'Submission deadline', icon: 'calendar', c: '#5b5bf0' },
    { key: 'emd', label: 'EMD', icon: 'wallet', c: '#10b981' },
    { key: 'tender_fee', label: 'Tender fee', icon: 'tag', c: '#f59e0b' },
    { key: 'minimum_turnover', label: 'Minimum turnover', icon: 'bank', c: '#f43f5e' },
  ];
  const STEPS = [
    { id: 'read', title: 'Reading pages', sub: 'Extracting text, using OCR when needed' },
    { id: 'chunk', title: 'Splitting into passages', sub: 'Keeping every page number attached' },
    { id: 'index', title: 'Building the search index', sub: 'Embeddings + FAISS vector search' },
    { id: 'extract', title: 'Extracting requirements', sub: 'The AI reads the relevant sections' },
  ];
  const SUGGEST = [
    'What is the last date to submit the bid?',
    'How much EMD is required and how is it paid?',
    'What experience does the bidder need?',
    'What is the project timeline?',
  ];

  /* -------------------------------------------------------------- state */
  const S = {
    view: 'landing', theme: document.documentElement.getAttribute('data-theme'),
    file: null, ocr: true, sample: false,
    doc: null, filename: '', pages: 0, ocrPages: 0, result: null, meta: {},
    items: [], checked: new Set(), tab: 'checklist', filter: 'all', q: '',
    sel: null, showText: false, chat: [], asking: false,
  };
  const docKey = () => `tl-checks:${S.filename}|${S.pages}`;
  const loadChecks = () => { try { S.checked = new Set(JSON.parse(localStorage.getItem(docKey()) || '[]')); } catch { S.checked = new Set(); } };
  const saveChecks = () => { try { localStorage.setItem(docKey(), JSON.stringify([...S.checked])); } catch { /* ignore */ } };

  /* -------------------------------------------------------------- toast */
  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.innerHTML = `${ic(kind === 'err' ? 'alert' : 'sparkle')}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.transition = '.3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, kind === 'err' ? 7000 : 3500);
  }

  /* ------------------------------------------------------------ landing */
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  function navHTML(right = '') {
    return `<header class="nav">
      <div class="logo"><span class="logo-mark">${ic('logo')}</span><span>TenderLens</span></div>
      <div class="nav-right">${right}<button class="icon-btn" data-act="theme" title="Toggle theme">${ic(S.theme === 'dark' ? 'sun' : 'moon')}</button></div>
    </header>`;
  }

  function landingHTML() {
    const dropInner = S.file
      ? `<div class="file-chip"><span class="file-ico">${ic('file')}</span>
           <div class="grow"><b>${esc(S.file.name)}</b><small>${fmtSize(S.file.size)} · PDF</small></div>
           <button class="icon-btn" data-act="remove" title="Remove">${ic('x')}</button></div>
         <button class="btn primary lg" data-act="analyze">Analyze tender ${ic('send')}</button>`
      : `<div class="drop-inner" data-act="browse">
           <div class="drop-icon">${ic('upload')}</div>
           <h3>Drop your tender PDF here</h3>
           <p>or <span class="link">browse files</span> from your computer</p>
         </div>`;
    return `${navHTML(`<span class="pill subtle">${ic('layers')} B26 · AI Tender Analyzer</span>`)}
    <main class="landing">
      <div class="badge reveal" style="--d:0">${ic('sparkle')} AI-powered · OCR · RAG · Source-linked</div>
      <h1 class="display reveal" style="--d:1">Read a 100-page tender <em>in seconds.</em></h1>
      <p class="lead reveal" style="--d:2">Upload a government or enterprise tender. Get eligibility, deadlines, fees and deliverables as a clean checklist, with every item linked back to its source page.</p>
      <div class="drop reveal ${S.file ? 'has-file' : ''}" style="--d:3" id="drop">
        ${dropInner}
        <input type="file" id="file" accept="application/pdf,.pdf" hidden>
        <div class="drop-foot">
          <label class="switch"><input type="checkbox" id="ocr" ${S.ocr ? 'checked' : ''}><span class="track"></span><span>OCR for scanned pages</span></label>
          <div class="tags"><span class="tag">PDF · up to 100 MB</span></div>
        </div>
      </div>
      ${S.sample ? `<p class="sample-row reveal" style="--d:4">No tender handy? <button class="link" data-act="sample">Try the sample tender →</button></p>` : ''}
      <div class="features">
        <div class="feat reveal" style="--d:5"><div class="tile" style="--c:#5b5bf0">${ic('shield')}</div><b>Eligibility &amp; finance</b><span>Turnover, experience, EMD and registration rules in one place.</span></div>
        <div class="feat reveal" style="--d:6"><div class="tile" style="--c:#f59e0b">${ic('clock')}</div><b>Deadlines &amp; fees</b><span>Never miss a submission date. Live countdown included.</span></div>
        <div class="feat reveal" style="--d:7"><div class="tile" style="--c:#10b981">${ic('eye')}</div><b>Proof on every answer</b><span>Click any item to see the exact highlighted page.</span></div>
      </div>
    </main>`;
  }

  /* ---------------------------------------------------------- analyzing */
  function analyzingHTML() {
    return `${navHTML()}
    <div class="progress-wrap"><div class="progress-card reveal">
      <div class="orb"></div>
      <h2 class="display sm">Analyzing your tender</h2>
      <p style="color:var(--muted)">${esc(S.file ? S.file.name : 'Sample tender')}</p>
      <ol class="steps">${STEPS.map(s => `<li data-step="${s.id}"><span class="dot">${ic('check')}</span><div><b>${s.title}</b><small>${s.sub}</small></div></li>`).join('')}</ol>
      <div class="bar"><span id="bar"></span></div>
    </div></div>`;
  }

  function stepEvent(ev) {
    const li = $(`.steps li[data-step="${ev.step}"]`);
    if (!li) return;
    li.classList.toggle('active', ev.state === 'active');
    li.classList.toggle('done', ev.state === 'done');
    if (ev.detail) $('small', li).textContent = ev.detail;
    const done = $$('.steps li.done').length, active = $$('.steps li.active').length;
    $('#bar').style.width = Math.max(6, ((done + active * .45) / STEPS.length) * 100) + '%';
  }

  async function runAnalyze(url, body) {
    S.view = 'analyzing'; render();
    let finalEvent = null;
    try {
      const res = await fetch(url, { method: 'POST', body });
      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('ndjson')) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'The server could not start the analysis.');
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.error) throw new Error(ev.error);
          if (ev.done) finalEvent = ev; else stepEvent(ev);
        }
      }
      if (!finalEvent) throw new Error('The analysis ended unexpectedly. Please try again.');
    } catch (err) {
      S.view = 'landing'; render(); toast(err.message || String(err), 'err');
      return;
    }
    $('#bar').style.width = '100%';
    await sleep(650);
    finish(finalEvent);
  }

  function finish(ev) {
    Object.assign(S, {
      doc: ev.doc, filename: ev.filename, pages: ev.pages, ocrPages: ev.ocr_pages,
      result: ev.result, meta: ev.meta || {}, tab: 'checklist', filter: 'all', q: '', chat: [], showText: false,
    });
    S.items = [];
    CATS.forEach(c => (S.result[c.key] || []).forEach((it, i) => S.items.push({ id: `${c.key}:${i}`, cat: c.key, text: it.value, page: it.page })));
    loadChecks();
    const first = STATS.map(s => S.result[s.key]).find(x => x && x.page);
    S.sel = first ? { page: first.page, hl: first.value, itemId: null } : null;
    S.view = 'results'; render();
  }

  /* ------------------------------------------------------------ results */
  const val = k => (S.result[k] || {}).value || 'Not Found';
  const pg = k => (S.result[k] || {}).page || null;

  function ringHTML() {
    const d = S.meta.deadline_days;
    let num, label, color, frac;
    if (d == null) { num = '—'; label = 'no date found'; color = 'var(--muted)'; frac = 0; }
    else if (d < 0) { num = 'Closed'; label = Math.abs(d) + ' days ago'; color = 'var(--rose)'; frac = 1; }
    else { num = d; label = d === 1 ? 'day left' : 'days left'; color = d <= 3 ? 'var(--rose)' : d <= 14 ? 'var(--amber)' : 'var(--green)'; frac = Math.min(1, Math.max(.06, d / 30)); }
    const small = String(num).length > 4 ? 'font-size:19px' : '';
    return `<div class="ring-card reveal" style="--d:2;--ringc:${color}">
      <div class="ring"><svg viewBox="0 0 104 104"><circle class="bgc" cx="52" cy="52" r="46"/><circle class="fg" cx="52" cy="52" r="46" data-frac="${frac}"/></svg>
        <div class="ring-num"><div><b style="${small}">${num}</b><small>${label}</small></div></div></div>
      <div class="ring-meta"><b>Submission deadline</b><span>${esc(val('submission_deadline'))}</span></div>
    </div>`;
  }

  function resultsHTML() {
    const title = val('tender_title') !== 'Not Found' ? val('tender_title') : S.filename;
    const total = S.items.length;
    const menu = `<div class="menu-wrap"><button class="btn ghost" data-act="menu">${ic('download')} <span class="lbl">Export</span></button>
      <div class="menu" id="menu"><button data-act="csv">${ic('list')} Download CSV checklist</button><button data-act="json">${ic('file')} Download JSON</button></div></div>`;
    return `${navHTML(`<span class="pill file-pill">${ic('file')}<span>${esc(S.filename)} · ${S.pages} pages</span></span>${menu}<button class="btn ghost" data-act="new">${ic('plus')} <span class="lbl">New tender</span></button>`)}
    <main class="shell">
      <section class="hero">
        <div class="reveal" style="--d:0;max-width:860px">
          <div class="eyebrow">Tender analysis</div>
          <h1 class="display md">${esc(title)}</h1>
          <div class="chips"><span class="chip">${ic('layers')} ${S.pages} pages</span>
            ${S.ocrPages ? `<span class="chip">${ic('eye')} ${S.ocrPages} read with OCR</span>` : ''}
            <span class="chip">${ic('list')} ${total} requirements found</span></div>
        </div>
        ${ringHTML()}
      </section>
      <section class="stats">${STATS.map((s, i) => {
        const v = val(s.key), p = pg(s.key), nf = v === 'Not Found';
        return `<div class="stat reveal" style="--d:${i + 2}"><div class="stat-top"><span class="tile" style="--c:${s.c}">${ic(s.icon)}</span>${s.label}</div>
          <div class="stat-val ${nf ? 'nf' : ''}">${esc(v)}</div>
          ${p ? `<button class="src" data-act="open" data-page="${p}" data-hl="${esc(v)}">${ic('file')} Page ${p}</button>` : '<span></span>'}</div>`;
      }).join('')}</section>
      <section class="workspace">
        <div class="reveal" style="--d:6">
          <div class="tabs">
            <button class="tab" data-act="tab" data-tab="checklist">${ic('list')}<span>Checklist</span></button>
            <button class="tab" data-act="tab" data-tab="ask">${ic('chat')}<span>Ask AI</span></button>
            <button class="tab" data-act="tab" data-tab="explore">${ic('search')}<span>Explore document</span></button>
          </div>
          <div id="tab-content"></div>
        </div>
        <aside class="viewer reveal" style="--d:7">
          <div class="v-head"><span class="tile" style="--c:#5b5bf0">${ic('eye')}</span><div><b>Source viewer</b><small>Proof straight from the tender</small></div>
            <div class="v-nav"><button class="icon-btn" data-act="prev" id="vprev">${ic('left')}</button>
              <span class="v-page"><input type="number" id="vpage" min="1" max="${S.pages}" value="1"> / ${S.pages}</span>
              <button class="icon-btn" data-act="next" id="vnext">${ic('right')}</button></div></div>
          <div id="v-quote"></div>
          <div class="v-body" id="v-body"></div>
          <div class="v-foot"><span>Use ← → keys to flip pages</span><button data-act="toggletext" id="v-toggle">Show extracted text</button></div>
          <div id="v-text"></div>
        </aside>
      </section>
    </main>`;
  }

  /* ---- checklist tab ---- */
  function listHTML() {
    const q = S.q.trim().toLowerCase();
    let html = '';
    CATS.forEach(c => {
      if (S.filter !== 'all' && S.filter !== c.key) return;
      const rows = S.items.filter(it => it.cat === c.key && (!q || it.text.toLowerCase().includes(q)));
      if (!rows.length) return;
      const all = S.items.filter(it => it.cat === c.key);
      html += `<section class="cat" style="--c:${c.c}">
        <div class="cat-head"><span class="tile" style="--c:${c.c}">${ic(c.icon)}</span><h3>${c.label}</h3><span class="count" data-cat-count="${c.key}">0/${all.length}</span></div>
        <div class="cat-bar"><span data-cat-bar="${c.key}"></span></div>
        <ul class="items">${rows.map(it => `<li class="item ${S.checked.has(it.id) ? 'done' : ''} ${S.sel && S.sel.itemId === it.id ? 'sel' : ''}" data-act="item" data-id="${it.id}" data-page="${it.page || ''}">
          <label class="check"><input type="checkbox" class="chk" data-id="${it.id}" ${S.checked.has(it.id) ? 'checked' : ''}><span class="box">${ic('check')}</span></label>
          <div class="item-text">${esc(it.text)}</div>
          ${it.page ? `<button class="src" data-act="open" data-page="${it.page}" data-hl="${esc(it.text)}" data-item="${it.id}">${ic('file')} p.${it.page}</button>` : ''}
        </li>`).join('')}</ul></section>`;
    });
    return html || `<div class="empty"><div class="tile">${ic('search')}</div><b>Nothing matches</b>Try a different word or clear the filter.</div>`;
  }

  function checklistHTML() {
    return `<div class="panel">
      <div class="toolbar">
        <div class="search">${ic('search')}<input id="cl-q" placeholder="Search requirements…" value="${esc(S.q)}" autocomplete="off"></div>
        <div class="mini-prog"><div class="mini-ring"><svg viewBox="0 0 44 44"><circle class="bgc" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" id="mini-fg"/></svg></div>
          <div><span id="prog-num">0 / ${S.items.length}</span><small>done</small></div></div>
      </div>
      <div class="filters">${[{ key: 'all', label: 'All' }, ...CATS].map(c => `<button class="fchip ${S.filter === c.key ? 'active' : ''}" data-act="filter" data-key="${c.key}">${c.label}${c.key !== 'all' ? ` · ${S.items.filter(i => i.cat === c.key).length}` : ` · ${S.items.length}`}</button>`).join('')}</div>
      <div id="cl-list">${listHTML()}</div>
    </div>`;
  }

  function refreshProgress() {
    const total = S.items.length, done = S.items.filter(i => S.checked.has(i.id)).length;
    const fg = $('#mini-fg'); if (fg) fg.style.strokeDashoffset = 113 * (1 - (total ? done / total : 0));
    const num = $('#prog-num'); if (num) num.textContent = `${done} / ${total}`;
    CATS.forEach(c => {
      const all = S.items.filter(i => i.cat === c.key), d = all.filter(i => S.checked.has(i.id)).length;
      const cnt = $(`[data-cat-count="${c.key}"]`); if (cnt) cnt.textContent = `${d}/${all.length}`;
      const bar = $(`[data-cat-bar="${c.key}"]`); if (bar) bar.style.width = (all.length ? d / all.length * 100 : 0) + '%';
    });
    return { done, total };
  }

  /* ---- ask tab ---- */
  function fmt(t) {
    let s = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let out = '', inList = false;
    s.split('\n').forEach(ln => {
      const m = ln.match(/^\s*[*\-•]\s+(.*)/);
      if (m) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${m[1]}</li>`; }
      else { if (inList) { out += '</ul>'; inList = false; } if (ln.trim()) out += `<p>${ln}</p>`; }
    });
    if (inList) out += '</ul>';
    const chip = n => `<button class="src" data-act="open" data-page="${n}">${ic('file')}p.${n}</button>`;
    return out.replace(/\((?:p\.|pp\.|page)\s*(\d+)\)/gi, (_, n) => chip(n)).replace(/\[Page (\d+)\]/gi, (_, n) => chip(n));
  }

  function chatHTML() {
    return `<div class="panel chat">
      <div class="chat-head"><span class="tile" style="--c:#8b5cf6">${ic('sparkle')}</span><div><b>Ask this tender anything</b><small>Answers use only the tender text, with page references</small></div></div>
      <div class="msgs" id="msgs"></div>
      <form class="composer" id="composer"><div class="search">${ic('chat')}<input id="askq" placeholder="e.g. What documents must I upload?" autocomplete="off"></div>
        <button class="send" type="submit" aria-label="Send">${ic('send')}</button></form>
    </div>`;
  }

  function renderMsgs() {
    const box = $('#msgs'); if (!box) return;
    if (!S.chat.length) {
      box.innerHTML = `<div class="empty"><div class="tile" style="--c:#8b5cf6">${ic('sparkle')}</div><b>Ask a question</b>Try one of these to get started.
        <div class="sugg">${SUGGEST.map(q => `<button data-act="sugg" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
      return;
    }
    box.innerHTML = S.chat.map(m => {
      if (m.role === 'user') return `<div class="msg user">${esc(m.text)}</div>`;
      if (m.typing) return `<div class="msg ai"><span class="typing"><i></i><i></i><i></i></span></div>`;
      const srcs = (m.sources || []).length ? `<div class="msg-srcs">Searched pages ${m.sources.map(n => `<button class="src" data-act="open" data-page="${n}">${n}</button>`).join('')}</div>` : '';
      return `<div class="msg ai">${fmt(m.text)}${srcs}</div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  async function ask(q) {
    q = q.trim(); if (!q || S.asking) return;
    S.asking = true; S.chat.push({ role: 'user', text: q }, { role: 'ai', typing: true }); renderMsgs();
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: S.doc, question: q }) });
      const j = await r.json();
      S.chat.pop();
      if (!r.ok) throw new Error(j.error || 'Something went wrong');
      S.chat.push({ role: 'ai', text: j.answer, sources: j.sources });
    } catch (err) { S.chat.pop(); S.chat.push({ role: 'ai', text: 'Sorry, that did not work: ' + err.message }); }
    S.asking = false; renderMsgs();
  }

  /* ---- explore tab ---- */
  function exploreHTML() {
    const cur = S.sel ? S.sel.page : 0;
    return `<div class="panel">
      <div class="toolbar"><div class="search">${ic('search')}<input id="ex-q" placeholder="Find a word or phrase anywhere in the tender…" autocomplete="off"></div></div>
      <div id="ex-res"><div class="empty"><div class="tile">${ic('search')}</div><b>Search the full document</b>Type at least 2 letters, for example “blacklisted” or “GST”.</div></div>
      <div class="h4">All pages</div>
      <div class="pages-grid">${Array.from({ length: S.pages }, (_, i) => `<button class="pg ${cur === i + 1 ? 'cur' : ''}" data-act="open" data-page="${i + 1}">${i + 1}</button>`).join('')}</div>
    </div>`;
  }

  let exTimer = null;
  async function runSearch(q) {
    const box = $('#ex-res'); if (!box) return;
    if (q.trim().length < 2) { box.innerHTML = `<div class="empty"><div class="tile">${ic('search')}</div><b>Search the full document</b>Type at least 2 letters.</div>`; return; }
    const r = await fetch(`/api/search/${S.doc}?q=${encodeURIComponent(q)}`); const j = await r.json();
    if (!j.results.length) { box.innerHTML = `<div class="empty"><div class="tile">${ic('search')}</div><b>No matches</b>“${esc(q)}” does not appear in this document.</div>`; return; }
    const re = new RegExp(rx(esc(q.trim())), 'gi');
    box.innerHTML = `<div class="results-list">${j.results.map(x => `<button class="res" data-act="open" data-page="${x.page}" data-hl="${esc(q.trim())}">
      <span class="src">${ic('file')} p.${x.page}</span><div><p>…${esc(x.snippet).replace(re, m => `<mark>${m}</mark>`)}…</p><small>${x.count} match${x.count > 1 ? 'es' : ''} on this page</small></div></button>`).join('')}</div>`;
  }

  /* ------------------------------------------------------------- viewer */
  let vToken = 0;
  function updateViewer() {
    const body = $('#v-body'); if (!body) return;
    const prev = $('#vprev'), next = $('#vnext'), inp = $('#vpage'), quote = $('#v-quote');
    if (!S.sel) {
      body.innerHTML = `<div class="v-empty"><div><div class="tile">${ic('eye')}</div><b>Pick a requirement</b>Click any page chip, such as <span class="src" style="vertical-align:middle">p.14</span>, to see exactly where it came from.</div></div>`;
      prev.disabled = next.disabled = true; quote.innerHTML = ''; return;
    }
    const { page, hl } = S.sel, token = ++vToken;
    prev.disabled = page <= 1; next.disabled = page >= S.pages; inp.value = page;
    quote.innerHTML = hl ? `<div class="v-quote"><b>Highlighted:</b> ${esc(hl)}</div>` : '';
    body.innerHTML = '<div class="skel"></div><img alt="">';
    const img = $('img', body);
    img.alt = `Tender page ${page}`;
    img.onload = () => { if (token !== vToken) return; img.classList.add('ready'); const s = $('.skel', body); if (s) s.remove(); };
    img.onerror = () => { if (token !== vToken) return; body.innerHTML = `<div class="v-empty"><div><b>Could not render this page</b></div></div>`; };
    img.src = `/api/page/${S.doc}/${page}` + (hl ? `?hl=${encodeURIComponent(hl.slice(0, 200))}` : '');
    body.scrollTop = 0;
    $$('.pg').forEach(b => b.classList.toggle('cur', +b.dataset.page === page));
    if (S.showText) loadText();
  }

  async function loadText() {
    const box = $('#v-text'); if (!box || !S.sel) return;
    box.innerHTML = '<div class="v-text">Loading…</div>';
    const r = await fetch(`/api/text/${S.doc}/${S.sel.page}`); const j = await r.json();
    if (S.sel && S.sel.page === j.page) box.innerHTML = `<div class="v-text">${esc(j.text) || '(no text on this page)'}</div>`;
  }

  function openPage(page, hl, itemId) {
    page = Math.max(1, Math.min(S.pages, +page || 1));
    S.sel = { page, hl: hl || null, itemId: itemId || null };
    $$('.item').forEach(li => li.classList.toggle('sel', li.dataset.id === itemId));
    updateViewer();
  }

  /* ------------------------------------------------------------- render */
  function renderTab() {
    const box = $('#tab-content'); if (!box) return;
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === S.tab));
    if (S.tab === 'checklist') { box.innerHTML = checklistHTML(); refreshProgress(); }
    else if (S.tab === 'ask') { box.innerHTML = chatHTML(); renderMsgs(); }
    else { box.innerHTML = exploreHTML(); }
    box.firstElementChild.style.animation = 'fadeUp .45s both';
  }

  function render() {
    const app = $('#app');
    if (S.view === 'landing') app.innerHTML = landingHTML();
    else if (S.view === 'analyzing') app.innerHTML = analyzingHTML();
    else {
      app.innerHTML = resultsHTML();
      renderTab(); updateViewer();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const fg = $('.ring .fg'); if (fg) fg.style.strokeDashoffset = 289 * (1 - parseFloat(fg.dataset.frac || 0));
      }));
    }
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------- export */
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  function exportCSV() {
    const rows = [['Category', 'Requirement', 'Source Page', 'Done']];
    [['Tender title', 'tender_title'], ...STATS.map(s => [s.label, s.key])].forEach(([l, k]) => rows.push([l, val(k), pg(k) || '', '']));
    S.items.forEach(it => rows.push([CATS.find(c => c.key === it.cat).label, it.text, it.page || '', S.checked.has(it.id) ? 'Yes' : 'No']));
    download('tender_checklist.csv', '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  }

  /* ----------------------------------------------------------- confetti */
  function confetti() {
    const c = $('#confetti'), ctx = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    const cols = ['#5b5bf0', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];
    const ps = Array.from({ length: 150 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight * .38, vx: (Math.random() - .5) * 15, vy: -Math.random() * 14 - 4, s: Math.random() * 8 + 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => { p.vy += .36; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); ctx.restore(); });
      if (++t < 160) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }

  /* ------------------------------------------------------------ actions */
  const actions = {
    theme() {
      S.theme = S.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', S.theme);
      try { localStorage.setItem('tl-theme', S.theme); } catch { /* ignore */ }
      const b = $('[data-act="theme"]'); if (b) b.innerHTML = ic(S.theme === 'dark' ? 'sun' : 'moon');
    },
    browse() { $('#file').click(); },
    remove() { S.file = null; render(); },
    analyze() {
      if (!S.file) return;
      const fd = new FormData(); fd.append('file', S.file); fd.append('ocr', S.ocr ? '1' : '0');
      runAnalyze('/api/analyze', fd);
    },
    sample() { const fd = new FormData(); fd.append('ocr', S.ocr ? '1' : '0'); S.file = null; runAnalyze('/api/analyze-sample', fd); },
    new() { S.view = 'landing'; S.file = null; S.sel = null; render(); },
    tab(t) { S.tab = t.dataset.tab; renderTab(); },
    filter(t) { S.filter = t.dataset.key; renderTab(); },
    open(t, e) {
      e.stopPropagation();
      openPage(t.dataset.page, t.dataset.hl, t.dataset.item);
      if (window.innerWidth <= 1120) $('.viewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    item(t, e) {
      if (e.target.closest('.check') || e.target.closest('.src')) return;
      if (t.dataset.page) { const it = S.items.find(i => i.id === t.dataset.id); openPage(t.dataset.page, it.text, t.dataset.id); }
    },
    prev() { if (S.sel) openPage(S.sel.page - 1, null, null); },
    next() { if (S.sel) openPage(S.sel.page + 1, null, null); },
    toggletext(t) { S.showText = !S.showText; t.textContent = S.showText ? 'Hide extracted text' : 'Show extracted text'; if (S.showText) loadText(); else $('#v-text').innerHTML = ''; },
    menu(t, e) { e.stopPropagation(); $('#menu').classList.toggle('open'); },
    csv() { exportCSV(); $('#menu').classList.remove('open'); toast('Checklist CSV downloaded'); },
    json() { download('tender_checklist.json', JSON.stringify(S.result, null, 2), 'application/json'); $('#menu').classList.remove('open'); toast('JSON downloaded'); },
    sugg(t) { ask(t.dataset.q); },
  };

  document.addEventListener('click', e => {
    const m = $('#menu'); if (m && !e.target.closest('.menu-wrap')) m.classList.remove('open');
    const t = e.target.closest('[data-act]'); if (!t) return;
    const fn = actions[t.dataset.act]; if (fn) fn(t, e);
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'file') { setFile(e.target.files[0]); }
    else if (e.target.id === 'ocr') { S.ocr = e.target.checked; }
    else if (e.target.classList.contains('chk')) {
      const id = e.target.dataset.id;
      e.target.checked ? S.checked.add(id) : S.checked.delete(id);
      e.target.closest('.item').classList.toggle('done', e.target.checked);
      saveChecks();
      const { done, total } = refreshProgress();
      if (e.target.checked && total && done === total) { confetti(); toast('All requirements checked. Great work!'); }
    } else if (e.target.id === 'vpage') { openPage(e.target.value, null, null); }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'cl-q') { S.q = e.target.value; $('#cl-list').innerHTML = listHTML(); refreshProgress(); }
    else if (e.target.id === 'ex-q') { clearTimeout(exTimer); const v = e.target.value; exTimer = setTimeout(() => runSearch(v), 260); }
  });

  document.addEventListener('submit', e => {
    if (e.target.id === 'composer') { e.preventDefault(); const i = $('#askq'); const q = i.value; i.value = ''; ask(q); }
  });

  document.addEventListener('keydown', e => {
    if (S.view !== 'results' || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') actions.next(); else if (e.key === 'ArrowLeft') actions.prev();
  });

  /* drag & drop */
  ['dragenter', 'dragover'].forEach(n => document.addEventListener(n, e => {
    e.preventDefault(); const d = e.target.closest && e.target.closest('.drop'); if (d && !S.file) d.classList.add('over');
  }));
  document.addEventListener('dragleave', e => { const d = $('.drop'); if (d && !d.contains(e.relatedTarget)) d.classList.remove('over'); });
  document.addEventListener('drop', e => {
    e.preventDefault(); const d = $('.drop'); if (d) d.classList.remove('over');
    if (S.view === 'landing' && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });

  function setFile(f) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { toast('Please choose a PDF file.', 'err'); return; }
    if (f.size > 100 * 1048576) { toast('That file is larger than 100 MB.', 'err'); return; }
    S.file = f; render();
  }

  /* --------------------------------------------------------------- boot */
  fetch('/api/config').then(r => r.json()).then(c => { S.sample = !!c.sample; if (S.view === 'landing') render(); }).catch(() => {});
  render();
})();
