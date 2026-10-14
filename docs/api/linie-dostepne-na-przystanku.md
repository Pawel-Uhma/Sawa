# Linie dostepne na przystanku

- Kategoria: Transport
- Właściciel: Zarząd Transportu Miejskiego
- Odświeżanie: codziennie
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_ztm_lista_linii_na_przystanku`
- Opis: Lista linii dostępnych na przystanku. Dane powiązane ze zbiorami "Lokalizacja przystanków komunikacji miejskiej" oraz "Odjazdy linii z przystanku".

## Przykład wywołania

**Przykład wywołania dla zapytania o linie dostępne na przystanku**

```
curl --location 'http://dane.um.warszawa.pl/api/action/get_ztm_lista_linii_na_przystanku' --header 'Authorization:  token_uzytkownika' --header 'Content-Type: application/json' --data '{"busstopId": "5070", "busstopNr": "03" }'
```

## Przykład odpowiedzi

**Przykład odpowiedzi zwracający linie dostępne na przystanku**

```
[
	{
		"values": [
			{
				"value": "23",
				"key": "linia"
			}
		]
	},
	{
		"values": [
			{
				"value": "20",
				"key": "linia"
			}
		]
	},
	{
		"values": [
			{
				"value": "24",
				"key": "linia"
			}
		]
	}
]
```
