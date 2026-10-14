# Konsultacje społeczne

- Kategoria: Aktywni mieszkańcy
- Właściciel: Centrum Komunikacji Społecznej
- Odświeżanie: 2 godziny
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_cks_konsultacje_spoleczne`
- Opis: Konsultacje społeczne pochodzą ze strony https://konsultacje.um.warszawa.pl/.

## Przykład wywołania

**Przykład zapytania dla pobrania Konsultacje społeczne**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_cks_konsultacje_spoleczne' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Konsultacje społeczne**

```
[
	{
		"id": 995,
		"title": "Jaki plan miejscowy dla rejonu liceum przy ulicy Słowackiego? ",
		"subtitle": "Jaki plan miejscowy dla rejonu liceum przy ulicy Słowackiego? ",
		"short_description": "<p>Trwają prace nad planem miejscowym dla rejonu LO im. Czesława Niemena przy ulicy Słowackiego w Wesołej. Obejmuje on teren liceum oraz sąsiedni obszar, gdzie planowany jest „Kompleks sportowo-rekreacyjny Groszówka” z halą, boiskiem, lodowiskiem i domem kultury. Zapoznaj się z projektem planu i zgłoś swoje uwagi!</p>",
		"description": "<p><a target="_blank" href="https://konsultacje.um.warszawa.pl/processes/mpzp-liceum-Slowackiego-Wesola/f/390/#subcontent" rel="noopener noreferrer">Plan miejscowy</a>&nbsp;to dokument, który określi, jak będzie można urządzić tę okolicę. W Warszawie plany ustalają, w jaki sposób mogą być m.in. budowane i przebudowywane budynki, ulice, place, tworzona sieć infrastruktury, jak mogą zostać urządzone tereny zieleni, czyli np. parki i skwery.</p><p>Jeśli masz propozycje zmian do projektu, teraz jest czas, żeby je zgłosić.</p><h3>Jaki jest obszar planu</h3><p>Obszar planu obejmuje około 5 hektarów. Leży na osiedlu Groszówka w Wesołej. Większość tego terenu należy do m.st. Warszawy. W granicach planu znajduje się nowo wybudowane CLXIII Liceum Ogólnokształcące im. Czesława Niemena. Poza budynkiem szkoły i jego otoczeniem teren jest wciąż niezagospodarowany. W części porasta go las.</p><div class="editor-content-image" data-image=""><img src="https://konsultacje.um.warszawa.pl/repository/blobs/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBcU0vIiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--8f226b2d6d95c848d7ed6133dfcec91978d03247/Wesola_Slowackiego_1200_FB_post.png?disposition=attachment" alt="https://konsultacje.um.warszawa.pl/repository/blobs/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBcU0vIiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--8f226b2d6d95c848d7ed6133dfcec91978d03247/Wesola_Slowackiego_1200_FB_post"></div><p>Na tym terenie powstanie <strong>Kompleks sportowo-rekreacyjny Groszówka</strong>. Znajdą się w nim:</p><ul><li><p>hala sportowa</p></li><li><p>boisko</p></li><li><p>lodowisko</p></li><li><p>dom kultury.</p></li></ul><p>Kompleks ma służyć mieszkańcom dzielnicy. Będzie miejscem sportu, rekreacji i kultury. (......)
		"category_id": 5,
		"district_id": null,
		"slug": "mpzp-liceum-Slowackiego-Wesola",
		"start_date": "2025-09-09",
		"end_date": "2025-10-16",
		"latitude": null,
		"longitude": null,
		"address": null,
		"zip_code": null,
		"hero_image": "https://konsultacje.um.warszawa.pl/rails/active_storage/disk/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdDVG9JYTJWNVNTSWhPVFo0TldjeWFtTnRaakV4T0RWemQzcHNhSGh3ZUdGc09UZHZaUVk2QmtWVU9oQmthWE53YjNOcGRHbHZia2tpZTJsdWJHbHVaVHNnWm1sc1pXNWhiV1U5SWxkbGMyOXNZVjlUYkc5M1lXTnJhV1ZuYjE4ek9EQXdlREV5TURCZlpHVmphV1JwYlM1d2JtY2lPeUJtYVd4bGJtRnRaU285VlZSR0xUZ25KMWRsYzI5c1lWOVRiRzkzWVdOcmFXVm5iMTh6T0RBd2VERXlNREJmWkdWamFXUnBiUzV3Ym1jR093WlVPaEZqYjI1MFpXNTBYM1I1Y0dWSklnNXBiV0ZuWlM5d2JtY0dPd1pVT2hGelpYSjJhV05sWDI1aGJXVTZDbXh2WTJGcyIsImV4cCI6IjIwMjUtMTAtMjNUMTE6NDk6MzUuOTUyWiIsInB1ciI6ImJsb2Jfa2V5In19--d5463ddfb5f4f0f24dd8652ce0aad41f14d44d35/Wesola_Slowackiego_3800x1200_decidim.png",
		"banner_image": null,
		"url": "/processes/mpzp-liceum-Slowackiego-Wesola",
		"recipients": "citizens",
		"tags": ""
	},..
]
```
