# Warsaw Open Data Hackathon 2026

Repozytorium zespołu (4 osoby) na hackathon 17–18.10.2026 w 42 Warsaw. Dokumentacja jest w `docs/`, zacznij od `docs/README.md`.

## Zasady, których pilnujesz

- **Przed 17.10.2026, 11:00 nie piszesz kodu aplikacji.** Regulamin (§4 ust. 3) zabrania używania kodu i innych elementów przygotowanych przed wydarzeniem. Dozwolone są tylko gotowe biblioteki open source. Przed startem wolno: dokumentacja, analiza danych, plany, testowanie API ręcznie (curl), notatki. Jeśli ktoś prosi o kod przed startem, przypomnij o tej zasadzie i zaproponuj zapisanie planu w `docs/`.
- **Każde rozwiązanie musi korzystać z min. 1 zbioru z dane.um.warszawa.pl** (katalog: `docs/03-dane.md`).
- **Nigdy nie commituj tokenu API.** Token trzymamy w `.env.local`, a ten plik jest w `.gitignore`.

## Dziennik AI: aktualizuj po każdym prompcie

Hook sam dopisuje treść promptu do `docs/ai-log.md`. **Na końcu każdej odpowiedzi, w której coś zrobiłeś, dopisz pod ostatnim promptem w tym pliku jedną linię:**

```
**AI:** <co zrobiłeś, 1–3 zdania: jakie pliki zmieniłeś lub utworzyłeś, co wygenerowałeś, jakie decyzje podjął zespół>
```

Jeśli prompt był tylko pytaniem i nic nie zmieniłeś, i tak dopisz linię `**AI:**` z krótką odpowiedzią. Jeśli zmieniła się wiedza w innym dokumencie (np. wybrany pomysł, zmiana architektury), zaktualizuj też ten dokument.

## Stack (od 17.10)

Next.js (App Router) + TypeScript, Tailwind, mapa MapLibre. Szczegóły w `docs/05-plan-architektury.md`.

## Styl

Dokumentację piszesz po polsku, zwięźle. Commity bez przypisywania autorstwa Claude.
