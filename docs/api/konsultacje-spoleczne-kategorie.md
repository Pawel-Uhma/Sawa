# Konsultacje społeczne kategorie

- Kategoria: Aktywni mieszkańcy
- Właściciel: Centrum Komunikacji Społecznej
- Odświeżanie: 2 godziny
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_cks_konsultacje_spoleczne_kategorie`
- Opis: Zbiór zawiera słownik kategorii konsultacji społecznych. Zasób stanowi uzupełnienie zasobu "Konsultacje społeczne".

## Przykład wywołania

**Przykład zapytania dla pobrania Konsultacje społeczne - kategorie**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_cks_konsultacje_spoleczne_kategorie' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Konsultacje społeczne - kategorie**

```
[
	{
		"id": 1,
		"name": "Dokumenty"
	},(...)
]
```
