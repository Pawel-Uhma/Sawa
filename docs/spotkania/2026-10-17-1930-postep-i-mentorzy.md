# Postęp popołudnia i rozmowa z mentorami (17.10, ok. 16:00–19:30)

**Kto:** Paweł, Antek, Szczepan, Jasiek; mentorzy: Bartek (Play), Hubert (Allegro), Anatoli i Jan (CIRF). **Czas:** ok. 3 h luźnej pracy przy stole i ok. 15 min z mentorami.

## Ustalenia
- Zainteresowania to 4 kategorie (historia, kultura, sport, przyroda), w podpisie to, co jest w danych. Wybór 1–4, bez limitu 3. Najwyżej zmienimy.
- Znajomość miasta zmienia opowieść i trasę: „pierwszy raz” tłumaczy tło (Wola, Powstanie), „mieszkam tu” daje dawne nazwy i mniej znane miejsca. Kto mieszka, ale nie zna dzielnicy, wybiera „trochę znam”.
- Ikony na mapie: wariant 3, płaski, bez naklejkowej obwódki i cienia; osobne ikony tramwaju i autobusu.
- Pojazdy na żywo dopiero po wyznaczeniu trasy: tylko pojazd użytkownika i po jednym przed i za nim, płynny ruch z prędkością liczoną z przejazdu poprzednika.
- Bez metra: pod ziemią nic nie widać (zgodne z [12-plan-mvp.md](../12-plan-mvp.md) §7).
- Opcja „Przed siebie” do usunięcia: wywozi w przypadkowe miejsce (Bemowo, Ursynów).
- Lata i liczby w tekście opowieści słownie (TTS źle czyta cyfry); w bazie zostają liczby.
- Zamiast czatu transkrypt tego, co mówi Sawa; stuknięcie w podgląd otwiera całość w zakładce Sawa.
- Toalety odpadają (nikt nie widział potrzeby), zostają poza MVP.
- `WAW_TOKEN` jest na Railway (wcześniej zmienna nazywała się inaczej).

## Uwagi mentorów
- Pomysł mocny, ale uzasadnienie „Warszawa za 50 lat” słabe. Trzeba je sprzedać: kto jest odbiorcą (miasto?), co zyska w 2076.
- Pitch 5 min (na scenie padło też 9 min, do sprawdzenia): pokazać, że działa i że dane miasta dają wartość. Demo może być częściowo nagraniem.
- Z prezentacją zajrzeć do Bartka (Play).

## Otwarte kwestie
- Wszystkie pojazdy w widoku mapy (przy przybliżeniu) czy tylko trzy przy trasie — R3 (Paweł).
- Jeden ciągły „podcast” z płynnymi przejściami (streaming) zamiast osobnych opowieści — R3 + R4.
- Tryb „live” bez planowania: wsiadasz do dowolnego autobusu i Sawa opowiada — zespół.
- Dłuższy sam spacer (np. 1,5–2 h) — R1.
- Wideo w PPTX osadzone czy z linku (osadzone bywa bez dźwięku) — R2.
- Źródło liczby „20% warszawiaków spoza Warszawy” do pitcha — R2.

## Zadania
- [ ] Ekrany demo na tokeny kolorów zamiast `bg-white` i hexów, żeby działał ciemny motyw (syrenka z ciemnymi pachami na jasnym tle) — Paweł (R3)
- [ ] Usunąć „Przed siebie” z wyboru końca trasy — Paweł (R3)
- [ ] Suwak przy celu: minimum = czas najszybszej trasy (T-104, zadanie T-110), dłużej = trasa krajoznawcza do celu — Paweł (R3)
- [ ] „Do celu” ze startu z GPS nie wyznacza trasy; 5 min do odległego celu wysypało produkcję — Paweł (R3) + Szczepan (R1)
- [ ] Dziwna pętla na końcu trasy — Szczepan (R1)
- [ ] Śledzenie lokalizacji na żywo: która opowieść gra (`activeIndex` do „Na żywo”) — Antek (R3)
- [ ] Grupowanie punktów przy oddaleniu (T-107, issue #42) — Antek (R3)
- [ ] Na GitHubie włączyć automatyczne usuwanie gałęzi po merge’u (tylko właściciel repo) — Paweł
- [ ] Pitch pod „Warszawa 2076” według uwag mentorów — Jasiek (R2, T-50)

## Zmienione dokumenty
- [todo.md](../todo.md): T-17 zamknięte, nowe T-112–T-117 (suwak przy celu już był jako T-110, #43); T-05 zamknął Szczepan (rezygnacja)
- [stan.md](../stan.md): wpis ze spotkania, nowe otwarte decyzje
- [10-prd.md](../10-prd.md): toalety poza zakresem
- [CLAUDE.md](../../CLAUDE.md): agent sprawdza przypisane issues na GitHubie
