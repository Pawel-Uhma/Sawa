# Lokalizacja defibrylatorów (AED)

- Kategoria: Zdrowie
- Właściciel: Stołeczne Centrum Bezpieczeństwa
- Odświeżanie: codziennie
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow`
- Opis: Aktywne urządzenia AED na terenie Warszawy.

## Przykład wywołania

**Przykład zapytania dla pobrania dostępność defibratorów**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow' --header 'Authorization: token_uzytkownika'
```

**Przykład zapytania dla pobrania Konkretnego defibrylatora**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow' --header 'Content-Type: application/json' --data '{"defibrillator_id": "622"}
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania dostępność defibratorów**

```
[ { "geometry": { 
	"coordinates": [
		 [ 21.0148748892902,
		 52.2086170695684 ]
	 ],
	"type": "Point"
},
 "properties": {
	 "defibrillator_id": "622",
	 "device_access_description": "Poniedziałek: godz. 8:00-18:00; Wtorek-Piątek: godz. 8:00-16:00",
	 "device_availability": "Ograniczona",
	 "device_location": "Wewnątrz budynku",
	 "device_manufacturer": "Medtronic",
	 "device_public_access": "Publiczny",
	 "location_building": "25/27",
	 "location_city": "Warszawa",
	 "location_description": "Przy wejściu na półpiętrze.",
	 "location_object_name": "Urząd Dzielnicy Mokotów m.st. Warszawy",
	 "location_postcode": "02-517",
	 "location_street": "Rakowiecka"
	 }
}, ...
]
```

**Przykład odpowiedzi dla pobrania dostępność konkretnego defibratora (zwracane zdjęcie)**

```
[ { "geometry": { 
	"coordinates": [
		 [ 21.0148748892902,
		 52.2086170695684 ]
	 ],
	"type": "Point"
},
 "properties": {
	 "defibrillator_id": "622",
	 "device_access_description": "Poniedziałek: godz. 8:00-18:00; Wtorek-Piątek: godz. 8:00-16:00",
	 "device_availability": "Ograniczona",
	 "device_location": "Wewnątrz budynku",
	 "device_manufacturer": "Medtronic",
	 "device_public_access": "Publiczny",
	 "location_building": "25/27",
	 "location_city": "Warszawa",
	 "location_description": "Przy wejściu na półpiętrze.",
	 "location_object_name": "Urząd Dzielnicy Mokotów m.st. Warszawy",
	 "location_postcode": "02-517",
	 "location_street": "Rakowiecka"
	, "attachment": "/9j/4AAQSkZJRgABAQEASABIAAD/4RLKRXhpZ.....
	"}
}, ...
]
```
