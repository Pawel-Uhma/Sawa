# Zasady pracy i kodu

Obowiązują od 17.10, 12:00. Dotyczą 4 osób i ich agentów Claude Code. Plan budowy i stack: [12-plan-mvp.md](12-plan-mvp.md). **Zakres to tylko lista MVP z [10-prd.md](10-prd.md).** Zasady pracy z dokumentami (`todo.md`, `stan.md`, dziennik AI) są w [CLAUDE.md](../CLAUDE.md) i dalej obowiązują.

Oznaczenia: **[Z]** założenie, którego zespół jeszcze nie potwierdził. Jeśli się z nim nie zgadzasz, zgłoś w `stan.md`, nie zmieniaj po cichu.

## 1. Dziesięć reguł na kartce

1. `main` zawsze się buduje i zawsze da się go wdrożyć. Czerwone CI = nikt nie merguje, dopóki ktoś nie naprawi.
2. Pracujesz w swoim obszarze (tabela w §3). Cudzy kod zmieniasz tylko za zgodą właściciela.
3. Kontrakt (`packages/shared`) zmienia się przed kodem, w osobnym małym PR, z akceptacją konsumenta.
4. Mała gałąź, mały PR, merge w ciągu 1–2 godzin. Gałąź starsza niż 3 godziny to problem.
5. Żadnych sekretów w git, w promptach do agentów ani w logach. Nowa zmienna środowiskowa trafia do `.env.example` w tym samym PR.
6. Każde dane z zewnątrz (HTTP, API miasta, LLM, env) przechodzą przez schemat zod.
7. Każde wywołanie zewnętrzne ma timeout i zachowanie awaryjne. Demo musi działać, gdy API miasta albo LLM padnie.
8. Logika biznesowa jest w czystych funkcjach z testami. Route handler i komponent tylko ją wołają.
9. Sawa mówi tylko fakty z bazy ze źródłem. Tekstów Sawy nie piszemy ręcznie (regulamin §4 ust. 3).
10. Po każdym zadaniu: `todo.md`, `stan.md`, linia `**AI:**` w `ai-log.md`.

## 2. Git i współpraca

**Model:** trunk-based. Gałęzie z `main`, krótkie, squash merge przez PR na GitHubie.

| Co | Zasada |
|---|---|
| Nazwa gałęzi | `<rola>/<krótki-opis-po-angielsku>`, np. `r1/route-planner`, `r3/onboarding-screen`, `r2/places-migration` |
| Commit | Conventional Commits, opis po polsku, małe litery: `feat(api): planer trasy z jedną przesiadką`, `fix(web): slider na iPhonie`. Typy: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`. Zakres: `web`, `api`, `shared`, `db`, `docs`, `ci` |
| Autorstwo | Commity bez przypisywania autorstwa Claude (zasada z `CLAUDE.md`) |
| Przed pracą | `git pull --rebase` na `main`, potem `pnpm install` (lockfile mógł się zmienić) |
| PR | Tytuł jak commit. Opis: co, dlaczego, jak sprawdzić, numer zadania (`T-13`). Zrzut ekranu przy zmianie UI |
| Review | **Własny obszar:** merge sam, gdy CI zielone (bez czekania na review, bo nie ma czasu). **Kontrakt, migracja bazy, zmienne env, `CLAUDE.md`, konfiguracja CI i deployu:** akceptacja właściciela, którego to dotyczy |
| Konflikty | Rebase na `main`, nie merge `main` do gałęzi. `pnpm-lock.yaml`: weź wersję z `main` i odpal `pnpm install`. `todo.md`: scal, nie kasuj cudzych linii |
| Zamrożenie | Sobota 22:00: zakres MVP zamknięty, nowe funkcje tylko z listy „po MVP”. **Niedziela 09:00: tylko poprawki błędów, każdy merge mówisz na głos** |

**Deploy:**
- `main` → produkcja: Vercel (web) i Railway (api) automatycznie.
- Każdy PR dostaje podgląd na Vercelu. Web z podglądu łączy się z produkcyjnym API **[Z]** (podgląd API na Railway to dodatkowy koszt i konfiguracja).
- Migracje Supabase odpala tylko R2, po merge do `main`.

## 3. Kto jest właścicielem czego

Cztery role. Dawna R5 (produkt, pitch, QA) jest rozdzielona: prowadzi ją R2, a testy na telefonie robią wszyscy na zmianę **[Z]**. Osoby do ról przypisuje [zespol.md](zespol.md).

| Rola | Obszar w repo | Deploy |
|---|---|---|
| R1 Dane i planer | `apps/api/src/adapters/waw/`, `adapters/gtfs/`, `domain/routing/`, `services/plan-route.ts`, `routes/routes.ts`; schematy tras w `packages/shared` | Railway |
| R2 Baza, historia, produkt | `supabase/`, `scripts/`, `apps/api/src/adapters/supabase/`, `services/places.ts`, `routes/places.ts`; PRD, scenariusz demo, pitch, oddanie | Supabase |
| R3 Frontend i mapa | `apps/web/` w całości, `packages/ui` jeśli powstanie | Vercel |
| R4 AI | `apps/api/src/adapters/llm/`, `prompts/`, `services/story.ts`, `routes/stories.ts`, `scripts/prewarm-stories.ts` | — |
| Wspólne | `packages/shared/`, `apps/api/src/index.ts` i `app.ts` (składanie), `apps/api/src/lib/`, konfiguracja w katalogu głównym, `.github/` | zmiana = PR z akceptacją zainteresowanych |

## 4. Warstwy abstrakcji

### Backend (`apps/api`, Hono)

```
apps/api/src/
  index.ts          # start serwera
  app.ts            # składanie: tworzy adaptery, wstrzykuje do serwisów, montuje trasy
  routes/           # HTTP: walidacja zod, wywołanie serwisu, mapowanie na odpowiedź
  services/         # przypadki użycia: planRoute, getStory... Zależą od interfejsów (ports.ts)
  domain/           # czyste funkcje i typy: geo, punktacja miejsc, ETA, długość opowieści. Zero IO
  adapters/         # świat zewnętrzny: waw/ (dane.um), gtfs/, supabase/, llm/
  prompts/          # prompty Sawy (tekst po polsku + builder w TS)
  lib/              # env, cache, logger, błędy, fetch z timeoutem
