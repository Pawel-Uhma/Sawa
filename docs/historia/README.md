# Historia okolicy 42 Warsaw (promień 1 km)

Dane dla Sawy w trybie „co tu było?”. Środek: **al. Solidarności 171, Czyste (Wola), 52.2359, 20.9789**. Zebrane 17.10.2026 w trzech rundach. Rundy 1–2 (do 400 m): agenci AI Haiku szukali w sieci. Runda 3 (do 1 km): skrypty pobrały wszystko, co ma współrzędne (Wikipedia, Wikidata, OSM, Commons, warszawa1939.pl, Google Places), a 9 agentów Haiku wyciągało fakty wyłącznie z pobranych tekstów. Całość scalona i sprawdzona automatycznie.

## Ustalenia (17.10, Paweł)

- Jednostka to **punkt na mapie** z krótką historią. Sawa odzywa się, gdy jesteś blisko.
- Format: **GeoJSON + Markdown**. 17.10 ładujemy GeoJSON do Mapbox bez przepisywania.
- Treść: **fakty i ciekawostki ze źródłami**. Kwestie Sawy generuje LLM na żywo 17.10. Gotowych tekstów jej głosem nie piszemy (§4 ust. 3 regulaminu).
- Dodatki: linki do zdjęć archiwalnych z licencjami, streszczenie po angielsku, dawne nazwy ulic, ludzie związani z miejscem.

## Mapa

![Mapa historii okolicy, 1 km](mapa-historia-1km.png)

Zbliżenie na 400 m: [mapa-historia.png](mapa-historia.png) (stan po rundzie 2).

## Pliki

| Plik | Co jest w środku |
|---|---|
| [sawa-historia.geojson](sawa-historia.geojson) | **326 punktów, 2367 faktów i ciekawostek**: 92 do 400 m i 234 w pasie 400–1000 m (pole `pas`). 118 budynków, 66 pomników, 48 tablic, 27 ulic, 27 miejsc, 20 murali, 9 zdarzeń, 7 świątyń, 4 cmentarze. 351 zdjęć (archiwalne z warszawa1939.pl i Commons oraz ilustracje artykułów), 224 punkty z warstwą `dzis` (Google Places) |
| [osm-sport-przyroda.geojson](osm-sport-przyroda.geojson) | **102 punkty z OSM (17.10):** 70 parków, ogrodów i skwerów (`tagi: ["nature"]`) i 32 obiekty sportowe (`["sport"]`), 16 z akapitem z Wikipedii. Ten sam format co wyżej, `zrodlo_rekordu: "osm"`. Generuje `pnpm --filter @sawa/scripts fetch:osm`, licencje: OSM ODbL, Wikipedia CC BY-SA (podpis w źródłach miejsca) |
| [ludzie.json](ludzie.json) | 12 osób, w tym 7 w promieniu (Korczak, Wilczyńska, Gałczyński, Tchorek, Chopin, Świerczewski, Weinstein). Osoby spoza promienia mają `poza_promieniem: true` |
| [os-czasu.json](os-czasu.json) | 33 wydarzenia, od 1573 (elekcja) do 2016 (Warsaw Spire), PL i EN |
| [zdjecia.json](zdjecia.json) | 31 zdjęć archiwalnych z Wikimedia Commons, licencje z metadanych. Są też dopięte do punktów w GeoJSON (pole `zdjecia`) |
| [surowe/](surowe/) | Wyniki agentów (runda 1: `1-…8-`, runda 2: `r2-*`, runda 3: `r3-wiki-*` z Wikipedii i `r3-auto.json` z OSM i warszawa1939.pl), `google-places-1km.json` (3011 miejsc), `osm-1km.json`, `scalenie-log-1km.txt` (połączenia, odrzucenia i 68 pominiętych artykułów o firmach), dane z warszawa1939.pl (`r2-11`), wynik Google Places (`google-places.json`, 777 miejsc), wyciąg z OSM i `scalenie-log.txt` (co połączono, co odrzucono i dlaczego) |

## Najmocniejsze miejsca do demo

