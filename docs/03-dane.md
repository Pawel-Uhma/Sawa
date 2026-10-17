# Dane: katalog dane.um.warszawa.pl

Stan na 2026-10-17. Portal ma **19 zbiorów**. Pełne przykłady wywołań i odpowiedzi są w [api/](api/), jeden plik na zbiór.

## Jak wołać API

- Wszystkie endpointy mają postać `POST https://dane.um.warszawa.pl/api/action/<endpoint>`
- Nagłówek `Authorization: <token>`. Token pobiera się na https://dane.um.warszawa.pl/key-api
- Parametry idą w JSON w body (`Content-Type: application/json`)
- W aplikacji token trzymamy **tylko po stronie serwera** (Next.js route handler), nigdy w przeglądarce

```bash
curl -X POST 'https://dane.um.warszawa.pl/api/action/get_zom_pogoda' \
  -H "Authorization: $WAW_TOKEN" -H 'Content-Type: application/json'
```

## Zbiory

| Kategoria | Zbiór | Odświeżanie | Endpoint (`/api/action/…`) | Body | Szczegóły |
|---|---|---|---|---|---|
| Aktywni mieszkańcy | Konsultacje społeczne | 2 godziny | `get_cks_konsultacje_spoleczne` | — | [api/konsultacje-spoleczne.md](api/konsultacje-spoleczne.md) |
| Aktywni mieszkańcy | Konsultacje społeczne dzielnice | 2 godziny | `get_cks_konsultacje_spoleczne_dzielnice` | — | [api/konsultacje-spoleczne-dzielnice.md](api/konsultacje-spoleczne-dzielnice.md) |
| Aktywni mieszkańcy | Konsultacje społeczne kategorie | 2 godziny | `get_cks_konsultacje_spoleczne_kategorie` | — | [api/konsultacje-spoleczne-kategorie.md](api/konsultacje-spoleczne-kategorie.md) |
| Nieruchomości | Rejestr Cen Nieruchomości | codziennie | `get_bgk_rcn` | `{"dzielnica": "Bemowo", "rodzajNieruchomosci": "nieruchomoscLokalowa", "rodzajRynku": "rynekPierwotny", "rok": "2022"}` | [api/rejestr-cen-nieruchomosci.md](api/rejestr-cen-nieruchomosci.md) |
| Sport | Otwarte boiska | Tygodniowo | `get_be_otwarte_boiska` | — | [api/otwarte-boiska.md](api/otwarte-boiska.md) |
| Sport | Zajęcia sportowe | 2 godziny | `get_bmm_zajecia_sportowe` | — | [api/zajecia-sportowe.md](api/zajecia-sportowe.md) |
| Transport | Linie dostepne na przystanku | codziennie | `get_ztm_lista_linii_na_przystanku` | `{"busstopId": "5070", "busstopNr": "03" }` | [api/linie-dostepne-na-przystanku.md](api/linie-dostepne-na-przystanku.md) |
| Transport | Lokalizacja pojazdów komunikacji miejskiej | 10 sekund | `get_ztm_lokalizacja_pojazdow` | `{ "type": 1 }` | [api/lokalizacja-pojazdow-komunikacji-miejskiej.md](api/lokalizacja-pojazdow-komunikacji-miejskiej.md) |
| Transport | Lokalizacja przystanków komunikacji miejskiej | codziennie | `get_ztm_przystanki_komunikacji_miejskiej` | — | [api/lokalizacja-przystanow-komunikacji-miejskiej.md](api/lokalizacja-przystanow-komunikacji-miejskiej.md) |
| Transport | Odjazdy linii z przystanku | codziennie | `get_ztm_odjazdy_linii_z_przystanku` | `{"busstopId": "5070", "busstopNr": "03", "line": "20"}` | [api/odjazdy-dla-linii-z-przystanku.md](api/odjazdy-dla-linii-z-przystanku.md) |
| Transport | Pojazdy transportu publicznego | codziennie | `get_ztm_pojazdy` | — | [api/pojazdy-transportu-publicznego.md](api/pojazdy-transportu-publicznego.md) |
| Transport | Utrudnienia w ruchu drogowym | 1 minuta | `get_bin_utrudnienia_drogowe` | — | [api/utrudnienia-w-ruchu-drogowym.md](api/utrudnienia-w-ruchu-drogowym.md) |
| Transport | Wolne miejsca parkingowe | 1 minuta | `get_m_parkingi_wolne_miejsca` | — | [api/wolne-miejsca-parkingowe.md](api/wolne-miejsca-parkingowe.md) |
| Wydarzenia | Kalendarz wydarzeń | 2 godziny | `get_bmm_kalendarz_wydarzen` | — | [api/kalendarz-wydarzen.md](api/kalendarz-wydarzen.md) |
| Zdrowie | Lokalizacja defibrylatorów (AED) | codziennie | `get_scb_lokalizacja_defibrylatorow` | — | [api/lokalizacja-defibryzatorow-aed.md](api/lokalizacja-defibryzatorow-aed.md) |
| Środowisko | Monitoring jakości powietrza | 10 minut | `get_bopipk_monitoring_jakosci_powietrza` | — | [api/monitoring-jakosci-powietrza.md](api/monitoring-jakosci-powietrza.md) |
| Środowisko | Pogoda | 10 minut | `get_zom_pogoda` | — | [api/pogoda.md](api/pogoda.md) |
| Środowisko | Segregacja odpadów | codziennie | `get_bmm_segregacja_odpadow` | — | [api/segregacja-odpadow.md](api/segregacja-odpadow.md) |
| Środowisko | Typy odpadów | codziennie | `get_bmm_typy_odpadow` | — | [api/typy-odpadow.md](api/typy-odpadow.md) |

## Uwagi

- **Dane na żywo:** pozycje pojazdów (co 10 s), parkingi i utrudnienia (co 1 min), powietrze i pogoda (co 10 min). Tylko te zbiory nadają się do „co jest teraz”.
- **Dane historyczne ma tylko Rejestr Cen Nieruchomości** (filtr po roku). Żeby mieć historię czegokolwiek innego, trzeba ją zbierać samemu od startu hackathonu, np. pozycje pojazdów przez ok. 22 godziny.
- **Pozycje pojazdów mają specyfikację Swagger:** https://dane.um.warszawa.pl/files/ztm_lokalizacja_pojazdow_komunikacji_miejskiej8.yaml
- **Hałasu nie ma w katalogu**, choć strona hackathonu o nim wspomina. Nie planujemy na nim projektu, dopóki się nie pojawi.
- **Poza portalem** są jeszcze: iot.warszawa.pl, warszawa19115.pl i konsultacje.um.warszawa.pl. Regulamin wymaga zbioru z portalu lub miejskiego API, więc to może być najwyżej uzupełnienie.
- **Każdy zbiór trzeba przetestować curl-em przed wydarzeniem** i zanotować tutaj: czy działa, ile rekordów zwraca i czy są w nim współrzędne.

## Wyniki testów (uzupełnić)

| Zbiór | Działa? | Liczba rekordów | Współrzędne? | Uwagi |
|---|---|---|---|---|
| | | | | |
