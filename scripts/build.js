// Siteyi data/events.json'dan üretir → dist/
// Kullanım: node scripts/build.js   (bağımlılık yok)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const S = require(path.join(ROOT, "src/shared.js"));
const { CATS, esc, longDate, fmtShort, pd, iso, addD, yakaOf, detailHTML } = S;

const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/events.json"), "utf8"));
const OUT = path.join(ROOT, "dist");
const BASE = CFG.basePath;                 // ör. "/istanbul-etkinlik/"
const SITE_URL = CFG.siteUrl.replace(/\/$/, "");
const abs = p => SITE_URL + "/" + p.replace(/^\//, "");

const TODAY = (() => {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  catch (e) { return iso(new Date()); }
})();

// ---- veri doğrulama ----
const ids = new Set();
for (const e of DATA.events) {
  if (!CATS[e.category]) throw new Error("Bilinmeyen kategori: " + e.category + " (" + e.id + ")");
  if (!DATA.sources[e.source]) throw new Error("Bilinmeyen kaynak: " + e.source + " (" + e.id + ")");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.start) || !/^\d{4}-\d{2}-\d{2}$/.test(e.end)) throw new Error("Hatalı tarih: " + e.id);
  if (e.time && !/^\d{2}:\d{2}$/.test(e.time)) throw new Error("Hatalı saat: " + e.id);
  if (!/^[a-z0-9-]+$/.test(e.id)) throw new Error("Hatalı id: " + e.id);
  if (ids.has(e.id)) throw new Error("Tekrarlanan id: " + e.id);
  ids.add(e.id);
}

const pageUrl = x => BASE + "etkinlik/" + x.id + "/";
const upcoming = DATA.events.filter(e => e.end >= TODAY);
const updatedText = longDate(DATA.updated);

fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };

// ---- ortak parçalar ----
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const ICON = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#16213a"/><path d="M14 46V34h4v-6l2-3 2 3v6h4v12zM30 46V36a8 8 0 0 1 16 0v10z" fill="#d9a441"/><rect x="48" y="22" width="3" height="24" fill="#d9a441"/></svg>')}">`;

const NAV_LINKS = [["", "Tümü"], ...Object.values(CATS).map(c => [c.path + "/", c.name.split(" ·")[0]]), ["ucretsiz/", "Ücretsiz"], ["belediye/", "Belediye"]];
const topnav = active => `<div class="topnav"><div class="topnav-inner"><a class="brand" href="${BASE}">Şehirde <em>ne var?</em></a>
<nav aria-label="Kategoriler">${NAV_LINKS.map(([p, n]) => `<a href="${BASE}${p}" class="${active === p ? "on" : ""}">${esc(n)}</a>`).join("")}</nav></div></div>`;

const head = ({ title, desc, canonical, jsonld, extra = "" }) => `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="${esc(CFG.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#16213a">
${CFG.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(CFG.googleSiteVerification)}">` : ""}
${ICON}
${FONTS}
<link rel="stylesheet" href="${BASE}assets/style.css?v=${DATA.updated}">
${(jsonld || []).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n")}
${extra}
</head>`;

const footer = () => `<footer>
  <h4>Bu takvim hakkında</h4>
  <p>Şehirde Ne Var?, İstanbul'daki konser, tiyatro, stand-up, opera-bale, belediye etkinlikleri, festival ve meetup'ları tek yerde toplayan bağımsız bir rehberdir. Liste her gün güncellenir; son güncelleme: <b>${updatedText}</b>. Bilgiler aşağıdaki kaynaklardan derlenir. Saat, fiyat ve bilet durumu değişebilir; gitmeden önce mekânın ya da bilet platformunun sayfasını kontrol edin.</p>
  <ul>${Object.values(DATA.sources).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.title)}</a></li>`).join("")}</ul>
  <p style="margin-top:14px">Etkinlik verisi açık: <a href="${BASE}data/events.json">events.json</a> · Eksik ya da hatalı bir etkinlik mi var? <a href="${CFG.repoUrl}/issues/new" target="_blank" rel="noopener">Bize bildirin</a>.</p>
</footer>`;

