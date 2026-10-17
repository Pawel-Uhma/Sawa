# Stan projektu

**Ostatnia aktualizacja:** 17.10.2026, ok. 12:05 (Szczepan, z agentem)

## Teraz

- Sobota 17.10, po 11:00: kod aplikacji wolno pisać.
- Zrobione: mózg zespołu (mapa w `README.md`, `todo.md`, `zespol.md`, karty ról w `role/`), zasady pracy w `CLAUDE.md`.
- Nowe: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) (zasady kodu i współpracy) i [12-plan-mvp.md](12-plan-mvp.md) (stack, kontrakt API, harmonogram). Każdy czyta i zgłasza niezgodę z założeniami [Z] (T-64).
- Szkielet monorepo gotowy (T-04): `pnpm install && pnpm dev`. Plan MVP przycięty do listy MVP z PRD, dodatki w `todo.md` w sekcji „Poza MVP”.
- Najbliższe: wpisanie git user.name i ról do `zespol.md` (T-08), inicjalizacja repo aplikacji (T-04), zdjęcie decyzji o API Bielika i Supabase (T-01, T-02).
- Plan bazy miejsc w [13-plan-bazy.md](13-plan-bazy.md) (Jasiek, 13:00): baza Supabase pusta, PostGIS do włączenia; 13:10: schemat i RPC w Supabase (T-20), 13:08: dane załadowane (326 miejsc, 351 zdjęć, T-21). R3 i R4 mogą czytać przez RPC `places_in_bbox`, `place_detail`, R1 przez `places_near_line` (Jasiek).

- 13:20 (Paweł): deploy działa. Web: https://sawa-hackathon.vercel.app (Vercel, konto Pawła). API: https://api-production-d213.up.railway.app/health (Railway, projekt `sawa`, serwis `api`, auto-deploy z `main`). Railway nie czyta już `apps/api/railway.json`, ustawienia są w serwisie.

- 13:25 (Paweł, z agentem R3): demo mock w `apps/web` (start → onboarding → mapa z suwakiem → trasa z odtwarzaczem), bez API i bez tokena Mapbox, branch `r3/demo-mock`. Do sprawdzenia na telefonie.

- 13:30 (spotkanie): podział Szczepan R1 planer, Jasiek R2 baza, Paweł R3, Antek R4 głos. Scraping kolejnych miejsc czeka na stabilny schemat bazy. Bazę zmienia tylko agent Jaśka. [Podsumowanie](spotkania/2026-10-17-1330-postep-i-podzial.md)

- 13:47 (Paweł, z agentem R3): nowy onboarding (`OnboardingFlow`, 5 kroków, 3 pytania, Sawa w 5 pozach i 15 ikon 3D z fal.ai, sprężyny `motion`). Analiza i projekt: [ui/onboarding.md](ui/onboarding.md). Czeka na podpięcie w `demo-app.tsx` (sesja R3 od mapy). Pytania o znajomość miasta i styl opowieści: R1 + R4 decydują, czy trafią do planera i promptów.

- 13:51 (Paweł, R3): na https://sawa-hackathon.vercel.app działa mock: onboarding sawa-72, ekran główny A6 i trasa z gestami na prawdziwej mapie (MapLibre + OpenFreeMap, bez tokenu). Dane wciąż mockowe (`lib/mock-data.ts`), podpięcie API to T-30/T-10. Zmiany na gałęzi `r3/demo-mock` (część już w commitach, reszta w drzewie roboczym), jeszcze nie w `main`.

## Zablokowane

- Auto-deploy weba z GitHuba: aplikacja Vercel nie ma dostępu do repo `Pawel-Uhma/Sawa`. Odblokowuje Paweł (GitHub → Settings → Applications → Vercel). Do tego czasu deploy przez `npx vercel deploy --prod`.
- Nic więcej nie zgłoszono. Dopisz tu blokadę od razu, z nazwiskiem osoby, która może ją odblokować.

## Otwarte decyzje

Każda ma właściciela (kto rozstrzyga). Po decyzji przenieś ją do właściwego dokumentu i usuń stąd.

| Pytanie | Kto rozstrzyga | Gdzie szukać kontekstu |
|---|---|---|
| Lista zainteresowań (8 kluczy) i reguły przypisania w seedzie | R3 + R2 | [13-plan-bazy.md §5](13-plan-bazy.md) |
| Potwierdzenie stacku z planu MVP: Hono na Railway + monorepo pnpm, 4 role (R5 → R2) | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) §2, §11 |
| Mapa: Mapbox (decyzja R3, T-65) czy MapLibre (plan MVP)? Konflikt po scaleniu 17.10 | R3 (Paweł) | [05-plan-architektury.md](05-plan-architektury.md), [12-plan-mvp.md](12-plan-mvp.md) |
| Skąd kolejność przystanków linii (GTFS?) | R1, 13:30 | [12-plan-mvp.md](12-plan-mvp.md) §7, P1 |
| Konta Vercel i Railway: zespołowe czy prywatne | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) P7 |
| Przycisk „dalej” w opowieści: MVP czy później | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Git: PR do `main` czy bezpośredni push (agenci pushują wprost, są konflikty) | zespół | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Dziennik AI: wyłączyć hook i na koniec opisać użycie AI (§4 ust. 4), czy zostawić | zespół, R2 (T-53) | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Planer: ile miejsc na trasę (30 min daje teraz 120) | R1 | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Kto prezentuje, jeśli Ala nie dojedzie (zdalnie przez FaceTime?) | zespół | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Toalety: brak zbioru w portalu, OSM czy rezygnacja | R1 | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Tryb „z wysiadaniem” (muzea): MVP czy po MVP | zespół | [10-prd.md](10-prd.md) |
| Scraping muzeów i wystaw pod zainteresowania | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Google Places: klucz każdego czy tylko Wikipedia | R2 + zespół | [05-plan-architektury.md](05-plan-architektury.md) |
| API Bielika: gdzie hostowane, limity; zapasowy LLM | R4 | [05-plan-architektury.md](05-plan-architektury.md) |
| Rozpoznawanie powracającego użytkownika bez konta | zespół (dodatek, jeśli zostanie czas) | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Zasady pracy z repo (gałęzie, PR, merge) | zespół | [spotkania/2026-10-17-1130-stack-repo-domena.md](spotkania/2026-10-17-1130-stack-repo-domena.md) |
| Zdanie o wdrożeniu dla jury (Sawa obok Warszawa 19115) | R5 | [06-plan-dnia.md](06-plan-dnia.md) |
| Tryb trasy w MVP: (a) „jak dojadę”, (b) przejażdżka z czasem, (c) start–koniec | zespół | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |
| Czat z Sawą w MVP (T-34) czy tylko na prezentacji | zespół | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |
| Grupa docelowa (przyjezdni czy mieszkańcy) i format: podcast dwóch głosów czy narracja | zespół (przy PRD) | [spotkania/2026-10-17-wieczor-jury-koncept.md](spotkania/2026-10-17-wieczor-jury-koncept.md) |
| Hook auto-push z rozwiązywaniem konfliktów; wspólna gałąź czy osobne | zespół (przy T-62) | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |

## Ostatnie decyzje

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