| Miejsce | Odległość | Dlaczego |
|---|---|---|
| Kercelak | 150 m | Największy bazar przedwojennej Warszawy (od 1867 r.), gwara, „Tata Tasiemka”, felietony Wiecha |
| Okopy Lubomirskiego | 120 m | Wał z 1770 r. zbudowany przeciw dżumie. Stąd wzięły się nazwy Okopowej, Przyokopowej i Towarowej |
| Dom Sierot Korczaka | 145 m | Krochmalna 92, dziś Jaktorowska 6. Korczak i Wilczyńska prowadzili go od 1912 do 1942 r. Obok rośnie „Dąb doktora Korczaka” |
| Szpital św. Łazarza | 160 m | 5 sierpnia 1944 r., w czasie Rzezi Woli, zginęło tu ok. 1200 osób |
| Kościół redemptorystów, Karolkowa 49 | 240 m | 6 sierpnia 1944 r. zginęło 30 zakonników. Tablica Tchorka ma nieścisły napis |
| Elektrownia Tramwajowa / Muzeum Powstania | 360 m* | Pierwszy tramwaj elektryczny pojechał w 1908 r. Obok stoi bunkier „Tobruk” przewieziony tu w 2004 r. |
| Al. Solidarności | pod wejściem | Dawniej Leszno, potem Trasa W-Z i od 1948 r. al. Świerczewskiego. Obecna nazwa od 1991 r. |

\* Punkt elewacji od strony Przyokopowej. Środek budynku leży ok. 430 m od wejścia.

## Jak czytać pola

- `pewnosc`: wysoka / srednia / niska, w ocenie agenta.
- `do_weryfikacji`: fakty, których daty skrypt nie znalazł w tekście źródłowego artykułu Wikipedii (35 z 2367). Zwykle pochodzą z innego źródła, np. korczak.ckc.uw.edu.pl albo dzieje.pl.
- `zrodla_wikipedia_sprawdzone: false`: punkt ma tylko źródła spoza Wikipedii (warszawa1939.pl, Google, OSM, prasa).
- `dzis`: obiekty z Google Places stojące dziś w tym miejscu (do 25 m), z linkiem do Google Maps. Rekordy z id `g-*` pochodzą tylko z Google i mają historię do uzupełnienia.
- `istnieje`: czy budynek stoi do dziś (wg warszawa1939.pl „OBIEKT NIE ISTNIEJE”).
- `lokalizacja: przyblizona`: punkt jest na ulicy albo przy obiekcie, a nie w dokładnym miejscu zdarzenia.
- `uwagi`: sprzeczności między źródłami, na przykład liczby ofiar albo daty nadania nazw.

**Ograniczenie weryfikacji:** skrypt sprawdzał tylko, czy lata z faktu występują w źródle (2071 z 2367 przeszło; 261 faktów pochodzi spoza Wikipedii, głównie z OSM, warszawa1939.pl i Google, i nie było z czym porównać). Nie sprawdzał nazwisk ani liczb. Agenci często czytali Wikipedię przez streszczenia, a nie dosłowny tekst. Zanim fakt trafi do pitchu, trzeba go przeczytać w źródle.

## Do sprawdzenia na miejscu w sobotę (zrób zdjęcia)

- [ ] Tablica „Zdobycie Elektrowni Tramwajowej”: możliwe, że dotyczy elektrowni na Powiślu.
- [ ] Tablica „Stanisław Conrad” (265 m): nie wiadomo, kim był.
- [ ] 4 tablice Tchorka bez napisu w OSM (`tablica-tchorka-osm-*`).
- [ ] Tablica pracowników Szpitala św. Łazarza i tablica nauczycieli i uczniów przy Karolkowej 56.
- [ ] Co stało na działce al. Solidarności 171 przed 1944 r. Jedyny trop to zakłady Norblina, niepotwierdzony.

## Czego brakuje

