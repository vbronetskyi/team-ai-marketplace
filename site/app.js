/* Catalog of team-ai-marketplace. Static: reads catalog-index.json (built in CI from the
   manifests, READMEs, CHANGELOGs and component files) and does everything else in the
   browser — fuzzy search, facets, plugin and artifact pages, what's new, ⌘K. */
(() => {
  'use strict';

  const KIND = {
    plugin: { label: 'Плагін', many: 'Плагіни', icon: '◆' },
    skill: { label: 'Скіл', many: 'Скіли', icon: '✦' },
    agent: { label: 'Агент', many: 'Агенти', icon: '◉' },
    command: { label: 'Команда', many: 'Команди', icon: '⌘' },
    hook: { label: 'Хук', many: 'Хуки', icon: '⚓' },
  };
  const KIND_ORDER = ['plugin', 'skill', 'agent', 'command', 'hook'];

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('#app');
  const view = $('#view');
  const layer = $('#layer');
  const state = { data: null, docs: [], q: '', kinds: new Set(), keywords: new Set(), authors: new Set(), sort: 'relevance', palette: false, paletteSel: 0 };

  // ---------- utils ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const kindVar = (k) => `--k:var(--kind-${k})`;
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  /** Minimal Markdown: headings, fenced code, lists, tables, paragraphs, inline code/links/bold. */
  function md(src) {
    const inline = (t) =>
      esc(t)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<span title="$2">$1</span>');
    const lines = String(src ?? '').replace(/\r/g, '').split('\n');
    const out = [];
    for (let i = 0; i < lines.length; ) {
      const l = lines[i];
      if (/^```/.test(l)) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      } else if (/^#{1,4} /.test(l)) {
        const n = l.match(/^#+/)[0].length;
        out.push(`<h${Math.min(n + 1, 4)}>${inline(l.replace(/^#+ /, ''))}</h${Math.min(n + 1, 4)}>`);
        i++;
      } else if (/^\|/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
        out.push(`<table>${body.map((r, j) => `<tr>${cells(r).map((c) => (j === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</table>`);
      } else if (/^\s*([-*]|\d+\.) /.test(l)) {
        const ordered = /^\s*\d+\./.test(l);
        const items = [];
        while (i < lines.length && (/^\s*([-*]|\d+\.) /.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
          if (/^\s*([-*]|\d+\.) /.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.) /, ''));
          else items[items.length - 1] += ' ' + lines[i].trim();
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      } else if (l.trim() === '' || /^---\s*$/.test(l)) {
        i++;
      } else {
        const buf = [];
        while (i < lines.length && lines[i].trim() !== '' && !/^(```|#{1,4} |\||\s*([-*]|\d+\.) )/.test(lines[i])) buf.push(lines[i++]);
        out.push(`<p>${inline(buf.join(' '))}</p>`);
      }
    }
    return out.join('\n');
  }

  // ---------- search ----------
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  /** Fuzzy score of one token against a field: exact word > prefix > substring > subsequence. */
  function tokenScore(tok, text) {
    if (!text) return 0;
    if (new RegExp(`(^|[^a-zа-яіїєґ0-9])${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-zа-яіїєґ0-9])`).test(text)) return 3;
    if (new RegExp(`(^|[^a-zа-яіїєґ0-9])${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)) return 2;
    if (text.includes(tok)) return 1.5;
    if (tok.length >= 4) {
      let j = 0;
      for (const ch of text) if (ch === tok[j] && ++j === tok.length) return 0.5;
    }
    return 0;
  }
  const FIELDS = [['name', 6], ['keywords', 4], ['description', 3], ['meta', 2], ['body', 1]];
  function score(doc, q) {
    const toks = norm(q).split(/[\s,]+/).filter((t) => t.length > 1);
    if (toks.length === 0) return 1;
    let total = 0;
    for (const t of toks) {
      let best = 0;
      for (const [f, w] of FIELDS) best = Math.max(best, tokenScore(t, doc.idx[f]) * w);
      if (best === 0) return 0; // every token must match somewhere
      total += best;
    }
    return total;
  }

  function buildDocs(data) {
    const plugins = data.plugins.map((p) => ({
      kind: 'plugin', id: p.name, name: p.displayName, plugin: p.name, version: p.version, description: p.description, keywords: p.keywords,
      author: p.author, updated: p.updated, install: p.install, ref: p,
      idx: { name: norm(p.name + ' ' + p.displayName), keywords: norm(p.keywords.join(' ')), description: norm(p.description), meta: norm(p.components.map((c) => c.name).join(' ')), body: norm(p.readme) },
    }));
    const items = data.items.map((it) => ({
      kind: it.kind, id: it.id, name: it.name, plugin: it.plugin, version: it.version, description: it.description, keywords: it.keywords,
      author: it.author, updated: it.updated, install: `claude plugin install ${it.plugin}@${data.marketplace.name}`, ref: it,
      idx: { name: norm(it.name + ' ' + it.id), keywords: norm(it.keywords.join(' ')), description: norm(it.description), meta: norm([it.invocation, ...(it.tools || []), ...(it.skills || []), it.model].join(' ')), body: norm(it.body) },
    }));
    return [...plugins, ...items];
  }

  function filtered() {
    const q = state.q.trim();
    let list = state.docs.map((d) => ({ d, s: score(d, q) })).filter((x) => x.s > 0);
    list = list.filter(({ d }) => (state.kinds.size ? state.kinds.has(d.kind) : true));
    list = list.filter(({ d }) => (state.keywords.size ? d.keywords.some((k) => state.keywords.has(k)) : true));
    list = list.filter(({ d }) => (state.authors.size ? state.authors.has(d.author) : true));
    const by = {
      relevance: (a, b) => b.s - a.s || KIND_ORDER.indexOf(a.d.kind) - KIND_ORDER.indexOf(b.d.kind) || a.d.name.localeCompare(b.d.name),
      name: (a, b) => a.d.name.localeCompare(b.d.name),
      updated: (a, b) => String(b.d.updated).localeCompare(String(a.d.updated)),
    }[state.sort];
    return list.sort(by).map((x) => x.d);
  }

  // ---------- pieces ----------
  const kindTag = (k) => `<span class="kind" style="${kindVar(k)}">${esc(KIND[k]?.label ?? k)}</span>`;
  const docHref = (d) => (d.kind === 'plugin' ? `#/plugin/${encodeURIComponent(d.plugin)}` : `#/item/${encodeURIComponent(d.plugin)}/${d.kind}/${encodeURIComponent(d.name)}`);
  function card(d) {
    const meta = d.kind === 'plugin' ? `${d.ref.components.length} компонентів · ${esc(d.author)}` : `у ${esc(d.plugin)}`;
    return `<div class="card">
      <div>
        <div class="card-top">${kindTag(d.kind)}<span class="ver">v${esc(d.version)}</span></div>
        <a class="card-title" href="${docHref(d)}">${esc(d.kind === 'plugin' ? d.name : d.ref.invocation || d.name)}</a>
        <p>${esc(d.description)}</p>
        <div class="kws">${d.keywords.slice(0, 4).map((k) => `<span class="kw">#${esc(k)}</span>`).join('')}</div>
      </div>
      <div class="card-foot"><span class="meta">${meta}</span>
        <div class="btns"><button class="btn" data-copy="${esc(d.install)}">Install</button><a class="btn" href="${docHref(d)}" style="display:inline-flex;align-items:center">Відкрити</a></div>
      </div>
    </div>`;
  }
  const installBox = (cmd) => `<div class="install"><span class="dollar">$</span><code>${esc(cmd)}</code><button class="btn primary" data-copy="${esc(cmd)}">Копіювати</button>`;

  // ---------- views ----------
  function home() {
    const d = state.data;
    const counts = KIND_ORDER.map((k) => ({ k, n: state.docs.filter((x) => x.kind === k).length }));
    const kws = [...new Set(d.plugins.flatMap((p) => p.keywords))].slice(0, 8);
    const recent = [...d.plugins].sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
    const news = releases().slice(0, 4);
    view.innerHTML = `<main>
      <section class="hero">
        <div class="eyebrow">Marketplace плагінів · скілів · агентів</div>
        <h1>Знайди потрібний артефакт<br>і постав його одним copy-paste</h1>
        <p>Клієнтський fuzzy-пошук по описах, frontmatter і тілу markdown. Без бекенду: уся статика зібрана в CI з маніфестів репозиторію.</p>
        <div class="hero-search"><span>⌕</span><input id="hero-q" type="search" placeholder='Опиши, що треба, напр. "архітектура бекенду" або "spec"' autocomplete="off"></div>
        <div class="chips">${kws.map((k) => `<button class="chip" data-kw="${esc(k)}">#${esc(k)}</button>`).join('')}</div>
      </section>
      <section class="stats">${counts.map(({ k, n }) => `<button class="stat" data-kind="${k}"><b>${n}</b><span>${KIND[k].many}</span></button>`).join('')}</section>
      <div class="section-head"><h2>Плагіни</h2><a href="#/search">Усі артефакти →</a></div>
      <section class="grid">${recent.map((p) => card(state.docs.find((x) => x.kind === 'plugin' && x.plugin === p.name))).join('')}</section>
      <div class="section-head" style="margin-top:36px"><h2>Що нового</h2><a href="#/new">Усі релізи →</a></div>
      <div class="timeline">${news.map(releaseRow).join('')}</div>
      <div class="note" style="margin-top:28px">Вперше тут? <a href="#/start">Як підключити marketplace</a> — три команди.</div>
    </main>`;
    const hq = $('#hero-q');
    hq.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(`#/search?q=${encodeURIComponent(hq.value)}`); });
    view.querySelectorAll('[data-kw]').forEach((b) => b.addEventListener('click', () => { state.keywords = new Set([b.dataset.kw]); state.kinds.clear(); go('#/search'); }));
    view.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { state.kinds = new Set([b.dataset.kind]); state.keywords.clear(); go('#/search'); }));
  }

  function facetBtn(label, count, on, attr) {
    return `<button class="facet${on ? ' on' : ''}" ${attr}><span>${esc(label)}</span><span class="count">${count}</span></button>`;
  }
  function search() {
    const all = filtered();
    const base = state.docs.filter((d) => score(d, state.q) > 0);
    const kws = [...new Set(state.docs.flatMap((d) => d.keywords))].sort();
    const authors = [...new Set(state.docs.map((d) => d.author))];
    const heading = state.q ? `Результати для «${esc(state.q)}»` : state.kinds.size === 1 ? KIND[[...state.kinds][0]].many : 'Усі артефакти';
    view.innerHTML = `<main><div class="layout">
      <aside class="facets">
        <div class="facet-title">Тип</div>
        ${KIND_ORDER.map((k) => facetBtn(KIND[k].many, base.filter((d) => d.kind === k).length, state.kinds.has(k), `data-fk="${k}"`)).join('')}
        <div class="facet-title">Keywords</div>
        <div class="facet-kws">${kws.map((k) => `<button class="chip${state.keywords.has(k) ? ' on' : ''}" data-fw="${esc(k)}">#${esc(k)}</button>`).join('')}</div>
        <div class="facet-title">Автор</div>
        ${authors.map((a) => facetBtn(a, base.filter((d) => d.author === a).length, state.authors.has(a), `data-fa="${esc(a)}"`)).join('')}
      </aside>
      <section>
        <div class="results-head">
          <div><h1>${heading}</h1><div class="meta">${all.length} ${all.length === 1 ? 'результат' : 'результатів'}</div></div>
          <label>Сортувати <select id="sort">
            <option value="relevance"${state.sort === 'relevance' ? ' selected' : ''}>За релевантністю</option>
            <option value="name"${state.sort === 'name' ? ' selected' : ''}>За назвою</option>
            <option value="updated"${state.sort === 'updated' ? ' selected' : ''}>Нещодавно оновлені</option>
          </select></label>
        </div>
        ${all.length ? `<div class="grid">${all.map(card).join('')}</div>` : `<div class="empty"><div>🔍</div><h3>Нічого не знайшли</h3><p>Спробуйте скинути фільтри або змінити запит.</p><button class="btn primary" id="clear">Скинути фільтри</button></div>`}
      </section>
    </div></main>`;
    const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));
    view.querySelectorAll('[data-fk]').forEach((b) => b.addEventListener('click', () => { toggle(state.kinds, b.dataset.fk); search(); }));
    view.querySelectorAll('[data-fw]').forEach((b) => b.addEventListener('click', () => { toggle(state.keywords, b.dataset.fw); search(); }));
    view.querySelectorAll('[data-fa]').forEach((b) => b.addEventListener('click', () => { toggle(state.authors, b.dataset.fa); search(); }));
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; search(); });
    $('#clear')?.addEventListener('click', () => { state.kinds.clear(); state.keywords.clear(); state.authors.clear(); state.q = ''; $('#q').value = ''; search(); });
  }

  function plugin(name) {
    const p = state.data.plugins.find((x) => x.name === name);
    if (!p) return notFound();
    const items = state.data.items.filter((i) => i.plugin === name);
    const groups = KIND_ORDER.filter((k) => k !== 'plugin').map((k) => ({ k, list: items.filter((i) => i.kind === k) })).filter((g) => g.list.length);
    const pluginLink = (n) => `<a class="btn" href="#/plugin/${encodeURIComponent(n)}" style="display:inline-flex;align-items:center">${esc(n)}</a>`;
    view.innerHTML = `<main>
      <button class="back" onclick="history.back()">← Назад</button>
      <div class="detail-head"><div class="detail-icon" style="${kindVar('plugin')}">◆</div>
        <div>
          <div class="title-row"><h1>${esc(p.displayName)}</h1><span class="ver">v${esc(p.version)}</span><span class="ok">✓ Claude Code</span>${p.evals.length ? `<span class="ok">evals: ${p.evals.length}</span>` : ''}</div>
          <p>${esc(p.description)}</p>
          <div class="meta">${esc(p.author)} · оновлено ${fmtDate(p.updated)} · ${esc(p.license ?? '')} · тег <span class="mono">${esc(p.tag)}</span></div>
        </div>
      </div>
      ${installBox(p.install)}<a class="btn" href="${esc(p.githubUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center">View on GitHub ↗</a></div>
      <h2>Склад плагіна</h2>
      <div class="comp-groups">${groups.map((g) => `<div class="comp-group" style="${kindVar(g.k)}">
        <div class="comp-group-head"><span class="dot"></span>${KIND[g.k].many}<span class="meta">${g.list.length}</span></div>
        ${g.list.map((i) => `<a class="comp" href="#/item/${encodeURIComponent(name)}/${i.kind}/${encodeURIComponent(i.name)}"><div class="row"><b>${esc(i.name)}</b><span class="inv">${esc(i.invocation)}</span></div><div class="desc">${esc(i.description)}</div></a>`).join('')}
      </div>`).join('')}</div>
      ${p.deps.length ? `<h2>Залежності</h2><div class="deps">${p.deps.map((d) => `${pluginLink(d.name)}<span class="meta mono" style="align-self:center">${esc(d.range)}</span>`).join('')}</div>` : ''}
      ${p.dependents.length ? `<h2>Від нього залежать</h2><div class="deps">${p.dependents.map(pluginLink).join('')}</div>` : ''}
      <h2>README</h2><div class="prose">${md(p.readme.replace(/^# .*\n/, ''))}</div>
      <h2>Changelog</h2><div class="changes">${p.changelog.map((c) => `<div class="change"><div class="row"><b>v${esc(c.version)}</b><span class="meta">${fmtDate(c.date)}</span></div><ul>${c.items.map((x) => `<li>${md(x).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul></div>`).join('')}</div>
    </main>`;
  }

  function item(pluginName, kind, name) {
    const it = state.data.items.find((i) => i.plugin === pluginName && i.kind === kind && i.name === name);
    if (!it) return notFound();
    const p = state.data.plugins.find((x) => x.name === pluginName);
    view.innerHTML = `<main>
      <div class="crumbs"><a href="#/search">Каталог</a> / <a href="#/plugin/${encodeURIComponent(pluginName)}">${esc(p.displayName)}</a> / ${esc(name)}</div>
      <div class="detail-head"><div class="detail-icon" style="${kindVar(kind)}">${KIND[kind].icon}</div>
        <div>
          <div class="title-row">${kindTag(kind)}<h1>${esc(name)}</h1>${it.invocation ? `<span class="pill">${esc(it.invocation)}</span>` : ''}</div>
          <p>${esc(it.description)}</p>
          <div class="meta">з плагіна ${esc(p.displayName)} v${esc(p.version)}${it.model ? ` · модель ${esc(it.model)}` : ''}</div>
        </div>
      </div>
      ${it.tools?.length ? `<div class="box-label">Tools / permissions</div><div class="tools">${it.tools.map((t) => `<span class="tool">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.skills?.length ? `<div class="box-label">Підвантажує скіли</div><div class="tools">${it.skills.map((t) => `<span class="tool">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.files?.length ? `<div class="box-label">Файли поруч</div><div class="tools">${it.files.map((t) => `<span class="tool">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="box-label">Встановлення (разом із плагіном)</div>
      ${installBox(`claude plugin install ${pluginName}@${state.data.marketplace.name}`)}<a class="btn" href="${esc(it.githubUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center">Джерело ↗</a></div>
      <h2>Документація</h2><div class="prose">${md(it.body)}</div>
    </main>`;
  }

  function releases() {
    return state.data.plugins
      .flatMap((p) => p.changelog.map((c) => ({ ...c, plugin: p.name, displayName: p.displayName })))
      .sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version));
  }
  function releaseRow(r) {
    return `<a class="release" href="#/plugin/${encodeURIComponent(r.plugin)}" style="color:inherit;text-decoration:none">
      <div><div class="v">v${esc(r.version)}</div><div class="meta">${fmtDate(r.date)}</div></div>
      <div><b>${esc(r.displayName)}</b><div class="meta" style="color:var(--text-dim)">${esc(r.items.join(' · ').replace(/`/g, ''))}</div></div></a>`;
  }
  function whatsNew() {
    view.innerHTML = `<main><a class="back" href="#/">← На головну</a><div class="section-head"><h1 style="margin:0">Що нового</h1>
      <a href="${esc(state.data.marketplace.repo)}/tags" target="_blank" rel="noopener">Теги релізів ↗</a></div>
      <div class="timeline" style="margin-top:16px">${releases().map(releaseRow).join('')}</div></main>`;
  }
  function start() {
    const m = state.data.marketplace;
    const steps = [
      { t: 'Додай marketplace', d: 'Один раз на машину: Claude Code запам\'ятає джерело плагінів.', c: m.addCommand },
      { t: 'Постав плагін', d: 'Залежності плагіна поставляться самі. Для проєкту додай --scope project.', c: `claude plugin install sdd-engineering@${m.name} --scope project` },
      { t: 'Перевір', d: 'Список встановлених плагінів з версіями; нова сесія підхопить їх.', c: 'claude plugin list' },
    ];
    view.innerHTML = `<main style="max-width:780px"><a class="back" href="#/">← На головну</a><h1>Як підключити marketplace</h1>
      <p style="color:var(--text-dim)">Три кроки. Спершу додай marketplace як джерело, потім став окремі плагіни.</p>
      <div class="steps">${steps.map((s, i) => `<div class="step"><div class="n">${i + 1}</div><div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>${installBox(s.c)}</div></div></div>`).join('')}</div>
      <div class="note"><strong>marketplace update vs plugin update.</strong> Перше оновлює список джерел (які плагіни й версії існують), друге — код конкретного встановленого плагіна: <code>claude plugin marketplace update ${esc(m.name)}</code>, потім <code>claude plugin update &lt;plugin&gt;@${esc(m.name)}</code>.</div>
      <h2>Для всієї команди</h2><div class="prose">${md('Закоміть у проєкт `.claude/settings.json`:\n\n```json\n' + JSON.stringify({ extraKnownMarketplaces: { [m.name]: { source: { source: 'github', repo: m.repo.replace('https://github.com/', '') } } }, enabledPlugins: Object.fromEntries(state.data.plugins.map((p) => [`${p.name}@${m.name}`, true])) }, null, 2) + '\n```')}</div>
    </main>`;
  }
  function notFound() {
    view.innerHTML = `<main><div class="empty"><div>📦</div><h3>Такого артефакту немає</h3><p>Можливо, його перейменували.</p><a class="btn primary" href="#/search">До каталогу</a></div></main>`;
  }

  // ---------- palette ----------
  function renderPalette() {
    if (!state.palette) { layer.innerHTML = ''; return; }
    const q = $('#pq')?.value ?? '';
    const res = state.docs.map((d) => ({ d, s: score(d, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.d);
    state.paletteSel = Math.min(state.paletteSel, Math.max(res.length - 1, 0));
    const list = res.map((d, i) => `<a class="pal${i === state.paletteSel ? ' sel' : ''}" href="${docHref(d)}"><span class="dot" style="${kindVar(d.kind)}"></span><span>${esc(d.kind === 'plugin' ? d.name : d.ref.invocation || d.name)} <span class="sub">· ${esc(d.kind === 'plugin' ? 'v' + d.version : d.plugin)}</span></span><span class="k">${kindTag(d.kind)}</span></a>`).join('');
    if (!$('#pq')) {
      layer.innerHTML = `<div class="overlay" id="ov"><div class="palette"><div class="palette-in"><span>⌕</span><input id="pq" placeholder="Перейти до артефакту…" autocomplete="off"><span class="esc">ESC</span></div><div class="palette-list" id="pl"></div></div></div>`;
      $('#ov').addEventListener('click', (e) => { if (e.target.id === 'ov') closePalette(); });
      $('#pq').addEventListener('input', () => { state.paletteSel = 0; renderPalette(); });
      $('#pq').addEventListener('keydown', (e) => {
        const n = $('#pl').querySelectorAll('.pal').length;
        if (e.key === 'ArrowDown') { state.paletteSel = Math.min(state.paletteSel + 1, n - 1); renderPalette(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { state.paletteSel = Math.max(state.paletteSel - 1, 0); renderPalette(); e.preventDefault(); }
        if (e.key === 'Enter') { const a = $('#pl .pal.sel'); if (a) { closePalette(); location.hash = a.getAttribute('href'); } }
      });
      $('#pq').focus();
    }
    $('#pl').innerHTML = list || '<div class="meta" style="padding:14px">Нічого не знайдено</div>';
    $('#pl').querySelectorAll('.pal').forEach((a) => a.addEventListener('click', closePalette));
  }
  const openPalette = () => { state.palette = true; state.paletteSel = 0; renderPalette(); };
  function closePalette() { state.palette = false; renderPalette(); }

  // ---------- routing, events ----------
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    const h = decodeURIComponent(location.hash.slice(1) || '/');
    const [path, query = ''] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const qp = new URLSearchParams(query);
    if (qp.has('q')) { state.q = qp.get('q'); $('#q').value = state.q; }
    window.scrollTo(0, 0);
    if (parts[0] === 'search') search();
    else if (parts[0] === 'plugin') plugin(parts[1]);
    else if (parts[0] === 'item') item(parts[1], parts[2], parts.slice(3).join('/'));
    else if (parts[0] === 'new') whatsNew();
    else if (parts[0] === 'start') start();
    else home();
  }
  function toast() {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span>✓</span> Скопійовано в буфер';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { /* insecure context */ }
    toast();
  });
  $('#q').addEventListener('input', (e) => { state.q = e.target.value; if (!location.hash.startsWith('#/search')) go('#/search'); else search(); });
  $('#palette-btn').addEventListener('click', openPalette);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); state.palette ? closePalette() : openPalette(); }
    if (e.key === 'Escape' && state.palette) closePalette();
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); }
  });
  function setTheme(t) { app.dataset.theme = t; $('#theme-btn').textContent = t === 'dark' ? '☾' : '☀'; store.set('catalog-theme', t); }
  $('#theme-btn').addEventListener('click', () => setTheme(app.dataset.theme === 'dark' ? 'light' : 'dark'));
  setTheme(store.get('catalog-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  fetch('catalog-index.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      state.data = data;
      state.docs = buildDocs(data);
      $('#gh-link').href = data.marketplace.repo;
      $('#foot').innerHTML = `Зібрано ${esc(new Date(data.builtAt).toLocaleString('uk-UA'))}${data.commit ? ` з коміту <span class="mono">${esc(data.commit)}</span>` : ''} · ${data.plugins.length} плагіни · ${data.items.length} компонентів`;
      window.addEventListener('hashchange', route);
      route();
    })
    .catch((err) => { view.innerHTML = `<main><div class="empty"><div>📦</div><h3>Каталог не завантажився</h3><p>${esc(err.message)}</p></div></main>`; });
})();
