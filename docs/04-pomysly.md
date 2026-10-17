# Pomysły

Każdy pomysł ma listę zbiorów, z których korzysta, oraz ocenę ryzyka. Wybrany pomysł oznaczamy ✅.

## Wyzwanie 2: Złap oddech (pierwszy wybór)

### A. „Masz 2 godziny” (faworyt)

Użytkownik podaje, gdzie jest i ile ma wolnego czasu. Aplikacja proponuje **trzy gotowe plany**: wydarzenie, zajęcia sportowe albo otwarte boisko. Każdy plan uwzględnia bieżącą pogodę i jakość powietrza oraz pokazuje najbliższy odjazd komunikacji. Rozmowa w języku naturalnym przez LLM (Bielik), np. „mam 2 godziny na Mokotowie, coś na świeżym powietrzu, z dzieckiem”.

- **Dane (6–8 zbiorów):** kalendarz wydarzeń, zajęcia sportowe, otwarte boiska, pogoda, jakość powietrza, przystanki, odjazdy linii, pozycje pojazdów
- **Dlaczego wygrywa:** maksimum w kryterium danych, demo widać od razu, łatwo zrozumieć w 5 minut
- **Ryzyko:** zakres. Minimalna wersja to planer i mapa bez rozmowy; rozmowa z LLM dopiero jako drugi krok
- **Pitch:** jedna osoba, sobota, pada deszcz, powietrze złe. Na żywo pokazujemy, jak zmienia się plan

### B. Otwarte boiska szkolne na teraz

Szkolne boiska, bieżnie, korty i siłownie plenerowe dostępne dla mieszkańców. Aplikacja pokazuje, co jest otwarte blisko ciebie, oraz pogodę i powietrze.

- **Dane:** otwarte boiska, pogoda, jakość powietrza, przystanki
- **Dlaczego:** niszowy temat z przekazem „miasto ma infrastrukturę, o której nikt nie wie”, trafia do osoby z urzędu w jury
- **Ryzyko:** mała skala, może wyglądać na zbyt prosty projekt

### C. Czysty oddech: kiedy i gdzie wyjść

Rekomendacja pory i miejsca na spacer lub bieg na podstawie jakości powietrza i pogody, z trasą do najbliższej zieleni lub boiska.

- **Dane:** jakość powietrza, pogoda, boiska, przystanki
- **Ryzyko:** mało danych o zieleni w katalogu

## Wyzwanie 3: Twój ruch (drugi wybór)

### D. Mapa punktualności komunikacji

Od soboty 11:00 zapisujemy pozycje pojazdów co 10–30 sekund. W niedzielę mamy ok. 22 godziny prawdziwych danych: mapę opóźnień, wąskie gardła i porównanie z rozkładem.

- **Dane:** pozycje pojazdów, odjazdy linii, przystanki, utrudnienia w ruchu
- **Dlaczego:** bardzo mocne w kryterium danych, efektowna wizualizacja
- **Ryzyko:** dopasowanie pozycji pojazdu do rozkładu jest trudne technicznie. Zbieranie danych **musi ruszyć w pierwszej godzinie**

### E. Konsultacje społeczne dla ludzi

Bot lub strona streszcza trwające konsultacje w twojej dzielnicy prostym językiem i powiadamia o nowych.

- **Dane:** konsultacje społeczne, ich kategorie i dzielnice
- **Dlaczego:** temat bliski Ministerstwu Cyfryzacji i miastu, dobre zastosowanie LLM
- **Ryzyko:** mało efektowne na scenie

### F. AED blisko ciebie

Najbliższy dostępny defibrylator i trasa do niego.

- **Dane:** AED
- **Ryzyko:** podobne aplikacje już istnieją, więc innowacyjność (25%) będzie niska. Raczej jako funkcja dodatkowa w innym projekcie

## Wyzwanie 1: Warszawa 2076

### H. Sawa: podcast z okna autobusu ✅

Wybrany 17.10. Planowanie przejazdu komunikacją miejską pod czas i zainteresowania, a Sawa opowiada o mijanych miejscach. Szczegóły w [10-prd.md](10-prd.md).

### G. Indeks miasta 15-minutowego

Rejestr Cen Nieruchomości połączony z dostępnością komunikacji, boisk, AED i jakością powietrza. Z tego mapa „gdzie się dobrze mieszka za swoje pieniądze” i symulacja scenariuszy na 2076 rok.

- **Dane:** Rejestr Cen Nieruchomości, przystanki, boiska, AED, jakość powietrza
- **Ryzyko:** trudno obronić realność prognozy, przekonujące demo wymaga dużo analizy

## Do dyskusji w zespole

- [x] Wybór: H, Sawa (17.10)
- [ ] Pomysł zapasowy na wypadek przydziału do wyzwania 3
- [ ] Czy rozmowa z LLM wchodzi do minimalnej wersji, czy jest dodatkiem
