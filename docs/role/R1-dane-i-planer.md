# R1 · Dane i planer tras

**Cel:** dane z dane.um.warszawa.pl podane do aplikacji szybko i stabilnie, plus planer, który z rozkładu i pozycji pojazdów układa trasę z przesiadkami.

**Twoje pliki (po 17.10):** `lib/waw-client.ts`, `app/api/waw/[zasob]/route.ts`, `lib/planner/` (logika trasy), `lib/types.ts` (typy odpowiedzi miasta).

**Przeczytaj przed pracą:** [03-dane.md](../03-dane.md) i [api/](../api/) (co naprawdę zwracają endpointy), [05-plan-architektury.md](../05-plan-architektury.md) (przepływ danych, TTL cache), [10-prd.md](../10-prd.md) (sekcje Główna ścieżka i Dane).

**Zasady:**
- Token miasta tylko po stronie serwera (nagłówek `Authorization`). Nie wpisuj go do kodu ani do `.env.production`.
- Cache z TTL zgodnym z częstotliwością zbioru: pojazdy 10 s, parkingi 1 min, powietrze i pogoda 10 min, reszta 1 h.
- Ręcznie sprawdzone odpowiedzi curl zapisz w `docs/api/`, zanim napiszesz typy.

**Zadania:** tag `R1` w [todo.md](../todo.md).

**Nie ruszasz bez zgody właściciela:** UI (R3), prompty i LLM (R4), schemat Supabase (R2). Potrzebę zmiany zapisz w `todo.md` jako zadanie dla tej roli.

**Ktoś czeka na Ciebie:** R3 (mapa potrzebuje proxy do 13:00, T-10), R4 (planer dostarcza punkty do opowieści, T-13).