const SKYLINE = `<svg class="skyline" viewBox="0 0 520 160" fill="#f5efe4" aria-hidden="true"><rect x="0" y="120" width="520" height="40"/><path d="M40 120V80h10V60l5-8 5 8v20h10v40z"/><path d="M120 120V90a40 40 0 0 1 80 0v30z"/><rect x="155" y="34" width="10" height="20"/><path d="M160 30l-3 6h6z"/><rect x="104" y="40" width="6" height="80"/><path d="M107 28l-4 12h8z"/><rect x="210" y="40" width="6" height="80"/><path d="M213 28l-4 12h8z"/><path d="M260 120V70l20-30 20 30v50z"/><path d="M330 120V96a30 30 0 0 1 60 0v24z"/><rect x="316" y="56" width="5" height="64"/><rect x="399" y="56" width="5" height="64"/><path d="M430 120V20l6-14 6 14v100z"/><rect x="460" y="70" width="40" height="50"/></svg>`;

// ---- liste sayfaları (ana sayfa + kategoriler) ----
function listPage({ rel, title, h1, kicker, sub, desc, preset, filter }) {
  const items = upcoming.filter(filter || (() => true))
    .sort((a, b) => a.start.localeCompare(b.start) || (a.time || "99").localeCompare(b.time || "99"));
  // tarayıcıya giden veri: yaklaşanlar (ilgili-etkinlik önerileri için tümü)
  const clientData = { updated: DATA.updated, sources: DATA.sources, ongoing: DATA.ongoing.filter(o => o.end >= TODAY), events: upcoming };
  const canonical = abs(BASE + rel);
  const jsonld = [{
    "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: desc, url: canonical, inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", name: CFG.siteName, url: abs(BASE) },
    mainEntity: { "@type": "ItemList", numberOfItems: items.length,
      itemListElement: items.slice(0, 100).map((e, i) => ({ "@type": "ListItem", position: i + 1, url: abs(pageUrl(e)), name: e.title })) }
  }];
  if (!rel) jsonld.push({ "@context": "https://schema.org", "@type": "WebSite", name: CFG.siteName, url: abs(BASE), inLanguage: "tr-TR" });

  const html = `${head({ title, desc, canonical, jsonld })}
<body>
${topnav(rel)}
<header class="hero">${SKYLINE}
  <div class="hero-inner">
    <div class="kicker">${esc(kicker)}</div>
    <h1>${h1}</h1>
    <p class="sub">${esc(sub)}</p>
    <div class="stats" id="stats"></div>
    <div class="updated">Son güncelleme: <b>${updatedText}</b> · her gün yenilenir</div>
  </div>
</header>
<div class="bar"><div class="bar-inner">
  <div class="row">
    <label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Sanatçı, oyun, mekân veya ilçe ara…" autocomplete="off" aria-label="Etkinlik ara"></label>
    <div class="seg" id="when"></div>
  </div>
  <div class="row" id="cats"></div>
  <div class="row">
    <label class="tog"><input type="checkbox" id="free"> Sadece ücretsiz</label>
    <label class="tog"><input type="checkbox" id="bel"> Belediye etkinlikleri</label>
    <label class="tog"><input type="checkbox" id="avail"> Tükenenleri gizle</label>
    <select id="yaka" aria-label="Yaka"><option value="">Tüm şehir</option><option value="A">Avrupa Yakası</option><option value="N">Anadolu Yakası</option></select>
  </div>
</div></div>
<main>
  <section class="ongoing" id="ongoingWrap"><h2>Süregelen festivaller &amp; sergiler</h2><div class="strip" id="ongoing"></div></section>
  <div id="list"><noscript><p>Etkinlik listesini filtrelemek için JavaScript gerekir. Tüm etkinlikler aşağıda listelenmiştir.</p></noscript></div>
  <section class="seo-list" aria-label="Tüm etkinlik sayfaları">
    <details><summary>Tüm ${esc(kicker.toLocaleLowerCase("tr"))} (${items.length}) — liste görünümü</summary>
      <ul>${items.map(e => `<li><a href="${pageUrl(e)}">${esc(e.title)}</a> — ${fmtShort(e.start)}${e.end !== e.start ? "–" + fmtShort(e.end) : ""}${e.time ? " " + e.time : ""}, ${esc(e.venue)}</li>`).join("")}</ul>
    </details>
  </section>
</main>
<div class="ov" id="ov" aria-hidden="true"><div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mtitle"></div></div>
<div class="toast" id="toast"></div>
${footer()}
<script>window.SITE=${JSON.stringify({ base: BASE })};window.PRESET=${JSON.stringify(preset || {})};window.DATA=${JSON.stringify(clientData).replace(/</g, "\\u003c")};</script>
<script src="${BASE}assets/shared.js?v=${DATA.updated}"></script>
<script src="${BASE}assets/app.js?v=${DATA.updated}"></script>
</body></html>`;
  write(rel + "index.html", html);
}

