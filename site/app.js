"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const C = { reel: "#006F4C", story: "#3A6FD8", post: "#D9920F", ad: "#C3C7CC", pos: "#006F4C", neu: "#C3C7CC", neg: "#EE3737", g: "#006F4C", b: "#3A6FD8" };
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nf = n => n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("ru-RU");
const kf = n => { if (n == null || isNaN(n)) return "—"; const a = Math.abs(n);
  return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " млн" : a >= 1e4 ? Math.round(n / 1e3) + " тыс" : nf(n); };
const pf = (n, d = 1) => n == null || !isFinite(n) ? "—" : n.toFixed(d).replace(".", ",") + "%";
const sum = (a, f) => a.reduce((s, x) => s + (+(typeof f === "function" ? f(x) : x[f]) || 0), 0);
const med = a => { a = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const dd = s => { const [y, m, d] = s.slice(0, 10).split("-"); return +d + " " + MON[+m - 1]; };
const dshort = s => s.slice(8, 10) + "." + s.slice(5, 7);
const addD = (s, n) => { const d = new Date(s.slice(0, 10) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wday = s => (new Date(s.slice(0, 10) + "T00:00:00Z").getUTCDay() + 6) % 7;
const delta = (a, b) => { if (!b || a == null) return ""; const p = (a - b) / b * 100; if (Math.abs(p) < 0.5) return `<span>≈ как раньше</span>`;
  return `<span class="${p > 0 ? "up" : "dn"}">${p > 0 ? "▲" : "▼"} ${pf(Math.abs(p), 0)}</span> к прошлым ${S.p} дн.`; };
const er = p => p.reach ? (p.total_interactions ?? (p.likes + p.comments + p.saved + p.shares)) / p.reach * 100 : null;
const thumb = (p, cls = "th") => p.th ? `<img class="${cls}" loading="lazy" src="thumbs/${p.id}.jpg" alt="">` : `<div class="thph">нет</div>`;

const D = window.D;
const A = D.acc.map(r => Object.fromEntries([["date", r[0]], ...D.acc_cols.map((c, i) => [c, r[i + 1]])]));
A.forEach(r => { r.org_views = (r.views_reel || 0) + (r.views_story || 0) + (r.views_post || 0); });
const LAST = A.length ? A[A.length - 1].date : new Date().toISOString().slice(0, 10);
const P = D.posts.slice().sort((a, b) => b.ts.localeCompare(a.ts));
const S = { p: 30, tab: "sum", fmt: "", rub: "", sort: "ts", dir: -1 };

// медиана охвата по формату за 90 дней — база для меток «выше/ниже обычного»
const P90 = P.filter(p => p.ts.slice(0, 10) > addD(LAST, -90));
const BASE = {}; for (const f of new Set(P90.map(p => p.fmt))) BASE[f] = med(P90.filter(p => p.fmt === f && p.ts.slice(0, 10) <= addD(LAST, -3)).map(p => p.reach));
const mark = p => { const b = BASE[p.fmt]; if (!b || !p.reach || p.ts.slice(0, 10) > addD(LAST, -2)) return p.ts.slice(0, 10) > addD(LAST, -3) ? `<span class="pill p-m">свежая</span>` : "";
  const r = p.reach / b; return r >= 1.5 ? `<span class="pill p-g">выше обычного ×${r.toFixed(1).replace(".", ",")}</span>` : r <= 0.6 ? `<span class="pill p-r">ниже обычного</span>` : ""; };

function range() { const end = LAST, start = addD(end, -S.p + 1), pend = addD(start, -1), pstart = addD(start, -S.p); return { start, end, pstart, pend }; }
const inR = (s, a, b) => s.slice(0, 10) >= a && s.slice(0, 10) <= b;

// ---------- tooltip ----------
const tip = $("#tip");
function showTip(e, html) { tip.innerHTML = html; tip.style.display = "block"; const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; }
const hideTip = () => tip.style.display = "none";
document.addEventListener("scroll", hideTip, { passive: true });

// ---------- charts ----------
function nice(max) { if (max <= 0) return [0, 1]; const e = Math.pow(10, Math.floor(Math.log10(max))); const s = [1, 2, 2.5, 5, 10].map(x => x * e).find(x => max / x <= 4) || 10 * e; return [s, Math.ceil(max / s) * s]; }
function legend(el, items) { $(el).innerHTML = items.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join(""); }

function stackBars(el, labels, series, o = {}) {
  const box = $(el); const W = Math.max(box.clientWidth, 300), H = o.h || 220, ml = 52, mr = 6, mt = 8, mb = 24, iw = W - ml - mr, ih = H - mt - mb, n = labels.length;
  if (!n) { box.innerHTML = `<div class="empty">Нет данных за период</div>`; return; }
  const tot = labels.map((_, i) => sum(series, s => s.values[i])); const [step, top] = nice(Math.max(...tot));
  const y = v => mt + ih - v / top * ih, bw = iw / n, gap = n > 60 ? 1 : 2, w = Math.max(1, bw - gap);
  let g = "";
  for (let v = 0; v <= top + 1e-9; v += step) g += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${(o.fmt || kf)(v)}</text>`;
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 64)));
  labels.forEach((l, i) => { if (i % every === 0) g += `<text class="ax" x="${ml + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xl ? o.xl(l) : l)}</text>`; });
  labels.forEach((_, i) => { let base = 0; const x = ml + i * bw + gap / 2; const vis = series.filter(s => s.values[i] > 0);
    vis.forEach((s, j) => { const v = s.values[i], y0 = y(base), y1 = y(base + v), h = Math.max(0, y0 - y1 - (j ? 1 : 0)), last = j === vis.length - 1, r = last ? Math.min(4, w / 2, h) : 0;
      g += r ? `<path fill="${s.color}" d="M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z"/>` : `<rect fill="${s.color}" x="${x}" y="${y1}" width="${w}" height="${h}"/>`;
      base += v; }); });
  labels.forEach((_, i) => g += `<rect data-i="${i}" x="${ml + i * bw}" y="${mt}" width="${bw}" height="${ih}" fill="transparent"/>`);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.label || "")}">${g}</svg>`;
  box.querySelector("svg").addEventListener("mousemove", e => { const i = e.target.dataset && e.target.dataset.i; if (i == null) return hideTip();
    showTip(e, `<b>${esc(o.tl ? o.tl(labels[i]) : labels[i])}</b>` + series.map(s => `<div class="r"><span><i style="background:${s.color}"></i>${esc(s.name)}</span><span>${nf(s.values[i])}</span></div>`).join("")
      + (series.length > 1 ? `<div class="r" style="margin-top:3px;border-top:1px solid #eee;padding-top:3px"><span>Всего</span><span>${nf(tot[i])}</span></div>` : "")); });
  box.querySelector("svg").addEventListener("mouseleave", hideTip);
}

function hbars(el, items, o = {}) {
  if (!items.length) { $(el).innerHTML = `<div class="empty">${o.empty || "Нет данных"}</div>`; return; }
  const max = Math.max(...items.map(x => x.v)) || 1;
  $(el).innerHTML = items.map(x => `<div class="hbr"${x.tip ? ` title="${esc(x.tip)}"` : ""}><span style="${x.me ? "font-weight:800" : ""}">${esc(x.l)}</span><div class="bar"><i style="width:${x.v / max * 100}%;background:${x.c || C.g}"></i></div><span class="v">${x.t ?? nf(x.v)}</span></div>`).join("");
}

function scatter(el, pts, o) {
  const box = $(el); const W = Math.max(box.clientWidth, 300), H = 240, ml = 52, mr = 10, mt = 8, mb = 30, iw = W - ml - mr, ih = H - mt - mb;
  if (pts.length < 3) { box.innerHTML = `<div class="empty">Мало Reels за 90 дней</div>`; return; }
  const [xs, xt] = nice(Math.max(...pts.map(p => p.x))), [ys, yt] = nice(Math.max(...pts.map(p => p.y)));
  const X = v => ml + v / xt * iw, Y = v => mt + ih - v / yt * ih; let g = "";
  for (let v = 0; v <= yt + 1e-9; v += ys) g += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${ml - 8}" y="${Y(v) + 4}" text-anchor="end">${kf(v)}</text>`;
  for (let v = 0; v <= xt + 1e-9; v += xs) g += `<text class="ax" x="${X(v)}" y="${H - 12}" text-anchor="middle">${String(+v.toFixed(1)).replace(".", ",")} с</text>`;
  g += `<text class="ax" x="${W - mr}" y="${H}" text-anchor="end">среднее время просмотра</text>`;
  pts.forEach((p, i) => g += `<circle data-i="${i}" cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="${C.reel}" fill-opacity=".75" stroke="#fff" stroke-width="2" style="cursor:pointer"/>`);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}">${g}</svg>`;
  const svg = box.querySelector("svg");
  svg.addEventListener("mousemove", e => { const i = e.target.dataset && e.target.dataset.i; if (i == null) return hideTip(); const p = pts[i].p;
    showTip(e, `<b>${dd(p.ts)}</b><div style="max-width:220px;color:#5d6166">${esc(p.cap.slice(0, 90))}</div><div class="r"><span>Охват</span><span>${nf(p.reach)}</span></div><div class="r"><span>Досмотр</span><span>${String(p.watch).replace(".", ",")} с</span></div>`); });
  svg.addEventListener("mouseleave", hideTip);
  svg.addEventListener("click", e => { const i = e.target.dataset && e.target.dataset.i; if (i != null) open(pts[i].p.url, "_blank"); });
}

