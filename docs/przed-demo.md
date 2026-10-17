# Przed demo: o czym pamiętać

Rzeczy, które trzeba zrobić albo sprawdzić przed pokazem (niedziela 18.10, przed zamrożeniem kodu o 09:00 i przed prezentacją o 11:30). Dopisuj tu wszystko, co łatwo przeoczyć rano. Pilnuje R2 (checklista T-54).

- [ ] **Railway: `VEHICLES_ALWAYS_ON=1`** (pojazdy na żywo, T-99). Bez tego API zbiera pozycje pojazdów tylko przez 20 min po starcie i po każdym zapytaniu, a prognoza ruchu z poprzednika linii działa dopiero po kilku minutach zbierania. Ustawić najpóźniej ok. 30 min przed pokazem i nie restartować potem serwisu (restart czyści historię). Szczegóły: [15-pojazdy-na-zywo.md](15-pojazdy-na-zywo.md#ograniczenia)
- [ ] **Railway: `WAW_TOKEN`** (T-17). Bez niego nie ma pojazdów na żywo ani odjazdów z rozkładu ZTM.
- [ ] `/health` na Railway: `transitDate: "2026-10-18"` (grafy na 17–23.10 są w repo, API przełącza się o północy). Trasa demo zapisana jako fixture (T-18).
- [ ] Rozgrzane opowieści i głos dla trasy demo: cache jest w pamięci, restart Railway go czyści (T-94).
- [ ] Railway: `DEBUG_PAGES=0` (uwaga w `apps/api/.env.example`).
