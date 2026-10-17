# R2 · Baza, historia i produkt

**Cel:** baza miejsc ze współrzędnymi i historią, z której aplikacja bierze fakty dla Sawy. Dane historyczne są już zebrane; Twoje zadanie to je uporządkować, wgrać i sprawdzić licencje. **Od 17.10 przejmujesz też dawną rolę R5** (zespół ma 4 osoby): PRD, scenariusz demo, pitch deck, dokumentacja na oddanie. Zasady z [R5-produkt-pitch-qa.md](R5-produkt-pitch-qa.md) obowiązują Ciebie; testy na telefonie robią wszyscy.

**Twoje pliki (po 17.10):** `supabase/migrations/`, `scripts/seed-*.ts`, w `apps/api/src/`: `adapters/supabase/`, `services/places.ts`, `routes/places.ts`; plus pliki dawnej R5 (`10-prd.md`, `pitch/`, `06-plan-dnia.md`). Szczegóły: [11-zasady-pracy-i-kodu.md](../11-zasady-pracy-i-kodu.md) §3–4, plan: [12-plan-mvp.md](../12-plan-mvp.md) §6.

**Przeczytaj przed pracą:** [historia/README.md](../historia/README.md) (jednostka = punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo), [historia/sawa-historia.geojson](../historia/sawa-historia.geojson), [historia/zdjecia.json](../historia/zdjecia.json), [05-plan-architektury.md](../05-plan-architektury.md) (sekcja Baza miejsc).

**Zasady:**
- Tekstów Sawy nie piszesz ręcznie w repo (regulamin §4 ust. 3). Wgrywasz fakty i źródła.
- Zdjęcia wgrywasz tylko z licencją i autorem. Bez licencji odpadają.
- Klucze Supabase: tylko `service_role` na Railway, nigdy w git. Przeglądarka nie łączy się z Supabase, wszystko idzie przez API.
- Schemat tylko przez pliki w `supabase/migrations/`. MCP Supabase służy do podglądu, nie do zmian bez migracji.
- Seed skryptem, żeby dało się go powtórzyć po zmianie schematu.

**Zadania:** tag `R2` w [todo.md](../todo.md).

**Nie ruszasz bez zgody właściciela:** UI (R3), prompty (R4). Zmiana schematu, który dotyka innych, wymaga wpisu w `todo.md`, żeby R1 i R4 wiedziały.

**Ktoś czeka na Ciebie:** R4 (opowieść czyta fakty z bazy, T-42), R3 (mapa czyta punkty, T-30).