const range = (() => { const s = upcoming.map(e => e.start).sort(); return s.length ? `${fmtShort(s[0] < TODAY ? TODAY : s[0])} – ${fmtShort(upcoming.map(e => e.end).sort().pop())}` : ""; })();

listPage({
  rel: "", title: "İstanbul Etkinlikleri — Konser, Tiyatro, Stand-up, Ücretsiz Belediye Etkinlikleri | Şehirde Ne Var?",
  h1: "Şehirde <em>ne var?</em>", kicker: "İstanbul etkinlik takvimi",
  sub: "Konserler, tiyatrolar, stand-up geceleri, belediyelerin ücretsiz etkinlikleri, festivaller ve meetup'lar — tek bir yerde, gün gün. Her gün güncellenir.",
  desc: `İstanbul'da bugün, bu hafta sonu ve bu ay ne var? ${upcoming.length} konser, tiyatro, stand-up, opera-bale, ücretsiz İBB ve belediye etkinliği, festival ve meetup tek takvimde (${range}).`
});
for (const [key, c] of Object.entries(CATS)) {
  const n = upcoming.filter(e => e.category === key).length;
  const cap = c.plural.charAt(0).toLocaleUpperCase("tr") + c.plural.slice(1);
  listPage({
    rel: c.path + "/", preset: { cat: key }, filter: e => e.category === key,
    title: `İstanbul ${cap} — Güncel Takvim ve Biletler | Şehirde Ne Var?`,
    h1: `İstanbul <em>${esc(c.plural)}</em>`, kicker: `İstanbul ${c.plural}`,
    sub: `İstanbul'daki ${n} yaklaşan ${c.plural} — tarih, saat, mekân ve bilet bilgileriyle. Her gün güncellenir.`,
    desc: `İstanbul'da bu hafta hangi ${c.plural} var? ${n} etkinlik; tarih, saat, mekân, ilçe ve bilet fiyatlarıyla güncel takvim.`
  });
}
listPage({
  rel: "ucretsiz/", preset: { free: true }, filter: e => e.free,
  title: "İstanbul'da Ücretsiz Etkinlikler — Konser, Tiyatro, Atölye | Şehirde Ne Var?",
  h1: "İstanbul'da <em>ücretsiz</em> etkinlikler", kicker: "Ücretsiz etkinlikler",
  sub: "İBB kültür merkezleri, belediyeler ve diğer mekânlardaki ücretsiz konser, oyun, atölye ve sergiler.",
  desc: "İstanbul'da bugün ve bu hafta ücretsiz ne var? İBB kültür merkezlerindeki ücretsiz konserler, atölyeler, sergiler ve daha fazlası."
});
listPage({
  rel: "belediye/", preset: { bel: true }, filter: e => e.municipal,
  title: "İBB ve Belediye Etkinlikleri İstanbul — Şehir Tiyatroları, Kültür Merkezleri | Şehirde Ne Var?",
  h1: "<em>Belediye</em> etkinlikleri", kicker: "Belediye etkinlikleri",
  sub: "İBB Şehir Tiyatroları, İBB kültür merkezleri, Muammer Karaca Tiyatrosu ve ilçe belediyelerinin programları.",
  desc: "İBB Şehir Tiyatroları oyunları, İBB kültür merkezlerinin ücretsiz konserleri ve ilçe belediyesi etkinlikleri — güncel İstanbul takvimi."
});

// ---- etkinlik sayfaları ----
function jsonldEvent(x) {
  const t = x.time ? `T${x.time}:00+03:00` : "";
  const offer = { "@type": "Offer", url: DATA.sources[x.source].url, priceCurrency: "TRY",
    availability: x.soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock", validFrom: DATA.updated };
  if (x.free) offer.price = 0;
  else { const m = (x.price || "").replace(/\./g, "").match(/(\d+(?:,\d+)?)/); if (m) offer.price = Number(m[1].replace(",", ".")); }
  const ev = {
    "@context": "https://schema.org", "@type": "Event", name: x.title,
    startDate: x.start + t, endDate: x.end + (x.start === x.end ? t : ""),
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: x.venue, address: { "@type": "PostalAddress", addressLocality: x.district || "İstanbul", addressRegion: "İstanbul", addressCountry: "TR" } },
    description: describe(x), url: abs(pageUrl(x)), inLanguage: "tr", offers: offer
  };
  if (x.free) ev.isAccessibleForFree = true;
  return ev;
}
function describe(x) {
  const c = CATS[x.category];
  const when = x.start === x.end ? longDate(x.start) : `${fmtShort(x.start)} – ${fmtShort(x.end)}`;
  const price = x.free ? (x.price || "Ücretsiz") : (x.price ? "Bilet: " + x.price : "");
  return [`${x.title}: ${when}${x.time ? ", saat " + x.time : ""}`, `${x.venue}${x.district ? ", " + x.district : ""}, İstanbul`, c.name, price, x.note].filter(Boolean).join(" · ") + ".";
}

