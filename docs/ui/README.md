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
