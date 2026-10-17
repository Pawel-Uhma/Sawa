# Stan projektu

**Ostatnia aktualizacja:** 17.10.2026, ok. 14:10 (Szczepan, z agentem)

## Teraz

- R1 (Szczepan, 14:10): w `main` planer z pętlą (PR #9) i poprawką kształtu ostatniego odcinka (PR #11). **Dla R3 (Antek, PR #12):** mock T-16 zastąpiony prawdziwym planerem; `Leg.lngLats` to kształt po ulicach z GTFS (`shapes.txt`), nie same przystanki. Mapa może przejść z `GET /v1/routes/demo` na `POST /v1/routes/plan` (zainteresowania + czas + `returnToStart`), gdy będzie onboarding i slider. Następne w R1: deploy API na Railway (T-62, po terminie), planer na miejscach z Supabase zamiast `places.geojson` (T-19), odjazdy na żywo z `WAW_TOKEN` (T-17).
- Paweł: frontend i generowanie głosu (TTS, T-43). Rola do wpisania w `zespol.md`. **Opowieści (T-45, T-41, T-42, R4) nie mają właściciela**, a to one konsumują `Route.places` i `windowSec` z planera.

- R1 (Szczepan, ok. 14:30): planer jest w `main` (PR #5). Wybór zainteresowań zmieniony na 4 ogólne kategorie: `historical`, `cultural`, `sports`, `nature` (PR w toku). **R3:** onboarding pokazuje te 4 (etykiety PL: historia, kultura, sport, przyroda). **R2:** oznaczyć miejsca kategoriami (T-25, instrukcja w karcie R2): szczegółowe tagi zostają, można też wpisać nazwę kategorii wprost; do `sports` i `nature` potrzebne nowe miejsca (otwarte boiska z API miasta, parki z OSM). Dziś: historia 241 miejsc, kultura 207, sport 0, przyroda 0.

- Sobota 17.10, po 11:00: kod aplikacji wolno pisać.
- Zrobione: mózg zespołu (mapa w `README.md`, `todo.md`, `zespol.md`, karty ról w `role/`), zasady pracy w `CLAUDE.md`.
- Nowe: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) (zasady kodu i współpracy) i [12-plan-mvp.md](12-plan-mvp.md) (stack, kontrakt API, harmonogram). Każdy czyta i zgłasza niezgodę z założeniami [Z] (T-64).
- Szkielet monorepo gotowy (T-04): `pnpm install && pnpm dev`. Plan MVP przycięty do listy MVP z PRD, dodatki w `todo.md` w sekcji „Poza MVP”.
- Najbliższe: wpisanie git user.name i ról do `zespol.md` (T-08), inicjalizacja repo aplikacji (T-04), zdjęcie decyzji o API Bielika i Supabase (T-01, T-02).
- Plan bazy miejsc w [13-plan-bazy.md](13-plan-bazy.md) (Jasiek, 13:00): baza Supabase pusta, PostGIS do włączenia; 13:10: schemat i RPC w Supabase (T-20), 13:08: dane załadowane (326 miejsc, 351 zdjęć, T-21). R3 i R4 mogą czytać przez RPC `places_in_bbox`, `place_detail`, R1 przez `places_near_line` (Jasiek). 13:24: port `PlacesRepository` i adapter w `apps/api/src/adapters/supabase/` (T-24); następne: kontrakt `Place`/`PlaceSummary` i `/v1/places`.
- R1 (Szczepan, 13:15): kolejność przystanków i kształty linii z GTFS mkuran.pl (licencja ZTM + ODbL, wymagany podpis), skompresowane do `apps/api/data/`. Planer dopasowuje miejsca do tras **w pamięci API**, wejście to GeoJSON w formacie RPC `places_in_bbox` (teraz z pliku `apps/api/data/places.geojson`, potem z Supabase). **Dla R2 (Jasiek):** RPC `places_near_line` nie będzie używane przez planer; lista `INTERESTS` przenosi się do `packages/shared/src/interests.ts` (te same klucze), `scripts/historia/interests.ts` może ją stamtąd importować; dodaję `scripts/export-places-geojson.ts`, które używa Twojego `mapPlace`.
- Plan mapy w [14-plan-mapy.md](14-plan-mapy.md) (Antek, R3, 13:30): MapLibre zamiast Mapboxa, miejsca przez `GET /v1/places` i `/v1/places/:id` (czeka na R2), trasa z `POST /v1/routes/plan` (czeka na mock T-16 od R1). Kroki 1–3 (mapa, podkład, punkty z fixture) bez zależności.
- Mapa (Antek, 15:00, PR z `r3/maplibre-map`): `/mapa` na MapLibre 5 z miejscami z `GET /v1/places`, kartą z `/v1/places/:id`, filtrem kategorii `?i=` i trasą demo z planera R1. Dev container w `.devcontainer/` (Node 24, pnpm, `node_modules` w wolumenach Dockera), do akceptacji jako konfiguracja wspólna.

- R1 (Szczepan, 14:00): planer działa na prawdziwych danych (GTFS + 326 miejsc z pliku), `POST /v1/routes/plan` i `GET /v1/routes/demo` w PR #4, podgląd na `http://localhost:8787/debug/planner` (`DEBUG_PAGES=1`). `Route.places` to już miejsca do opowieści, co najmniej 45 s od siebie (dla R4). Po ok. 20 min trasa wychodzi poza obszar z danymi.

- R2 (Jasiek, 13:38): `GET /v1/places` i `GET /v1/places/:id` gotowe (kontrakt PR #6, trasy na nim). **R3:** mapa może brać `/v1/places?bbox=…`; **R4:** fakty i źródła z `/v1/places/:id` (`sources[].id` do cytowania, `unverifiedFacts` pomijać). **R1:** dodać `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` na Railway.

- R2 (Jasiek, 14:08): sport i przyroda mają miejsca (T-25): +102 z OSM (parki, skwery, obiekty sportowe), w bazie 428 miejsc (historia 242, kultura 113, sport 33, przyroda 75). `apps/api/data/places.geojson` odświeżony dla planera. Następne: zbiór miasta „Otwarte boiska” (T-27, potrzebny token).

- 13:20 (Paweł): deploy działa. Web: https://sawa-hackathon.vercel.app (Vercel, konto Pawła). API: https://api-production-d213.up.railway.app/health (Railway, projekt `sawa`, serwis `api`, auto-deploy z `main`). Railway nie czyta już `apps/api/railway.json`, ustawienia są w serwisie.

- 13:25 (Paweł, z agentem R3): demo mock w `apps/web` (start → onboarding → mapa z suwakiem → trasa z odtwarzaczem), bez API i bez tokena Mapbox, branch `r3/demo-mock`. Do sprawdzenia na telefonie.

- 13:30 (spotkanie): podział Szczepan R1 planer, Jasiek R2 baza, Paweł R3, Antek R4 głos. Scraping kolejnych miejsc czeka na stabilny schemat bazy. Bazę zmienia tylko agent Jaśka. [Podsumowanie](spotkania/2026-10-17-1330-postep-i-podzial.md)

- 13:47 (Paweł, z agentem R3): nowy onboarding (`OnboardingFlow`, 5 kroków, 3 pytania, Sawa w 5 pozach i 15 ikon 3D z fal.ai, sprężyny `motion`). Analiza i projekt: [ui/onboarding.md](ui/onboarding.md). Czeka na podpięcie w `demo-app.tsx` (sesja R3 od mapy). Pytania o znajomość miasta i styl opowieści: R1 + R4 decydują, czy trafią do planera i promptów.

- 13:51 (Paweł, R3): na https://sawa-hackathon.vercel.app działa mock: onboarding sawa-72, ekran główny A6 i trasa z gestami na prawdziwej mapie (MapLibre + OpenFreeMap, bez tokenu). Dane wciąż mockowe (`lib/mock-data.ts`), podpięcie API to T-30/T-10. Zmiany na gałęzi `r3/demo-mock` (część już w commitach, reszta w drzewie roboczym), jeszcze nie w `main`.

- 14:30 (Paweł, R3): gesty jak w iOS. Arkusz trasy ciągnie się za treść i zamyka ściągnięciem w dół, karty ekranu głównego chowają się pod pasek zakładek, strona nie powiększa się i nie odbija. Przetestowane dotykiem w emulacji iPhone; do sprawdzenia na prawdziwym telefonie.

- R2 (Jasiek, 14:30): zbiór miasta „Otwarte boiska” w bazie (T-27): 57 szkolnych terenów sportowych z godzinami otwarcia, adresy geokodowane Nominatim. Razem 485 miejsc, sport 90, przyroda 75. `places.geojson` dla planera odświeżony.
- R1 (Szczepan, 14:40): planer czyta miejsca z Supabase (`listInBBox`, cache 10 min, odświeżanie w tle), przy błędzie lub braku kluczy z `places.geojson` (T-19, PR #17). Na Railway sprawdzić w logach `planner places loaded` z `isFallback: false`.

- 14:50 (Paweł, R3): w `main` całość na live: demo z onboardingiem, trasa z `POST /v1/routes/plan`, piny z `/v1/places`, odtwarzacz opowieści (`POST /v1/stories` + `POST /v1/speech`, głos ElevenLabs, następny punkt ładowany z wyprzedzeniem), panel przejażdżek. Mapa Antka pod `/mapa`. API opowieści i TTS (OpenRouter, ElevenLabs) z gałęzi `r4/stories-llm`.

## Zablokowane

- Pomiar R1 (14:40, 485 miejsc): trasa 60 min w jedną stronę z 42 Warsaw dalej ma ostatnie miejsce ok. 30. min (ostatnie okno 31 min). Pętla 60 min i trasa 90 min ze wszystkimi kategoriami mają miejsca do końca. Miejsca leżą tylko ok. 3 km od 42 Warsaw (lng 20,93–21,02, lat 52,21–52,26), więc potrzebne miejsca dalej od centrum Woli (R2, Jasiek).
- Auto-deploy weba z GitHuba: aplikacja Vercel nie ma dostępu do repo `Pawel-Uhma/Sawa`. Odblokowuje Paweł (GitHub → Settings → Applications → Vercel). Do tego czasu deploy przez `npx vercel deploy --prod`.

## Otwarte decyzje

Każda ma właściciela (kto rozstrzyga). Po decyzji przenieś ją do właściwego dokumentu i usuń stąd.

| Pytanie | Kto rozstrzyga | Gdzie szukać kontekstu |
|---|---|---|
| Kto robi opowieści (R4: T-45, T-41, T-42) | zespół | [role/R4-ai-i-glos.md](role/R4-ai-i-glos.md) |
| Potwierdzenie stacku z planu MVP: Hono na Railway + monorepo pnpm, 4 role (R5 → R2) | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) §2, §11 |
| Konta Vercel i Railway: zespołowe czy prywatne | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) P7 |
| Przycisk „dalej” w opowieści: MVP czy później | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Git: PR do `main` czy bezpośredni push (agenci pushują wprost, są konflikty) | zespół | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Dziennik AI: wyłączyć hook i na koniec opisać użycie AI (§4 ust. 4), czy zostawić | zespół, R2 (T-53) | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Planer: ile miejsc na trasę (30 min daje teraz 120) | R1 | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Kto prezentuje, jeśli Ala nie dojedzie (zdalnie przez FaceTime?) | zespół | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Toalety: brak zbioru w portalu, OSM czy rezygnacja | R1 | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Tryb „z wysiadaniem” (muzea): MVP czy po MVP | zespół | [10-prd.md](10-prd.md) |
| Scraping muzeów i wystaw pod zainteresowania | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| API Bielika: gdzie hostowane, limity; zapasowy LLM | R4 | [05-plan-architektury.md](05-plan-architektury.md) |
| Rozpoznawanie powracającego użytkownika bez konta | zespół (dodatek, jeśli zostanie czas) | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Zasady pracy z repo (gałęzie, PR, merge) | zespół | [spotkania/2026-10-17-1130-stack-repo-domena.md](spotkania/2026-10-17-1130-stack-repo-domena.md) |
| Zdanie o wdrożeniu dla jury (Sawa obok Warszawa 19115) | R5 | [06-plan-dnia.md](06-plan-dnia.md) |
| Tryb trasy w MVP: (a) „jak dojadę”, (b) przejażdżka z czasem, (c) start–koniec | zespół | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |
| Czat z Sawą w MVP (T-34) czy tylko na prezentacji | zespół | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |
| Grupa docelowa (przyjezdni czy mieszkańcy) i format: podcast dwóch głosów czy narracja | zespół (przy PRD) | [spotkania/2026-10-17-wieczor-jury-koncept.md](spotkania/2026-10-17-wieczor-jury-koncept.md) |
| Hook auto-push z rozwiązywaniem konfliktów; wspólna gałąź czy osobne | zespół (przy T-62) | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |

## Ostatnie decyzje

- 17.10, 13:37: zainteresowania to 4 ogólne kategorie `historical`, `cultural`, `sports`, `nature` (`packages/shared/src/interests.ts`, PR #7); szczegółowe tagi zostają w danych. Zastępuje listę 8 kluczy z [13-plan-bazy.md §5](13-plan-bazy.md). Zdecydował Szczepan (R1).

- 17.10, 13:43: Google Places tylko z danych pobranych 15–16.10 (warstwa `dzis`, 506 obiektów przy 224 miejscach, i 55 rekordów `g-*`), **bez zapytań na żywo i bez klucza**. W API jako `Place.todayNearby`; w UI podpis „Google Maps”. Warunki Google: treść max 30 dni, po hackathonie usunąć albo odświeżyć. Zdecydował Jasiek (R2). T-23 odpada.
- 17.10, 13:31: bez dziennika AI. Hook `log-prompt.sh` usunięty, reguła `**AI:**` z `CLAUDE.md` wycofana, `ai-log.md` zostaje jako archiwum. Opis użycia AI na oddanie robi R2 (T-53). Zdecydował Jasiek (R2, właściciel T-53).
- 17.10, 13:40: mapa na MapLibre (nie Mapbox); na mapie wszystkie miejsca niezależnie od `richness`, próg w stałej `MIN_PLACE_RICHNESS`, bez przełącznika w UI. Decyzja Antka (R3). [14-plan-mapy.md](14-plan-mapy.md)
- 17.10, 13:55: TTS w API gotowe na gałęzi `r4/tts-elevenlabs` (Pawel): `POST /v1/speech {text}` zwraca mp3, głos Asia, Multilingual v2, stabilność 0,3 / wierność 0,7 / ekspresja 0,9 / tempo 1,05. Liczby i daty LLM musi pisać słownie, bo cyfry TTS czyta źle. Tagi typu [sighs] nie działają w v2.
- 17.10, 13:30: głos to ElevenLabs (ok. 0,50 zł/min, klucz w Railway), integracja R4. Użytkowników nie trzymamy w bazie. [Podsumowanie](spotkania/2026-10-17-1330-postep-i-podzial.md)

- 17.10, wieczór (rozmowa z jury): problem to przyjezdni w Warszawie; konkurencja to aplikacja Warsaw Polish Guide, nie powielamy jej funkcji. [Podsumowanie](spotkania/2026-10-17-wieczor-jury-koncept.md)
- 17.10, wieczór: ekran główny to wariant A (arkusz na mapie, mobile); język: docs po polsku, kod po angielsku; commit podpisuje osoba, nie agent. [Podsumowanie](spotkania/2026-10-17-wieczor-podzial-i-ui.md)
- 17.10: backend na Railway; zostajemy przy darmowej subdomenie Vercela. [05-plan-architektury.md](05-plan-architektury.md)
- 17.10: mapa na Mapbox (styl własny; R3). Token trzymamy poza repo. [05-plan-architektury.md](05-plan-architektury.md)
- 17.10: projekt to Sawa (pomysł) i wyzwanie 1 „Warszawa 2076”. [README](README.md)

- 17.10, 11:30: stack Next.js + Supabase + Vercel potwierdzony; repo z dokumentacją i klucz API na Discordzie zespołu. [Podsumowanie](spotkania/2026-10-17-1130-stack-repo-domena.md)
- 17.10, 11:45: backend jako osobna usługa Hono (TypeScript) na Railway, monorepo pnpm, dokumenty po polsku, kod po angielsku, 4 role (R5 rozwiązana, zadania ma R2). Ustalone przez Szczepana, do potwierdzenia przez zespół. [12-plan-mvp.md](12-plan-mvp.md)

- 17.10: MVP to historia miejsc; podcast z okna w komunikacji; bez logowania; Supabase na koncie zespołu. [Podsumowanie](spotkania/2026-10-17-1100-mvp-sawy.md)
- 17.10: historia to punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo. [historia/README.md](historia/README.md)
