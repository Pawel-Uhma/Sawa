# Zajęcia sportowe

- Kategoria: Sport
- Właściciel: Biuro Marketingu Miasta
- Odświeżanie: 2 godziny
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_bmm_zajecia_sportowe`
- Opis: Zajęcia sportowe pochodzą z kalenarza zajęć sportowych umieszczonych na stronie internetowej miasta https://sport.um.warszawa.pl.

## Przykład wywołania

**Przykład zapytania dla pobrania Zajęcia sportowe**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_bmm_zajecia_sportowe' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Zajęcia sportowe**

```
[{ 
"category": [ 
	{ 
	"id": "category_37", 
	"name": "Jazda na rolkach/rolki" 
	}, 
	{ 
	"id": "category_120", 
	"name": "Nartorolki" 
	} 
], 
"date": [ 
        "2022-06-16" 
], 
"day": [ 
        { 
          "id": "thursday", 
          "name": "Czwartek" 
        } 
      ], 
      "dedicated": [ 
        { 
          "id": "value_1", 
          "name": "Kobiety" 
        }, 
        { 
          "id": "value_2", 
          "name": "Mężczyźni" 
        }, 
        { 
          "id": "value_4", 
          "name": "Młodzież" 
        }, 
        { 
          "id": "value_5", 
          "name": "Seniorzy" 
        } 
], 
"image": { 
        "small": { 
          "path": "http://um.warszawa.pl/documents/55624/6743173/ns_rolki.jpg/1d90643b-4b28-
1e7d-b91c-2504e64583e5?t=1634499026391&imagePreview=1" 
        } 
      }, 
"language": "pl_PL", 
"localization": [ 
	{ 
		"id": "wesola", 
		"name": "Wesoła" 
	} 
 ], 
"text": "<p>TN "Biegówki" zaprasza na bezpłatne zajęcia na rolkach/nartrorolkach 
 terenowych (FT). Miesjce zbiórki: róg ul. Fabrycznej i Jana Pawła II w Starej Miłośnie. 
 Zajęcia te prowadzone są w formie szkoleniowych wycieczek w terenie urozmaiconym (miasto/las). 
 Zajęcia te nie są cykliczne. Zajęcia organizawane są dla dorosłych i młodzieży. Szczegółowe 
 informacje dostępne są pod numerem telefonu <a href="tel:697 052 296">697 052 296</a> oraz 
 na stronie internetowej: <a href="http://www.facebook.com/tnbiegowkiwesola" 
 target="_blank">www.facebook.com/tnbiegowkiwesola</a><a href="http://www.tnbiegowski.pl" target="_blank">www.tnbiegowski.pl</a> &nbsp; Zapisy 
 prowadzi: Katarzyna Witek</p>", "time": "11:00", 
"title": "Zajęcia na rolkach/nartorolkach terenowych (zaawansowani)", 
"url": "https://sport.um.warszawa.pl/-/zajecia-na-rolkach-nartorolkach-
terenowychzaawansowani" 
},..
]
```
