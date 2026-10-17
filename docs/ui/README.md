# UI: propozycje i wyniki pracy (R3)

Tu agent R3 zapisuje zrzuty ekranu: propozycje UI/UX przed wdrożeniem i stan aplikacji po każdym większym kroku. Dzięki temu cały zespół (i R5 do pitcha) widzi, jak wygląda aplikacja, bez uruchamiania jej.

## Struktura

| Folder | Co tam trafia |
|---|---|
| `propozycje/` | Warianty ekranów do wyboru, szkice, makiety (zanim powstanie kod) |
| `wyniki/` | Zrzuty działającej aplikacji po skończonym zadaniu |

## Nazwy plików

`HHMM-ekran-opis[-mobile|-desktop].png`, np. `1420-onboarding-wariant-a-mobile.png`. Godzina z dnia hackathonu; zrzuty z niedzieli z prefiksem `d2-`, np. `d2-0830-mapa-trasa-mobile.png`.

Domyślnie zrzut mobilny (390 × 844). Desktop (1440 × 900) tylko, gdy ekran się różni.

## Dziennik

Każdy zrzut ma jedną linię poniżej: plik, co pokazuje, decyzja (jeśli jest). Najnowsze na górze.

| Plik | Co pokazuje | Zadanie | Decyzja |
|---|---|---|---|
