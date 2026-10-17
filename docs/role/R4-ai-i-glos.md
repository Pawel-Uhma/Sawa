# R4 · AI i głos

**Cel:** Sawa mówi. Model językowy (Bielik, zapasowo Claude) pisze opowieść o miejscu, które właśnie mijasz, a TTS ją odczytuje. Czat to druga droga do Sawy.

**Twoje pliki (po 17.10):** w `apps/api/src/`: `adapters/llm/`, `prompts/` (prompt Sawy), `services/story.ts`, `routes/stories.ts`; `scripts/prewarm-stories.ts`. W MVP tylko opowieść tekstem; czat, TTS i awatar są poza planem MVP ([12-plan-mvp.md](../12-plan-mvp.md) §10). Szczegóły: [11-zasady-pracy-i-kodu.md](../11-zasady-pracy-i-kodu.md) §3–4, plan: [12-plan-mvp.md](../12-plan-mvp.md) §8.

**Przeczytaj przed pracą:** [awatar/README.md](../awatar/README.md) (persona i styl), [10-prd.md](../10-prd.md) (Rozwiązanie, Główna ścieżka), [05-plan-architektury.md](../05-plan-architektury.md) (LLM, Głos), [historia/README.md](../historia/README.md).

**Zasady:**
- Klucz LLM tylko na serwerze, w `.env.local`. Nie w kodzie ani w URL.
- Sawa mówi tylko to, co jest w faktach z bazy (R2) albo w źródle. Bez zmyślania dat i nazwisk. Każdy fakt ma źródło.
- Prompt zapisany w `lib/prompts/`, żeby reszta zespołu widziała, jak Sawa mówi.
- Przed wyborem TTS sprawdź polskie wymowy na trzech tekstach z historii okolicy.

**Zadania:** tag `R4` w [todo.md](../todo.md). Pierwsze zadanie: API Bielika (T-01).

**Nie ruszasz bez zgody właściciela:** UI (R3), proxy miasta (R1), schemat bazy (R2).

**Ktoś czeka na Ciebie:** R3 (czat, T-34 wymaga T-40), R5 (scenariusz demo zależy od głosu).
