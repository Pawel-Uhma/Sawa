# Odjazdy linii z przystanku

- Kategoria: Transport
- Właściciel: Zarząd Transportu Miejskiego
- Odświeżanie: codziennie
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_ztm_odjazdy_linii_z_przystanku`
- Opis: Lista linii dostępnych na przystanku. Dane powiązane ze zbiorami "Lokalizacja przystanków komunikacji miejskiej" oraz "Linie dostępne na przystanku".

## Przykład wywołania

**Przykład wywołania dla zapytania o odjazdy linii z przystanku**

```
curl --location 'https://dane.um.warszawa.pl/api/action/get_ztm_odjazdy_linii_z_przystanku' --header 'Authorization: token_uzytkownika' --header 'Content-Type: application/json' --data '{"busstopId": "5070", "busstopNr": "03", "line": "20"}'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla zapytania o odjazdy linii z przystanku**

```
[
	[
		{
			"value": null,
			"key": "symbol_2"
		},
		{
			"value": null,
			"key": "symbol_1"
		},
		{
			"value": "012",
			"key": "brygada"
		},
		{
			"value": "Żerań FSO",
			"key": "kierunek"
		},
		{
			"value": "TP-FSO",
			"key": "trasa"
		},
		{
			"value": "06:46:00",
			"key": "czas"
		}
	],...
```
