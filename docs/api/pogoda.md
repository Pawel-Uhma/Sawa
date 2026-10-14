# Pogoda

- Kategoria: Środowisko
- Właściciel: Zarząd Oczyszczania Miasta
- Odświeżanie: 10 minut
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_zom_pogoda`
- Opis: Dane meteo pochodzące ze stacji meterologocznych Zarządu Oczyszczania Miasta.

## Przykład wywołania

**Przykład zapytania dla pobrania wszystkich przystanków**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_zom_pogoda' \ 
--header 'Authorization: token_uzytkownika' \ 
--header 'Content-Type: application/json'
```

## Przykład odpowiedzi

**Przykład zwracający dane lokalizacji pojazdów komuniakcji miejskiej**

```
[
	{
		"lokalizacja": "Stacja Bielany",
		"lat": 52.29241,
		"lon": 20.97288,
		"czas": "2025-08-13 09:10:00",
		"temp_pow": 24.8,
		"temp_naw": 32.6,
		"wilg_pow": 35.0,
		"pred_wiatru": 0.2,
		"kier_wiatru": 197.0,
		"int_opadu": 0.0
	}, ...
]
```
