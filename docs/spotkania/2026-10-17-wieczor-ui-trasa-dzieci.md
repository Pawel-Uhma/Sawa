# UI, trasa pieszo i tryb dla dzieci (17.10, wieczór)

**Kto:** Paweł, Antek, Szczepan, Jasiek. **Czas:** nie podano (transkrypt bez godzin).

## Ustalenia
- Tryb „w samochodzie” i przelot widokowy odpadają: zmniejszyłyby użycie API Warszawa, a celujemy w warszawiaka bez samochodu.
- Trasa pieszo ma prowadzić przez punkty, a nie obok nich linią prostą (zahaczać o miejsca w przecznicy, nie omijać ich). Zgłoszenie do planera.
- Trasa nie wraca tą samą drogą, którą przyszła (uniknięcie „tam i z powrotem”).
- Tryb dla dzieci: prostszy język i bardziej dziecięca grafika, wybór punktów przyjazny dzieciom. Trudnych tematów (wojna, getto) nie pomijamy, tylko mówimy o nich delikatnie, bez szczegółowej przemocy. Zgłoszenie [#65](https://github.com/Pawel-Uhma/Sawa/issues/65).
- Ikony i kółka miejsc w kolorach tematów (historia, kultura, sport, przyroda), zgodnie z [#53](https://github.com/Pawel-Uhma/Sawa/issues/53) (T-119).
- Motyw ciemny: rzeki na niebiesko, dokończenie ekranów demo na tokeny (T-115).
- Każde miejsce w bazie dostaje podtyp (`sub-kind`), żeby miało własną ikonę (np. budynki, instytucje). Do potwierdzenia przez R2 przy schemacie.
- Film demo: nagrywamy ludzi używających aplikacji, nie sam ekran, a montaż robimy po działającym deployu.
- Głos (ElevenLabs) zostaje wyłączony domyślnie; kredyty się skończyły.

## Otwarte kwestie
- Śledzenie lokalizacji podczas podcastu (czy Sawa ma puszczać kolejne punkty wg pozycji): nie zrobione, issue [#35](https://github.com/Pawel-Uhma/Sawa/issues/35) (T-121, T-112). Rozstrzyga zespół.
- Długość podcastu wg dystansu między punktami: ktoś to wdrożył, nie ustalono kto i czy działa. Sprawdzić przed pitchem.
- Muzyka między punktami, gdy jest cisza: pomysł, bez decyzji.
- Zdjęcia: Paweł przy scrapingu powiedział, że licencję na razie ignorujemy. To sprzeczne z T-97 („tylko zdjęcia z licencją i autorem”). Obowiązuje T-97, do potwierdzenia przez zespół.
- Prezentacja: Google Slides czy natywny PDF z agenta. Rozstrzyga Paweł.
- Darmowe klucze Firecrawl: kto zakłada konta i przekazuje klucze (bez numerów kart w repo ani na czacie).
- Proxy do ZTM z home lab (Antek): Railway nie łączy się z dane.um.warszawa.pl. Zgłoszenie [#63](https://github.com/Pawel-Uhma/Sawa/issues/63), przypisane do Antka.

## Zadania
- [ ] Trasa pieszo przez punkty i bez powrotu tą samą drogą — R1 (Szczepan, do potwierdzenia) — przed testem na telefonie
- [ ] Sub-kind miejsc w bazie i ikony per typ — R2 (Jasiek, do potwierdzenia) — przed zamrożeniem
- [ ] Nagranie demo z ludźmi (T-55) — R2 — dziś w nocy albo jutro rano
- [ ] Proxy ZTM z home lab ([#63](https://github.com/Pawel-Uhma/Sawa/issues/63)) — Antek

## Zmienione dokumenty
- [todo.md](../todo.md): nowe zadania i termin nagrania demo
- [stan.md](../stan.md): wpis o spotkaniu i otwarte kwestie
