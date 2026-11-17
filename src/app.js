(function () {
  const { CATS, TR_DAYS, TR_MON, pd, iso, addD, fmtShort, longDate, esc, yakaOf, norm, detailHTML, shareText } = window.SNV;
  const DATA = window.DATA, SITE = window.SITE, PRESET = window.PRESET || {};
  const SRC = DATA.sources;
  const pageUrl = x => SITE.base + "etkinlik/" + x.id + "/";

  const EV = DATA.events.map(e => ({ ...e, yaka: yakaOf(e.district),
    hay: norm([e.title, e.venue, e.district, e.note || "", CATS[e.category].name].join(" ")) }));
  const byId = Object.fromEntries(EV.map(e => [e.id, e]));

  function istToday() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return iso(new Date()); }
  }
  const TODAY = istToday();

  const st = { q: "", when: "all", cats: new Set(PRESET.cat ? [PRESET.cat] : []), free: !!PRESET.free, bel: !!PRESET.bel, avail: false, yaka: "" };
  document.getElementById("free").checked = st.free;
  document.getElementById("bel").checked = st.bel;

  function range() {
    const t = pd(TODAY);
    if (st.when === "today") return [TODAY, TODAY];
    if (st.when === "tomorrow") { const x = iso(addD(t, 1)); return [x, x]; }
    if (st.when === "weekend") {
      const dow = t.getDay();
      const sat = dow === 0 ? addD(t, -1) : addD(t, 6 - dow);
      const fri = iso(addD(sat, -1));
      return [fri < TODAY ? TODAY : fri, iso(addD(sat, 1))];
    }
    if (st.when === "week") return [TODAY, iso(addD(t, 6))];
    return [TODAY, "2099-12-31"];
  }
  const WHEN = [["today", "Bugün"], ["tomorrow", "Yarın"], ["weekend", "Hafta sonu"], ["week", "7 gün"], ["all", "Tümü"]];

  function passBase(ev) {
    if (st.free && !ev.free) return false;
    if (st.bel && !ev.municipal) return false;
    if (st.avail && ev.soldOut) return false;
    if (st.yaka && ev.yaka !== st.yaka) return false;
    if (st.q) { const w = norm(st.q).split(/\s+/).filter(Boolean); if (!w.every(x => ev.hay.includes(x))) return false; }
    return true;
  }
  function expand(list, [a, b]) {
    const out = [];
    for (const ev of list) {
      if (ev.end < a || ev.start > b) continue;
      let d = pd(ev.start < a ? a : ev.start); const end = pd(ev.end < b ? ev.end : b);
      while (d <= end) { out.push({ ...ev, day: iso(d) }); d = addD(d, 1); }
    }
    return out;
  }

  function card(x) {
    const c = CATS[x.category];
    const multi = x.start !== x.end ? `<span class="tag">${fmtShort(x.start)} – ${fmtShort(x.end)}</span>` : "";
    const price = x.free ? `<span class="tag free">${esc(x.price || "Ücretsiz")}</span>` : (x.price ? `<span class="tag">${esc(x.price)}</span>` : "");
    return `<article class="card" style="--c:${c.color}" data-id="${x.id}" tabindex="0" role="button" aria-label="${esc(x.title)} — detaylar">
    <div class="time">${x.time ? esc(x.time) : "—"}${x.time ? "" : "<small>saat için<br>kaynağa bakın</small>"}</div>
    <div class="body">
      <div class="cat">${c.name}</div>
      <h3 class="title"><a href="${pageUrl(x)}" style="text-decoration:none">${esc(x.title)}</a></h3>
      <div class="where">${esc(x.venue)}${x.district && !x.venue.includes(x.district) ? " · " + esc(x.district) : ""}</div>
      ${x.note ? `<div class="note">${esc(x.note)}</div>` : ""}
      <div class="meta">${price}${x.municipal ? '<span class="tag bel">Belediye</span>' : ""}${x.soldOut ? '<span class="tag sold">Tükendi</span>' : ""}${multi}
        <span class="src more">Detaylar →</span></div>
    </div></article>`;
  }

  function render() {
    const r = range();
    const inRange = expand(EV.filter(passBase), r);
    const counts = {}; inRange.forEach(x => counts[x.category] = (counts[x.category] || 0) + 1);
    document.getElementById("cats").innerHTML =
      `<button class="chip ${st.cats.size === 0 ? "on" : ""}" data-c="">Hepsi <span class="n">${inRange.length}</span></button>` +
      Object.entries(CATS).map(([k, c]) => `<button class="chip ${st.cats.has(k) ? "on" : ""}" data-c="${k}"><span class="dot" style="background:${c.color}"></span>${c.name} <span class="n">${counts[k] || 0}</span></button>`).join("");
    const shown = inRange.filter(x => st.cats.size === 0 || st.cats.has(x.category))
      .sort((a, b) => a.day.localeCompare(b.day) || (a.time || "99").localeCompare(b.time || "99") || a.title.localeCompare(b.title, "tr"));

    const longs = DATA.ongoing.filter(l => !(l.end < r[0] || l.start > r[1]))
      .filter(l => (!st.free || l.free) && (!st.bel || l.municipal) && (st.cats.size === 0 || st.cats.has(l.category)) && (!st.q || norm(l.title + " " + l.description).includes(norm(st.q))));
    document.getElementById("ongoingWrap").style.display = longs.length ? "" : "none";
    document.getElementById("ongoing").innerHTML = longs.map(l => `<div class="long" data-long="${l.id}" tabindex="0" role="button"><div class="range">${fmtShort(l.start)} – ${fmtShort(l.end)}</div><h3>${esc(l.title)}</h3><p>${esc(l.description)}</p><a>Detaylar →</a></div>`).join("");

    const byDay = {}; shown.forEach(x => (byDay[x.day] = byDay[x.day] || []).push(x));
    const days = Object.keys(byDay).sort();
    const L = document.getElementById("list");
    if (!days.length) { L.innerHTML = `<div class="empty"><b>Bu filtrelerle etkinlik yok</b>Tarih aralığını genişletmeyi ya da filtreleri temizlemeyi deneyin.</div>`; return; }
    const tom = iso(addD(pd(TODAY), 1));
    L.innerHTML = days.map(day => {
      const d = pd(day); const dn = TR_DAYS[d.getDay()];
      const rel = day === TODAY ? "Bugün" : (day === tom ? "Yarın" : dn);
      return `<section class="day" data-day="${day}"><div class="dayhead"><h2>${d.getDate()} ${TR_MON[d.getMonth()]}</h2><span class="dname">${rel}${rel !== dn ? " · " + dn : ""}</span><span class="cnt">${byDay[day].length} etkinlik</span></div>
      <div class="grid">${byDay[day].map(card).join("")}</div></section>`;
    }).join("");
  }

  // istatistik
  (function () {
    const up = EV.filter(e => e.end >= TODAY);
    const el = document.getElementById("stats"); if (!el) return;
    el.innerHTML = [[up.length, "yaklaşan etkinlik"], [new Set(up.map(e => e.venue)).size, "mekân"], [up.filter(e => e.municipal).length, "belediye etkinliği"], [up.filter(e => e.free).length, "ücretsiz"]]
      .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  })();

  // kontroller
  const W = document.getElementById("when");
  W.innerHTML = WHEN.map(([k, l]) => `<button data-w="${k}" class="${st.when === k ? "on" : ""}">${l}</button>`).join("");
  W.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.when = b.dataset.w; W.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); render(); });
  document.getElementById("cats").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; const c = b.dataset.c; if (!c) st.cats.clear(); else st.cats.has(c) ? st.cats.delete(c) : st.cats.add(c); render(); });
  let tmr; document.getElementById("q").addEventListener("input", e => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = e.target.value.trim(); render(); }, 120); });
  ["free", "bel", "avail"].forEach(id => document.getElementById(id).addEventListener("change", e => { st[id] = e.target.checked; render(); }));
  document.getElementById("yaka").addEventListener("change", e => { st.yaka = e.target.value; render(); });
  render();

  // ===== detay penceresi =====
  const OV = document.getElementById("ov"), MD = document.getElementById("modal");
  let lastFocus = null;
  function openEvent(id, day) {
    const x = byId[id]; if (!x) return;
    MD.style.setProperty("--c", CATS[x.category].color);
    MD.innerHTML = detailHTML(x, { all: EV, sources: SRC, today: TODAY, day, pageUrl, asPage: false });
    MD.querySelector("[data-copy]").onclick = () => copy(shareText(x, SRC));
    show("e-" + x.id);
  }
  function openLong(id) {
    const l = DATA.ongoing.find(o => o.id === id); if (!l) return;
    const c = CATS[l.category];
    const rel = l.related || {};
    const related = EV.filter(e => (rel.venue && e.venue === rel.venue) || (rel.titleContains && e.title.includes(rel.titleContains)))
      .filter(e => e.end >= TODAY).sort((a, b) => a.start.localeCompare(b.start) || (a.time || "").localeCompare(b.time || ""));
    MD.style.setProperty("--c", c.color);
    MD.innerHTML = `<div class="mhead"><div class="mcat">${c.name}</div><h2 id="mtitle">${esc(l.title)}</h2><div class="mtags">${l.free ? '<span class="tag">Ücretsiz</span>' : ""}${l.municipal ? '<span class="tag">Belediye etkinliği</span>' : ""}</div><button class="x" aria-label="Kapat" data-close>×</button></div>
    <div class="mbody"><div class="facts"><div class="fact"><div class="k">Tarihler</div><div class="v">${longDate(l.start)}<br>→ ${longDate(l.end)}</div></div></div>
    <div class="mnote">${esc(l.description)}</div>
    <div class="actions"><a class="btn primary" href="${esc(SRC[l.source].url)}" target="_blank" rel="noopener nofollow">Kaynağa git ↗</a></div>
    ${related.length ? `<div class="msec"><h4>Programdan etkinlikler (${related.length})</h4>${related.map(e => window.SNV.mini(e)).join("")}</div>` : ""}
    <div class="msrc">Bilgi kaynağı: <a href="${esc(SRC[l.source].url)}" target="_blank" rel="noopener nofollow">${esc(SRC[l.source].title)}</a></div></div>`;
    show("f-" + l.id);
  }
  function show(hash) {
    if (!OV.classList.contains("open")) lastFocus = document.activeElement;
    OV.classList.add("open"); OV.setAttribute("aria-hidden", "false"); document.body.classList.add("lock");
    OV.scrollTop = 0; MD.scrollTop = 0;
    const x = MD.querySelector(".x"); if (x) x.focus();
    try { if (location.hash !== "#" + hash) history.replaceState(null, "", "#" + hash); } catch (e) {}
  }
  function closeModal() {
    OV.classList.remove("open"); OV.setAttribute("aria-hidden", "true"); document.body.classList.remove("lock");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1600); }
  async function copy(t) { try { await navigator.clipboard.writeText(t); toast("Kopyalandı"); } catch (e) { toast("Kopyalanamadı"); } }

  function activate(el) {
    if (el.dataset.id !== undefined) { const day = el.closest(".day") && el.closest(".day").dataset.day; openEvent(el.dataset.id, day); return; }
    if (el.dataset.long !== undefined) openLong(el.dataset.long);
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-close]") || e.target === OV) { closeModal(); return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // yeni sekmede açmaya izin ver
    const el = e.target.closest(".card,.long,.mini"); if (el) { e.preventDefault(); activate(el); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && OV.classList.contains("open")) { closeModal(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".card,.long,.mini")) { e.preventDefault(); activate(e.target); }
    if (e.key === "Tab" && OV.classList.contains("open")) {
      const f = [...MD.querySelectorAll("a,button,[tabindex='0']")]; if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  function fromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("e-")) openEvent(h.slice(2));
    else if (h.startsWith("f-")) openLong(h.slice(2));
    else if (OV.classList.contains("open")) closeModal();
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
