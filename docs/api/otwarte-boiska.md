# Otwarte boiska

- Kategoria: Sport
- Właściciel: Biuro Edukacji
- Odświeżanie: Tygodniowo
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_be_otwarte_boiska`
- Opis: Baza oświatowych terenów sportowych, w tym między innymi: boisk, bieżni, kortów tenisowych, siłowni zewnętrznych udostępnianych mieszkańcom bezpłatnie w określonych godzinach.

## Przykład wywołania

**Przykład zapytania dla pobrania zasobu otwarte boiska**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_be_otwarte_boiska' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla zasobu otwarte boiska**

```
[
  {
	"Dzielnica": "Żoliborz",
	"Adres obiektu": "ul. Elbląska 51",
	"Nazwa placówki oświatowej": "LXIV Liceum Ogólnokształcące im. Stanisława Ignacego Witkiewicza \"Witkacego\"",
	"Typ obiektu": "boiska uniwersalne/wielozadaniowe",
	"Boisk uniwersalne zawiera": "boiska do piłki ręcznej-boiska do koszykówki-boiska do siatkówki-boiska do piłki nożnej",
	"Rodzaj nawierzchni": "polireutan lub podobne",
	"Obiekt wyposażony w trybuny": "NIE",
	"Obiekt wyposażony w piłkochwyty": "TAK",
	"Poniedziałek": "Od 17:00 do 22:00",
	"Wtorek": "Od 17:00 do 22:00",
	"Środa": "Od 17:00 do 22:00",
	"Czwartek": "Od 17:00 do 22:00",
	"Piątek": "Od 17:00 do 22:00",
	"Sobota": "Od 10:00 do 22:00",
	"Niedziela": "Od 10:00 do 22:00",
	"Uwagi": "wejście na teren szkoły przez otwartą furtkę obok bramy wjazdowej",
	"Data aktualizacji": "2026-07-02"
  },...
]
```

## Jak używamy (R2, 17.10)

`pnpm --filter @sawa/scripts fetch:boiska` pobiera zbiór, łączy wiersze w jedną szkołę, geokoduje adres (Nominatim) i zapisuje szkoły z obszaru tras do [`docs/historia/um-otwarte-boiska.geojson`](../historia/um-otwarte-boiska.geojson). Seed wgrywa je do `places` z tagiem `sport`; Sawa może powiedzieć, co jest otwarte i w jakich godzinach. Odpowiedź nie ma współrzędnych, a pole `Uwagi` bywa `null`.
