"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const C = { reel: "#006F4C", story: "#3A6FD8", post: "#D9920F", ad: "#C3C7CC", pos: "#006F4C", neu: "#C3C7CC", neg: "#EE3737", g: "#006F4C", b: "#3A6FD8" };
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONF = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nf = n => n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("ru-RU");
const dec = (n, d = 1) => n == null || !isFinite(n) ? "—" : (+n).toFixed(d).replace(".", ",");
const kf = n => { if (n == null || isNaN(n)) return "—"; const a = Math.abs(n);
  return a >= 1e6 ? dec(n / 1e6, a >= 1e7 ? 0 : 1) + " млн" : a >= 1e4 ? Math.round(n / 1e3) + " тыс" : nf(n); };
const pf = (n, d = 1) => n == null || !isFinite(n) ? "—" : dec(n, d) + "%";
const usd = n => n == null ? "—" : "$" + nf(n);
const sum = (a, f) => a.reduce((s, x) => s + (+(typeof f === "function" ? f(x) : x[f]) || 0), 0);
const med = a => { a = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const dd = s => { const [, m, d] = s.slice(0, 10).split("-"); return +d + " " + MON[+m - 1]; };
const dshort = s => s.slice(8, 10) + "." + s.slice(5, 7);
const addD = (s, n) => { const d = new Date(s.slice(0, 10) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wday = s => (new Date(s.slice(0, 10) + "T00:00:00Z").getUTCDay() + 6) % 7;
const monday = s => addD(s, -wday(s));
const inR = (s, a, b) => s.slice(0, 10) >= a && s.slice(0, 10) <= b;
const hint = t => `<button class="q" type="button" data-tip="${esc(t)}" aria-label="Пояснение">?</button>`;
const chg = (a, b, label) => { if (!b || a == null) return ""; const p = (a - b) / b * 100; if (Math.abs(p) < 1) return "≈ как " + label;
  return `<span class="${p > 0 ? "up" : "dn"}">${p > 0 ? "▲" : "▼"} ${pf(Math.abs(p), 0)}</span> ${label}`; };
const tile = (k, v, d, o = {}) => `<div class="tile ${o.cls || ""}"><span class="k">${k}${o.tip ? hint(o.tip) : ""}</span><span class="v">${v}</span><span class="d">${d || "&nbsp;"}</span></div>`;
const thumb = p => p.th ? `<img class="th" loading="lazy" src="thumbs/${p.id}.jpg" alt="">` : `<div class="thph"></div>`;
const T = {
  er: "ER — лайки, комментарии, сохранения и репосты на 100 человек охвата. Показывает, насколько пост цепляет тех, кто его увидел.",
  reach: "Охват — сколько разных людей увидели публикацию без рекламы. Рекламный охват показан отдельно.",
  views: "Просмотры — сколько раз контент показали (один человек может посмотреть несколько раз). Здесь только свой контент, без рекламы.",
  sv: "Сохранения и репосты на 1000 человек охвата. Сохраняют и пересылают то, что полезно или смешно, — сильный сигнал для алгоритма.",
  watch: "Сколько секунд в среднем смотрят Reels. Instagram не отдаёт длину ролика, поэтому процент досмотра посчитать нельзя.",
  med: "Медиана — значение посередине: половина постов выше, половина ниже. В отличие от среднего, один вирусный пост её не искажает.",
  pv: "Сколько человек перешли в профиль с этой публикации (Instagram считает только для фото и каруселей).",
  ad: "Если публикацию продвигали через рекламный кабинет Meta, здесь её рекламный охват и расход за всё время. Посты, загруженные в рекламу отдельно, сюда не попадают.",
};

const D = window.D;
const A = D.acc.map(r => Object.fromEntries([["date", r[0]], ...D.acc_cols.map((c, i) => [c, r[i + 1]])]));
A.forEach(r => { r.org = (r.views_reel || 0) + (r.views_story || 0) + (r.views_post || 0); });
const LAST = A.length ? A[A.length - 1].date : new Date().toISOString().slice(0, 10);
const P = D.posts.slice().sort((a, b) => b.ts.localeCompare(a.ts));
const PM = Object.fromEntries(P.map(p => [p.id, p]));
P.forEach(p => { p.er = p.reach ? (p.total_interactions ?? 0) / p.reach * 100 : null; p.sv = p.reach ? ((p.saved || 0) + (p.shares || 0)) / p.reach * 1000 : null;
  p.age = (Date.parse(D.built) - Date.parse(p.ts)) / 36e5; });
const S = { tab: "wk", ct: 90, au: 30, fmt: "", rub: "", sort: "ts", dir: -1, mo: null };

// ---------- базовые медианы по формату (90 дней, без постов младше 2 дней) ----------
const P90 = P.filter(p => p.ts.slice(0, 10) > addD(LAST, -90) && p.age > 48);
const BASE = {};
for (const f of new Set(P90.map(p => p.fmt))) { const a = P90.filter(p => p.fmt === f);
  BASE[f] = { n: a.length, reach: med(a.map(p => p.reach)), er: med(a.map(p => p.er)), sv: med(a.map(p => p.sv)), watch: med(a.map(p => p.watch)), pv: med(a.map(p => p.reach ? p.profile_visits / p.reach * 1000 : null)) }; }
function verdict(p) {
  const b = BASE[p.fmt]; if (p.age < 48) return { cls: "p-m", t: "рано судить", why: "Пост вышел меньше 2 дней назад — охват ещё растёт." };
  if (!b || !b.reach || b.n < 3 || !p.reach) return { cls: "p-m", t: "мало данных", why: "" };
  const r = p.reach / b.reach;
  const v = r >= 1.3 ? { cls: "p-g", t: r >= 2 ? `зашёл ×${dec(r)}` : "зашёл", k: 1 } : r <= 0.7 ? { cls: "p-r", t: "не зашёл", k: -1 } : { cls: "p-m", t: "как обычно", k: 0 };
  const f = [];
  if (p.watch && b.watch) f.push([Math.log(p.watch / b.watch), p.watch > b.watch ? `смотрят ${dec(p.watch)} с — дольше обычного (${dec(b.watch)} с)` : `смотрят всего ${dec(p.watch)} с при обычных ${dec(b.watch)} с — слабое начало ролика`]);
  if (p.sv != null && b.sv) f.push([Math.log((p.sv + .1) / (b.sv + .1)), p.sv > b.sv ? `много сохранений и репостов: ${dec(p.sv)} на 1000 (обычно ${dec(b.sv)})` : `мало сохранений и репостов: ${dec(p.sv)} на 1000 (обычно ${dec(b.sv)})`]);
  if (p.er != null && b.er) f.push([Math.log((p.er + .01) / (b.er + .01)), p.er > b.er ? `ER ${pf(p.er)} — выше обычного (${pf(b.er)})` : `ER ${pf(p.er)} — ниже обычного (${pf(b.er)})`]);
  const want = v.k >= 0 ? 1 : -1;
  const best = f.filter(x => Math.sign(x[0]) === want || v.k === 0).sort((a, c) => Math.abs(c[0]) - Math.abs(a[0]))[0];
  v.why = `Охват ${nf(p.reach)} при обычных ${nf(b.reach)} для формата «${p.fmt}».` + (best ? " Почему: " + best[1] + "." : "");
  if (p.comments > 300 && p.rub === "Розыгрыш") v.why += " Розыгрыш накручивает комментарии.";
  return v;
}

// ---------- tooltip ----------
const tip = $("#tip");
function showTip(e, html) { tip.innerHTML = html; tip.style.display = "block"; const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = Math.max(8, e.clientX - w - 14); if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; }
const hideTip = () => tip.style.display = "none";
document.addEventListener("scroll", hideTip, { passive: true });
document.addEventListener("mouseover", e => { const q = e.target.closest(".q"); if (q) showTip(e, esc(q.dataset.tip)); });
document.addEventListener("mouseout", e => { if (e.target.closest(".q")) hideTip(); });
document.addEventListener("click", e => { const q = e.target.closest(".q"); if (q) { e.preventDefault(); showTip(e, esc(q.dataset.tip)); } else if (!e.target.closest("svg")) hideTip(); });

// ---------- charts ----------
function nice(max) { if (max <= 0) return [1, 1]; const e = Math.pow(10, Math.floor(Math.log10(max))); const s = [1, 2, 2.5, 5, 10].map(x => x * e).find(x => max / x <= 4) || 10 * e; return [s, Math.ceil(max / s) * s]; }
const legend = (el, items) => $(el).innerHTML = items.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join("");
function stackBars(el, labels, series, o = {}) {
  const box = $(el); const W = Math.max(box.clientWidth, 280), H = o.h || 220, ml = 50, mr = 6, mt = 8, mb = 24, iw = W - ml - mr, ih = H - mt - mb, n = labels.length;
  if (!n) { box.innerHTML = `<div class="empty">Нет данных</div>`; return; }
  const tot = labels.map((_, i) => sum(series, s => s.values[i])); const [step, top] = nice(Math.max(...tot));
  const y = v => mt + ih - v / top * ih, bw = iw / n, gap = n > 60 ? 1 : 2, w = Math.max(1, bw - gap);
  let g = "";
  for (let v = 0; v <= top + 1e-9; v += step) g += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${(o.fmt || kf)(v)}</text>`;
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 60)));
  labels.forEach((l, i) => { if (i % every === 0) g += `<text class="ax" x="${ml + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xl ? o.xl(l) : l)}</text>`; });
  labels.forEach((_, i) => { let base = 0; const x = ml + i * bw + gap / 2; const vis = series.filter(s => s.values[i] > 0);
    vis.forEach((s, j) => { const v = s.values[i], y0 = y(base), y1 = y(base + v), h = Math.max(0, y0 - y1 - (j ? 1 : 0)), r = j === vis.length - 1 ? Math.min(4, w / 2, h) : 0;
      const op = o.dim && o.dim(labels[i]) ? ' fill-opacity=".45"' : "";
      g += r ? `<path fill="${s.color}"${op} d="M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z"/>` : `<rect fill="${s.color}"${op} x="${x}" y="${y1}" width="${w}" height="${h}"/>`;
      base += v; }); });
  labels.forEach((_, i) => g += `<rect data-i="${i}" x="${ml + i * bw}" y="${mt}" width="${bw}" height="${ih}" fill="transparent"/>`);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img">${g}</svg>`;
  const svg = box.querySelector("svg");
  const mv = e => { const i = e.target.dataset && e.target.dataset.i; if (i == null) return hideTip();
    showTip(e, `<b>${esc(o.tl ? o.tl(labels[i]) : labels[i])}</b>` + series.map(s => `<div class="r"><span><i style="background:${s.color}"></i>${esc(s.name)}</span><span>${nf(s.values[i])}</span></div>`).join("")
      + (series.length > 1 ? `<div class="r" style="margin-top:3px;border-top:1px solid #eee;padding-top:3px"><span>Всего</span><span>${nf(tot[i])}</span></div>` : "")); };
  svg.addEventListener("mousemove", mv); svg.addEventListener("click", mv); svg.addEventListener("mouseleave", hideTip);
}
function hbars(el, items, o = {}) {
  if (!items.length) { $(el).innerHTML = `<div class="empty">${o.empty || "Нет данных"}</div>`; return; }
  const max = Math.max(...items.map(x => x.v || 0)) || 1;
  $(el).innerHTML = items.map(x => `<div class="hbr ${x.dim ? "dim" : ""}"><span style="${x.me ? "font-weight:800" : ""}">${esc(x.l)}</span><div class="bar"><i style="width:${(x.v || 0) / max * 100}%;background:${x.c || C.g}"></i></div><span class="v">${x.t ?? nf(x.v)}</span></div>`).join("");
}
function table(el, cols, rows, o = {}) {
  if (!rows.length) { $(el).innerHTML = `<div class="empty">${o.empty || "Нет данных за период"}</div>`; return; }
  $(el).innerHTML = `<table><thead><tr>${cols.map(c => `<th class="${c.l ? "l" : ""}" ${c.k ? `data-k="${c.k}"` : ""}>${c.h}${c.tip ? hint(c.tip) : ""}${o.sort && o.sort === c.k ? (o.dir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr class="${r._cls || ""}">${cols.map(c => `<td class="${c.cls || (c.l ? "l" : "")}">${c.f(r)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  if (o.onSort) $(el).querySelectorAll("th[data-k]").forEach(th => th.onclick = e => { if (!e.target.closest(".q")) o.onSort(th.dataset.k); });
}
const ic = (t, c = "g") => `<span class="ic ${c}">${t}</span>`;
const weekly = (rows, fields) => { const w = {}; rows.forEach(r => { const k = monday(r.date); w[k] = w[k] || { date: k, days: 0 }; w[k].days++; fields.forEach(f => w[k][f] = (w[k][f] || 0) + (+r[f] || 0)); }); return Object.values(w).sort((a, b) => a.date.localeCompare(b.date)); };

// ================= НЕДЕЛЯ =================
function rWk() {
  const end = LAST, start = addD(end, -6), ps = addD(start, -7), pe = addD(start, -1);
  const cur = A.filter(r => inR(r.date, start, end)), prv = A.filter(r => inR(r.date, ps, pe));
  const wp = P.filter(p => inR(p.ts, start, addD(end, 1))), pp = P.filter(p => inR(p.ts, ps, pe));
  $("#wk-range").textContent = `${dd(start)} — ${dd(end)}`;
  const nfo = cur.filter(r => r.new_followers != null), nfp = prv.filter(r => r.new_followers != null);
  const stw = D.stories.filter(s => inR(s.ts, start, addD(end, 1)));
  $("#wk-tiles").innerHTML = [
    tile("Просмотры своего контента", kf(sum(cur, "org")), chg(sum(cur, "org"), sum(prv, "org"), "к прошлой неделе"), { cls: "main", tip: T.views }),
    tile("Новые подписчики", nfo.length ? "+" + nf(sum(nfo, "new_followers")) : "—", nfp.length === 7 ? chg(sum(nfo, "new_followers"), sum(nfp, "new_followers"), "к прошлой неделе") : ""),
    tile("Визиты профиля", kf(sum(cur, "profile_views")), chg(sum(cur, "profile_views"), sum(prv, "profile_views"), "к прошлой неделе")),
    tile("Клики по ссылке в профиле", kf(sum(cur, "website_clicks")), chg(sum(cur, "website_clicks"), sum(prv, "website_clicks"), "к прошлой неделе")),
    tile("Публикаций", nf(wp.length), `${wp.filter(p => p.fmt === "Reels").length} Reels · неделей раньше ${pp.length}`),
    tile("Сторис", stw.length ? nf(stw.length) : nf(sum(cur, "views_story")) , stw.length ? `средний охват ${kf(sum(stw, "reach") / stw.length)}` : "просмотров сторис за неделю"),
  ].join("");

  const V = wp.map(p => ({ p, v: verdict(p) }));
  const keys = [];
  const good = V.filter(x => x.v.k === 1).sort((a, b) => b.p.reach / BASE[b.p.fmt].reach - a.p.reach / BASE[a.p.fmt].reach)[0];
  const bad = V.filter(x => x.v.k === -1).sort((a, b) => a.p.reach / BASE[a.p.fmt].reach - b.p.reach / BASE[b.p.fmt].reach)[0];
  if (good) keys.push(`${good.p.th ? `<img src="thumbs/${good.p.id}.jpg" alt="">` : ic("▲")}<div><b>Повторить:</b> ${good.p.fmt.toLowerCase()} от ${dd(good.p.ts)} «${esc(good.p.cap.slice(0, 60))}». ${esc(good.v.why)} <a href="${good.p.url}" target="_blank" rel="noopener">Открыть</a></div>`);
  if (bad) keys.push(`${bad.p.th ? `<img src="thumbs/${bad.p.id}.jpg" alt="">` : ic("▼", "r")}<div><b>Не повторять в таком виде:</b> ${bad.p.fmt.toLowerCase()} от ${dd(bad.p.ts)}. ${esc(bad.v.why)} <a href="${bad.p.url}" target="_blank" rel="noopener">Открыть</a></div>`);
  if (!good && !bad && wp.length) keys.push(`${ic("=")}<div>Все публикации недели собрали обычный для своих форматов охват — ни провалов, ни прорывов.</div>`);
  if (!wp.length) keys.push(`${ic("!", "r")}<div>За неделю не вышло ни одной публикации.</div>`);
  const days = new Set(wp.map(p => p.ts.slice(0, 10))); const empty = [...Array(7)].map((_, i) => addD(start, i)).filter(d => !days.has(d));
  if (empty.length >= 3) keys.push(`${ic("!", "a")}<div>${empty.length} дн. без публикаций: ${empty.map(d => WD[wday(d)]).join(", ")}.</div>`);
  const o1 = sum(cur, "org"), o0 = sum(prv, "org");
  if (o0 && Math.abs(o1 - o0) / o0 > .15) { const fm = ["reel", "story", "post"].map(k => [k, sum(cur, "views_" + k) - sum(prv, "views_" + k)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    keys.push(`${ic(o1 > o0 ? "▲" : "▼", o1 > o0 ? "g" : "r")}<div>Просмотры своего контента ${o1 > o0 ? "выросли" : "упали"} на ${pf(Math.abs(o1 - o0) / o0 * 100, 0)} — больше всего за счёт ${{ reel: "Reels", story: "сторис", post: "постов и каруселей" }[fm[0]]} (${fm[1] > 0 ? "+" : "−"}${kf(Math.abs(fm[1]))}).</div>`); }
  const seen = new Set(), rq = D.comments.filter(c => c.ts.slice(0, 10) > addD(LAST, -14) && !c.ans && (c.tone === "neg" || c.q)).filter(c => { const k = c.tx.slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; });
  if (rq.length) keys.push(`${ic("✎", "a")}<div>Без ответа ${rq.length} комментариев с вопросом или жалобой за 14 дней — список справа.</div>`);
  $("#wk-keys").innerHTML = keys.map(k => `<li>${k}</li>`).join("");

  const pm = PM;
  $("#wk-reply").innerHTML = rq.sort((a, b) => (b.tone === "neg") - (a.tone === "neg") || b.ts.localeCompare(a.ts)).slice(0, 8).map(c => { const p = pm[c.m];
    return `<div class="it"><div class="tx" title="${esc(c.tx)}">${esc(c.tx)}</div><div class="meta"><span class="pill ${c.tone === "neg" ? "p-r" : "p-a"}">${c.tone === "neg" ? "жалоба" : "вопрос"}</span><span>${dd(c.ts)} ${c.ts.slice(11, 16)}</span>${c.th.map(t => `<span>${esc(t)}</span>`).join(" · ")}${p ? `<a href="${p.url}" target="_blank" rel="noopener">ответить под постом →</a>` : ""}</div></div>`; }).join("") || `<div class="empty">Всё отвечено 👍</div>`;

  $("#wk-posts").innerHTML = V.map(({ p, v }) => `<div class="pcd"><div class="top">${p.th ? `<img loading="lazy" src="thumbs/${p.id}.jpg" alt="">` : `<div class="thph"></div>`}<div class="meta"><b>${p.fmt}</b> · ${WD[wday(p.ts)]} ${dd(p.ts)}, ${p.ts.slice(11, 16)}<br><span class="pill ${v.cls}">${v.t}</span> <span>${esc(p.rub)}</span><span class="c">${esc(p.cap.slice(0, 90))}</span><a class="op" href="${p.url}" target="_blank" rel="noopener">открыть</a></div></div>
    <div class="nums"><div><b>${kf(p.reach)}</b>охват</div><div><b>${pf(p.er)}</b>ER</div><div><b>${p.watch ? dec(p.watch) + " с" : nf((p.saved || 0) + (p.shares || 0))}</b>${p.watch ? "досмотр" : "сохр.+репосты"}</div></div>
    <div class="why">${esc(v.why)}${p.ad ? ` <span class="pill p-a">реклама: +${kf(p.ad.reach)} охвата за ${usd(p.ad.spend)}</span>` : ""}</div></div>`).join("") || `<div class="empty">Публикаций за неделю нет</div>`;
  rSeries("#wk-st", start, addD(end, 1), "За эту неделю сторис ещё не собраны — сбор идёт каждые 4 часа с 27 октября.");
}
function rSeries(el, a, b, empty) {
  const by = {}; D.stories.filter(s => inR(s.ts, a, b)).forEach(s => (by[s.ts.slice(0, 10)] = by[s.ts.slice(0, 10)] || []).push(s));
  const rows = Object.entries(by).sort((x, y) => y[0].localeCompare(x[0])).map(([d, a]) => { a.sort((x, y) => x.ts.localeCompare(y.ts)); const f = a[0], l = a[a.length - 1];
    return { d, n: a.length, f: f.reach, l: l.reach, keep: a.length > 1 && f.reach ? l.reach / f.reach * 100 : null, ex: sum(a, "tap_exit"), v: sum(a, "views"), pv: sum(a, "profile_visits"), rp: sum(a, "replies") + sum(a, "shares") }; });
  table(el, [{ h: "День", l: 1, f: r => `${WD[wday(r.d)]} ${dd(r.d)}` }, { h: "Сторис", f: r => r.n }, { h: "Охват первой", f: r => nf(r.f) }, { h: "Охват последней", f: r => nf(r.l) },
    { h: "Дошли до конца", f: r => r.keep == null ? "—" : `<b>${pf(r.keep, 0)}</b>`, tip: "Охват последней сторис дня к охвату первой. Чем выше, тем лучше держит серия." },
    { h: "Вышли", f: r => r.v ? pf(r.ex / r.v * 100, 0) : "—", tip: "Доля выходов из сторис от всех просмотров" }, { h: "В профиль", f: r => nf(r.pv) }, { h: "Ответы и репосты", f: r => nf(r.rp) }], rows, { empty });
}

// ================= МЕСЯЦ =================
const partial0 = (x, y) => x < y ? x : y;
function months() { const s = new Set(A.map(r => r.date.slice(0, 7))); return [...s].sort().reverse(); }
function rMo() {
  const ms = months(); if (!S.mo) S.mo = ms[0];
  const sel = $("#mo-sel"); if (!sel.options.length) sel.innerHTML = ms.map(m => `<option value="${m}">${MONF[+m.slice(5) - 1]} ${m.slice(0, 4)}</option>`).join(""); sel.value = S.mo;
  const a = S.mo + "-01", lastDay = A.filter(r => r.date.startsWith(S.mo)).map(r => r.date).sort().pop(), nd = +lastDay.slice(8);
  const full = new Date(Date.UTC(+S.mo.slice(0, 4), +S.mo.slice(5), 0)).getUTCDate();
  const pa = addD(a, -1).slice(0, 7) + "-01", pend = addD(a, -1), pb = partial0(addD(pa, nd - 1), pend);
  const cur = A.filter(r => inR(r.date, a, lastDay)), prv = A.filter(r => inR(r.date, pa, pb));
  const partial = nd < full;
  $("#mo-note").textContent = partial ? `Месяц ещё идёт: данные по ${dd(lastDay)}, сравниваем с первыми ${nd} днями прошлого месяца.` : "Сравнение с прошлым месяцем.";
  const lbl = "к прошлому месяцу";
  const mp = P.filter(p => inR(p.ts, a, lastDay)), mpp = P.filter(p => inR(p.ts, pa, pb));
  const fl = D.fol.filter(f => f[0] <= lastDay + "~").pop();
  const nfo = cur.filter(r => r.new_followers != null);
  $("#mo-tiles").innerHTML = [
    tile("Подписчики", nf(fl ? fl[1] : null), nfo.length ? `+${nf(sum(nfo, "new_followers"))} новых за ${nfo.length} дн.` : "", { cls: "main" }),
    tile("Просмотры своего контента", kf(sum(cur, "org")), chg(sum(cur, "org"), sum(prv, "org"), lbl), { tip: T.views }),
    tile("Взаимодействия", kf(sum(cur, "total_interactions")), chg(sum(cur, "total_interactions"), sum(prv, "total_interactions"), lbl), { tip: "Лайки, комментарии, сохранения, репосты и ответы на сторис" }),
    tile("Клики по ссылке в профиле", kf(sum(cur, "website_clicks")), chg(sum(cur, "website_clicks"), sum(prv, "website_clicks"), lbl)),
    tile("Публикаций", nf(mp.length), `в прошлом месяце ${mpp.length}`),
  ].join("");
  const keys = [], o = sum(cur, "org"), op = sum(prv, "org"), ad = sum(cur, "views_ad");
  if (o) keys.push(`${ic(op && o < op ? "▼" : "▲", op && o < op * .9 ? "r" : "g")}<div>Свой контент набрал <b>${kf(o)}</b> просмотров${op ? ` (${o >= op ? "+" : "−"}${pf(Math.abs(o - op) / op * 100, 0)} ${lbl})` : ""}. Реклама дала ещё <b>${kf(ad)}</b> — ${pf(ad / (ad + o) * 100, 0)} всех просмотров аккаунта.</div>`);
  const best = mp.filter(p => p.reach && p.age > 48).sort((x, y) => y.reach - x.reach)[0];
  if (best) keys.push(`${best.th ? `<img src="thumbs/${best.id}.jpg" alt="">` : ic("★")}<div>Лучшая публикация — ${best.fmt.toLowerCase()} от ${dd(best.ts)}: охват <b>${nf(best.reach)}</b>. <a href="${best.url}" target="_blank" rel="noopener">Открыть</a></div>`);
  const cm = D.comments.filter(c => inR(c.ts, a, lastDay)), neg = cm.filter(c => c.tone === "neg");
  if (cm.length) keys.push(`${ic("✎", neg.length / cm.length > .1 ? "r" : "g")}<div>Комментариев <b>${nf(cm.length)}</b>, негатива <b>${pf(neg.length / cm.length * 100, 0)}</b>.</div>`);
  const cs = compStats(), me = cs.find(c => c.me), rk = cs.slice().sort((x, y) => y.er - x.er).findIndex(c => c.me) + 1;
  if (me) keys.push(`${ic("⇄", rk > 3 ? "a" : "g")}<div>По вовлечённости мы на <b>${rk}-м месте</b> из ${cs.length} среди пиццерий и фастфуда, по числу подписчиков — на ${cs.slice().sort((x, y) => y.f - x.f).findIndex(c => c.me) + 1}-м.</div>`);
  $("#mo-keys").innerHTML = keys.map(k => `<li>${k}</li>`).join("");
  $("#mo-top").innerHTML = mp.filter(p => p.reach).sort((x, y) => y.reach - x.reach).slice(0, 4).map(p => `<a class="pc" href="${p.url}" target="_blank" rel="noopener">${p.th ? `<img loading="lazy" src="thumbs/${p.id}.jpg" alt="">` : ""}<div class="m"><b>${kf(p.reach)}</b> охват<br>${p.fmt} · ${dd(p.ts)}</div></a>`).join("") || `<div class="empty">Нет публикаций</div>`;
  const W = weekly(A.filter(r => r.date > addD(LAST, -182)), ["views_reel", "views_story", "views_post", "org", "views_ad"]);
  const part = w => w.days < 7;
  legend("#lg-mo", [["Reels", C.reel], ["Сторис", C.story], ["Посты и карусели", C.post]]);
  stackBars("#ch-mo", W.map(w => w.date), [{ name: "Reels", color: C.reel, values: W.map(w => w.views_reel) }, { name: "Сторис", color: C.story, values: W.map(w => w.views_story) }, { name: "Посты", color: C.post, values: W.map(w => w.views_post) }],
    { xl: dshort, tl: d => `Неделя с ${dd(d)}${part(W.find(w => w.date === d)) ? " (неполная)" : ""}`, dim: d => part(W.find(w => w.date === d)) });
  legend("#lg-mo-ad", [["Свой контент", C.reel], ["Реклама", C.ad]]);
  stackBars("#ch-mo-ad", W.map(w => w.date), [{ name: "Свой контент", color: C.reel, values: W.map(w => w.org) }, { name: "Реклама", color: C.ad, values: W.map(w => w.views_ad) }], { xl: dshort, tl: d => "Неделя с " + dd(d), h: 200 });
}

// ================= КОНТЕНТ =================
function rCt() {
  $$("#ct-per button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.p === S.ct));
  const a = addD(LAST, -S.ct + 1), all = P.filter(p => p.ts.slice(0, 10) >= a), ok = all.filter(p => p.age > 48 && p.reach);
  $("#ct-note").textContent = `${dd(a)} — ${dd(LAST)} · ${all.length} публикаций`;
  // группы
  const G = [["Формат", p => p.fmt], ["Рубрика", p => p.rub, "Рубрика определяется по словам в подписи — бывают ошибки"], ["Язык подписи", p => p.lang],
    ["Призыв к действию в подписи", p => p.cta ? "есть (заказать, приложение, ссылка)" : "нет"], ["Промокод в подписи", p => p.promo ? "есть" : "нет"],
    ["Длина подписи", p => p.clen < 150 ? "короткая (до 150 знаков)" : p.clen < 500 ? "средняя" : "длинная (500+)"],
    ["Время выхода (Ташкент)", p => { const h = +p.ts.slice(11, 13); return h < 11 ? "утро (до 11)" : h < 17 ? "день (11–17)" : h < 20 ? "вечер (17–20)" : "поздно (после 20)"; }],
    ["День недели", p => wday(p.ts) >= 5 ? "выходные" : "будни"]];
  const facts = [], all_m = med(ok.map(p => p.reach));
  $("#ct-groups").innerHTML = G.map(([name, f, tp]) => { const g = {}; ok.forEach(p => (g[f(p)] = g[f(p)] || []).push(p));
    const rows = Object.entries(g).map(([k, a]) => ({ k, n: a.length, m: med(a.map(p => p.reach)), er: med(a.map(p => p.er)) })).sort((x, y) => (y.n >= 5) - (x.n >= 5) || y.m - x.m);
    const val = rows.filter(r => r.n >= 5); if (val.length >= 2) { const hi = val[0], lo = val[val.length - 1]; if (hi.m / lo.m >= 1.2) facts.push([hi.m / lo.m, `${name}: «${hi.k}» — медиана ${kf(hi.m)}, это в ${dec(hi.m / lo.m)} раза больше, чем «${lo.k}» (${kf(lo.m)}).`]); }
    if (val.length === 1 && rows.length > 1) facts.push([0, `${name}: почти все публикации — «${val[0].k}», сравнивать не с чем.`]);
    const id = "g" + Math.random().toString(36).slice(2, 8);
    setTimeout(() => hbars("#" + id, rows.map(r => ({ l: r.k, v: r.m, dim: r.n < 5, t: `${kf(r.m)} <small>· ${r.n} шт.</small>`, c: r.n < 5 ? C.ad : C.g }))), 0);
    return `<div><h3>${name}${tp ? hint(tp) : ""}</h3><div class="hb" id="${id}"></div></div>`; }).join("");
  facts.sort((x, y) => y[0] - x[0]);
  $("#ct-keys").innerHTML = facts.slice(0, 4).map(f => `<li>${ic(f[0] ? "→" : "=", f[0] ? "g" : "a")}<div>${esc(f[1])}</div></li>`).join("") || `<li>${ic("=", "a")}<div>Ни один признак не даёт заметной разницы в охвате (больше 20%) — или публикаций слишком мало для сравнения.</div></li>`;
  // календарь
  const weeks = Math.min(26, Math.ceil(S.ct / 7)), st = monday(addD(LAST, -(weeks * 7) + 7)), cnt = {};
  P.forEach(p => { const d = p.ts.slice(0, 10); if (d >= st) cnt[d] = (cnt[d] || 0) + 1; });
  let cal = `<div class="cal"><div class="lab">${WD.map(w => `<span>${w}</span>`).join("")}</div>`;
  for (let w = 0; w < weeks; w++) { cal += `<div class="col">`; for (let i = 0; i < 7; i++) { const d = addD(st, w * 7 + i), n = cnt[d] || 0;
    cal += d > LAST ? `<span class="d" style="background:transparent"></span>` : `<span class="d" title="${WD[i]} ${dd(d)}: ${n} публ." style="${n ? `background:rgba(0,111,76,${n > 1 ? 1 : .55})` : ""}"></span>`; } cal += `</div>`; }
  $("#ct-cal").innerHTML = cal + `</div>`;
  const days = weeks * 7, empty = [...Array(days)].map((_, i) => addD(st, i)).filter(d => d <= LAST && !cnt[d]).length;
  const hrs = all.map(p => +p.ts.slice(11, 13)), ev = hrs.filter(h => h >= 17 && h < 20).length;
  $("#cal-sub").textContent = `${weeks} недель · светлый — 1 публикация, тёмный — 2+`;
  $("#cal-note").textContent = `Дней без публикаций: ${empty} из ${days}. ${all.length ? pf(ev / all.length * 100, 0) + " публикаций выходят в 17–20 — другое время почти не проверялось." : ""}`;
  // скорость набора
  const L = P.filter(p => p.hist && p.hist.some(h => h[0] >= 150)).map(p => { const at = h => { const x = p.hist.filter(q => q[0] <= h).pop(); return x ? x[1] : null; }; const wk = at(170);
    return wk ? { d1: at(26) / wk, d3: at(74) / wk } : null; }).filter(Boolean);
  $("#ct-life").innerHTML = L.length >= 3 ? `<ul class="keys"><li>${ic("1")}<div>За первые сутки пост набирает <b>${pf(med(L.map(x => x.d1)) * 100, 0)}</b> охвата первой недели.</div></li><li>${ic("3")}<div>За трое суток — <b>${pf(med(L.map(x => x.d3)) * 100, 0)}</b>.</div></li></ul><p class="note">По ${L.length} публикациям. Если через сутки пост сильно ниже обычного — дальше он вряд ли догонит.</p>`
    : `<div class="empty">Копим данные: снимаем цифры свежих постов каждые 4 часа. Первые выводы — примерно через 2 недели.</div>`;
  // таблица
  const rubs = [...new Set(P.map(p => p.rub))].sort(), sel = $("#ct-rub");
  if (sel.options.length !== rubs.length + 1) sel.innerHTML = `<option value="">Все рубрики</option>` + rubs.map(r => `<option>${esc(r)}</option>`).join(""); sel.value = S.rub;
  $$("#ct-fmt button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.fmt));
  let pc = all; if (S.fmt) pc = pc.filter(p => p.fmt === S.fmt); if (S.rub) pc = pc.filter(p => p.rub === S.rub);
  $("#ct-sub").textContent = `${pc.length} шт.`;
  const key = { ts: p => p.ts, adr: p => p.ad ? p.ad.reach : null, svr: p => p.sv }[S.sort] || (p => p[S.sort]);
  pc = pc.slice().sort((a, b) => { const x = key(a), y = key(b); return (x == null) - (y == null) || (x < y ? -1 : x > y ? 1 : 0) * S.dir; });
  table("#ct-tbl", [
    { h: "", l: 1, f: p => `<a href="${p.url}" target="_blank" rel="noopener">${thumb(p)}</a>` },
    { h: "Дата", k: "ts", l: 1, f: p => `${dd(p.ts)}<div class="note">${WD[wday(p.ts)]} ${p.ts.slice(11, 16)}</div>` },
    { h: "Публикация", l: 1, cls: "cap", f: p => { const v = verdict(p); return `<b>${p.fmt}</b> · ${esc(p.rub)} · ${esc(p.lang)} <span class="pill ${v.cls}">${v.t}</span><br>${esc(p.cap.slice(0, 100))}`; } },
    { h: "Охват", k: "reach", f: p => `<b>${nf(p.reach)}</b>`, tip: T.reach }, { h: "Из рекламы", k: "adr", f: p => p.ad ? `${kf(p.ad.reach)}<div class="note">${usd(p.ad.spend)}</div>` : `<span class="note">—</span>`, tip: T.ad },
    { h: "ER", k: "er", f: p => pf(p.er), tip: T.er }, { h: "Сохр.+реп. /1000", k: "svr", f: p => dec(p.sv), tip: T.sv },
    { h: "Комм.", k: "comments", f: p => nf(p.comments) }, { h: "В профиль", k: "profile_visits", f: p => nf(p.profile_visits), tip: T.pv }, { h: "Подписки", k: "follows", f: p => nf(p.follows), tip: "Подписались с этой публикации (только фото и карусели)" },
    { h: "Досмотр", k: "watch", f: p => p.watch ? dec(p.watch) + " с" : "—", tip: T.watch },
  ], pc, { sort: S.sort, dir: S.dir, onSort: k => { S.dir = S.sort === k ? -S.dir : -1; S.sort = k; rCt(); } });
  // reels
  const rl = all.filter(p => p.fmt === "Reels" && p.watch && p.age > 48).sort((a, b) => b.watch - a.watch), mw = med(rl.map(p => p.watch));
  $("#watch-sub").textContent = rl.length ? `медиана ${dec(mw)} с · ${rl.length} Reels за период` : "";
  const sl = rl.length > 10 ? [...rl.slice(0, 5), ...rl.slice(-5)] : rl;
  table("#ct-watch", [{ h: "", l: 1, f: p => `<a href="${p.url}" target="_blank" rel="noopener">${thumb(p)}</a>` }, { h: "Reels", l: 1, cls: "cap", f: p => `${dd(p.ts)} · ${esc(p.rub)}<br>${esc(p.cap.slice(0, 100))}` },
    { h: "Досмотр", f: p => `<b>${dec(p.watch)} с</b>`, tip: T.watch }, { h: "Охват", f: p => nf(p.reach) }, { h: "ER", f: p => pf(p.er) }],
    sl.map((p, i) => ({ ...p, _cls: rl.length > 10 && i === 5 ? "gap" : "" })), { empty: "Мало Reels за период" });
}

// ================= СТОРИС =================
function rSt() {
  const a = addD(LAST, -29), cur = A.filter(r => r.date >= a), prv = A.filter(r => inR(r.date, addD(a, -30), addD(a, -1)));
  const st = D.stories.slice().sort((x, y) => y.ts.localeCompare(x.ts)), v = sum(st, "views"), days = new Set(st.map(s => s.ts.slice(0, 10))).size;
  $("#st-tiles").innerHTML = [tile("Просмотры сторис за 30 дней", kf(sum(cur, "views_story")), chg(sum(cur, "views_story"), sum(prv, "views_story"), "к прошлым 30 дням"), { cls: "main" }),
    tile("Сторис собрано", nf(st.length), days ? `≈ ${dec(st.length / days)} в день` : "сбор только начался"),
    tile("Средний охват одной", kf(st.length ? sum(st, "reach") / st.length : null)), tile("Вышли со сторис", pf(v ? sum(st, "tap_exit") / v * 100 : null, 0), "", { tip: "Доля выходов от всех просмотров собранных сторис" }),
    tile("Переходы в профиль", nf(sum(st, "profile_visits")))].join("");
  stackBars("#ch-st", cur.map(r => r.date), [{ name: "Охват сторис", color: C.story, values: cur.map(r => r.reach_story) }], { xl: dshort, tl: dd });
  rSeries("#st-ser", "0000", "9999", "Сторис ещё не собраны");
  $("#st-sub").textContent = `${st.length} шт.`;
  table("#st-tbl", [{ h: "", l: 1, f: thumb }, { h: "Время", l: 1, f: s => `${dd(s.ts)} ${s.ts.slice(11, 16)}` },
    { h: "Охват", f: s => nf(s.reach) }, { h: "Листали вперёд", f: s => nf(s.tap_forward) }, { h: "Вернулись назад", f: s => nf(s.tap_back), tip: "Вернулись пересмотреть — признак интересной сторис" },
    { h: "Вышли", f: s => `${nf(s.tap_exit)} <span class="note">${s.views ? pf(s.tap_exit / s.views * 100, 0) : ""}</span>` }, { h: "Ответы", f: s => nf(s.replies) }, { h: "Репосты", f: s => nf(s.shares) },
    { h: "В профиль", f: s => nf(s.profile_visits) }], st, { empty: "Сторис ещё не собраны" });
}

// ================= АУДИТОРИЯ И КОММЕНТАРИИ =================
function rAu() {
  $$("#au-per button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.p === S.au));
  const a = addD(LAST, -S.au + 1), cm = D.comments.filter(c => c.ts.slice(0, 10) >= a), neg = cm.filter(c => c.tone === "neg"), pos = cm.filter(c => c.tone === "pos");
  const nans = neg.filter(c => !c.ans), qs = cm.filter(c => c.q), am = med(cm.filter(c => c.ans).map(c => c.am));
  const hm = m => m == null ? "—" : m < 60 ? Math.round(m) + " мин" : m < 1440 ? dec(m / 60) + " ч" : dec(m / 1440) + " дн";
  $("#cm-tiles").innerHTML = [tile("Комментарии", nf(cm.length), `${S.au} дней`), tile("Позитив", pf(cm.length ? pos.length / cm.length * 100 : null, 0)),
    tile("Негатив", pf(cm.length ? neg.length / cm.length * 100 : null, 0), `${neg.length} шт., без ответа ${nans.length}`, { tip: "Тон определяется по словарю (рус. и узб.). Бывают ошибки, особенно с сарказмом." }),
    tile("Вопросы", nf(qs.length), `без ответа ${qs.filter(c => !c.ans).length}`), tile("Время ответа", hm(am), "медиана", { tip: "Сколько проходит от комментария до нашего ответа" })].join("");
  const wk = {}; D.comments.filter(c => c.ts.slice(0, 10) > addD(LAST, -84)).forEach(c => { const w = monday(c.ts); (wk[w] = wk[w] || { pos: 0, neu: 0, neg: 0 })[c.tone]++; });
  const W = Object.keys(wk).sort();
  legend("#lg-tone", [["Позитив", C.pos], ["Нейтрально", C.neu], ["Негатив", C.neg]]);
  stackBars("#ch-tone", W, [{ name: "Позитив", color: C.pos, values: W.map(w => wk[w].pos) }, { name: "Нейтрально", color: C.neu, values: W.map(w => wk[w].neu) }, { name: "Негатив", color: C.neg, values: W.map(w => wk[w].neg) }], { xl: dshort, tl: w => "Неделя с " + dd(w), fmt: nf });
  const th = {}; neg.forEach(c => (c.th.length ? c.th : ["Без темы"]).forEach(t => th[t] = (th[t] || 0) + 1));
  hbars("#cm-themes", Object.entries(th).sort((x, y) => y[1] - x[1]).map(([l, v]) => ({ l, v, c: C.neg })), { empty: "Негатива за период нет" });
  const bp = {}; neg.forEach(c => { bp[c.m] = bp[c.m] || { n: 0, th: {} }; bp[c.m].n++; c.th.forEach(t => bp[c.m].th[t] = (bp[c.m].th[t] || 0) + 1); });
  const bpr = Object.entries(bp).filter(([m]) => PM[m]).map(([m, x]) => ({ p: PM[m], ...x })).sort((x, y) => y.n - x.n).slice(0, 8);
  table("#cm-posts", [{ h: "", l: 1, f: r => `<a href="${r.p.url}" target="_blank" rel="noopener">${thumb(r.p)}</a>` }, { h: "Публикация", l: 1, cls: "cap", f: r => `<b>${r.p.fmt}</b> · ${dd(r.p.ts)}<br>${esc(r.p.cap.slice(0, 90))}` },
    { h: "Негатив", f: r => `<b>${r.n}</b>` }, { h: "Всего комм.", f: r => nf(r.p.comments) }, { h: "О чём", l: 1, f: r => Object.keys(r.th).map(t => `<span class="pill p-r">${esc(t)}</span>`).join(" ") || "—" }], bpr, { empty: "Негатива за период нет" });
  // аудитория
  const au = D.aud || {}, f = au.follower_demographics || {}, re = au.reached_audience_demographics || {};
  const ages = Object.entries(f.age || {}).sort(), ag = f.age_gender || {}, AG = ages.map(x => x[0]);
  legend("#lg-age", [["Женщины", C.g], ["Мужчины", C.b], ["Пол не указан", C.ad]]);
  stackBars("#ch-age", AG, [{ name: "Женщины", color: C.g, values: AG.map(x => ag[x + "|F"] || 0) }, { name: "Мужчины", color: C.b, values: AG.map(x => ag[x + "|M"] || 0) }, { name: "Пол не указан", color: C.ad, values: AG.map(x => ag[x + "|U"] || 0) }], { h: 240 });
  const cities = Object.entries(f.city || {}).sort((x, y) => y[1] - x[1]), ct = sum(cities, x => x[1]), rc = re.city || {}, rt = sum(Object.values(rc), x => x);
  table("#aud-city", [{ h: "Город", l: 1, f: r => esc(r[0].split(",")[0]) }, { h: "Подписчики", f: r => nf(r[1]) }, { h: "Доля подписчиков", f: r => pf(r[1] / ct * 100) },
    { h: "Доля охвата", f: r => pf(rc[r[0]] != null && rt ? rc[r[0]] / rt * 100 : null), tip: "Доля города среди охваченных в этом месяце, включая рекламу — поэтому зависит от геотаргетинга кампаний" }], cities.slice(0, 12));
  const tg = D.tags.filter(t => t.ts.slice(0, 10) > addD(LAST, -30)).sort((x, y) => (y.lk || 0) + (y.cm || 0) - (x.lk || 0) - (x.cm || 0)).slice(0, 12);
  table("#cm-tags", [{ h: "Аккаунт", l: 1, f: t => `<a href="${t.url}" target="_blank" rel="noopener">@${esc(t.u)}</a>` }, { h: "Дата", l: 1, f: t => dd(t.ts) }, { h: "Публикация", l: 1, cls: "cap", f: t => esc(t.cap) },
    { h: "Лайки", f: t => nf(t.lk) }, { h: "Комм.", f: t => nf(t.cm) }], tg, { empty: "За 30 дней отметок нет" });
}

// ================= КОНКУРЕНТЫ =================
function compStats() {
  const users = [...new Set(D.comp_daily.map(r => r.u))], cut = addD(LAST, -29);
  return users.map(u => { const s = D.comp_daily.filter(r => r.u === u).sort((a, b) => a.d.localeCompare(b.d)), l = s[s.length - 1], w = s.filter(r => r.d <= addD(l.d, -7)).pop();
    const m = D.comp_media.filter(x => x.u === u && x.ts.slice(0, 10) >= cut), eng = m.length ? med(m.map(x => (x.lk || 0) + (x.cm || 0))) : null;
    return { u, me: u === D.own, name: l.n || u, f: l.f, g7: w ? l.f - w.f : null, n30: m.length, reels: m.length ? m.filter(x => x.p === "REELS").length / m.length * 100 : null,
      of: m.length ? m.filter(x => x.of).length / m.length * 100 : null, eng, er: eng != null && l.f ? eng / l.f * 100 : null }; });
}
function rCp() {
  const cs = compStats().sort((a, b) => b.f - a.f);
  table("#comp-tbl", [{ h: "Аккаунт", l: 1, f: c => `<a href="https://instagram.com/${c.u}" target="_blank" rel="noopener">${esc(c.name)}</a>` },
    { h: "Подписчики", f: c => nf(c.f) }, { h: "Прирост за 7 дн.", f: c => c.g7 == null ? `<span class="note">копится до 3 ноя</span>` : (c.g7 > 0 ? "+" : "") + nf(c.g7) },
    { h: "Публикаций", f: c => nf(c.n30) }, { h: "Доля Reels", f: c => pf(c.reels, 0) }, { h: "С акцией в тексте", f: c => pf(c.of, 0), tip: "Доля публикаций, где в подписи есть акция, скидка, промокод, бонус или подарок" },
    { h: "Лайки+комм.", f: c => nf(c.eng), tip: "Медиана на публикацию — один розыгрыш не искажает картину" },
    { h: "Вовлечённость", f: c => pf(c.er, 2), tip: "Медиана лайков и комментариев на публикацию на 100 подписчиков. Охваты конкурентов Instagram не показывает." }], cs.map(c => ({ ...c, _cls: c.me ? "me" : "" })));
  hbars("#comp-er", cs.filter(c => c.er != null).sort((a, b) => b.er - a.er).map(c => ({ l: c.name, v: c.er, t: pf(c.er, 2), c: c.me ? C.g : C.ad, me: c.me })));
  const wks = [...Array(8)].map((_, i) => monday(addD(LAST, -7 * (7 - i))));
  table("#comp-wk", [{ h: "", l: 1, f: c => c.me ? `<b>${esc(c.name)}</b>` : esc(c.name) }, ...wks.map(w => ({ h: dshort(w), f: c => { const n = D.comp_media.filter(x => x.u === c.u && monday(x.ts) === w).length;
    return `<span style="display:inline-block;min-width:22px;padding:2px 4px;border-radius:5px;background:rgba(0,111,76,${Math.min(.85, n * .12)});color:${n > 4 ? "#fff" : "inherit"}">${n}</span>`; } }))],
    cs.map(c => ({ ...c, _cls: c.me ? "me" : "" })));
  const nm = Object.fromEntries(cs.map(c => [c.u, c.name]));
  const top = D.comp_media.filter(x => x.u !== D.own && x.ts.slice(0, 10) > addD(LAST, -14)).sort((a, b) => (b.lk || 0) + (b.cm || 0) - (a.lk || 0) - (a.cm || 0)).slice(0, 10);
  table("#comp-top", [{ h: "Бренд", l: 1, f: x => `<b>${esc(nm[x.u] || x.u)}</b><div class="note">${dd(x.ts)}</div>` },
    { h: "Публикация", l: 1, cls: "cap", f: x => `${x.p === "REELS" ? "Reels" : "Пост"}${x.of ? ' <span class="pill p-a">акция</span>' : ""} · ${esc(x.cap)} <a href="${x.url}" target="_blank" rel="noopener">открыть</a>` },
    { h: "Лайки", f: x => nf(x.lk) }, { h: "Комм.", f: x => nf(x.cm) }], top);
}

// ================= каркас =================
const R_ = { wk: rWk, mo: rMo, ct: rCt, st: rSt, au: rAu, cp: rCp };
function render() { $$("#tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.t === S.tab)); $$(".panel").forEach(p => p.hidden = p.id !== "p-" + S.tab); hideTip(); R_[S.tab](); }
$("#tabs").onclick = e => { const t = e.target.closest("button"); if (!t) return; S.tab = t.dataset.t; history.replaceState(null, "", "#" + S.tab); render(); scrollTo(0, 0); };
$("#ct-per").onclick = e => { const t = e.target.closest("button"); if (t) { S.ct = +t.dataset.p; rCt(); } };
$("#au-per").onclick = e => { const t = e.target.closest("button"); if (t) { S.au = +t.dataset.p; rAu(); } };
$("#ct-fmt").onclick = e => { const t = e.target.closest("button"); if (t) { S.fmt = t.dataset.v; rCt(); } };
$("#ct-rub").onchange = e => { S.rub = e.target.value; rCt(); };
$("#mo-sel").onchange = e => { S.mo = e.target.value; rMo(); };
let rt, lw = innerWidth; addEventListener("resize", () => { if (innerWidth === lw) return; lw = innerWidth; clearTimeout(rt); rt = setTimeout(render, 150); });
if (R_[location.hash.slice(1)]) S.tab = location.hash.slice(1);
$("#stamp").textContent = `@${D.own} · данные по ${dd(LAST)} · обновлено ${dd(D.built)} в ${D.built.slice(11, 16)}`;
const bad = Object.entries((D.status || {}).blocks || {}).filter(([, v]) => !v.ok);
const NAMES = { account: "статистика аккаунта", media: "публикации", stories: "сторис", audience: "аудитория", comments: "комментарии", tags: "отметки", competitors: "конкуренты", ads: "реклама" };
$("#foot").innerHTML = (bad.length ? `<span class="pill p-r">Не обновилось: ${bad.map(([k]) => NAMES[k] || k).join(", ")}</span> ` : "") + `Данные Instagram и рекламного кабинета Meta, обновляются автоматически каждые 4 часа. Дни — по суткам Meta, время публикаций — Ташкент.`;
render();
