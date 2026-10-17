# Plan dnia i role

## Role (5 osób)

Szczegóły, pliki i zasady każdej roli: [zespol.md](zespol.md) i karty w [role/](role/). Kto ma którą rolę, uzupełnia się w `zespol.md`.

| Rola | Zakres | Kto |
|---|---|---|
| R1 Dane i planer tras | Proxy do API miasta, cache, pozycje ZTM, planer trasy z przesiadkami | _do ustalenia_ |
| R2 Baza i historia | Supabase, seed historii z GeoJSON, licencje zdjęć, cache Google Places | _do ustalenia_ |
| R3 Frontend i mapa | UI, mapa, onboarding, slider, odtwarzacz, wersja mobilna, zakłada repo | _do ustalenia_ |
| R4 AI i głos | LLM (Bielik, zapas Claude), prompty Sawy, czat, TTS, awatar | _do ustalenia_ |
| R5 Produkt, pitch i QA | Scenariusz demo, pitch deck, testy na telefonie, dokumentacja; od soboty wieczorem ćwiczy 5 minut | _do ustalenia_ |

## Harmonogram

**Sobota 17.10**

| Godzina | Oficjalnie | My |
|---|---|---|
| 09:00 | Rejestracja | Stolik, prąd, wifi, sprawdzenie tokenów API |
| 10:00 | Otwarcie, specyfikacja wyzwań | Słuchamy, czy wyzwania nie mają dodatkowych wymagań |
| 11:00 | Start pracy | Inicjalizacja repo ([05-plan-architektury.md](05-plan-architektury.md)), podział zadań |
| 13:00 | | Pierwszy zbiór na mapie, działa end to end |
| 15:00 | Obiad | Krótki przegląd, co działa i co wycinamy |
| 17:00 | | Wszystkie zbiory pomysłu podpięte |
| 22:00 | Pizza | Minimalna wersja gotowa, pierwszy deploy |
| noc | | LLM, dopracowanie UI, pierwsza wersja pitch decka |

**Niedziela 18.10**

| Godzina | Oficjalnie | My |
|---|---|---|
| 08:00 | Śniadanie | Próba pitcha z zegarkiem |
| 09:00 | | **Zamrożenie zmian w kodzie**, tylko poprawki błędów |
| 10:30 | | Wysłanie: repo, deck, dokumentacja, [ai-log.md](ai-log.md) |
| 11:00 | Koniec pracy | Wszystko oddane |
| 11:30–13:30 | Prezentacje | 5 minut + 2 minuty pytań |
| 14:30 | Wyniki | |

## Struktura pitcha (5 minut)

1. **Problem (30 s):** konkretna osoba i konkretna sytuacja w Warszawie
2. **Demo na żywo (2 min 30 s):** jedna ścieżka, przećwiczona; nagranie wideo jako zapas
3. **Dane (45 s):** które zbiory miejskie i dlaczego razem dają więcej niż osobno
4. **Wdrożenie (45 s):** kto tego używa i jak miasto może to przejąć (np. w aplikacji Warszawa 19115)
5. **Zespół i następne kroki (30 s)**

Pytania, na które przygotowujemy odpowiedź: skalowanie, koszt LLM, prywatność lokalizacji, co jeśli API miasta padnie.

## Checklista przed wydarzeniem

- [ ] Rejestracja do 8.10
- [ ] Tokeny API dla wszystkich
- [ ] Testy curl każdego zbioru z wybranego pomysłu, wyniki w [03-dane.md](03-dane.md)
- [ ] Konta: GitHub, Vercel, dostęp do LLM
- [ ] Node 20+ i `gh` na każdym laptopie
- [ ] Ładowarki, przedłużacz, adapter HDMI lub USB-C
