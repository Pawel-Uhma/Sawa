# Lokalizacja przystanków komunikacji miejskiej

- Kategoria: Transport
- Właściciel: Zarząd Transportu Miejskiego
- Odświeżanie: codziennie
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_ztm_przystanki_komunikacji_miejskiej`
- Opis: Lokalizacja przystanków komunikacji miejskiej. Dane powiązane ze zbiorem "Linie dostępne na przystanku".

## Przykład wywołania

**Przykład zapytania dla pobrania wszystkich przystanków**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_ztm_przystanki_komunikacji_miejskiej' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi przystanków komuniakcji miejskiej**

```
"values": [
	{
		"value": "1001",
		"key": "zespol"
	},
	{
		"value": "01",
		"key": "slupek"
	},
	{
		"value": "Kijowska",
		"key": "nazwa_zespolu"
	},
	{
		"value": "2201",
		"key": "id_ulicy"
	},
	{
		"value": "52.248455",
		"key": "szer_geo"
	},
	{
		"value": "21.044827",
		"key": "dlug_geo"
	},
	{
		"value": "al.Zieleniecka",
		"key": "kierunek"
	},
	{
		"value": "2025-04-01 00:00:00.0",
		"key": "obowiazuje_od"
	}
]
```
