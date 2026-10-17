# Pytania do PRD Sawy

Na tej podstawie piszemy `docs/10-prd.md`, fundament aplikacji. Przy każdym pytaniu jest **propozycja domyślna** z dotychczasowych ustaleń. Wystarczy odpowiedzieć „OK” albo wpisać inną odpowiedź. Pytania oznaczone ⭐ blokują resztę, odpowiadamy na nie najpierw.

## 1. Problem i wyzwanie

1. ⭐ **W którym wyzwaniu startujemy (przydział organizatora)?** Domyślnie: zostaje to, co przydzielili; PRD piszemy pod nie.
2. ⭐ **Jeden problem, który rozwiązujemy, w jednym zdaniu.** Domyślnie: „Ludzie chodzą po Warszawie i nie wiedzą, na co patrzą; miasto rośnie dzięki nowym mieszkańcom, którzy nie znają jego historii”.
3. ⭐ **Na którym z trzech wątków Sawy się skupiamy?** (a) „co tu było?” – historia miejsca, (b) „co robić?” – plan na wolny czas, (c) łączenie ludzi. Domyślnie: (a) jako rdzeń, z (b) jako jeden dodatek.
4. Jak to łączy się z perspektywą 50 lat (jeśli wyzwanie 1)? Domyślnie: migranci i nowi mieszkańcy (prognoza 20% w 2060) – Sawa buduje tożsamość miejsca.

## 2. Użytkownik

5. ⭐ **Kim jest główna persona?** Imię, wiek, skąd, w jakiej sytuacji otwiera Sawę. Domyślnie: osoba nowa w Warszawie (np. z Ukrainy lub z innego miasta), pracuje na Woli, idzie pieszo na spotkanie.
6. Druga persona (opcjonalnie)? Np. turysta, senior, uczeń na wycieczce.
7. Na czym używa: telefon w ręku, słuchawki, czy komputer? Domyślnie: telefon, przeglądarka (bez instalacji).
8. Języki: PL, EN, UA? Domyślnie: PL + EN (mamy streszczenia EN w danych).

## 3. Główna ścieżka (to, co pokażemy w demo)

9. ⭐ **Opisz krok po kroku jedną ścieżkę użytkownika od otwarcia do „wow”.** Domyślnie: otwieram stronę → mapa z moją pozycją → Sawa wita i mówi, co jest obok → klikam punkt → historia, zdjęcie archiwalne „wtedy i dziś” → pytam Sawę o coś na czacie.
10. Czy Sawa odzywa się sama, gdy podchodzę do punktu (geofencing), czy tylko po kliknięciu? Domyślnie: sama, z symulacją spaceru w demo (nie będziemy chodzić po sali).
11. Głos (TTS) czy tylko tekst? Domyślnie: tekst, głos jako dodatek, jeśli zostanie czas.
12. Czy można rozmawiać z Sawą (czat z LLM), czy tylko czytać? Domyślnie: czat z kontekstem punktów w pobliżu.
13. Jaka jest osobowość i ton Sawy? Np. ciepła przewodniczka, ironiczna warszawianka, poważna kronikarka. Długość jednej kwestii?

## 4. Zakres (MVP vs. później)

14. ⭐ **Co MUSI działać na pitchu w niedzielę o 11:00?** Domyślnie: mapa z punktami historii, karta punktu, Sawa mówi kontekstowo (LLM), min. 2 zbiory z dane.um.warszawa.pl widoczne w demo.
15. Co świadomie wycinamy (pokażemy tylko na slajdzie jako „następne kroki”)? Domyślnie: łączenie ludzi, konta użytkowników, aplikacja natywna.
16. Obszar: tylko 1 km wokół 42 Warsaw, czy cała Warszawa (np. punkty z Wikipedii dla całego miasta)? Domyślnie: 1 km szczegółowo, reszta miasta pusta lub z rzadszymi punktami.

## 5. Dane miejskie (kryterium 20%)

17. ⭐ **Które zbiory z dane.um.warszawa.pl i do czego?** Propozycja:
    - pogoda i jakość powietrza → Sawa dopasowuje propozycję („pada, chodź do kościoła św. Wawrzyńca, nie na skwer”),
    - kalendarz wydarzeń → „dziś obok jest…”,
    - przystanki i odjazdy ZTM → „wracasz? tramwaj za 4 min”,
    - otwarte boiska / zajęcia sportowe → opcjonalnie.
18. Czy dane miejskie mają być „na żywo” w demo (np. odjazd tramwaju), czy wystarczy pokazanie ich na mapie?
19. Skąd historia: tylko nasze `historia/sawa-historia.geojson` czy też dociągamy na żywo z Wikipedii? Domyślnie: nasz GeoJSON (źródła są w środku).

## 6. AI

20. Który LLM: Bielik (plus u jurorki) czy Claude? Czy sprawdziliśmy już API Bielika i limit? Domyślnie: Bielik, Claude jako zapas za jedną zmienną.
21. Jak pilnujemy, żeby Sawa nie zmyślała historii? Domyślnie: LLM dostaje tylko fakty z GeoJSON z najbliższych punktów, odpowiada wyłącznie z nich i podaje źródło.
22. Czy Sawa ma awatar/animację (mamy `docs/awatar/`)? Statyczny obrazek czy kilka stanów (mówi, myśli, wita)?

## 7. Wdrożenie i wartość dla miasta (kryterium 20%)

23. ⭐ **Kto przejmie Sawę po hackathonie i dlaczego?** Np. Muzeum Warszawy, Biuro Promocji, aplikacja Warszawa 19115, szkoły. Domyślnie: Muzeum Warszawy + miasto jako warstwa w apce miejskiej.
24. Czy pokazujemy „Sawę jako źródło danych dla miasta” (gdzie nikt nie chodzi = sygnał wykluczenia)? Jeśli tak, to w MVP czy tylko na slajdzie?
25. Model utrzymania: kto dopisuje nowe miejsca (mieszkańcy, muzea, automatycznie z Wikipedii)?

## 8. Wymagania niefunkcjonalne

26. Prywatność lokalizacji: czy cokolwiek zapisujemy na serwerze? Domyślnie: nie, lokalizacja zostaje w przeglądarce.
27. Co jeśli API miasta albo LLM padnie w trakcie pitcha? Domyślnie: cache + tryb offline z nagranymi odpowiedziami + wideo zapasowe.
28. Dostępność: duża czcionka, kontrast, czytnik ekranu? Na ile poważnie?
29. Wygląd: mamy już styl (pitch, awatar)? Kolory, fonty, nastrój.

## 9. Sukces i demo

30. ⭐ **Po czym poznamy, że wygraliśmy demo?** Jedno zdanie, które jury ma zapamiętać.
31. Jaki scenariusz demo na żywo (pogoda, pora dnia, miejsce)? Domyślnie: spacer od 42 Warsaw do Hal Mirowskich / Kercelaka, symulowany na mapie.
32. Jakie liczby pokażemy (326 punktów, 2367 faktów, X zbiorów miejskich, czas odpowiedzi)?

## 10. Zespół i czas

33. Kto odpowiada za który moduł (role z [06-plan-dnia.md](06-plan-dnia.md))?
34. O której zamrażamy zakres funkcji? Domyślnie: sobota 22:00, w nocy już tylko szlify.
