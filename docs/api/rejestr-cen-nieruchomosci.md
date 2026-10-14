# Rejestr Cen Nieruchomości

- Kategoria: Nieruchomości
- Właściciel: Biuro Geodezji i Katastru
- Odświeżanie: codziennie
- Licencja: 
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_bgk_rcn`
- Opis: Zbiór zawiera dane transakcyjne z Rejestru Cen Nieruchomości prowadzonego przez Biuro Geodezji i Katastru m.st. Warszawy, oparte na aktach notarialnych. Dla każdej transakcji dostępne są: cena, data zawarcia umowy, rodzaj nieruchomości, lokalizacja oraz podstawowe parametry techniczne. Warunki wykorzystania: https://mapa.um.warszawa.pl/warunki.html.

## Przykład wywołania

**Przykład wywołania dla zapytania o transakcje nieruchomości lokalowej rynku pierwotnego w dzielnicy Bemowo w roku 2022**

```
curl --location 'https://dane.um.warszawa.pl/api/action/get_bgk_rcn' --header 'Authorization: token_uzytkownika' --header 'Content-Type: application/json' --data '{"dzielnica": "Bemowo", "rodzajNieruchomosci": "nieruchomoscLokalowa", "rodzajRynku": "rynekPierwotny", "rok": "2022"}'
```

## Odpowiedź

**Odpowiedź**

```
Obiekt typu GeoJSON uwzględniający w atrybucie properties dane opisane w zaprezentowanym modelu pojęciowym danych rejestru cen nieruchomości w  pkt. 1 załącznika nr 9 do Rozporządzenia Ministra Rozwoju, Pracy i Technologii z dnia 27 lipca 2021 r. w sprawie ewidencji gruntów i budynków (t.j. Dz. U. z 2024 r. poz. 219 z późn. zm.).
```