```

**Kierunek zależności:** `routes → services → domain`. Serwisy znają tylko interfejsy z `services/ports.ts`, adaptery je implementują. `domain/` nie importuje niczego z `adapters/`, `routes/` ani bibliotek z IO.

| Warstwa | Wolno | Nie wolno |
|---|---|---|
| `routes/` | `zValidator`, wywołać jeden serwis, ustawić status i nagłówki cache | logiki biznesowej, SQL, fetch |
| `services/` | składać domain + porty, decydować o fallbacku | importować SDK (supabase-js, anthropic), znać HTTP |
| `domain/` | liczyć | `fetch`, `Date.now()` bez parametru (czas podajesz z zewnątrz), `process.env` |
| `adapters/` | SDK, fetch, SQL, mapowanie formatu zewnętrznego na typy domenowe | logiki biznesowej |

**Adapter = warstwa antykorupcyjna.** API miasta zwraca listy `{key, value}` z polskimi kluczami (`szer_geo`, `nazwa_zespolu`). Adapter `waw` zamienia je na typy domenowe (`Stop { id, name, position: { lat, lng } }`) i tylko on wie o tym formacie. To samo dla GeoJSON historii (`fakty` → `facts`) i odpowiedzi LLM.

**Porty do wymiany dostawcy.** `LlmProvider` (Bielik / Claude), `PlacesRepository`, `TransitSource`. Dostawcę wybiera zmienna env w `app.ts` (`LLM_PROVIDER=bielik|claude|fake`). Każdy port ma implementację `fake` do testów i trybu offline.

### Frontend (`apps/web`, Next.js)

```
apps/web/src/
  app/              # trasy Next.js: page.tsx, layout.tsx, demo/. Cienkie, składają features
  features/         # onboarding/, map/, planner/, player/, demo/
    <feature>/
      components/   # komponenty tej funkcji
      hooks/        # useQuery, logika stanu
      index.ts      # publiczne API funkcji; inni importują tylko stąd
  components/ui/    # shadcn (generowane, nie przerabiamy ręcznie bez potrzeby)
  lib/api.ts        # JEDYNE miejsce, które woła backend (klient hc z Hono)
  lib/              # utils, formatowanie
