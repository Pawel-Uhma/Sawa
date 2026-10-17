# Schemat rekordu: dzielnice (17.10, runda 4)

Zakres: Wola, Bemowo, Bielany, Żoliborz, Śródmieście. Źródło: lokalny zrzut polskiej Wikipedii (ZIM, sierpień 2026), artykuły wybrane przez Wikidatę (obiekty ze współrzędnymi w dzielnicy) i listę ulic z OSM. Agent czyta tylko podany plik paczki i nie sięga do sieci.

Każdy agent zapisuje `docs/historia/dzielnice/surowe/bNN-K.json` (NN = numer paczki, K = część 1, 2, 3…): tablica JSON obiektów.

```json
{
  "id": "hala-mirowska",
  "nazwa": "Hale Mirowskie",
  "name_en": "Mirów Halls",
  "typ": "miejsce | budynek | nieistniejacy-budynek | pomnik | tablica | zdarzenie | ulica | swiatynia | cmentarz | park | sport",
  "dzielnica": "Wola",
  "adres_dzis": "pl. Mirowski 1",
  "adres_historyczny": null,
  "lat": 52.2385, "lon": 20.9965,
  "lokalizacja": "dokladna | przyblizona",
  "okres": "1899–dziś",
  "istnieje": true,
  "fakty": ["Zdania z datami, po polsku, wprost z artykułu."],
  "ciekawostki": ["Anegdoty i „czy wiesz, że”, też wprost z artykułu."],
  "summary_en": "2–3 zdania po angielsku.",
  "ludzie": [{"kto": "…", "rola": "…", "wiki": null}],
  "dawne_nazwy": ["…"],
  "zrodla": [{"tytul": "Wikipedia: Hale Mirowskie", "url": "https://pl.wikipedia.org/wiki/Hale_Mirowskie"}],
  "pewnosc": "wysoka | srednia | niska",
  "uwagi": null
}
```

Zasady:
- Nie zmyślasz. Każdy fakt wynika z tekstu artykułu w paczce. Liczby, daty i nazwiska przepisujesz dokładnie.
- 3–8 faktów i 0–3 ciekawostki na rekord. Bez narracji i bez kwestii Sawy.
- Współrzędne bierzesz z nagłówka `WSPÓŁRZĘDNE` artykułu. Dla ulicy to środek odcinka (`lokalizacja: przyblizona`).
- Z artykułu o ulicy możesz zrobić dodatkowe rekordy dla ważnych budynków i zdarzeń pod konkretnym adresem (współrzędne ulicy, `lokalizacja: przyblizona`, adres w `adres_dzis`).
- Pomijasz artykuły bez historii miejsca: instytucje, firmy, organizacje, imprezy bez związku z budynkiem.
- `id`: slug z nazwy, małe litery, myślniki, bez polskich znaków.
