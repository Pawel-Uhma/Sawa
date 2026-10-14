# Monitoring jakości powietrza

- Kategoria: Środowisko
- Właściciel: Biuro Ochrony Powietrza i Polityki Klimatycznej
- Odświeżanie: 10 minut
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_bopipk_monitoring_jakosci_powietrza`
- Opis: Poziom jakości powietrza na terenie Warszawy i gmin ościennych.

## Przykład wywołania

**Przykład wywołania dla zapytania o jakość powietrza**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_bopipk_monitoring_jakosci_powietrza' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi zwracający dane o jakości powietrza**

```
[{
	"ijp": {
   	"name": "Bardzo dobry",
		"recommendations": "Jakość powietrza jest bardzo dobra, zanieczyszczenie powietrza nie stanowi zagrożenia dla zdrowia, warunki bardzo sprzyjające do wszelkich aktywności na wolnym powietrzu, bez ograniczeń."
	},
	"data_source": "Urząd m.st. Warszawy",
	"name": "Warszawa-Grochowska",
	"station_type": "Stacja monitoringu",
	"lon": 21.080555,
	"owner": "Urząd m.st. Warszawy",
	"station": "ul. Grochowska",
	"address": {
		"city": "Warszawa",
		"street": "Grochowska 244",
		"zip_code": "04-368",
		"district": "Praga-Południe",
		"commune": "Warszawa"
	},
	"lat": 52.245703,
	"data": [
		{
			"ijp": {
				"name": "Bardzo dobry"
			},
			"param_name": "pył zawieszony PM10",
			"param_code": "PM10",
			"value": 7.88278,
			"time": "2025-07-30 05:00:00",
			"unit": "µg/m3"
		},
		{
			"ijp": {
				"name": "Bardzo dobry"
			},
			"param_name": "pył zawieszony PM2.5",
			"param_code": "PM25",
			"value": 5.70948,
			"time": "2025-07-30 05:00:00",
			"unit": "µg/m3"
		},
		{
			"ijp": {
				"name": "Bardzo dobry"
			},
			"param_name": "dwutlenek azotu",
			"param_code": "NO2",
			"value": 15.7512,
			"time": "2025-07-30 05:00:00",
			"unit": "µg/m3"
		},
		{
			"ijp": {
				"name": "Bardzo dobry"
			},
			"param_name": "tlenek węgla",
			"param_code": "CO",
			"value": 0.0427396,
			"time": "2025-07-30 05:00:00",
			"unit": "mg/m3"
		}
	]
},...]
```
