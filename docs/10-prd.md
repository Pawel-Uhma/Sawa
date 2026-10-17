# PRD: Sawa

Wersja 0.1, 17.10.2026. Źródło: [spotkanie 17.10, 11:00](spotkania/2026-10-17-1100-mvp-sawy.md), pytania w [09-pytania-prd.md](09-pytania-prd.md).

## Problem

Warszawa rośnie dzięki nowym mieszkańcom, a ci nie znają historii miejsc, przez które codziennie przejeżdżają. Zanika tożsamość i poczucie przynależności do miasta (wyzwanie 1, Warszawa 2076; trendy w [08-badania-trendy.md](08-badania-trendy.md)).

## Użytkownik

Osoba, która przyjechała do Warszawy za pracą. Mieszka tu od roku, zna dom, biuro i siłownię, nigdzie poza tym nie była, bo nie wie, gdzie i po co jechać. Używa telefonu, otwiera stronę w przeglądarce, bez instalacji i bez konta.

## Rozwiązanie

Sawa, syrenka-przewodniczka, planuje przejazd komunikacją miejską dopasowany do czasu i zainteresowań i opowiada jak podcast o miejscach, które mijasz za oknem. Wie z rozkładu i pozycji pojazdów ZTM, co zaraz będzie po drodze, więc zaczyna mówić we właściwym momencie. Nie oprowadza po muzeach, w środku od tego są audioprzewodniki.

## Główna ścieżka

1. Ekran startowy z krótkim przewodnikiem.
2. Onboarding: wybór ok. 3 zainteresowań; po wybraniu jednego pojawiają się podobne (jak przy pierwszym uruchomieniu TikToka). Ma trwać kilka sekund, bo przejdą go widzowie na sali.
3. Mapa z lokalizacją i sliderem czasu: od 30 min do 4 h lub więcej.
4. „Generuj”: trasa autobusami i tramwajami, z przesiadkami, bez wysiadania, z listą punktów po drodze.
5. Jazda: Sawa opowiada o mijanych miejscach; przy korku wybiera dłuższą historię. Pogoda wpływa na podpowiedzi (np. „weź parasol”).
6. Zakładka czatu: pytania do Sawy o mijane miejsca.

## MVP (niedziela, 11:00)

- [ ] Ekran startowy z przewodnikiem
- [ ] Onboarding zainteresowań
- [ ] Mapa i slider czasu
- [ ] Planowanie trasy komunikacją miejską
- [ ] Opowieść o miejscach na trasie (dane o miejscach + ZTM)
- [ ] Podstrona demo: stała lokalizacja, symulowana jazda, wszystkie funkcje w ok. 1,5 min
- [ ] Wejście przez kod QR, strona wygląda jak aplikacja na telefonie
- Bez logowania.

## Po MVP (w tej kolejności, jeśli zostanie czas)

- Przycisk „dalej”: pominięcie punktu, Sawa bierze następny pobliski (do decyzji, czy nie wchodzi do MVP)
- Głos (TTS)
- Tryb „z wysiadaniem”: muzeum lub park przy długim czasie i pasujących zainteresowaniach
- Muzea i wystawy czasowe pod zainteresowania (scraping)
- Rozpoznawanie powracającego użytkownika bez konta, pamięć odwiedzonych miejsc
- Wydarzenia kulturalne i łączenie ludzi

## Dane

| Źródło | Do czego |
|---|---|
| ZTM: pozycje pojazdów, przystanki, linie, odjazdy (dane.um.warszawa.pl) | Planowanie trasy, przewidywanie, co zaraz za oknem, korki |
| Pogoda (dane.um.warszawa.pl) | Podpowiedzi zależne od pogody |
| Kalendarz wydarzeń (dane.um.warszawa.pl) | Wzmianki o tym, co dzieje się na trasie |
| Wikipedia / Wikidata (cała Warszawa) | Miejsca i fakty; trasa wychodzi poza 1 km wokół 42 Warsaw |
| [historia/](historia/README.md) (1 km wokół 42 Warsaw) | Gęste dane do demo |
| Google Places | Uzupełnienie miejsc; agresywny cache, bo darmowy limit to 1000 zapytań na klucz |
| Toalety | Do ustalenia: brak zbioru w portalu |

## Architektura (zmiany wobec [05](05-plan-architektury.md))

Next.js na Vercel, baza miejsc ze współrzędnymi w Supabase (darmowy plan, konto zespołu), dane miasta przez proxy na serwerze.

## Wdrożenie (do pitcha)

Kulturalna warstwa obok technicznej aplikacji Warszawa 19115: miasto ma narzędzie, które buduje przynależność nowych mieszkańców. Do dopracowania razem z jednym zdaniem dla jury.

## Otwarte kwestie

Lista w [podsumowaniu spotkania](spotkania/2026-10-17-1100-mvp-sawy.md#otwarte-kwestie).
