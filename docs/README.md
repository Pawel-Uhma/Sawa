# Warsaw Open Data Hackathon 2026: dokumentacja zespołu

**Kiedy:** 17–18 października 2026, start pracy w sobotę o 11:00, koniec w niedzielę o 11:00
**Gdzie:** 42 Warsaw, al. Solidarności 171B
**Rejestracja:** do 8.10.2026, 23:59. O miejscu decyduje kolejność zgłoszeń, więc zgłaszamy się jak najszybciej.

## Stan decyzji

| Decyzja | Status |
|---|---|
| Wyzwanie | Propozycja: **2. „Warszawa – złap oddech!”** jako pierwszy wybór, **3. „Twój ruch!”** jako drugi |
| Pomysł | **Sawa**, syrenka-przewodniczka („co tu było?”). Dane historyczne okolicy w [historia/](historia/README.md) |
| Stack | Next.js + TypeScript, szczegóły w [05-plan-architektury.md](05-plan-architektury.md) |
| Kod przed wydarzeniem | **Nie piszemy** (regulamin §4 ust. 3) |

## Dokumenty

1. [01-regulamin.md](01-regulamin.md): najważniejsze zasady, punktacja, co trzeba oddać
2. [02-analiza-wyzwan.md](02-analiza-wyzwan.md): porównanie trzech wyzwań i rekomendacja
3. [03-dane.md](03-dane.md): 19 zbiorów danych z endpointami, szczegóły w [api/](api/)
4. [04-pomysly.md](04-pomysly.md): pomysły na projekt
5. [05-plan-architektury.md](05-plan-architektury.md): stack, struktura, komendy startowe na 17.10
6. [06-plan-dnia.md](06-plan-dnia.md): harmonogram, role, checklista przed wydarzeniem
7. [07-brainstorm-problemy.md](07-brainstorm-problemy.md): brainstorm problemów Warszawy za 50 lat i propozycja Sawy
8. [08-badania-trendy.md](08-badania-trendy.md): badania o Warszawie z lat 2020–2026 i trendy na 50 lat
9. [historia/](historia/README.md): historia miejsc w promieniu 400 m od 42 Warsaw (GeoJSON, ludzie, oś czasu, zdjęcia)
10. [09-pytania-prd.md](09-pytania-prd.md): pytania do PRD z propozycjami odpowiedzi
11. [ai-log.md](ai-log.md): dziennik użycia AI, aktualizowany automatycznie po każdym prompcie

## Do zrobienia przed 17.10

- [ ] Rejestracja zespołu (nazwa, wyzwanie 1. i 2. wyboru), termin 8.10
- [ ] Każdy pobiera token API: https://dane.um.warszawa.pl/key-api
- [ ] Ręcznie przetestować endpointy ze [03-dane.md](03-dane.md) (curl) i zanotować, co naprawdę zwracają
- [ ] Wybrać jeden pomysł i jeden zapasowy
- [ ] Ustalić role (propozycja w [06-plan-dnia.md](06-plan-dnia.md))
- [ ] Konta: GitHub (repo tworzymy 17.10), Vercel, klucz do LLM
