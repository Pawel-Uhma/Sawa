---
name: spotkanie
description: Przetwarza transkrypt lub notatkę ze spotkania zespołu na hackathonie: zapisuje krótkie podsumowanie w docs/spotkania/ i wprowadza ustalenia do właściwych dokumentów w docs/ (mózg projektu). Używaj, gdy ktoś wkleja transkrypt, nagranie przepisane na tekst albo notatki ze spotkania, burzy mózgów lub rozmowy zespołu.
---

# Spotkanie → mózg projektu

Mózg projektu to `docs/` (spis w `docs/README.md`). Transkrypt to surowiec, nie dokument: **nie zapisujesz go nigdzie**, ani w całości, ani we fragmentach.

## Co odfiltrować

Pomijasz wszystko, co nie dotyczy projektu: żarty, dygresje, rozmowy prywatne, narzekanie, small talk, sprawy organizacyjne bez wpływu na pracę (jedzenie, wifi, kto gdzie siedzi), przejęzyczenia i myśli porzucone w pół zdania. Nie cytujesz ludzi dosłownie, chyba że zdanie nadaje się do pitcha. Nie przypisujesz nikomu głupich wypowiedzi.

## Kroki

1. Przeczytaj `docs/README.md` i dokumenty, których dotyczy spotkanie, żeby wiedzieć, co jest już ustalone.
2. Napisz podsumowanie w `docs/spotkania/RRRR-MM-DD-HHMM-<temat>.md`. Struktura (puste sekcje pomiń):

   ```markdown
   # <Temat> (<data, godzina>)

   **Kto:** imiona. **Czas:** ok. X min.

   ## Ustalenia
   - decyzja + jednozdaniowe „dlaczego”

   ## Otwarte kwestie
   - pytanie: warianty A / B, kto rozstrzyga

   ## Zadania
   - [ ] co — kto — do kiedy

   ## Zmienione dokumenty
   - [plik](../plik.md): co się zmieniło
   ```

   Maksymalnie ok. 40 linii. Zwięźle, po polsku.
3. **Wprowadź ustalenia do mózgu.** Każda decyzja ląduje w dokumencie, którego dotyczy (pomysł → `04-pomysly.md` lub PRD, architektura → `05-plan-architektury.md`, role i harmonogram → `06-plan-dnia.md`, odpowiedzi na pytania → `09-pytania-prd.md` / PRD, stan decyzji → tabela w `docs/README.md`). Nadpisujesz nieaktualne treści, zamiast dopisywać sprzeczne obok. Odrzucone pomysły skreślasz albo przenosisz do sekcji „Odrzucone” z jednym zdaniem powodu.
4. **Zmieniaj strukturę, gdy trzeba.** Jeśli temat nie pasuje do żadnego pliku, utwórz nowy dokument z kolejnym numerem. Jeśli plik się rozrósł albo jest nieaktualny, podziel go, scal lub przenieś do `docs/archiwum/`. Po każdej zmianie struktury zaktualizuj spis w `docs/README.md` i linki w innych plikach.
5. Dopisz linię `**AI:**` w `docs/ai-log.md` (zasada z `CLAUDE.md`).
6. Odpowiedz krótko: 3–5 najważniejszych ustaleń, lista zmienionych plików, otwarte kwestie do rozstrzygnięcia.

## Zasady

- Nie wymyślasz decyzji. Jeśli coś było tylko luźno rzucone, trafia do „Otwarte kwestie”, a nie do „Ustalenia”.
- Sprzeczność z istniejącym dokumentem zgłaszasz w odpowiedzi; nowsza decyzja zespołu wygrywa.
- O ludziach piszesz neutralnie, bez ocen.
- Żadnych tokenów, haseł ani danych prywatnych w plikach.
