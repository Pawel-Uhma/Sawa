# Postęp i podział pracy (17.10.2026, ok. 13:30)

**Kto:** Paweł, Szczepan, Jasiek, Antek. **Czas:** ok. 30 min, rozmowa przy pracy.

## Ustalenia
- Podział na teraz: Szczepan planowanie trasy (R1), Jasiek baza danych (R2), Paweł frontend (R3), głos i audio Antek (R4, do wpisania w `zespol.md`).
- Baza to jedna płaska tabela `places`: geolokalizacja, opis, referencje do zdjęć, zainteresowania; RPC `places_in_bbox`, `places_near_line`, `place_detail`. Dane z GeoJSON Pawła (1 km wokół 42) są już w bazie. Użytkowników w bazie nie trzymamy, bo nie ma logowania.
- Bazę zmienia tylko agent Jaśka (MCP do Supabase). Reszta czyta przez API/RPC.
- Scraping dalszych miejsc (ulice → numery budynków → Wikipedia) wstrzymany, aż schemat bazy się ustabilizuje, żeby nie przerabiać danych. Potem najpierw okolica po tej stronie Wisły (Żoliborz, Śródmieście), nie cała Warszawa.
- Głos: ElevenLabs, ok. 0,50 zł za minutę audio, ok. 10 min miesięcznie gratis, są polskie głosy. Na demo wystarczy.
- Backend i frontend są już na produkcji (Railway, Vercel).

## Otwarte kwestie
- Planer: pierwsza wersja na 30 min jazdy zwraca 120 miejsc, za mało czasu na opowieść. Limit miejsc albo minimalny czas na historię — R1.
- Git: PR do `main` (tak mówią zasady) czy bezpośredni push? Część agentów pushuje wprost na `main`, przez co są konflikty — zespół.
- Dziennik AI: padła propozycja, żeby go usunąć. Regulamin §4 ust. 4 wymaga tylko opisu zakresu użycia AI, nie logu każdego promptu. Warianty: A) wyłączyć hook i na koniec napisać krótki opis, B) zostawić — zespół (R2 przy T-53).
- Kto prezentuje, jeśli Ala nie dojedzie: pomysł, żeby dołączyła zdalnie (FaceTime), a slajdy podzielić między kilka osób — zespół.
- Własny głos Sawy (np. nagrany głos kogoś z zespołu) — luźny pomysł, R4.
- Mapa: styl Mapbox i kategorie punktów (budynek, ulica, pomnik…) z ikonami — propozycja, R3.

## Zadania
- [ ] Limit miejsc na trasie w planerze — Szczepan (R1)
- [ ] Integracja ElevenLabs po stronie API — Antek (R4)
- [ ] Projekt stylu mapy i kategorii punktów — R3
- [ ] Repo przydatne na hackathon (link na Discordzie) opisać w `docs/` — kto je znalazł
- [ ] Decyzja PR vs push na `main` i o dzienniku AI — zespół

## Zmienione dokumenty
- [05-plan-architektury.md](../05-plan-architektury.md): głos to ElevenLabs, koszt.
- [stan.md](../stan.md), [todo.md](../todo.md): nowe otwarte decyzje i zadania T-70–T-74.
