# Şehirde Ne Var? — İstanbul Etkinlik Rehberi

İstanbul'daki konser, tiyatro, stand-up, opera-bale-dans, belediye (İBB ve ilçe) etkinlikleri, festival ve meetup'ları tek bir takvimde toplayan statik site.

**Site:** https://suheydaakbay.github.io/istanbul-etkinlik/

## Nasıl çalışır

- Tüm etkinlikler `data/events.json` dosyasında durur.
- `node scripts/build.js` bu dosyadan siteyi `dist/` klasörüne üretir (bağımlılık yok):
  - ana sayfa ve kategori sayfaları (`/konser/`, `/tiyatro/`, `/stand-up/`, `/ucretsiz/`, `/belediye/` …)
  - her etkinlik için ayrı sayfa (`/etkinlik/<id>/`) ve Google'ın etkinlik sonuçları için schema.org `Event` verisi
  - `sitemap.xml`, `robots.txt`, `404.html`
- `main` dalına her gönderimde ve her gece GitHub Actions siteyi yeniden üretip GitHub Pages'e yayınlar (tarihi geçen etkinlikler kendiliğinden düşer).
- Her sabah bir zamanlanmış görev yeni etkinlikleri araştırıp `data/events.json`'u günceller. Kurallar: [UPDATING.md](UPDATING.md).

## Yerelde deneme

```bash
node scripts/build.js
cd dist/.. && python3 -m http.server   # sonra basePath'e göre aç
```

## Kendi alan adını bağlama

1. `site.config.json` içinde `siteUrl`'i alan adınla (ör. `https://istanbuldanevar.com`), `basePath`'i `/` yap.
2. Depo **Settings → Pages → Custom domain** alanına alan adını yaz, DNS'te GitHub Pages kayıtlarını ekle.

## Google'a kaydetme

1. https://search.google.com/search-console → **Mülk ekle** → URL öneki: site adresi.
2. Doğrulama için "HTML etiketi" yöntemini seç; `content="..."` değerini `site.config.json` → `googleSiteVerification` alanına yaz ve gönder.
3. Doğrulandıktan sonra **Site haritaları** bölümüne `sitemap.xml` ekle.
