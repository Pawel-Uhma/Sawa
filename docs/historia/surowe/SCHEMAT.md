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

## Runda 2 (16.10): głębiej, adres po adresie

- Cel: **20–40 rekordów na agenta**. Każdy adres, budynek, dawny budynek, fabryka, kino, szkoła, zdarzenie albo anegdota to osobny rekord.
- Najpierw przeczytaj, co już jest: `docs/historia/sawa-historia.geojson` (pole `properties.id` i `nazwa`). Nie powtarzaj tego. Jeśli masz nowe fakty o istniejącym miejscu, dodaj rekord z **tym samym `id`** (scalimy).
- Źródła poza Wikipedią są mile widziane, a nawet preferowane: warszawa1939.pl (przedwojenne adresy), warszawa.fandom.com (Warszawikia), 1944.pl (biogramy powstańców z adresami), sztetl.org.pl, zabytek.pl, fotopolska.eu, polska-org.pl, encyklopedia Warszawy, Muzeum Woli, Muzeum Warszawy, culture.pl, blogi varsavianistyczne, artykuły prasowe (Stołeczna, naszemiasto, tustolica, hush-warsaw, wawalove i podobne).
- **WebFetch zwraca streszczenie strony.** W poleceniu WebFetch proś o dosłowne cytaty zdań z datami, nazwiskami i liczbami. Do faktu wpisuj tylko to, co strona mówi wprost.
- Wikipedię pobieraj przez API z nagłówkiem User-Agent: `curl -s -A "sawa-hackathon-research/1.0 (paweluhma136@gmail.com)" "https://pl.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=..."`, z odstępem 1 s między zapytaniami. Część artykułów jest już pobrana w `/private/tmp/claude-501/-Users-pawel-Desktop-Sawa/1089f8db-b1b1-439e-a7ab-fefb0eed88e9/scratchpad/merge/wikicache/`.
- Współrzędne adresów: najpierw `docs/historia/surowe/osm-400m.json`, potem Nominatim (`https://nominatim.openstreetmap.org/search?street=<nr ulica>&city=Warszawa&format=json`, z User-Agent, maks. 1 zapytanie na sekundę). **Uwaga:** numeracja przedwojenna często różni się od dzisiejszej (np. Krochmalna 92 to dziś Jaktorowska 6). Przedwojenny adres zapisz w `adres_historyczny`, a współrzędne ustal dla dzisiejszego miejsca; jeśli się nie da, wpisz `lokalizacja: przyblizona` i wyjaśnij w `uwagi`.
- Rekord bez potwierdzonego źródła nie wchodzi. Rekordy spoza 400 m pomijasz.
