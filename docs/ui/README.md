# UI: propozycje i wyniki pracy (R3)

Tu agent R3 zapisuje zrzuty ekranu: propozycje UI/UX przed wdrożeniem i stan aplikacji po każdym większym kroku. Dzięki temu cały zespół (i R5 do pitcha) widzi, jak wygląda aplikacja, bez uruchamiania jej.

## Struktura

| Folder | Co tam trafia |
|---|---|
| `propozycje/` | Warianty ekranów do wyboru, szkice, makiety (zanim powstanie kod) |
| `wyniki/` | Zrzuty działającej aplikacji po skończonym zadaniu |

## Nazwy plików

`HHMM-ekran-opis[-mobile|-desktop].png`, np. `1420-onboarding-wariant-a-mobile.png`. Godzina z dnia hackathonu; zrzuty z niedzieli z prefiksem `d2-`, np. `d2-0830-mapa-trasa-mobile.png`.

Domyślnie zrzut mobilny (390 × 844). Desktop (1440 × 900) tylko, gdy ekran się różni.

## Dziennik

Każdy zrzut ma jedną linię poniżej: plik, co pokazuje, decyzja (jeśli jest). Najnowsze na górze.

| Plik | Co pokazuje | Zadanie | Decyzja |
|---|---|---|---|
| [1704-trasa-na-zywo-a](propozycje/1704-trasa-na-zywo-a-mobile.png), [b](propozycje/1704-trasa-na-zywo-b-mobile.png), [c](propozycje/1704-trasa-na-zywo-c-mobile.png) | Ekran trasy przerobiony pod T-106 (Antek): temat wybiera lokalizacja, a Sawa mówi jednym strumieniem z pomostami między tematami. Nie ma więc przycisków poprzednia/następna, zostaje pauza, a „Opowiedz teraz” przy przyszłym punkcie to wyjątek. Słowa już wypowiedziane są ciemne, reszta jasna (jak karaoke), a pod spodem „Dalej X · za ok. N min”. **A · Na żywo**: ciągły zapis jak napisy radia, poprzednie tematy wyszarzone nad bieżącym, chip „Teraz: miejsce” zmienia się sam, zapis jedzie za głosem, a po ręcznym przewinięciu pojawia się „Wróć do Sawy”. **B · Rozkład**: plan jazdy z odcinkami linii, znacznik „Ty” sam przeskakuje między punktami; przeszły punkt rozwija się z tym, co Sawa o nim powiedziała, przyszły z „Opowiedz teraz”. **C · Rozdziały**: karty jadą same za lokalizacją; przesunięcie w bok tylko podgląda przeszłe albo przyszłe rozdziały i nie zmienia narracji, a „Wróć do Sawy” wraca na bieżący. Do czasu T-106 temat zmienia się po końcu opowieści, a zapis składa się z kolejnych opowieści | ekran trasy, T-106 | do wyboru Pawła |
| [1652-trasa-a](propozycje/1652-trasa-a-mobile.png), [b](propozycje/1652-trasa-b-mobile.png), [c](propozycje/1652-trasa-c-mobile.png) | Ekran gotowej trasy od nowa, 3 propozycje w kodzie (przełącznik u góry arkusza, `?trasa=a\|b\|c`, `route-variants.tsx`). **A · Odtwarzacz**: opowieść na pierwszym planie, duża nazwa miejsca i tekst Sawy, pasek postępu z odcinkiem na punkt (przy >12 punktach jeden ciągły), przyciski poprzednia/graj/następna, punkty jako kafelki przewijane w bok. **B · Rozkład**: jak trasa w Mapach Apple, duży czas jazdy i godzina startu, pionowa oś z odcinkami (linia, kierunek, godzina) przeplecionymi z punktami; aktywny punkt rozwija się z tekstem i odtwarzaniem. **C · Pocztówki**: każdy punkt to duża karta przewijana w bok i zatrzaskująca się na środku; przesunięcie zmienia opowieść, pod spodem kropki i „Dalej: …”. Wszystkie zachowują arkusz z 3 wysokościami, panel na desktopie i skróty klawiszowe | ekran trasy | zastąpione przez 1704 (narracja za lokalizacją) |
| [1554-karta-miejsca-mobile](wyniki/1554-karta-miejsca-mobile.png) | Wdrożona karta miejsca (wariant A): nazwa bez nawiasu, adres, „Posłuchaj Sawy” (45 s), pasek zdjęć, tagi, fakty, „dziś w tym miejscu”, źródła; ściągnięcie w dół zamyka | karta miejsca | |
| [1547-karta-miejsca-a](propozycje/1547-karta-miejsca-a-mobile.png), [b](propozycje/1547-karta-miejsca-b-mobile.png), [b z opowieścią](propozycje/1547-karta-miejsca-b-opowiesc-mobile.png), [c](propozycje/1547-karta-miejsca-c-mobile.png) | Karta po dotknięciu miejsca na ekranie głównym, 3 propozycje w kodzie (przełącznik u góry, `?karta=a\|b\|c`). **A · Arkusz**: jak w Mapach Apple, „Posłuchaj Sawy”, pasek zdjęć, tagi, fakty, „dziś w tym miejscu”, źródła. **B · Sawa**: mała karta, Sawa wychyla się z ciekawostką „Wiesz, że…”, główna akcja to jej głos (`POST /v1/stories` + `/v1/speech`, 45 s), fakty na żądanie. **C · Wtedy i dziś**: archiwalne zdjęcie na całą szerokość z koralowym „graj”, przełącznik wtedy/dziś, fakty jako karty w bok. Wszystkie: ściągnięcie w dół zamyka, Esc, mapa centruje miejsce nad kartą | karta miejsca | Paweł wybrał A (17.10, 15:54) |
| [1454-mapa-antka-ekran-glowny-mobile](wyniki/1454-mapa-antka-ekran-glowny-mobile.png), [trasa mobile](wyniki/1454-mapa-antka-trasa-mobile.png), [trasa desktop](wyniki/1454-mapa-antka-trasa-desktop.png) | Ekrany demo na mapie Antka (`SawaMap` z `@/features/map`, PR #16): miejsca z `/v1/places` w kolorach rodzajów, kropka użytkownika, trasa z liniami i ponumerowanymi miejscami, aktywny przystanek | T-30 | |
| [1446-przejazdzki-mobile](wyniki/1446-przejazdzki-mobile.png), [desktop](wyniki/1446-przejazdzki-desktop.png) | Zakładka Przejażdżki wg makiety D: przełącznik czasu (wspólny z suwakiem), karta „Wola, której nie ma” z miniaturą trasy z `POST /v1/routes/plan` (na zrzucie API lokalnie wyłączone, więc stan zastępczy), linie ZTM, liczba opowieści, „graj” startuje trasę; Śródmieście i Praga jako „Wkrótce” | T-75 | |
| [1430-gesty-arkuszy-mobile](wyniki/1430-gesty-arkuszy-mobile.jpg) | Gesty: karta główna rozwinięta i ściągnięta pod pasek, arkusz trasy (środek, pełny), zwinięta karta zakładki. Arkusz zamyka się ściągnięciem w dół | T-33, T-35 | |
| [1351-trasa-panel-desktop](wyniki/1351-trasa-panel-desktop.png) | Trasa na desktopie: pływający panel z odtwarzaczem i osią przystanków, mapa z trasą omija panel | T-67 | |
| [1351-ekran-glowny-a6-desktop](wyniki/1351-ekran-glowny-a6-desktop.png) | A6 na desktopie: karta i Sawa w lewym dolnym rogu, zakładki u góry pośrodku | T-67 | |
| [1351-trasa-arkusz-mobile](wyniki/1351-trasa-arkusz-mobile.png) | Trasa na telefonie: arkusz z uchwytem (3 punkty zatrzymania, rzut), swipe między opowieściami | T-33, T-35 | |
| [1351-ekran-glowny-a6-mobile](wyniki/1351-ekran-glowny-a6-mobile.png) | Wdrożony A6 na prawdziwej mapie (MapLibre + OpenFreeMap) | T-66 | |
| [1347-onboarding-00-zestawienie-mobile](wyniki/1347-onboarding-00-zestawienie-mobile.jpg), [desktop](wyniki/1347-onboarding-00-zestawienie-desktop.jpg) | Nowy onboarding: powitanie z Sawą, znajomość Warszawy, zainteresowania z ikonami 3D i „podobne”, styl opowieści, „Układam Twoją Warszawę”. Opis i analiza: [onboarding.md](onboarding.md) | T-31 | do akceptacji Pawła |
| [1249-…-a6-karta-z-sawa](propozycje/1249-ekran-glowny-a6-karta-z-sawa-mobile.png) | A6: połączenie A4 i A5. Pływająca karta z czasem, tematami i „Wyznacz trasę” nad paskiem zakładek (Mapa, Przejażdżki, Sawa); Sawa wychyla się zza karty i pyta w dymku | ekran główny | kandydat do wdrożenia |
| [1218-ekran-glowny-a-wariacje-00-zestawienie.jpg](propozycje/1218-ekran-glowny-a-wariacje-00-zestawienie.jpg) | 5 wariacji A obok siebie | ekran główny | Paweł: najlepsze A4 i A5, połączone w A6 |
| [1218-…-a1-kropki-historii](propozycje/1218-ekran-glowny-a1-kropki-historii-mobile.png) | A1: A + 326 punktów historii na mapie, licznik i karta najbliższego miejsca (Kercelak, 120 m) | ekran główny | |
| [1218-…-a2-dymek-sawy](propozycje/1218-ekran-glowny-a2-dymek-sawy-mobile.png) | A2: Sawa obok kropki lokalizacji mówi w dymku na mapie; niski arkusz z 5 przyciskami czasu zamiast suwaka | ekran główny | |
| [1218-…-a3-podglad-trasy](propozycje/1218-ekran-glowny-a3-podglad-trasy-mobile.png) | A3: suwak od razu rysuje szkic trasy z numerami opowieści; podsumowanie (czas, linie, opowieści), „Jedziemy tą trasą” i losowanie innej | ekran główny | |
| [1218-…-a4-sawa-na-krawedzi](propozycje/1218-ekran-glowny-a4-sawa-na-krawedzi-mobile.png) | A4: Sawa (obraz 32) wychyla się zza arkusza i pyta w dymku | ekran główny | |
| [1218-…-a5-plywajaca-karta](propozycje/1218-ekran-glowny-a5-plywajaca-karta-mobile.png) | A5: oderwana szklana karta nad pływającym paskiem zakładek (Mapa, Przejażdżki, Sawa), więcej mapy | ekran główny | |
| [1150-ekran-glowny-00-zestawienie.jpg](propozycje/1150-ekran-glowny-00-zestawienie.jpg) | 5 propozycji ekranu głównego obok siebie | ekran główny | Paweł wybrał A (17.10) |
| [1150-…-a-arkusz-na-mapie](propozycje/1150-ekran-glowny-a-arkusz-na-mapie-mobile.png) | A: mapa na cały ekran, szklany arkusz z pytaniem Sawy, suwak 30 min–4 h+, tematy, „Wyznacz trasę”. Najbliżej Apple Maps, najbezpieczniejsza | ekran główny | |
| [1150-…-b-zasieg-historii](propozycje/1150-ekran-glowny-b-zasieg-historii-mobile.png) | B: krąg zasięgu z 326 prawdziwymi punktami z `historia/`, linijka czasu przewijana palcem, statystyki trasy | ekran główny | |
| [1150-…-c-rozmowa-z-sawa](propozycje/1150-ekran-glowny-c-rozmowa-z-sawa-mobile.png) | C: Sawa w całej postaci pyta w czacie, odpowiedzi jednym dotknięciem, mapa w dymku, mikrofon. Łączy ekran główny z zakładką czatu | ekran główny | |
| [1150-…-d-przejazdzki-jak-odcinki](propozycje/1150-ekran-glowny-d-przejazdzki-jak-odcinki-mobile.png) | D: gotowe trasy jak odcinki podcastu (mapa trasy, linie ZTM, zajawka opowieści), przełącznik czasu, pasek zakładek | ekran główny | |
| [1150-…-e-wieczor](propozycje/1150-ekran-glowny-e-wieczor-mobile.png) | E: tryb ciemny, mapa z punktami historii, wybór czasu kółkami jak w minutniku iOS, koralowe „Jedziemy” | ekran główny | |

## Źródła makiet

HTML makiet jest w `propozycje/html/` (otwórz w przeglądarce w widoku 390 × 844). Marka z [awatar/README.md](../awatar/README.md): Głębia `#17706F`, Mięta `#8ED1B5`, Koral `#F2755F`, Plus Jakarta Sans, logo „sawa.” we Fredoce. Mapa: OpenFreeMap przekolorowany na barwy Sawy. Trasy w D to przybliżenie po ulicach (OSRM), a nie prawdziwe linie ZTM. Numery linii i godziny odjazdów są przykładowe.
