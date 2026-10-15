# Schemat rekordu (dla agentów zbierających dane)

Środek: al. Solidarności 171, Warszawa (miejsce hackathonu), lat 52.2359, lon 20.9789. Promień: 400 m.
Odległość licz wzorem haversine. Obiekt dalej niż 400 m pomijasz (możesz wspomnieć w polu `uwagi` sąsiedniego rekordu).

Każdy agent zapisuje plik `docs/historia/surowe/<nr>-<temat>.json` z tablicą JSON obiektów:

```json
{
  "id": "kercelak",                       // slug, małe litery, myślniki
  "nazwa": "Kercelak (plac Kercelego)",
  "name_en": "Kercelak market square",
  "typ": "miejsce | budynek | nieistniejacy-budynek | pomnik | tablica | zdarzenie | ulica",
  "adres_dzis": "rondo Kercelak / al. Solidarności",
  "adres_historyczny": "plac Kercelego",  // null, jeśli bez zmian
  "lat": 52.2370, "lon": 20.9802,
  "lokalizacja": "dokladna | przyblizona",
  "odleglosc_m": 160,
  "okres": "1867–1944",
  "fakty": ["Zdania z datami, po polsku. Każdy fakt musi wynikać ze źródła."],
  "ciekawostki": ["Anegdoty i „czy wiesz, że” po polsku. Też ze źródłem."],
  "summary_en": "2–3 zdania po angielsku.",
  "ludzie": [{"kto": "Janusz Korczak", "rola": "prowadził tu Dom Sierot", "wiki": "https://pl.wikipedia.org/wiki/..."}],
  "dawne_nazwy": ["plac Kercelego (do 1944)"],
  "zdjecia": [{"url": "https://commons.wikimedia.org/wiki/File:...", "opis": "...", "rok": "1930", "zrodlo": "Wikimedia Commons / NAC / Polona", "licencja": "domena publiczna / CC BY-SA 4.0 / ..."}],
  "zrodla": [{"tytul": "Wikipedia: Kercelak", "url": "https://pl.wikipedia.org/wiki/Kercelak"}],
  "pewnosc": "wysoka | srednia | niska",
  "uwagi": "co jest niepewne, sprzeczności między źródłami"
}
```

Zasady:
- Nie zmyślasz. Fakt bez źródła nie wchodzi. Lepiej mniej rekordów niż wymyślone.
- Nie piszesz kwestii Sawy ani narracji, tylko fakty i ciekawostki.
- Zdjęcia tylko jako linki do stron plików (Commons, NAC/szukajwarchiwach, Polona, fotopolska.eu) z licencją, bez pobierania.
- Plik musi być poprawnym JSON (sprawdź `python3 -m json.tool plik.json`).
