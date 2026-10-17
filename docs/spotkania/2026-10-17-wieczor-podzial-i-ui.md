# Podział pracy, stack i wybór UI (17.10.2026, wieczór)

**Kto:** Paweł, Antek, Jasiek i pozostałe osoby z zespołu (transkrypt nie zawsze pokazuje, kto mówi). **Czas:** nieznany (transkrypt bez znaczników czasu).

## Ustalenia

- **Podział:** Paweł bierze frontend i UI (zgodnie z rolą R3). Podział na taski, a nie na osobne „obszary”, bo plan ułatwia rozdzielenie pracy. Reszta ról bez zmian: [zespol.md](../zespol.md).
- **Ekran główny: wariant A** („arkusz na mapie”, mobile, plik `1150-ekran-glowny-a-arkusz-na-mapie-mobile.png`). Wariant D (dawne kina, bazary) jako późniejszy ekran podobny do niego. Wariant E (czarny, nocny) odrzucony, bo ciemny design nie pasuje do pierwszego ekranu.
- **Język:** dokumentacja po polsku, kod po angielsku.
- **Commity:** każdy commit ma być widoczny jako commit osoby, która pushuje, a nie agenta. Zasada już zapisana w `CLAUDE.md`.
- **Urządzenia:** aplikacja ma działać dobrze na telefonie i na laptopie. Paweł prowadzi osobnego agenta na wersję desktopową, osobno od mobilnej.

## Otwarte kwestie

- **Tryb trasy w MVP:** trzy warianty do wyboru: (a) „jak dojadę” (bezpośrednia trasa), (b) przejażdżka: użytkownik ustala czas i dostaje propozycję trasy, (c) start i koniec w wybranych punktach, z trasą bezpośrednią albo widokową. Propozycja Pawła: slider czasu bez nowego trybu w UI, z możliwością zakończenia w innym miejscu. Rozstrzyga zespół.
- **Czat z Sawą w MVP:** część osób uważa, że czat nie wchodzi do MVP i może być tylko pokazany na prezentacji jako możliwy asystent. W [todo.md](../todo.md) jest T-34 (zakładka czatu, noc). Sprzeczność: rozstrzyga zespół.
- **Kategorie zainteresowań w onboardingu:** propozycja: historyczne / obecne / aktywność (sport). Do potwierdzenia przy T-31.
- **Pozycje autobusów i tramwajów na mapie** w czasie rzeczywistym, z płynnym ruchem: fajny dodatek, nie konieczność. Do decyzji po T-30.
- **Wejście głosowe (mikrofon) do Sawy:** pomysł na bonus, bez decyzji. Trzeba przemyśleć prywatność.
- **Wersja na laptopa jako QR do telefonu** (desktop pokazuje kod QR zamiast aplikacji): odrzucone jako ryzykowne dla oceny; zamiast tego oba widoki działają dobrze.
- **Hook w repo:** agent po skończeniu pracy sam pushuje i rozwiązuje konflikty. Pomysł przyjęty w rozmowie, bez decyzji. Powiązane z T-62 (zasady pracy z repo).
- **Wspólna gałąź czy osobne:** padło, żeby nie tworzyć osobnych gałęzi i kodu bez wspólnych zasad commitów. Rozstrzyga zespół przy T-62.
- **Imię w transkrypcie:** pada „Jasiek”, a w [zespol.md](../zespol.md) jest „Janek”. Sprawdzić, czy to ta sama osoba.

## Zadania

- [ ] Ekran główny według wariantu A, mobile-first — `Paweł (R3)` — po T-30
- [ ] Sprawdzić, czy w repo nie ma kluczy API ani tokenów, przed pierwszym pushem — `Wszyscy` — przed pushem
- [ ] Zdecydować tryb trasy w MVP (a/b/c) i czat w MVP — `zespół`

## Zmienione dokumenty

- [stan.md](../stan.md): nowe decyzje (ekran A, język, commity) i otwarte kwestie
- [todo.md](../todo.md): zadania ekranu A i sprawdzenia kluczy w repo
