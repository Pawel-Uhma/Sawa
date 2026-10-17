# Ścieżka krytyczna do prezentacji

Stan na 17.10, ok. 23:00 (Szczepan, z agentem R1). Cel: **18.10, 11:30, 5 min pitchu z demo na żywo, które nie może się wyłożyć.** Twarde terminy: 09:00 zamrożenie kodu (T-61), 10:30 wysłanie (repo, deck, opis AI), 11:30 scena.

Ścieżka krytyczna to łańcuch, którego opóźnienie przesuwa pitch. Wszystko poza nią (T-123 dzieci, T-129 angielskie opowieści, T-141–T-143 kosmetyka, T-14) robimy tylko, gdy łańcuch jest zielony.

## Łańcuch

```
[dziś w nocy]                              [niedziela rano]
1 trasa demo ustalona ──► 2 /demo przechodzi ──► 5 graf na 18.10 ──► 6 ostatni deploy 10:00 ──► 7 rozgrzanie ──► 11:30 pitch
       ▲                        ▲                                         ▲
3 spacery po ulicach ──────────┘                 4 zapas offline ─────────┘
(OSRM / Valhalla, deploy ręczny)                 (fixture + nagranie)
```

Równolegle (nie blokuje kodu, blokuje scenę): pitch i deck (8), oddanie 10:30 (9), sala (10).

## Kroki

| # | Co | Kto | Do kiedy | Gotowe, gdy |
|---|---|---|---|---|
| 1 | **Trasa demo zamknięta:** start 42 Warsaw, pierwsza opowieść o Kercelaku, jeden wariant czasu i końca trasy. Bez tej decyzji nie da się zrobić 2, 4 ani 7 | R2 + R3 (z [pitch/plan-pitchu.md](pitch/plan-pitchu.md) §4, §6) | 17.10, 24:00 | Parametry trasy (start, czas, koniec, profil) zapisane w `plan-pitchu.md` |
| 2 | **`/demo` przechodzi scenariusz 90 s** (T-36, T-102): jazda nie przeskakuje miejsc co kilka sekund, nie ucina opowieści, nie prosi o głos do wielu miejsc naraz (ElevenLabs 429, plan-pitchu §10) | R3 | 18.10, 08:00 | Trzy przebiegi z rzędu na telefonie bez błędu |
| 3 | **Spacery po ulicach, nie przez budynki.** Decyzja: własny OSRM (T-153) albo zostajemy na FOSSGIS + Valhalla. Każdy merge do `apps/api` wdrażamy ręcznie (T-148) i sprawdzamy `version` w `/health` | R1 | decyzja 17.10, 24:00; wdrożenie do 02:00 | Trasa demo na produkcji ma `lngLats` po ulicach; w logach brak `walk router failed` |
| 4 | **Zapas, gdy padnie miasto, LLM albo sieć.** `DEMO_OFFLINE` jest tylko w `apps/api/.env.example`, w kodzie go nie ma. Minimum: trasa demo jako fixture (T-18) i opowieści z głosem zapisane do pliku (T-94). Ostateczny zapas: nagranie 1:1 (T-55) | R1 (fixture trasy) + R4/R3 (opowieści, głos) + R2 (nagranie) | 18.10, 08:30 | Demo przechodzi z wyłączonym internetem albo mamy nagranie na laptopie sceny |
| 5 | **Graf na niedzielę** (T-18): grafy na 17–23.10 są w gałęzi `r1/transit-multi-day`, API przełącza się o północy samo. Zostaje merge i deploy | R1 | 17.10, przed północą | `/health` po północy: `transitDate: "2026-10-18"` |
| 6 | **Zamrożenie 09:00, ostatni deploy 10:00** (T-61, T-148): Vercel i Railway na tym samym commicie, test na 3 telefonach | Wszyscy, deploy R1 | 10:00 | `version` w `/health` = ostatni commit `main` |
| 7 | **Rozgrzanie i bez restartu** ([przed-demo.md](przed-demo.md)): `VEHICLES_ALWAYS_ON=1`, `WAW_TOKEN`, `DEBUG_PAGES=0`, przejechanie trasy demo raz (cache opowieści i głosu w pamięci), kredyty ElevenLabs sprawdzone. Po tym nikt nie restartuje Railway | R1 + R4 | 10:30–11:00 | Trasa demo odpowiada z cache w < 1 s, pojazdy `stale: false` |

## Równolegle

| # | Co | Kto | Do kiedy |
|---|---|---|---|
| 8 | Pitch: kto mówi i kto prowadzi demo (otwarta decyzja), deck według uwag mentorów (T-51, T-114, T-147), zbiory z dane.um.warszawa.pl nazwane na slajdzie i widoczne w demo (T-95: pojazdy na żywo, odjazdy ZTM, boiska). Film: zdjęcia 07:30, montaż do 09:30. Próba z zegarkiem 08:00 i druga po 10:30 | R2 + zespół | 08:00 próba |
| 9 | Oddanie 10:30: README i opis użycia AI (T-53), checklista (T-54), skan repo pod tokeny (T-68) | R2 | 10:30 |
| 10 | Sala: hotspot z telefonu zamiast Wi-Fi 42, dźwięk kablem, HDMI, „Nie przeszkadzać”, nagranie zapasowe offline na laptopie sceny (plan-pitchu §6) | zespół | 11:00 |

## Ryzyka, które zabijają demo

1. **Proxy do dane.um.warszawa.pl stoi na home labie Antka** (`sawa.rockydomek.party`, #63). Padnie prąd albo tunel, to nie ma pojazdów ani odjazdów na żywo, czyli zbioru miasta na scenie. Planer działa dalej na GTFS. Zapas: krok 4 i zrzut ekranu pojazdów do decku.
2. **Railway nie wdraża sam** (T-148). Merge bez ręcznego deployu = poprawka, której nie ma na produkcji.
3. **Restart Railway po 10:30** czyści cache opowieści, głosu i historię pojazdów.
4. **Limity zewnętrzne:** ElevenLabs (kredyty, 429), OpenRouter (168× 429 o 21:13), FOSSGIS (blokada IP po symulacji). Na scenie gramy trasę z cache, nie generujemy na żywo.
5. **Sieć sali:** jedno IP na ok. 100 osób. Hotspot.

## Do decyzji teraz

| Pytanie | Kto | Termin |
|---|---|---|
| Trasa demo (krok 1) | R2 + R3 | 24:00 |
| Własny OSRM czy FOSSGIS + Valhalla (krok 3) | R1 | 24:00 |
| Zakres zapasu offline: fixture w API czy samo nagranie (krok 4) | zespół | 24:00 |
| Kto mówi i kto prowadzi demo | zespół | 08:00 |
