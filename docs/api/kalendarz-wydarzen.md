# Kalendarz wydarzeń

- Kategoria: Wydarzenia
- Właściciel: Biuro Marketingu Miasta
- Odświeżanie: 2 godziny
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_bmm_kalendarz_wydarzen`
- Opis: Kalendarz wydarzeń pochodzi z kalenarza umieszczonego na stronie internetowej miasta https://um.warszawa.pl.

## Przykład wywołania

**Przykład zapytania dla pobrania Wydarzenia w Warszawie**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_bmm_kalendarz_wydarzen' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Wydarzenia w Warszawie**

```
{
	"address": [
		{
			"name": "Teatr Syrena",
			"street": "Litewska 3"
		}
	],
	"availableLanguages": [
		"pl_PL"
	],
	"language": "pl_PL",
	"map": {
		"features": [
			{
				"geometry": {
					"coordinates": [
						21.038453,
						52.252014
					],
					"type": "Point"
				},
				"properties": {
					"district": "Praga-Północ",
					"fullStreetName": "ulica Targowa",
					"shortStreetName": "ul. Targowa",
					"streetNumber": "56"
				},
				"type": "Feature"
			},
			{
				"geometry": {
					"coordinates": [
						21.049415,
						52.272562
					],
					"type": "Point"
				},
				"properties": {
					"district": "Targówek",
					"fullStreetName": "ulica Kołowa",
					"shortStreetName": "ul. Kołowa",
					"streetNumber": "20"
				},
				"type": "Feature"
			},
			{
				"geometry": {
					"coordinates": [
						21.022151,
						52.216486
					],
					"type": "Point"
				},
				"properties": {
					"district": "Śródmieście",
					"fullStreetName": "ulica Litewska",
					"shortStreetName": "ul. Litewska",
					"streetNumber": "3"
				},
				"type": "Feature"
			}
		],
		"type": "FeatureCollection"
	},
	"occurrence": [
		{
			"daily": true,
			"from": "2026-02-26T00:00:00+01",
			"to": "2026-02-26T23:59:59+01"
		}
	],
	"text": "<p>Legendarny prezydent Warszawy Stefan Starzyński, symbol oporu stolicy we wrześniu 1939 roku, będzie bohaterem kolejnej autorskiej premiery w&nbsp;warszawskim Teatrze Syrena. Musical na podstawie biografii pióra Grzegorza Piątka „Starzyński. Prezydent z&nbsp;pomnika” wyreżyseruje Konrad Imiela.</p><p>Organizator: <a href="https://teatrsyrena.pl/" target="_blank">Teatr Syrena</a></p>",
	"title": "Starzyński. Prezydent z pomnika",
	"url": "https://um.warszawa.pl/waw/80-rocznica/-/starzynski-prezydent-z-pomnika"
}
```
