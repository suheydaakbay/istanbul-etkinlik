# Günlük güncelleme kuralları

Bu dosya, `data/events.json`'u güncelleyen kişi ya da otomatik görev için yazılmıştır.

## Veri biçimi

```jsonc
{
  "updated": "YYYY-MM-DD",            // güncellemenin yapıldığı gün (İstanbul saati)
  "sources": { "<anahtar>": { "title": "Site · sayfa adı", "url": "https://..." } },
  "ongoing": [                         // 5 günden uzun süren festival/sergi/program
    { "id": "kebab-case", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "title": "...", "description": "...",
      "category": "festival|sergi|tiyatro|cocuk|...", "source": "<anahtar>", "free": false, "municipal": false,
      "related": { "venue": "Mekân adı" } | { "titleContains": "metin" } | null }
  ],
  "events": [
    {
      "id": "kebab-case-baslik-AAGG",  // a-z 0-9 ve tire; başlık + başlangıç ayı/günü (ör. -1118). Bir kez verilince DEĞİŞMEZ.
      "start": "YYYY-MM-DD", "end": "YYYY-MM-DD",   // tek günlükse ikisi aynı
      "time": "HH:MM" | "",
      "category": "konser|tiyatro|standup|sahne|festival|meetup|cocuk|atolye|sergi",
      "title": "...", "venue": "...", "district": "İlçe adı (Kadıköy, Beyoğlu …) ya da boş",
      "price": "850 TL'den" | "Ücretsiz" | "",
      "free": false, "municipal": false, "soldOut": false,
      "source": "<sources anahtarı>",
      "note": "isteğe bağlı: yaş sınırı, ikinci seans, iptal/erteleme …"
    }
  ]
}
```

Kategoriler: `sahne` = opera, bale, dans, gösteri · `atolye` = atölye, söyleşi, panel · `meetup` = topluluk, teknoloji, girişim, sosyal buluşmalar.
`municipal: true` = İBB (Şehir Tiyatroları, kültür merkezleri, Muammer Karaca, İstanbul Kitapçısı, Feshane…) veya ilçe belediyesi düzenliyor.

## Güncelleme adımları

1. Bugünden itibaren **en az 3 hafta** sonrasını kapsayacak şekilde İstanbul etkinliklerini araştır. Her türden kaynak: günlük "İstanbul'da bugün/yarın ne var" haberleri, İBB Şehir Tiyatroları haftalık programı, İBB Kültür ücretsiz konserleri, ilçe belediyesi tiyatroları, Muammer Karaca/AKM/Zorlu PSM/İKSV programları, stand-up takvimleri (TuzBiber, biletimGO, Biletinial, Bubilet), Meetup/Kommunity/dev.events, girişim etkinlik ajandaları, festival duyuruları.
2. Yalnızca **tarih, saat, mekân, fiyat gibi olgusal bilgileri** kendi cümlelerinle yaz; kaynak metinlerini kopyalama. Her etkinliğin `source`'u gerçekten o bilgiyi veren sayfa olsun. Emin olmadığın bilgiyi uydurma; saat/fiyat yoksa boş bırak.
3. Mevcut etkinlikleri **id'lerini değiştirmeden** güncelle (saat, fiyat, `soldOut`, iptal/erteleme notu). İptal edilen ya da ertelenen etkinliği listeden çıkar veya notla işaretle.
4. Aynı etkinliği iki kez ekleme (aynı başlık + tarih + mekân).
5. Bitiş tarihi **30 günden eski** olan etkinlikleri ve kullanılmayan kaynakları sil.
6. `updated` alanını bugünün tarihi yap.
7. `node scripts/build.js` çalıştır; hata vermemeli.
8. `main` dalına "Etkinlikler güncellendi: YYYY-MM-DD (+N yeni, -M eski)" mesajıyla commit at ve gönder. Yayın kendiliğinden olur.
