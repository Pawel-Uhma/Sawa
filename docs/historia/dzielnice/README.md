# Miejsca w dzielnicach: Wola, Bemowo, Bielany, Żoliborz, Śródmieście

Zebrane 17.10.2026 (Paweł, z agentem) jako dane dla planera, bo dotychczasowe miejsca leżą tylko ok. 3 km od 42 Warsaw. Format jak w [`../sawa-historia.geojson`](../sawa-historia.geojson), czyli to, co czyta `scripts/historia/map-place.ts`. Do bazy ładuje R2 (Jasiek), ta paczka niczego w Supabase nie zmienia.

„Centrum” to tu Śródmieście, bo takiej dzielnicy nie ma osobno.

## Pliki

| Plik | Co jest w środku |
|---|---|
| [sawa-dzielnice.geojson](sawa-dzielnice.geojson) | **1408 miejsc i 8892 faktów** z polskiej Wikipedii: Śródmieście 1037, Wola 166, Bielany 88, Żoliborz 74, Bemowo 43. Typy: 608 budynków (102 nieistniejące, `istnieje: false`), 261 ulic, 252 miejsca (44 z tagiem `nature`, 13 z `sport`), 139 pomników, 93 świątynie, 33 zdarzenia, 22 cmentarze. `zrodlo_rekordu: "wikipedia-zim-dzielnice"` |
| [osm-dzielnice.geojson](osm-dzielnice.geojson) | **723 punkty z OSM:** pomniki (307), tablice z napisami (92), murale (21), świątynie (40), parki i ogrody (134, `nature`) oraz obiekty sportowe (105, `sport`). Fakty to dosłowne tagi OSM: napis, data, autor, dyscypliny, godziny. 136 punktów ma tylko nazwę (`pewnosc: niska`). `zrodlo_rekordu: "osm-dzielnice"` |
| [warszawa1939-dzielnice.geojson](warszawa1939-dzielnice.geojson) | **443 karty z warszawa1939.pl** (Śródmieście 396, Wola 37): architekt, budowa, zniszczenia, „obiekt nie istnieje”, zdjęcie archiwalne. Fakty dosłownie z karty, bez LLM. Pobrane przez Firecrawl (880 kart, 295 pustych w serwisie), geokodowane po adresach budynków z OSM (ok. połowa co do budynku, reszta na środku ulicy). `zrodlo_rekordu: "warszawa1939-firecrawl"`, **licencja CC BY-NC** |
| [warszawikia-dzielnice.geojson](warszawikia-dzielnice.geojson) | **307 miejsc z Warszawikii** (Śródmieście 141, Wola 48, Żoliborz 47, Bemowo 45, Bielany 26), 1595 faktów. 785 artykułów z kategorii dzielnic, pobranych przez API MediaWiki, fakty wyciągnęło 12 agentów Haiku. `zrodlo_rekordu: "warszawikia-dzielnice"`, CC BY-SA |
| [ulice-osm.json](ulice-osm.json) | 1603 nazwy ulic i placów z OSM w granicach dzielnic (Śródmieście 535, Bielany 306, Wola 297, Bemowo 289, Żoliborz 176) ze środkiem odcinka |
| [surowe/](surowe/) | Wyniki 33 agentów (`bNN-K.json`), [schemat rekordu](surowe/SCHEMAT.md), indeks 1986 artykułów (`artykuly-index.json`) i skrypty (`skrypty/`) |

## Jak powstało

1. **Ulice:** Overpass, jedno zapytanie na dzielnicę po granicy `admin_level=9`, z przerwą 15–20 s.
2. **Artykuły:** jedno zapytanie SPARQL do Wikidaty (obiekty ze współrzędnymi i artykułem na pl.wiki w prostokącie dzielnic), przypisane do dzielnicy po granicy z OSM. Do tego artykuły o ulicach („Ulica X w Warszawie”, tag `wikipedia` z OSM). **Teksty pochodzą z lokalnego zrzutu Wikipedii** (`wikipedia_pl_all_nopic_2026-08.zim`, czytany przez libzim), a nie z sieci. 117 artykułów już użytych w `sawa-historia.geojson` pominięto.
3. **Fakty:** 33 agentów Haiku dostało po paczce ok. 50 artykułów (ulice do 12 tys. znaków, obiekty do 5 tys.) i pisało rekordy tylko z tekstu paczki, bez dostępu do sieci. Instytucje, firmy i szkoły bez historii budynku pominęli.
4. **Scalanie** (`skrypty/merge.py`): dzielnica liczona ze współrzędnych, a nie z deklaracji agenta. Pominięte są rekordy poza pięcioma dzielnicami i rekordy z ogólnym punktem „Warszawa” z Wikidaty (13). Artykuł o ulicy dopasowany tylko po nazwie trafia tam, gdzie wskazuje jego treść: Graniczna przeniesiona na Śródmieście, Jana III Sobieskiego i 11 Listopada (Mokotów, Praga) odrzucone.
5. **Weryfikacja:** każdy rok z faktu musi wystąpić w tekście źródłowego artykułu. 26 faktów nie przeszło i leży w `do_weryfikacji` (poza `fakty`).

Rate limitów nie było: Overpass dostał 12 zapytań, a Wikidata jedno. Google Places nie był używany.

## Runda 5 (17.10, wieczór): warszawa1939.pl i Warszawikia

- **warszawa1939.pl** nie ma kart obiektów w sitemapie, a `robots.txt` prosi o 10 s przerwy. Adresy kart znalazła wyszukiwarka serwisu (z naszego IP, 10 s między zapytaniami, 1200 adresów, filtr ulic z pięciu dzielnic), a same karty pobrał Firecrawl. 52 karty zebrane w rundzie 2 pominięte.
- **Warszawikia** blokowała nas wcześniej przy pobieraniu stron (HTTP 402), ale jej API MediaWiki działa. Pobrane 1351 stron z kategorii dzielnic (1,5 s między zapytaniami), bez Firecrawla.
- **Bez duplikatów:** rekord pasujący nazwą i miejscem (do 200 m, ulice do 600 m) do już istniejącego nie tworzy nowego pinu. Jeśli to mój plik, dostaje nowe fakty i źródło (190 rekordów wzbogaconych). Jeśli plik kogoś innego, jest pomijany (61 rekordów).
- Daty w faktach z Warszawikii sprawdzone w tekście strony, jak wyżej.

## Ograniczenia

- Śródmieście ma 74% rekordów, bo tam jest najwięcej artykułów. Bemowo i Bielany są cienkie, a dobrze uzupełnia je warstwa OSM (parki, sport).
- Ulica ma jeden punkt, czyli środek odcinka z OSM (`lokalizacja: przyblizona`). Budynki wyciągnięte z artykułów o ulicach dostały ten sam punkt.
- Wiele artykułów w zrzucie urywa się w połowie zdania (obcięcie paczki albo zrzutu). Agenci zaznaczali to w `uwagi`.
- Weryfikacja sprawdza tylko lata. Nazwisk ani liczb nie sprawdza.
- Ta sama nazwa ulicy w kilku dzielnicach (np. Mickiewicza na Bielanach i Żoliborzu) może dać fakty z sąsiedniego odcinka.
- `name_en` i `summary_en` to tłumaczenia agentów.

## Licencje

Wikipedia: CC BY-SA 4.0, podpis w `zrodla` każdego rekordu. OSM: ODbL. Wikidata: CC0.
