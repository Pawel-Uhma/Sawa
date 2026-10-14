# Wolne miejsca parkingowe

- Kategoria: Transport
- Właściciel: Urząd m.st. Warszawy
- Odświeżanie: 1 minuta
- Licencja: Creative Commons Attribution
- Endpoint: `POST https://dane.um.warszawa.pl/api/action/get_m_parkingi_wolne_miejsca`
- Opis: Wolne miejsca na parkingach zarządzanych przez Zarząd Terenów Publicznych, Zarząd Dróg Miejskich, Zarząd Pałacu Kultury i Nauki.

## Przykład wywołania

**Przykład zapytania dla pobrania Utrudnienia drogowe**

```
curl --location --request POST 'https://dane.um.warszawa.pl/api/action/get_m_parkingi_wolne_miejsca' --header 'Authorization: token_uzytkownika'
```

## Przykład odpowiedzi

**Przykład odpowiedzi dla pobrania Utrudnienia drogowe**

```
"Parkings": [
 {
 "name": "Parking na Pl. Żelaznej Bramy",
 "latitude": "52.239560",
 "longitude": "21.001779",
 "adress": "",
 "opening_hours": [
 {
 "monday": "00:00-23:59",
 "tuesday": "00:00-23:59",
 "wednesday": "00:00-23:59",
 "thursday": "00:00-23:59",
 "friday": "00:00-23:59",
 "saturday": "00:00-23:59",
 "sunday": "00:00-23:59"
 }
 ],
 "tariffs": [
 {
 "VehicleType": "Motor",
 "Prices": [
 {
 "StayLength": "1.00",
 "StayPrice": "5.00"
 },
 {
 "StayLength": "2.00",
 "StayPrice": "11.00"
 },
 {
 "StayLength": "3.00",
 "StayPrice": "14.00"
 },
 {
 "StayLength": "4.00",
 "StayPrice": "18.00"
 },
 {
 "StayLength": "24.00",
 "StayPrice": "98.00"
 }
 ]
 },
 {
 "VehicleType": "Samochód dostawczy",
 "Prices": [
 {
 "StayLength": "1.00",
 "StayPrice": "6.00"
 },
 {
 "StayLength": "2.00",
 "StayPrice": "13.00"
 },
 {
 "StayLength": "3.00",
 "StayPrice": "18.00"
 },
 {
 "StayLength": "4.00",
 "StayPrice": "22.00"
 },
 {
 "StayLength": "24.00",
 "StayPrice": "102.00"
 }
 ]
 },
 {
 "VehicleType": "Samochód osobowy",
 "Prices": [
 {
 "StayLength": "1.00",
 "StayPrice": "5.00"
 },
 {
 "StayLength": "2.00",
 "StayPrice": "11.00"
 },
 {
 "StayLength": "3.00",
 "StayPrice": "14.00"
 },
 {
 "StayLength": "4.00",
 "StayPrice": "18.00"
 },
 {
 "StayLength": "24.00",
 "StayPrice": "98.00"
 }
 ]
 }
 ],
 "levels": 1,
 "total_places": [
 {
 "level": "0",
 "standard": 47,
 "disabled": 0,
 "electric": 0
 }
 ],
 "free_places_total": {
 "public": 0,
 "disabled": 0,
 "electric": 0
 },
 "dimensions": [
 {
 "Length": "5.00",
 "Width": "2.50",
 "VehicleType": "Samochód osobowy"
 },
 {
 "Length": "5.00",
 "Width": "2.50",
 "VehicleType": "Samochód dostawczy"
 }
 ],
 "acceptedPaymentMethod": "Gotówka, karta płatnicza",
 "allowedVehicleType": "samochód osobowy, samochód dostawczy, motor",
 "additionalSecurity": "Parking strzeżony",
 "manager": "Zarząd Terenów Publicznych",
 "managerEmail": "nopar@wp.pl",
 "managerTelephone": "+48 601-248-664",
 "operatorTelephone": "+48 730-255-220",
 "parkingCategory": "Publiczny"
 },
]
```
