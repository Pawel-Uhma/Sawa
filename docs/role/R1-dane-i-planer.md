# R1 · Dane i planer tras

**Cel:** dane z dane.um.warszawa.pl podane do aplikacji szybko i stabilnie, plus planer, który z rozkładu i pozycji pojazdów układa trasę z przesiadkami.

**Twoje pliki (po 17.10):** w `apps/api/src/`: `adapters/waw/`, `adapters/gtfs/`, `domain/routing/`, `services/plan-route.ts`, `routes/routes.ts`; schematy tras w `packages/shared`. Deploy API na Railway. Szczegóły: [11-zasady-pracy-i-kodu.md](../11-zasady-pracy-i-kodu.md) §3–4, plan: [12-plan-mvp.md](../12-plan-mvp.md) §7.

**Przeczytaj przed pracą:** [03-dane.md](../03-dane.md) i [api/](../api/) (co naprawdę zwracają endpointy), [05-plan-architektury.md](../05-plan-architektury.md) (przepływ danych, TTL cache), [10-prd.md](../10-prd.md) (sekcje Główna ścieżka i Dane).

**Zasady:**
- Token miasta tylko po stronie serwera (nagłówek `Authorization`). Nie wpisuj go do kodu ani do `.env.production`.
- Cache z TTL zgodnym z częstotliwością zbioru: pojazdy 10 s, parkingi 1 min, powietrze i pogoda 10 min, reszta 1 h.
- Ręcznie sprawdzone odpowiedzi curl zapisz w `docs/api/`, zanim napiszesz typy.

**Zadania:** tag `R1` w [todo.md](../todo.md).

**Nie ruszasz bez zgody właściciela:** UI (R3), prompty i LLM (R4), schemat Supabase (R2). Potrzebę zmiany zapisz w `todo.md` jako zadanie dla tej roli.

**Ktoś czeka na Ciebie:** R3 (mapa potrzebuje proxy do 13:00, T-10), R4 (planer dostarcza punkty do opowieści, T-13).
