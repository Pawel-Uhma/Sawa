# Konsultacje społeczne dzielnice

- Kategoria: Aktywni mieszkańcy
- Właściciel: Centrum Komunikacji Społecznej
- Odświeżanie: 2 godziny
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_cks_konsultacje_spoleczne_dzielnice`
- Opis: Zbiór zawiera słownik dzielnic konsultacji społecznych. Zasób stanowi uzupełnienie zasobu "Konsultacje społeczne".

## Przykład wywołania

**Przykład zapytania dla pobrania Konsultacje społeczne - dzielnice**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_cks_konsultacje_spoleczne_dzielnice' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Konsultacje społeczne - dzielnice**

```
[
	{
		"id": 1,
		"name": "Bemowo",
		"address": "Urząd Dzielnicy Bemowo, 70, Powstańców Śląskich, Stare Jelonki, Jelonki Północne, Bemowo, Warszawa, województwo mazowieckie, 01-381, Polska"
	}, (...)
]
```