function table(el, cols, rows, o = {}) {
  if (!rows.length) { $(el).innerHTML = `<div class="empty">${o.empty || "Нет данных за период"}</div>`; return; }
  $(el).innerHTML = `<table><thead><tr>${cols.map(c => `<th class="${c.l ? "l" : ""}" ${c.k ? `data-k="${c.k}"` : ""} title="${esc(c.tip || "")}">${c.h}${o.sort && o.sort === c.k ? (o.dir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr class="${r._cls || ""}">${cols.map(c => `<td class="${c.cls || (c.l ? "l" : "")}">${c.f(r)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  if (o.onSort) $(el).querySelectorAll("th[data-k]").forEach(th => th.onclick = () => o.onSort(th.dataset.k));
}

// ---------- СВОДКА ----------
function rSum() {
  const R = range(), cur = A.filter(r => inR(r.date, R.start, R.end)), prv = A.filter(r => inR(r.date, R.pstart, R.pend));
  const pc = P.filter(p => inR(p.ts, R.start, R.end)), stc = sum(cur, "reach_story") ;
  const fol = D.fol.length ? D.fol[D.fol.length - 1][1] : null;
  const nfC = cur.filter(r => r.new_followers != null && r.new_followers !== ""), nfSum = sum(nfC, "new_followers");
  const ov = sum(cur, "org_views"), ovp = sum(prv, "org_views"), adv = sum(cur, "views_ad");
  const tiles = [
    ["Подписчики", nf(fol), nfC.length ? `+${nf(nfSum)} новых за ${nfC.length} дн.` : "", "main"],
    ["Просмотры без рекламы", kf(ov), delta(ov, ovp)],
    ["Взаимодействия", kf(sum(cur, "total_interactions")), delta(sum(cur, "total_interactions"), sum(prv, "total_interactions")), "", "Лайки, комментарии, сохранения, репосты и ответы на сторис"],
    ["Визиты профиля", kf(sum(cur, "profile_views")), delta(sum(cur, "profile_views"), sum(prv, "profile_views"))],
    ["Клики по ссылке в профиле", kf(sum(cur, "website_clicks")), delta(sum(cur, "website_clicks"), sum(prv, "website_clicks"))],
    ["Публикаций", nf(pc.length), `ER ${pf(med(pc.map(er)))} — медиана`, "", "ER — взаимодействия на 100 человек охвата"],
  ];
  $("#sum-tiles").innerHTML = tiles.map(([k, v, d, cls, t]) => `<div class="tile ${cls || ""}" ${t ? `title="${esc(t)}"` : ""}><span class="k">${k}</span><span class="v">${v}</span><span class="d">${d || "&nbsp;"}</span></div>`).join("");

  // главное
  const keys = []; const icon = (t, bad) => `<span class="ic ${bad ? "bad" : ""}">${t}</span>`;
  if (ov) keys.push(`${icon(ovp && ov < ovp ? "▼" : "▲", ovp && ov < ovp * .9)}<div>Свой контент набрал <b>${kf(ov)}</b> просмотров ${ovp ? `(${ov >= ovp ? "+" : "−"}${pf(Math.abs((ov - ovp) / ovp * 100), 0)} к прошлым ${S.p} дн.)` : ""}. Реклама дала ещё <b>${kf(adv)}</b> — это <b>${pf(adv / (adv + ov) * 100, 0)}</b> всех просмотров аккаунта, поэтому встроенная статистика Instagram сильно завышает «органику».</div>`);
  const best = pc.filter(p => p.reach).sort((a, b) => b.reach - a.reach)[0];
  if (best) { const b = BASE[best.fmt]; keys.push(`${best.th ? `<img src="thumbs/${best.id}.jpg" alt="">` : icon("★")}<div>Лучшая публикация — ${best.fmt.toLowerCase()} от ${dd(best.ts)}: охват <b>${nf(best.reach)}</b>${b ? `, в ${(best.reach / b).toFixed(1).replace(".", ",")} раза выше обычного для формата` : ""}. <a href="${best.url}" target="_blank" rel="noopener">Открыть</a><div class="note">${esc(best.cap.slice(0, 110))}</div></div>`); }
  const fm = Object.entries(BASE).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  if (fm.length > 1) keys.push(`${icon("▦")}<div>За 90 дней <b>${fm[0][0]}</b> собирают медианный охват <b>${kf(fm[0][1])}</b> — в ${(fm[0][1] / fm[fm.length - 1][1]).toFixed(1).replace(".", ",")} раза больше, чем ${fm[fm.length - 1][0].toLowerCase()} (${kf(fm[fm.length - 1][1])}).</div>`);
  const cm = D.comments.filter(c => inR(c.ts, R.start, R.end)), neg = cm.filter(c => c.tone === "neg");
  if (cm.length) { const th = {}; neg.forEach(c => c.th.forEach(t => th[t] = (th[t] || 0) + 1)); const tt = Object.entries(th).sort((a, b) => b[1] - a[1])[0];
    const na = neg.filter(c => !c.ans).length;
    keys.push(`${icon("✎", neg.length / cm.length > .1)}<div>Комментариев: <b>${nf(cm.length)}</b>, негатива <b>${pf(neg.length / cm.length * 100, 0)}</b>${tt ? `, чаще всего — «${esc(tt[0])}»` : ""}. ${na ? `Без ответа осталось <b>${na}</b> негативных.` : "На весь негатив ответили."}</div>`); }
  const comp = compStats(); const me = comp.find(c => c.me), lead = comp.filter(c => !c.me).sort((a, b) => b.er - a.er)[0];
  if (me && lead) keys.push(`${icon("⇄", me.er < lead.er)}<div>Вовлечённость у нас <b>${pf(me.er, 2)}</b> на подписчика, у лидера среди конкурентов (${esc(lead.name)}) — <b>${pf(lead.er, 2)}</b>.</div>`);
  $("#sum-keys").innerHTML = keys.map(k => `<li>${k}</li>`).join("") || `<li>Нет данных</li>`;
  $("#sum-key-sub").textContent = `${dd(R.start)} — ${dd(R.end)}`;
  const top = pc.filter(p => p.reach).sort((a, b) => b.reach - a.reach).slice(0, 4);
  $("#sum-top").innerHTML = top.map(p => `<a class="pc" href="${p.url}" target="_blank" rel="noopener">${p.th ? `<img loading="lazy" src="thumbs/${p.id}.jpg" alt="">` : ""}<div class="m"><b>${kf(p.reach)}</b> охват<br>${p.fmt} · ${dd(p.ts)}</div></a>`).join("") || `<div class="empty">Нет публикаций за период</div>`;

  legend("#lg-views", [["Reels", C.reel], ["Сторис", C.story], ["Посты и карусели", C.post]]);
  stackBars("#ch-views", cur.map(r => r.date), [{ name: "Reels", color: C.reel, values: cur.map(r => r.views_reel) }, { name: "Сторис", color: C.story, values: cur.map(r => r.views_story) }, { name: "Посты", color: C.post, values: cur.map(r => r.views_post) }], { xl: dshort, tl: dd });
  const fc = A.filter(r => inR(r.date, R.start, R.end) && r.new_followers != null && r.new_followers !== "");
  stackBars("#ch-fol", fc.map(r => r.date), [{ name: "Новые подписчики", color: C.g, values: fc.map(r => r.new_followers) }], { xl: dshort, tl: dd, h: 200 });
  legend("#lg-ad", [["Свой контент", C.reel], ["Реклама", C.ad]]);
  stackBars("#ch-ad", cur.map(r => r.date), [{ name: "Свой контент", color: C.reel, values: cur.map(r => r.org_views) }, { name: "Реклама", color: C.ad, values: cur.map(r => r.views_ad) }], { xl: dshort, tl: dd, h: 200 });
}

// ---------- ПУБЛИКАЦИИ ----------
function rPosts() {
  const R = range(); let pc = P.filter(p => inR(p.ts, R.start, R.end));
  const rubs = [...new Set(P.map(p => p.rub))].sort();
  const sel = $("#posts-rub"); if (sel.options.length !== rubs.length + 1) sel.innerHTML = `<option value="">Все рубрики</option>` + rubs.map(r => `<option>${esc(r)}</option>`).join(""); sel.value = S.rub;
  $$("#posts-fmt button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.fmt));
  const all = pc; if (S.fmt) pc = pc.filter(p => p.fmt === S.fmt); if (S.rub) pc = pc.filter(p => p.rub === S.rub);
  const tiles = [["Публикаций", nf(pc.length)], ["Средний охват", kf(pc.length ? sum(pc, "reach") / pc.length : null)], ["Медианный ER", pf(med(pc.map(er)))],
    ["Сохранения", kf(sum(pc, "saved"))], ["Репосты", kf(sum(pc, "shares"))], ["Подписки с постов", kf(sum(pc, "follows")), "Instagram считает подписки только для фото и каруселей"]];
  $("#posts-tiles").innerHTML = tiles.map(([k, v, t]) => `<div class="tile" ${t ? `title="${t}"` : ""}><span class="k">${k}</span><span class="v">${v}</span></div>`).join("");
  $("#posts-sub").textContent = `${pc.length} из ${all.length} за ${dd(R.start)} — ${dd(R.end)}`;
  const key = { ts: p => p.ts, er: er }[S.sort] || (p => p[S.sort]);
  pc.sort((a, b) => { const x = key(a), y = key(b); return (x == null) - (y == null) || (x < y ? -1 : x > y ? 1 : 0) * S.dir; });
  table("#posts-tbl", [
    { h: "", f: p => `<a href="${p.url}" target="_blank" rel="noopener">${thumb(p)}</a>`, l: 1 },
    { h: "Дата", k: "ts", l: 1, f: p => `${dd(p.ts)}<div class="note">${WD[wday(p.ts)]} ${p.ts.slice(11, 16)}</div>` },
    { h: "Публикация", l: 1, cls: "cap", f: p => `<b style="color:#161616">${p.fmt}</b> · ${esc(p.rub)} ${mark(p)}<br>${esc(p.cap.slice(0, 110))}` },
    { h: "Охват", k: "reach", f: p => nf(p.reach) }, { h: "Просмотры", k: "views", f: p => nf(p.views) },
    { h: "Лайки", k: "likes", f: p => nf(p.likes) }, { h: "Комм.", k: "comments", f: p => nf(p.comments) },
    { h: "Сохр.", k: "saved", f: p => nf(p.saved) }, { h: "Репосты", k: "shares", f: p => nf(p.shares) },
    { h: "Подписки", k: "follows", f: p => nf(p.follows), tip: "Только фото и карусели" },
    { h: "ER", k: "er", f: p => pf(er(p)), tip: "Взаимодействия на 100 человек охвата" },
    { h: "Досмотр", k: "watch", f: p => p.watch ? String(p.watch).replace(".", ",") + " с" : "—", tip: "Среднее время просмотра Reels" },
  ], pc, { sort: S.sort, dir: S.dir, onSort: k => { S.dir = S.sort === k ? -S.dir : -1; S.sort = k; rPosts(); }, empty: "Нет публикаций за период" });
}

// ---------- СТОРИС ----------
function rSt() {
  const R = range(), cur = A.filter(r => inR(r.date, R.start, R.end)), prv = A.filter(r => inR(r.date, R.pstart, R.pend));
  const st = D.stories.filter(s => inR(s.ts, R.start, addD(R.end, 1))).sort((a, b) => b.ts.localeCompare(a.ts));
  const v = sum(st, "views"), ex = sum(st, "tap_exit");
  const days = new Set(st.map(s => s.ts.slice(0, 10))).size;
  const tiles = [["Просмотры сторис", kf(sum(cur, "views_story")), delta(sum(cur, "views_story"), sum(prv, "views_story"))],
    ["Сторис собрано", nf(st.length), days ? `≈ ${(st.length / days).toFixed(1).replace(".", ",")} в день` : "сбор только начался"],
    ["Средний охват одной", kf(st.length ? sum(st, "reach") / st.length : null)],
    ["Ушли со сторис", pf(v ? ex / v * 100 : null, 0), "доля выходов от просмотров"],
    ["Ответы и репосты", nf(sum(st, "replies") + sum(st, "shares"))], ["Переходы в профиль", nf(sum(st, "profile_visits"))]];
  $("#st-tiles").innerHTML = tiles.map(([k, val, d]) => `<div class="tile"><span class="k">${k}</span><span class="v">${val}</span><span class="d">${d || "&nbsp;"}</span></div>`).join("");
  stackBars("#ch-st", cur.map(r => r.date), [{ name: "Охват сторис", color: C.story, values: cur.map(r => r.reach_story) }], { xl: dshort, tl: dd });
  $("#st-sub").textContent = st.length ? `${st.length} сторис` : "";
  table("#st-tbl", [
    { h: "", l: 1, f: s => thumb(s) }, { h: "Время", l: 1, f: s => `${dd(s.ts)} ${s.ts.slice(11, 16)}` }, { h: "Тип", l: 1, f: s => s.type === "VIDEO" ? "Видео" : "Фото" },
    { h: "Охват", f: s => nf(s.reach) }, { h: "Просмотры", f: s => nf(s.views) }, { h: "Листали вперёд", f: s => nf(s.tap_forward) }, { h: "Вернулись назад", f: s => nf(s.tap_back) },
    { h: "Вышли", f: s => `${nf(s.tap_exit)} <span class="note">${s.views ? pf(s.tap_exit / s.views * 100, 0) : ""}</span>` }, { h: "Ответы", f: s => nf(s.replies) }, { h: "Репосты", f: s => nf(s.shares) },
    { h: "В профиль", f: s => nf(s.profile_visits) }, { h: "Подписки", f: s => nf(s.follows) },
  ], st, { empty: "Сторис за период ещё не собраны — сбор идёт несколько раз в день" });
}

// ---------- ЧТО РАБОТАЕТ ----------
function grpTable(el, key) {
  const pp = P90.filter(p => p.ts.slice(0, 10) <= addD(LAST, -3)); const g = {};
  pp.forEach(p => (g[key(p)] = g[key(p)] || []).push(p));
  const rows = Object.entries(g).map(([k, a]) => ({ k, n: a.length, reach: med(a.map(p => p.reach)), er: med(a.map(er)), sv: med(a.map(p => p.reach ? (p.saved + p.shares) / p.reach * 1000 : null)), fo: sum(a, "follows") })).sort((a, b) => b.reach - a.reach);
  const best = Math.max(...rows.filter(r => r.n >= 3).map(r => r.reach));
  table(el, [{ h: "", l: 1, f: r => `<b>${esc(r.k)}</b>` }, { h: "Публикаций", f: r => nf(r.n) }, { h: "Охват", f: r => `${nf(r.reach)}${r.reach === best && rows.length > 1 ? ` <span class="pill p-g">лучший</span>` : ""}` },
    { h: "ER", f: r => pf(r.er), tip: "Взаимодействия на 100 человек охвата" }, { h: "Сохр.+репосты на 1000", f: r => r.sv == null ? "—" : r.sv.toFixed(1).replace(".", ","), tip: "Сохранения и репосты на 1000 человек охвата — признак полезного контента" }], rows);
}
function rWhat() {
  grpTable("#what-fmt", p => p.fmt); grpTable("#what-rub", p => p.rub);
  const B = [["08–11", 8, 11], ["11–14", 11, 14], ["14–17", 14, 17], ["17–20", 17, 20], ["20–24", 20, 24], ["ночь", 0, 8]];
  const pp = P90.filter(p => p.reach && p.ts.slice(0, 10) <= addD(LAST, -3)), cells = {};
  pp.forEach(p => { const h = +p.ts.slice(11, 13), b = B.findIndex(x => h >= x[1] && h < x[2]); (cells[wday(p.ts) + "_" + b] = cells[wday(p.ts) + "_" + b] || []).push(p.reach); });
  const vals = Object.values(cells).map(med), mx = Math.max(...vals, 1), all = med(pp.map(p => p.reach));
  const col = v => { const t = Math.min(1, v / mx); return `background:rgba(0,111,76,${0.08 + t * 0.85});color:${t > .5 ? "#fff" : "#161616"}`; };
  $("#what-hm").innerHTML = `<table class="hm"><thead><tr><th></th>${B.map(b => `<th>${b[0]}</th>`).join("")}</tr></thead><tbody>${WD.map((w, d) => `<tr><th>${w}</th>${B.map((_, b) => { const a = cells[d + "_" + b];
    return a ? `<td class="c" style="${col(med(a))}" title="${w} ${B[b][0]}: медиана охвата ${nf(med(a))}, публикаций ${a.length}">${kf(med(a))}<small>(${a.length})</small></td>` : `<td class="c" style="background:#F7F7F7"></td>`; }).join("")}</tr>`).join("")}</tbody></table>
    <p class="note">Медиана всех публикаций — ${kf(all)}. Ячейки с 1–2 публикациями — сигнал, а не вывод.</p>`;
  const rl = P90.filter(p => p.fmt === "Reels" && p.watch && p.ts.slice(0, 10) <= addD(LAST, -3)).sort((a, b) => b.watch - a.watch), mw = med(rl.map(p => p.watch));
  $("#watch-sub").textContent = rl.length ? `медиана ${String(mw.toFixed(1)).replace(".", ",")} с · ${rl.length} Reels за 90 дней` : "";
  const sel = rl.length > 10 ? [...rl.slice(0, 5), ...rl.slice(-5)] : rl;
  table("#ch-watch", [{ h: "", l: 1, f: p => `<a href="${p.url}" target="_blank" rel="noopener">${thumb(p)}</a>` }, { h: "Reels", l: 1, cls: "cap", f: p => `${dd(p.ts)} · ${esc(p.rub)}<br>${esc(p.cap.slice(0, 100))}` },
    { h: "Досмотр", f: p => `<b>${String(p.watch).replace(".", ",")} с</b>` }, { h: "Охват", f: p => nf(p.reach) }, { h: "ER", f: p => pf(er(p)) }],
    sel.map((p, i) => ({ ...p, _cls: rl.length > 10 && i === 5 ? "gap" : "" })), { empty: "Мало Reels за 90 дней" });
}

// ---------- АУДИТОРИЯ ----------
function rAud() {
  const a = D.aud || {}, f = a.follower_demographics || {}, re = a.reached_audience_demographics || {};
  const g = f.gender || {}, gt = (g.F || 0) + (g.M || 0);
  const ages = Object.entries(f.age || {}).sort(), top = ages.slice().sort((x, y) => y[1] - x[1])[0], at = sum(ages, x => x[1]);
  const cities = Object.entries(f.city || {}).sort((x, y) => y[1] - x[1]), ct = sum(cities, x => x[1]);
  $("#aud-tiles").innerHTML = [["Подписчики", nf(D.fol.length ? D.fol[D.fol.length - 1][1] : null)], ["Женщины", pf(gt ? g.F / gt * 100 : null, 0), "среди тех, у кого указан пол"], ["Мужчины", pf(gt ? g.M / gt * 100 : null, 0), ""],
    ["Главный возраст", top ? top[0] : "—", top ? pf(top[1] / at * 100, 0) + " подписчиков" : ""], ["Главный город", cities[0] ? cities[0][0].split(",")[0] : "—", cities[0] ? pf(cities[0][1] / ct * 100, 0) + " из топ-45 городов" : ""]]
    .map(([k, v, d]) => `<div class="tile"><span class="k">${k}</span><span class="v">${v}</span><span class="d">${d || "&nbsp;"}</span></div>`).join("");
  const ag = f.age_gender || {}, AG = ages.map(x => x[0]);
  legend("#lg-age", [["Женщины", C.g], ["Мужчины", C.b], ["Пол не указан", C.ad]]);
  stackBars("#ch-age", AG, [{ name: "Женщины", color: C.g, values: AG.map(x => ag[x + "|F"] || 0) }, { name: "Мужчины", color: C.b, values: AG.map(x => ag[x + "|M"] || 0) }, { name: "Пол не указан", color: C.ad, values: AG.map(x => ag[x + "|U"] || 0) }], { h: 240 });
  const rc = re.city || {}, rt = sum(Object.values(rc), x => x);
  table("#aud-city", [{ h: "Город", l: 1, f: r => esc(r[0].split(",")[0]) }, { h: "Подписчики", f: r => nf(r[1]) }, { h: "Доля подписчиков", f: r => pf(r[1] / ct * 100) },
    { h: "Доля охвата", f: r => pf(rc[r[0]] != null && rt ? rc[r[0]] / rt * 100 : null), tip: "Доля этого города среди охваченных в этом месяце (включая рекламу)" }], cities.slice(0, 12));
}

// ---------- КОММЕНТАРИИ ----------
function rCm() {
  const R = range(), cm = D.comments.filter(c => inR(c.ts, R.start, R.end)), neg = cm.filter(c => c.tone === "neg"), pos = cm.filter(c => c.tone === "pos");
  const ans = neg.filter(c => c.ans), am = med(cm.filter(c => c.ans).map(c => c.am));
  const hm = m => m == null ? "—" : m < 60 ? Math.round(m) + " мин" : m < 1440 ? (m / 60).toFixed(1).replace(".", ",") + " ч" : (m / 1440).toFixed(1).replace(".", ",") + " дн";
  $("#cm-tiles").innerHTML = [["Комментарии", nf(cm.length)], ["Позитив", pf(cm.length ? pos.length / cm.length * 100 : null, 0)], ["Негатив", pf(cm.length ? neg.length / cm.length * 100 : null, 0), `${neg.length} шт.`],
    ["Ответили на негатив", pf(neg.length ? ans.length / neg.length * 100 : null, 0), `${neg.length - ans.length} без ответа`], ["Время ответа", hm(am), "медиана, по всем комментариям с ответом"]]
    .map(([k, v, d]) => `<div class="tile"><span class="k">${k}</span><span class="v">${v}</span><span class="d">${d || "&nbsp;"}</span></div>`).join("");
  const wk = {}; D.comments.filter(c => c.ts.slice(0, 10) > addD(LAST, -84)).forEach(c => { const d = c.ts.slice(0, 10), w = addD(d, -wday(d)); (wk[w] = wk[w] || { pos: 0, neu: 0, neg: 0 })[c.tone]++; });
  const W = Object.keys(wk).sort();
  legend("#lg-tone", [["Позитив", C.pos], ["Нейтрально", C.neu], ["Негатив", C.neg]]);
  stackBars("#ch-tone", W, [{ name: "Позитив", color: C.pos, values: W.map(w => wk[w].pos) }, { name: "Нейтрально", color: C.neu, values: W.map(w => wk[w].neu) }, { name: "Негатив", color: C.neg, values: W.map(w => wk[w].neg) }], { xl: dshort, tl: w => "Неделя с " + dd(w), fmt: nf });
  const th = {}; neg.forEach(c => (c.th.length ? c.th : ["Без темы"]).forEach(t => th[t] = (th[t] || 0) + 1));
  hbars("#cm-themes", Object.entries(th).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, c: C.neg })), { empty: "Негатива за период нет" });
  const pm = Object.fromEntries(P.map(p => [p.id, p]));
  const nl = neg.filter(c => !c.ans).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 12);
  $("#cm-neg").innerHTML = nl.map(c => { const p = pm[c.m]; return `<div class="it">${esc(c.tx)}<div class="meta"><span>${dd(c.ts)} ${c.ts.slice(11, 16)}</span>${c.th.map(t => `<span class="pill p-r">${esc(t)}</span>`).join("")}${p ? `<a href="${p.url}" target="_blank" rel="noopener">к публикации</a>` : ""}</div></div>`; }).join("") || `<div class="empty">Весь негатив за период с ответом</div>`;
  const tg = D.tags.filter(t => t.ts.slice(0, 10) > addD(LAST, -30)).sort((a, b) => (b.lk || 0) + (b.cm || 0) - (a.lk || 0) - (a.cm || 0)).slice(0, 15);
  table("#cm-tags", [{ h: "Аккаунт", l: 1, f: t => `<a href="${t.url}" target="_blank" rel="noopener">@${esc(t.u)}</a><div class="note">${dd(t.ts)}</div>` }, { h: "Лайки", f: t => nf(t.lk) }, { h: "Комм.", f: t => nf(t.cm) }], tg, { empty: "За 30 дней отметок нет" });
}

// ---------- КОНКУРЕНТЫ ----------
function compStats() {
  const users = [...new Set(D.comp_daily.map(r => r.u))], cut = addD(LAST, -29);
  return users.map(u => { const s = D.comp_daily.filter(r => r.u === u).sort((a, b) => a.d.localeCompare(b.d)), l = s[s.length - 1];
    const w = s.filter(r => r.d <= addD(l.d, -7)).pop(); const m = D.comp_media.filter(x => x.u === u && x.ts.slice(0, 10) >= cut);
    const eng = m.length ? med(m.map(x => (x.lk || 0) + (x.cm || 0))) : null;
    return { u, me: u === D.own, name: l.n || u, f: l.f, g7: w ? l.f - w.f : null, n30: m.length, reels: m.length ? m.filter(x => x.p === "REELS").length / m.length * 100 : null, eng, er: eng != null && l.f ? eng / l.f * 100 : null }; });
}
function rComp() {
  const cs = compStats().sort((a, b) => b.f - a.f);
  table("#comp-tbl", [{ h: "Аккаунт", l: 1, f: c => `<a href="https://instagram.com/${c.u}" target="_blank" rel="noopener">${esc(c.name)}</a><div class="note">@${esc(c.u)}</div>` },
    { h: "Подписчики", f: c => nf(c.f) }, { h: "Прирост за 7 дн.", f: c => c.g7 == null ? `<span class="note">копится</span>` : (c.g7 > 0 ? "+" : "") + nf(c.g7) },
    { h: "Публикаций за 30 дн.", f: c => nf(c.n30) }, { h: "Доля Reels", f: c => pf(c.reels, 0) }, { h: "Лайки+комм. на публикацию", tip: "Медиана: один розыгрыш с тысячами комментариев не искажает картину", f: c => nf(c.eng) },
    { h: "Вовлечённость", f: c => pf(c.er, 2), tip: "Лайки и комментарии на публикацию на 100 подписчиков" }], cs.map(c => ({ ...c, _cls: c.me ? "me" : "" })));
  hbars("#comp-er", cs.filter(c => c.er != null).sort((a, b) => b.er - a.er).map(c => ({ l: c.name, v: c.er, t: pf(c.er, 2), c: c.me ? C.g : C.ad, me: c.me })));
  hbars("#comp-freq", cs.slice().sort((a, b) => b.n30 - a.n30).map(c => ({ l: c.name, v: c.n30 / 30 * 7, t: (c.n30 / 30 * 7).toFixed(1).replace(".", ","), c: c.me ? C.g : C.ad, me: c.me })));
  const nm = Object.fromEntries(cs.map(c => [c.u, c.name]));
  const top = D.comp_media.filter(x => x.u !== D.own && x.ts.slice(0, 10) > addD(LAST, -14)).sort((a, b) => (b.lk || 0) + (b.cm || 0) - (a.lk || 0) - (a.cm || 0)).slice(0, 10);
  table("#comp-top", [{ h: "Бренд", l: 1, f: x => `<b>${esc(nm[x.u] || x.u)}</b><div class="note">${dd(x.ts)}</div>` }, { h: "Публикация", l: 1, cls: "cap", f: x => `${x.p === "REELS" ? "Reels" : "Пост"} · ${esc(x.cap)} <a href="${x.url}" target="_blank" rel="noopener">открыть</a>` },
    { h: "Лайки", f: x => nf(x.lk) }, { h: "Комм.", f: x => nf(x.cm) }], top);
}

// ---------- каркас ----------
const R_ = { sum: rSum, posts: rPosts, st: rSt, what: rWhat, aud: rAud, cm: rCm, comp: rComp };
function render() {
  $$("#tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.t === S.tab)); $$(".panel").forEach(p => p.hidden = p.id !== "p-" + S.tab);
  $$("#period button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.p === S.p));
  $("#period").style.visibility = ["what", "aud", "comp"].includes(S.tab) ? "hidden" : "visible";
  R_[S.tab]();
}
$("#tabs").onclick = e => { const t = e.target.closest("button"); if (!t) return; S.tab = t.dataset.t; history.replaceState(null, "", "#" + S.tab); render(); };
$("#period").onclick = e => { const t = e.target.closest("button"); if (!t) return; S.p = +t.dataset.p; render(); };
$("#posts-fmt").onclick = e => { const t = e.target.closest("button"); if (!t) return; S.fmt = t.dataset.v; rPosts(); };
$("#posts-rub").onchange = e => { S.rub = e.target.value; rPosts(); };
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 150); });
if (R_[location.hash.slice(1)]) S.tab = location.hash.slice(1);
$("#stamp").textContent = `@${D.own} · данные по ${dd(LAST)} · обновлено ${dd(D.built)} в ${D.built.slice(11, 16)}`;
const bad = Object.entries((D.status || {}).blocks || {}).filter(([, v]) => !v.ok);
const NAMES = { account: "статистика аккаунта", media: "публикации", stories: "сторис", audience: "аудитория", comments: "комментарии", tags: "отметки", competitors: "конкуренты" };
$("#foot").innerHTML = (bad.length ? `<span class="pill p-r">Не обновилось: ${bad.map(([k]) => NAMES[k] || k).join(", ")}</span> ` : "") + `Данные из Instagram Graph API, обновляются автоматически несколько раз в день. Дни — по суткам Meta (тихоокеанское время), время публикаций — Ташкент.`;
render();