- Zdjęcia: brak dla Elektrowni Tramwajowej, Szpitala św. Łazarza, muru getta, Okopowej, Ogrodowej, Leszna i Żytniej. NAC (szukajwarchiwach.gov.pl), Polona i fotopolska.eu nie zostały przeszukane.
- Skwer Hanki Bielickiej i Skwer Gwary Warszawskiej: brak źródeł o nazwaniu.
- Sprzeczności do rozstrzygnięcia: Jaktorowska nazwana w 1916 czy w 1970 r.; granice getta na Chłodnej w grudniu 1941 r.; liczba ofiar wśród redemptorystów (24 czy 30).
- Poza promieniem, ale blisko i mocne: browar Haberbuscha i Schielego (ok. 600 m), Singer przy Krochmalnej 10 (540 m), Kamienica pod Zegarem i Czerniaków przy Chłodnej 20 (800 m), kładka na Chłodnej. Opisy są w faktach ulic, bez osobnych punktów.

## Licencje i warunki

- Wikipedia: CC BY-SA. OSM: ODbL. Commons: licencja przy każdym zdjęciu.
- **warszawa1939.pl: CC BY-NC.** Na hackathonie (niekomercyjnie) wolno, z podpisem. Przy komercjalizacji trzeba to zmienić.
- **Google Places:** warunki Google pozwalają trzymać treści najwyżej 30 dni (bezterminowo tylko `place_id`). Po hackathonie dane z Google odświeżamy przez API albo usuwamy.

## Runda 2 (17.10): co zadziałało, a co nie

- Najwięcej dało bezpośrednie pobranie kart z warszawa1939.pl: Rogatki Wolskie Kubickiego, kino Kometa, kamienica Machleida, szkoła przy Karolkowej z 1925 r., fabryka Philipsa, kamienica Węgiełka, przedwojenne zdjęcia.
- Agenci Haiku przeszukujący blogi i prasę dali mało (2–16 rekordów na agenta): Warszawikia blokuje boty (HTTP 402), wiele artykułów to PDF-y, a Nominatim i Overpass zaczęły odrzucać zapytania przy kilku agentach naraz.
- Odrzucone jako leżące poza 400 m mimo przypisania im przez agentów współrzędnych ulicy: Sąd na Lesznie, Leszno 13, brama i kładka przy Żelaznej, Koszary Mirowskie, kino „Czary”, przedwojenne Leszno 81–84 i 100. Pełna lista w `surowe/scalenie-log.txt`.

## Runda 3 (17.10): promień 1 km

- Źródła pobrane skryptami: 181 artykułów pl.wikipedii i 37 en z geotagiem w promieniu 1 km, 496 obiektów Wikidaty, 914 obiektów OSM (278 historycznych w pasie 400–1000 m), 3368 zdjęć z Commons (194 sprzed 1970), 112 kart warszawa1939.pl (34 w promieniu), 3011 miejsc z Google Places.
- Agenci przetwarzali tylko lokalne teksty, bez internetu. Odrzucili 68 artykułów o firmach i urzędach, które mają tu tylko biuro.
- Rekordy `osm-*` i `g-*` są automatyczne: mają nazwę i napis z tablicy, ale bez kontekstu. Rekordy `w1939-*` mają opis budynku z warszawa1939.pl i zdjęcia sprzed wojny. Położenie przedwojennych adresów przy Lesznie jest interpolowane (inna numeracja niż dziś).
- Nowe mocne miejsca w pasie 400–1000 m: Gęsiówka, Archiwum Ringelbluma, Kładka Pamięci, Kamienica pod Zegarem, kościół św. Karola Boromeusza, Pałacyk Michla, Kolonia Wawelberga, Szpital Wolski, cmentarze ewangelickie, synagoga Icchaka Altera, Norblin, Browary Warszawskie, Fabryka Kamlera, Pałacyk Bogusławskiego.

## Jak użyć

GeoJSON wczytujemy jako źródło Mapbox. Gdy użytkownik jest w promieniu ok. 50 m od punktu, LLM dostaje `fakty`, `ciekawostki` i `ludzie` tego punktu i układa z nich wypowiedź Sawy. Do pitchu: wszystkie dane pochodzą z otwartych źródeł (Wikipedia CC BY-SA, OSM ODbL, Commons), więc trzeba je podpisać w aplikacji.
