# R3 · Frontend i mapa

**Cel:** aplikacja, którą widać na scenie: onboarding, mapa, slider czasu, trasa z listą punktów, odtwarzacz opowieści, wersja na telefon. Ta rola zakłada repo aplikacji.

**Twoje pliki (po 17.10):** całe `apps/web/` (`src/app/`, `src/features/{onboarding,map,planner,player,chat,demo}/`, `src/lib/api.ts`). Zakładasz monorepo i CI (push do 12:30), deploy web na Vercel. Szczegóły: [11-zasady-pracy-i-kodu.md](../11-zasady-pracy-i-kodu.md) §3–4, plan: [12-plan-mvp.md](../12-plan-mvp.md) §9 i §13.

**Przeczytaj przed pracą:** [05-plan-architektury.md](../05-plan-architektury.md) (stack i komendy startowe), [10-prd.md](../10-prd.md) (Główna ścieżka, MVP), [spotkania/2026-10-17-1100-mvp-sawy.md](../spotkania/2026-10-17-1100-mvp-sawy.md) (ścieżka w aplikacji: onboarding → slider → generuj → trasa → opowieść).

**Zasady:**
- Stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui, MapLibre (`react-map-gl`), bez klucza API do mapy.
- Minimum na pitch: ekran startowy, slider, mapa, planowanie trasy, dane o miejscach i ZTM. Bez logowania.
- Każdy ekran działa w widoku telefonu: 16 px marginesu, bez poziomego scrolla.
- Pierwszy commit to czysta instalacja z generatora, potem małe commity.

**Zadania:** tag `R3` w [todo.md](../todo.md). Zakładasz repo (T-04) jako pierwszy, bo od niego zależy reszta.

**Nie ruszasz bez zgody właściciela:** proxy i planer (R1), schemat bazy (R2), prompty i LLM (R4).

**Ktoś czeka na Ciebie:** R1 (proxy, T-10), R4 (czat, T-40), R5 (podstrona demo do scenariusza, T-36).
