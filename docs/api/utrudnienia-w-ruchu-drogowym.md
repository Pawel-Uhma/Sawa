# Utrudnienia w ruchu drogowym

- Kategoria: Transport
- Właściciel: Biuro Infrastruktury
- Odświeżanie: 1 minuta
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_bin_utrudnienia_drogowe`
- Opis: Utrudnienia w ruchu drogowym.

## Przykład wywołania

**Przykład zapytania dla pobrania Utrudnienia drogowe**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_bin_utrudnienia_drogowe' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Utrudnienia drogowe**

```
[
  {
    "start_date": "2025-10-27 08:15:00",
    "end_date": "2025-10-31 04:30:00",
    "content": [
      "W środę, 29 października, rano drogowcy rozpoczną wymianę nawierzchni u zbiegu ulic Pelplińskiej i Sobockiej. Przez dwie doby kierowcy nie przejadą przez remontowane skrzyżowanie.",
      "Drogowcy zamkną remontowane skrzyżowanie w środę, 29 października, o godzinie 6:00. Ulicami Pelplińską i Sobocką ze wszystkich stron będzie można dojechać tylko do miejsca prac.",
      "Przed rozpoczęciem remontu, kierowcy powinni przestawić swoje samochody. W sąsiedztwie skrzyżowana staną znaki zakazujące parkowania wraz z tabliczką informującą o możliwości odholowania pojazdu na koszt właściciela.",
      "Ruch na skrzyżowanie wróci w piątek, 31 października, około godziny 4:00."
    ],
    "name": "Wymienią nawierzchnię na bielańskim skrzyżowaniu",
    "id": 8144,
    "geo": [
      [
        {
          "geomType": 0,
          "latlngs": [
            { "lat": 52.2821269608705, "lng": 20.9699285030365 }
          ]
        }
      ]
    ]
  },
  {
    "start_date": "2025-10-24 14:17:10",
    "end_date": "2025-10-31 12:15:30",
    "content": [
      "Przed końcem października ulica Sęczkowa przy Kosmatki będzie miała nową nawierzchnię. Prace rozpoczną się w poniedziałek, 27 października. Remontowanym fragmentem przejadą tylko dojeżdżający do posesji.",
      "Fragment ulicy Sęczkowej pomiędzy ulicą Kosmatki a posesją numer 116 wyremontuje prywatny inwestor, który wybudował tu osiedle.",
      "Ulica na remontowanym odcinku będzie zamknięta od poniedziałku, 27 października. Cały czas będzie można dojechać do posesji. Utrudnienia potrwają do końca października."
    ],
    "name": "Remont ulicy Sęczkowej",
    "id": 8146,
    "geo": [
      [
        {
          "geomType": 1,
          "latlngs": [
            { "lat": 52.2196333738311, "lng": 21.1044466495514 },
            { "lat": 52.2209446428302, "lng": 21.1036688089371 }
          ]
        }
      ]
    ]
  }
]
```