for (const x of DATA.events) {
  const c = CATS[x.category];
  const canonical = abs(pageUrl(x));
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "İstanbul etkinlikleri", item: abs(BASE) },
    { "@type": "ListItem", position: 2, name: c.name, item: abs(BASE + c.path + "/") },
    { "@type": "ListItem", position: 3, name: x.title, item: canonical }] };
  const body = detailHTML(x, { all: DATA.events, sources: DATA.sources, today: TODAY, pageUrl, asPage: true });
  const datePart = x.start === x.end ? fmtShort(x.start) : `${fmtShort(x.start)}–${fmtShort(x.end)}`;
  const html = `${head({
    title: `${x.title} — ${datePart}${x.time ? " " + x.time : ""}, ${x.venue} | İstanbul ${c.name}`,
    desc: describe(x), canonical, jsonld: x.end >= TODAY ? [jsonldEvent(x), crumbs] : [crumbs],
    extra: x.end < addDays(TODAY, -45) ? '<meta name="robots" content="noindex">' : ""
  })}
<body>
${topnav(c.path + "/")}
<main class="ep">
  <div class="crumb"><a href="${BASE}">İstanbul etkinlikleri</a> › <a href="${BASE}${c.path}/">${esc(c.name)}</a></div>
  <article class="modal" style="--c:${c.color}">${body}</article>
  <p style="margin-top:22px"><a class="btn" href="${BASE}">← Tüm İstanbul etkinlikleri</a> <a class="btn" href="${BASE}${c.path}/">${esc(c.name)} takvimi</a></p>
</main>
<div class="toast" id="toast"></div>
${footer()}
<script>
document.querySelector("[data-copy]").onclick=async()=>{const t=document.getElementById("toast");try{await navigator.clipboard.writeText(${JSON.stringify(S.shareText(x, DATA.sources)).replace(/</g, "\\u003c")});t.textContent="Kopyalandı"}catch(e){t.textContent="Kopyalanamadı"}t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1600)};
</script>
</body></html>`;
  write("etkinlik/" + x.id + "/index.html", html);
}
function addDays(s, n) { return iso(addD(pd(s), n)); }

// ---- statik dosyalar ----
write("assets/style.css", fs.readFileSync(path.join(ROOT, "src/style.css")));
write("assets/shared.js", fs.readFileSync(path.join(ROOT, "src/shared.js")));
write("assets/app.js", fs.readFileSync(path.join(ROOT, "src/app.js")));
write("data/events.json", JSON.stringify(DATA));
write(".nojekyll", "");
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${abs(BASE + "sitemap.xml")}\n`);
write("404.html", `${head({ title: "Sayfa bulunamadı | Şehirde Ne Var?", desc: "Aradığınız sayfa bulunamadı.", canonical: abs(BASE), extra: '<meta name="robots" content="noindex">' })}
<body>${topnav("x")}<main class="ep"><div class="empty"><b>Bu sayfa bulunamadı</b>Etkinliğin tarihi geçmiş ya da listeden kaldırılmış olabilir.<p><a class="btn primary" href="${BASE}">Güncel İstanbul etkinliklerine git</a></p></div></main></body></html>`);

const urls = [["", "daily", "1.0"], ...Object.values(CATS).map(c => [c.path + "/", "daily", "0.8"]), ["ucretsiz/", "daily", "0.8"], ["belediye/", "daily", "0.8"],
  ...DATA.events.filter(e => e.end >= addDays(TODAY, -45)).map(e => ["etkinlik/" + e.id + "/", "weekly", e.end >= TODAY ? "0.6" : "0.2"])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, f, p]) => `<url><loc>${abs(BASE + u)}</loc><lastmod>${DATA.updated}</lastmod><changefreq>${f}</changefreq><priority>${p}</priority></url>`).join("\n")}
</urlset>
`);

console.log(`Tamam: ${DATA.events.length} etkinlik sayfası, ${upcoming.length} yaklaşan, ${urls.length} URL → dist/ (bugün ${TODAY})`);
