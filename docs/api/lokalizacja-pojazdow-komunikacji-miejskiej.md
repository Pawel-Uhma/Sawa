# Lokalizacja pojazdów komunikacji miejskiej

- Kategoria: Transport
- Właściciel: Zarząd Transportu Miejskiego
- Odświeżanie: 10 sekund
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_ztm_lokalizacja_pojazdow`
- Swagger: https://dane.um.warszawa.pl/files/ztm_lokalizacja_pojazdow_komunikacji_miejskiej8.yaml
- Opis: Lokalizacja pojazdów komunikacji miejskiej.

## Przykłady wywołań

**Przykład zapytania dla pobrania lokalizacji autobusów**

```
curl --location 'https://dane.um.warszawa.pl/api/action/get_ztm_lokalizacja_pojazdow' \ 
 --header 'Authorization: token uzytkownika' \ 
 --header 'Content-Type: application/json' \ 
 --data '{
 	"type": 1
}'
```

**Przykład zapytania dla pobrania lokalizacji tramwajów**

```
curl --location 'https://dane.um.warszawa.pl/api/action/get_ztm_lokalizacja_pojazdow' \ 
 --header 'Authorization: token uzytkownika' \ 
 --header 'Content-Type: application/json' \ 
 --data '{
 	"type": 2
}'
```

## Przykład odpowiedzi

**Przykład zwracający dane lokalizacji pojazdów komuniakcji miejskiej**

```
"result": [
	{
		 "Brigade": "1",
		 "Lines": "161",
		 "Lat": 52.186646,
		 "Lon": 21.22471,
		 "Time": "2025-08-12 14:15:47",
		 "VehicleNumber": "1001"
	},
	...
]
```