```

- Komponent nie woła `fetch`. Dane: hook z `features/*/hooks` → `lib/api.ts`.
- Funkcja nie importuje z wnętrza innej funkcji, tylko z jej `index.ts`.
- Next.js nie ma własnej logiki biznesowej ani sekretów. Jedyna zmienna publiczna: `NEXT_PUBLIC_API_URL`.
- Stan: zainteresowania i czas w URL (`?i=wojna,architektura&t=90`), żeby link do demo był powtarzalny. Stan odtwarzacza w Zustand **[Z]**.

### Kontrakt (`packages/shared`)

- Schematy zod i typy z `z.infer` dla wszystkiego, co przechodzi przez HTTP: `Place`, `PlaceSummary`, `PlanRouteRequest`, `Route`, `Leg`, `RoutePlace`, `Story`, `Interest`.
- API waliduje nimi wejście, web dostaje typy przez klienta `hc` z Hono. Ręcznie przepisanych typów odpowiedzi w web nie ma.
- Do tego stałe wspólne dla obu stron (lista zainteresowań, limity czasu 30–240 min) i czyste funkcje geo.
- Zmiana pola: najpierw dodaj (opcjonalne), potem przełącz konsumenta, na końcu usuń stare. Nigdy nie zmieniaj znaczenia istniejącego pola.

### Baza (Supabase)

- Schemat tylko przez migracje w `supabase/migrations/` (SQL w repo). MCP Supabase z `.mcp.json` służy do podglądu i debugowania. Zmiana schematu przez MCP bez pliku migracji w repo jest zakazana.
- Przeglądarka nie łączy się z Supabase. Czyta i pisze tylko API (klucz `service_role` na Railway). RLS włączone na wszystkich tabelach, bez polityk dla `anon` **[Z]**.
- Seed skryptem (`pnpm --filter scripts seed:historia`), powtarzalny i idempotentny (`upsert` po `id`).

## 5. Konwencje nazewnictwa

**Język:** kod, nazwy plików, gałęzie, identyfikatory, tabele i kolumny po angielsku. Po polsku: dokumentacja, opisy commitów i PR, teksty w UI, prompty Sawy. Polskie klucze z danych źródłowych (`fakty`, `szer_geo`) żyją tylko w adapterach i skryptach seed.

| Element | Konwencja | Przykład |
|---|---|---|
| Pliki i katalogi | kebab-case | `route-planner.ts`, `story-player.tsx` |
| Komponenty React | PascalCase, eksport nazwany | `export function StoryPlayer()` |
| Funkcje, zmienne | camelCase, funkcja zaczyna się od czasownika | `planRoute`, `scorePlace`, `fetchVehicles` |
| Boolean | `is`/`has`/`should`/`can` | `isPlaying`, `hasTransfer` |
| Typy, interfejsy, schematy zod | PascalCase; schemat z sufiksem `Schema` | `type Route`, `RouteSchema` |
| Stałe | SCREAMING_SNAKE_CASE | `MAX_TRANSFERS`, `VEHICLES_TTL_MS` |
| Hooki | `use` + rzeczownik | `useRoutePlan`, `useStory` |
| Tabele | snake_case, liczba mnoga | `places`, `place_photos`, `story_cache` |
| Kolumny | snake_case | `name_en`, `created_at`, `geom` |
| Endpointy | `/v1/` + rzeczownik w liczbie mnogiej, kebab-case | `GET /v1/places`, `POST /v1/routes/plan`, `POST /v1/stories` |
| JSON w API | camelCase | `{ "durationMin": 90, "etaSec": 340 }` |
| Zmienne env | SCREAMING_SNAKE_CASE; publiczne tylko z `NEXT_PUBLIC_` | `WAW_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
| Testy | obok pliku, `*.test.ts` | `score-place.test.ts` |
| Fixtures | `__fixtures__/<źródło>-<opis>.json` | `__fixtures__/waw-stops-sample.json` |

**Jednostki w nazwie**, zawsze: `durationMin`, `distanceM`, `etaSec`, `ttlMs`, `radiusM`.

**Współrzędne:** w domenie zawsze obiekt `{ lat, lng }`. Tablica `[lng, lat]` występuje tylko na granicy GeoJSON i MapLibre i ma nazwę `lngLat`. Pomylenie kolejności to najczęstszy błąd na mapach.

**Czas:** w domenie `Date` albo milisekundy UTC. Godziny z rozkładu ZTM (`"06:46:00"`, mogą przekraczać 24:00) zamienia adapter, strefa `Europe/Warsaw`.

**Identyfikatory:** miejsca mają slug z GeoJSON (`kercelak`), przystanki `"<zespol>-<slupek>"` (`"5070-03"`) **[Z]**.

## 6. Testy

Narzędzie: **Vitest** w całym monorepo. Testy nie mogą wołać prawdziwych API (miasta, Supabase, LLM). CI ma przechodzić w mniej niż 3 minuty.

| Co | Jak | Obowiązkowe? |
|---|---|---|
| `domain/` (geo, punktacja, ETA, wybór długości opowieści, planer) | testy jednostkowe czystych funkcji | **tak, każda eksportowana funkcja** |
| Adaptery: parsowanie odpowiedzi | fixture z prawdziwej odpowiedzi (curl, przykłady z `docs/api/`) → oczekiwany typ domenowy | **tak** dla `waw`, GeoJSON, wyjścia LLM |
| Trasy API | `app.request()` z Hono i adapterami `fake`; sprawdzasz status i kształt odpowiedzi schematem z `shared` | tak, ścieżka szczęśliwa + błąd walidacji |
| Prompt builder | dostaje fakty, w wyniku są wszystkie źródła, brak pól spoza listy faktów | tak |
| Web: logika w hookach i utils | Vitest + Testing Library | tylko logika, nie wygląd |
| Ścieżka demo (`/demo`) | jeden test Playwright: start → onboarding → generuj → pierwsza opowieść | po MVP, przed niedzielą 08:00 (R3) |

- Błąd naprawiony = test, który by go złapał.
- Test opisuje zachowanie po angielsku: `it("skips places farther than 150 m from the line")`.
- Agent nie usuwa ani nie wyłącza testu, żeby CI przeszło. Zgłasza to człowiekowi.
- Bez progu pokrycia. Liczy się `domain/` i adaptery.

**CI (GitHub Actions, na każdy PR i push do `main`):** `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test`.

## 7. Dobre praktyki

**TypeScript**
- `strict: true` wszędzie. Bez `any`; dane nieznane to `unknown` + zod. Bez `as` do oszukania typów (wyjątek: testy).
- Eksporty nazwane, bez `export default` (wyjątek: pliki Next.js, które tego wymagają).
- Funkcja do ok. 40 linii, plik do ok. 300. Większe dziel.

**Błędy i odporność**
- Jedna klasa `AppError` z kodem (`NOT_FOUND`, `UPSTREAM_TIMEOUT`, `VALIDATION`, ...). Middleware w `app.ts` zamienia ją na status HTTP i JSON `{ error: { code, message } }`. Stack trace nie wychodzi do klienta.
- Timeout na każdym wywołaniu: API miasta 5 s, Supabase 5 s, LLM 30 s.
- Fallback ustalony z góry: API miasta padło → ostatnia wartość z cache z flagą `stale: true`; LLM padł → opowieść z `story_cache`, a gdy jej nie ma, same fakty z bazy; brak GPS → lokalizacja 42 Warsaw. Szczegóły: [12-plan-mvp.md](12-plan-mvp.md) §8.
- Cache w pamięci z TTL: przystanki 24 h, linie i odjazdy 1 h.

**Bezpieczeństwo i licencje**
- Sekrety tylko w `.env.local` (lokalnie), Vercel i Railway (produkcja). `.env.example` z pustymi wartościami w repo.
- CORS w API: tylko domena produkcyjna Vercela, podglądy (`*.vercel.app` projektu) i `localhost`.
- Lokalizacji użytkownika nie zapisujemy w bazie ani w logach.
- Każdy fakt i zdjęcie w UI ma podpis źródła i licencję (Wikipedia CC BY-SA, OSM ODbL, warszawa1939.pl CC BY-NC).

**Czytelność i utrzymanie**
- Bez zakomentowanego kodu i martwych plików. Usuwasz, git pamięta.
- `TODO` tylko z numerem zadania: `// TODO(T-13): kara za przesiadkę z dojściem`.
- Komentarz mówi „dlaczego”, nie „co”. Nieoczywiste rzeczy z danych miasta (np. godziny po 24:00) zawsze z komentarzem.
- Budujemy tylko punkty MVP z [12-plan-mvp.md](12-plan-mvp.md) §1. Rzeczy z §10 („Poza planem”) wymagają decyzji zespołu w `stan.md`. Niedokończoną funkcję chowasz za flagą env, żeby nie psuła `main`.
- Logi w API przez `pino` (JSON). W web bez `console.log` w commitach.
- Nowa zależność: sprawdź, czy już nie ma podobnej w repo. Dodajesz tylko w swoim pakiecie (`pnpm --filter web add ...`). Licencja musi pozwalać na użycie komercyjne (regulamin §4 ust. 3).

## 8. Praca z agentami Claude

- Agent czyta na starcie `CLAUDE.md`, ten dokument i swoją kartę roli. Zmiany poza obszarem roli wymagają zgody człowieka.
- Przy zadaniu dotykającym kontraktu albo dwóch ról: najpierw tryb planu (plan mode), plan w opisie PR, potem kod.
- Przed PR: `pnpm typecheck && pnpm lint && pnpm test` lokalnie, potem `/code-review`.
- Oszczędzaj limity subskrypcji: bez masowego odpalania subagentów; agent nie odpytuje API miasta w pętli (każdy człowiek ma własny token, limity nieznane).
- Agent nie commituje i nie pushuje bez polecenia człowieka. Nie robi `push --force` na `main`, nie usuwa cudzych gałęzi.
- Agent nie generuje „gotowych tekstów Sawy” do repo. Fakty z danych, kwestie z LLM na żywo.
- Wynik ręcznego testu API (curl) agent zapisuje jako fixture w `__fixtures__/` i notatkę w `docs/api/`.
