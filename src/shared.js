// Tarayıcıda ve derleme betiğinde (Node) ortak kullanılan yardımcılar.
(function (root) {
  const CATS = {
    konser: { name: "Konser", plural: "konserler", color: "var(--konser)", path: "konser" },
    tiyatro: { name: "Tiyatro", plural: "tiyatro oyunları", color: "var(--tiyatro)", path: "tiyatro" },
    standup: { name: "Stand-up", plural: "stand-up gösterileri", color: "var(--standup)", path: "stand-up" },
    sahne: { name: "Opera · Bale · Dans", plural: "opera, bale ve dans gösterileri", color: "var(--sahne)", path: "opera-bale-dans" },
    festival: { name: "Festival", plural: "festivaller", color: "var(--festival)", path: "festival" },
    meetup: { name: "Meetup · Topluluk", plural: "meetup ve topluluk etkinlikleri", color: "var(--meetup)", path: "meetup" },
    cocuk: { name: "Çocuk & Aile", plural: "çocuk ve aile etkinlikleri", color: "var(--cocuk)", path: "cocuk" },
    atolye: { name: "Atölye · Söyleşi", plural: "atölye ve söyleşiler", color: "var(--atolye)", path: "atolye-soylesi" },
    sergi: { name: "Sergi", plural: "sergiler", color: "var(--sergi)", path: "sergi" }
  };
  const ANADOLU = ["Kadıköy","Üsküdar","Ümraniye","Ataşehir","Kartal","Maltepe","Sancaktepe","Şile","Tuzla","Pendik","Beykoz","Çekmeköy","Sultanbeyli"];
  const TR_DAYS = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  const TR_MON = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  const pd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtShort = s => { const d = pd(s); return d.getDate() + " " + TR_MON[d.getMonth()]; };
  const longDate = s => { const d = pd(s); return d.getDate() + " " + TR_MON[d.getMonth()] + " " + d.getFullYear() + ", " + TR_DAYS[d.getDay()]; };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const yakaOf = ilce => !ilce ? "" : (ANADOLU.includes(ilce) ? "N" : "A");
  const yakaName = y => y === "N" ? "Anadolu Yakası" : (y === "A" ? "Avrupa Yakası" : "");
  const norm = s => String(s).toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
  const mapsUrl = (v, i) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([v, i, "İstanbul"].filter(Boolean).join(", "));

  function gcalUrl(x, day, sources) {
    const base = day || x.start;
    const d = base.replace(/-/g, "");
    const pad = n => String(n).padStart(2, "0");
    let dates;
    if (x.time) {
      const [h, m] = x.time.split(":").map(Number);
      const end = h + 2 >= 24 ? iso(addD(pd(base), 1)).replace(/-/g, "") : d;
      dates = `${d}T${pad(h)}${pad(m)}00/${end}T${pad((h + 2) % 24)}${pad(m)}00`;
    } else dates = `${d}/${iso(addD(pd(base), 1)).replace(/-/g, "")}`;
    const q = [["action", "TEMPLATE"], ["text", x.title], ["dates", dates], ["ctz", "Europe/Istanbul"],
      ["location", [x.venue, x.district, "İstanbul"].filter(Boolean).join(", ")],
      ["details", [x.note, x.price, "Kaynak: " + sources[x.source].url].filter(Boolean).join("\n")]];
    return "https://calendar.google.com/calendar/render?" + q.map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  }

  const fact = (k, v) => v ? `<div class="fact"><div class="k">${k}</div><div class="v">${v}</div></div>` : "";
  const mini = (x, href) => `<${href ? `a href="${href}"` : "div"} class="mini" data-id="${x.id}" tabindex="0" role="button" style="text-decoration:none"><span class="mc" style="background:${CATS[x.category].color}"></span><span class="md">${fmtShort(x.start)}${x.time ? " · " + x.time : ""}</span><span class="mt">${esc(x.title)}</span></${href ? "a" : "div"}>`;

  // Etkinlik detayının gövdesi — hem açılır pencerede hem etkinlik sayfasında kullanılır
  // ctx: {all, sources, today, day, pageUrl(x), asPage}
  function detailHTML(x, ctx) {
    const c = CATS[x.category];
    const when = x.start === x.end ? longDate(x.start)
      : `${fmtShort(x.start)} – ${fmtShort(x.end)} ${pd(x.end).getFullYear()}<div style="font-size:12.5px;color:var(--muted);font-weight:500">Her gün tekrarlanıyor</div>`;
    const price = x.free ? (x.price || "Ücretsiz") : (x.price || "Kaynakta belirtilmemiş");
    const tags = [x.free ? '<span class="tag">Ücretsiz</span>' : "", x.municipal ? '<span class="tag">Belediye etkinliği</span>' : "", x.soldOut ? '<span class="tag">Tükendi</span>' : ""].join("");
    const src = ctx.sources[x.source];
    const theDay = ctx.day || (x.start < ctx.today && x.end >= ctx.today ? ctx.today : x.start);
    const sameVenue = ctx.all.filter(e => e.id !== x.id && e.venue === x.venue && e.end >= ctx.today)
      .sort((a, b) => a.start.localeCompare(b.start) || (a.time || "").localeCompare(b.time || "")).slice(0, 6);
    const sameDay = ctx.all.filter(e => e.id !== x.id && e.category === x.category && e.start <= theDay && e.end >= theDay && e.venue !== x.venue)
      .sort((a, b) => (a.time || "99").localeCompare(b.time || "99")).slice(0, 5);
    const link = e => ctx.asPage ? ctx.pageUrl(e) : null;
    const past = x.end < ctx.today;
    return `<div class="mhead"><div class="mcat">${c.name}</div><${ctx.asPage ? "h1" : "h2"} id="mtitle" style="font-family:Fraunces,serif;font-weight:800;font-size:clamp(24px,4vw,32px);line-height:1.1;margin:6px 40px 0 0">${esc(x.title)}</${ctx.asPage ? "h1" : "h2"}><div class="mtags">${tags}</div>${ctx.asPage ? "" : '<button class="x" aria-label="Kapat" data-close>×</button>'}</div>
  <div class="mbody">
    ${past ? '<div class="past">Bu etkinliğin tarihi geçti.</div>' : ""}
    <div class="facts">
      ${fact("Tarih", when)}
      ${fact("Saat", x.time ? esc(x.time) : "Kaynakta belirtilmemiş")}
      ${fact("Mekân", esc(x.venue))}
      ${fact("İlçe", [x.district, yakaName(yakaOf(x.district))].filter(Boolean).map(esc).join(" · "))}
      ${fact("Bilet", esc(price))}
    </div>
    ${x.note ? `<div class="mnote">ℹ️ ${esc(x.note)}</div>` : ""}
    <div class="actions">
      <a class="btn primary" href="${esc(src.url)}" target="_blank" rel="noopener nofollow">Kaynağa / bilete git ↗</a>
      <a class="btn" href="${mapsUrl(x.venue, x.district)}" target="_blank" rel="noopener nofollow">📍 Haritada aç</a>
      <a class="btn" href="${esc(gcalUrl(x, theDay, ctx.sources))}" target="_blank" rel="noopener nofollow">📅 Takvime ekle</a>
      <button class="btn" data-copy>⧉ Bilgileri kopyala</button>
      ${ctx.asPage ? "" : `<a class="btn" href="${ctx.pageUrl(x)}">🔗 Etkinlik sayfası</a>`}
    </div>
    ${sameVenue.length ? `<div class="msec"><h4>${esc(x.venue)} — diğer etkinlikler</h4>${sameVenue.map(e => mini(e, link(e))).join("")}</div>` : ""}
    ${sameDay.length ? `<div class="msec"><h4>Aynı gün başka ${c.name.toLocaleLowerCase("tr")}</h4>${sameDay.map(e => mini(e, link(e))).join("")}</div>` : ""}
    <div class="msrc">Bilgi kaynağı: <a href="${esc(src.url)}" target="_blank" rel="noopener nofollow">${esc(src.title)}</a>. Saat, fiyat ve bilet durumu değişebilir; gitmeden önce kontrol edin.</div>
  </div>`;
  }

  function shareText(x, sources) {
    const price = x.free ? (x.price || "Ücretsiz") : (x.price || "");
    return [x.title, `${x.start === x.end ? longDate(x.start) : fmtShort(x.start) + " – " + fmtShort(x.end)}${x.time ? " · " + x.time : ""}`,
      [x.venue, x.district].filter(Boolean).join(", "), price, sources[x.source].url].filter(Boolean).join("\n");
  }

  const api = { CATS, ANADOLU, TR_DAYS, TR_MON, pd, iso, addD, fmtShort, longDate, esc, yakaOf, yakaName, norm, mapsUrl, gcalUrl, detailHTML, shareText, mini };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SNV = api;
})(typeof window !== "undefined" ? window : globalThis);
