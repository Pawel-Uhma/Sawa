# R2 · Baza i historia

**Cel:** baza miejsc ze współrzędnymi i historią, z której aplikacja bierze fakty dla Sawy. Dane historyczne są już zebrane; Twoje zadanie to je uporządkować, wgrać i sprawdzić licencje.

**Twoje pliki (po 17.10):** schemat i migracje Supabase, skrypt seed (np. `scripts/seed-historia.ts`), cache Google Places w bazie.

**Przeczytaj przed pracą:** [historia/README.md](../historia/README.md) (jednostka = punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo), [historia/sawa-historia.geojson](../historia/sawa-historia.geojson), [historia/zdjecia.json](../historia/zdjecia.json), [05-plan-architektury.md](../05-plan-architektury.md) (sekcja Baza miejsc).

**Zasady:**
- Tekstów Sawy nie piszesz ręcznie w repo (regulamin §4 ust. 3). Wgrywasz fakty i źródła.
- Zdjęcia wgrywasz tylko z licencją i autorem. Bez licencji odpadają.
- Klucze Supabase: anon key w kliencie, service key tylko na serwerze, nigdy w git.
- Seed skryptem, żeby dało się go powtórzyć po zmianie schematu.

**Zadania:** tag `R2` w [todo.md](../todo.md).

**Nie ruszasz bez zgody właściciela:** UI (R3), prompty (R4). Zmiana schematu, który dotyka innych, wymaga wpisu w `todo.md`, żeby R1 i R4 wiedziały.

**Ktoś czeka na Ciebie:** R4 (opowieść czyta fakty z bazy, T-42), R3 (mapa czyta punkty, T-30).
