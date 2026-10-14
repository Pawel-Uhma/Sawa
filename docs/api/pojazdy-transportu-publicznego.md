# Pojazdy transportu publicznego

- Kategoria: Transport
- Właściciel: Zarząd Transportu Miejskiego
- Odświeżanie: codziennie
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_ztm_pojazdy`
- Opis: Informacje o pojazdach transportu publicznego w Warszawie.

## Przykład wywołania

**Przykład zapytania dla pobrania poazdów komunikacji publicznej**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_ztm_pojazdy' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania pojazdów komunikacji publicznej**

```
{
	"busy": 
	[
		{
			"nazwaSkroconaOperatora": "KMŁ",
			"schematMalowania": "ZTM",
			"kolorPoreczy": "RAL 1004 żółty",
			"rokProdukcji": 2016,
			"numerTaborowy": "761",
			"nazwaOperatora": "Komunikacja Miejska Łomianki Sp. z o.o.",
			"trakcja": "Bus",
			"numerRejestracyjny": "WZ 2961M",
			"idMarki": 74,
			"kolorPojazdu": "RAL 1003+3020",
			"kolorTapicerki": "niebieski",
			"nazwaZajezdni": "Rolnicza"
		},...
	],
	"metro": 
	[
		{
			"nazwaSkroconaOperatora": "MW",
			"schematMalowania": "ZTM",
			"kolorPoreczy": "RAL 1004 żółty",
			"rokProdukcji": 2014,
			"numerTaborowy": "6530",
			"nazwaOperatora": "Metro Warszawskie Sp. z o.o.",
			"trakcja": "Metro",
			"idMarki": 142,
			"kolorPojazdu": "RAL 9002+1003+3020",
			"kolorTapicerki": "czerwony ZTM-Pocztówka",
			"nazwaZajezdni": "Kabaty"
		},...
	],
	"markiTramwaje": 
	[
		{
			"liczMiejscWozekDziec": 1,
			"dlugosc": 13500,
			"posiadaSSB": true,
			"liczMiejscSiedzacychTab": 18,
			"idMarki": 85,
			"operator": "Tramwaje Warszawskie Sp. z o.o.",
			"klimatyzacja": false,
			"operatorSkrot": "TW",
			"marka": "Konstal",
			"wersja": null,
			"typ": "105N",
			"liczMiejscTab": 125,
			"komGlosWewnatrz": true,
			"platnosc": "karta płatnicza + blik",
			"wariant": "i",
			"ukladSiedzen": "1+1",
			"powierzchniaPodlogi": 16.05,
			"wysokoscCalkowita": null,
			"producent": "Konstal",
			"komGlosZewnatrz": true,
			"liczMiejscSpec": 4,
			"liczMiejscStojacychTab": 107,
			"katWielkosci": "15m",
			"podloga": "HF",
			"szerokosc": 2400,
			"liczMiejscWozekInwalid": 0,
			"kierunkowosc": "jednokierunkowy"
		},...
	],
	"kolej": 
	[
		{
			"nazwaSkroconaOperatora": "SKM",
			"schematMalowania": "ZTM",
			"kolorPoreczy": "RAL 1004 żółty",
			"evn": "2 150 543-8",
			"rokProdukcji": 2022,
			"numerTaborowy": "711A",
			"nazwaOperatora": "Szybka Kolej Miejska Sp. z o.o.",
			"trakcja": "Kolej",
			"idMarki": 5081,
			"kolorPojazdu": "RAL 1015+1003+3020",
			"kolorTapicerki": "czerwony ZTM-Pocztówka",
			"nazwaZajezdni": "Odolany"
		},...
	],
	"tramwaje": 
	[
		{
			"nazwaSkroconaOperatora": "TW",
			"schematMalowania": "ZTM",
			"kolorPoreczy": "RAL 1004 żółty",
			"rokProdukcji": 2010,
			"numerTaborowy": "3137",
			"nazwaOperatora": "Tramwaje Warszawskie Sp. z o.o.",
			"trakcja": "Tram",
			"idMarki": 190,
			"kolorPojazdu": "RAL 1003+3020",
			"kolorTapicerki": "czerwony ZTM-Pocztówka",
			"nazwaZajezdni": "R-5 \"Annopol\""
		},...
	],
	"markiKolej": 
	[
		{
			"liczMiejscWozekDziec": 1,
			"dlugosc": null,
			"posiadaSSB": false,
			"liczMiejscSiedzacychTab": 46,
			"idMarki": 99,
			"operator": "Szybka Kolej Miejska Sp. z o.o.",
			"klimatyzacja": true,
			"operatorSkrot": "SKM",
			"marka": "Newag",
			"wersja": "A/F",
			"typ": "35WE",
			"liczMiejscTab": 148,
			"komGlosWewnatrz": true,
			"platnosc": null,
			"efektywnaSzerWejscia": 1400,
			"dlugoscPrzedzialu": null,
			"wariant": "",
			"ukladSiedzen": "2+2/1+1m",
			"powierzchniaPodlogi": 20.5,
			"wysokoscCalkowita": 4172,
			"producent": "Newag S.A.",
			"komGlosZewnatrz": false,
			"liczMiejscSpec": 4,
			"liczMiejscStojacychTab": 102,
			"katWielkosci": "6-wag",
			"szerokosc": 2840,
			"liczMiejscWozekInwalid": 2
		},...
	],
	"markiMetro": 
	[
		{
			"liczMiejscWozekDziec": null,
			"dlugosc": 115260,
			"posiadaSSB": false,
			"liczMiejscSiedzacychTab": 256,
			"idMarki": 128,
			"operator": "Metro Warszawskie Sp. z o.o.",
			"klimatyzacja": null,
			"operatorSkrot": "MW",
			"marka": "Metrowagonmasz",
			"wersja": ".3",
			"typ": "81",
			"liczMiejscTab": 1456,
			"komGlosWewnatrz": true,
			"platnosc": null,
			"efektywnaSzerWejscia": 1200,
			"dlugoscPrzedzialu": null,
			"wariant": "-717",
			"ukladSiedzen": "1+1",
			"powierzchniaPodlogi": null,
			"wysokoscCalkowita": 3600,
			"producent": "Metrowagonmasz",
			"komGlosZewnatrz": null,
			"liczMiejscSpec": null,
			"liczMiejscStojacychTab": 1200,
			"katWielkosci": "6-wag",
			"szerokosc": 2710,
			"liczMiejscWozekInwalid": 0
		},...
	],
	"markiBus": 
	[
		{
			"liczMiejscWozekDziec": 1,
			"dlugosc": 11947,
			"rodzajZasilania": "Spalinowy",
			"posiadaSSB": true,
			"liczMiejscSiedzacychTab": 30,
			"zasilanie": "ON",
			"idMarki": 1,
			"operator": "Miejskie Zakłady Autobusowe Sp. z o.o.",
			"klimatyzacja": false,
			"operatorSkrot": "MZA",
			"marka": "Jelcz",
			"wersja": "I",
			"typ": "M121",
			"liczMiejscTab": 104,
			"komGlosWewnatrz": true,
			"platnosc": "karta płatnicza + blik",
			"wariant": "I4",
			"ukladSiedzen": "2+2",
			"powierzchniaPodlogi": 9.11,
			"wysokoscCalkowita": 3220,
			"producent": "Zakłady Samochodowe JELCZ S.A.",
			"komGlosZewnatrz": false,
			"liczMiejscSpec": 4,
			"liczMiejscStojacychTab": 74,
			"katWielkosci": "MAXI (12m)",
			"podloga": "LE",
			"szerokosc": 2500,
			"liczMiejscWozekInwalid": 1
		},...
	]
}
```
