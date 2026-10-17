# Wieczór przy stole: proxy, dane, ekran trasy, mentorzy (17.10, ok. 19:30–20:00)

**Kto:** Paweł, Antek, Szczepan, Jasiek; dwoje mentorów. **Czas:** ok. 30 min luźnej pracy przy stole.

## Ustalenia
- Repo na razie bez licencji: warunki ustalają organizatorzy, nie dokładamy własnej.
- Ekran wyznaczania trasy: wariant B z suwakiem, bez dolnego paska (zgodne z T-130). Suwak ma mniej podziałek, np. co 30 min, bo gęstsza skala się nakładała.
- Głos zostaje wyłączony domyślnie, włącza go `?voice=1` w adresie (bez zmian względem `stan.md`).
- Większe zadania zgłaszamy jako issues: agent z pętlą czyta przypisane issues, robi je i merguje PR.
- PR-ów Pawła nie mergujemy hurtem: część (opowieść, plan pitchu) nie jest gotowa.
- Dalsze zbieranie miejsc (Firecrawl): rzadziej i równomiernie po całej Warszawie, poza Śródmieściem i Wolą, bo inne dzielnice mają prawie zero miejsc.

## Stan
- Baza: ok. 4500 miejsc, ok. 3000 zdjęć, 10 źródeł; Śródmieście ok. 2500. Darmowe kredyty Firecrawl prawie zużyte (95%).
- Proxy do API miasta przez home lab (#63, Cloudflare Tunnel) postawione, jeszcze nie przetestowane na produkcji.
- Odległość miejsc od trasy trochę lepsza. Trasa pieszo dalej potrafi iść „tam i z powrotem” (T-126, R1).
- Film z pitchu: gotowy tylko segment demo, zespołowi się nie podobał.

## Uwagi mentorów
- AI warto użyć w burzy mózgów, a potem spisać listę wymagań funkcjonalnych i listę aktorów systemu (np. emeryci, urzędnicy, biuro miasta).
- Brakuje projektów dla przedsiębiorców; aktorem może być np. lokalny przewoźnik z kilkoma busami.
- Pitch ok. 5 min: jasno opisać problem i rozwiązanie.

## Otwarte kwestie
- Tryb dla dzieci powstał na modelu Haiku: przejrzeć jakość, ewentualnie poprawić — R3 (Paweł) + R4.
- Czy parki są w bazie i na mapie (#85 zamknięte, do sprawdzenia na mapie) — R2.
- Domyślny motyw: jasny czy „Auto” — R3.
- Brak miejsc z bazy po zmianie klucza / przy VPN: co dokładnie się zmieniło — R1 + R2.
- Film pitchu: poprawiać czy zostać przy nagraniu demo na żywo — R2 + Paweł.

## Zadania
- [ ] T-140 Wyszukiwanie celu znajduje ulice i adresy, nie tylko miejsca z Google Places — R3
- [ ] T-141 Ciemny motyw: jaśniejsze ulice na mapie i syrenka czytelna na ciemnym tle — R3 (Antek)
- [ ] T-142 Stany czekania (kółka) w czcionce i kolorach Sawy — R3
- [ ] T-143 Suwak czasu: rzadsze podziałki (np. co 30 min) — R3 (Paweł)
- [ ] T-144 TTS czyta lata źle („1099” zamiast 1939, „1090” zamiast 1940, „5355” zamiast 53/55): sprawdzić, czy prompt pisze liczby słownie (T-98) — R4
- [ ] T-145 Przetestować proxy z #63 na produkcji (pojazdy, API miasta) — R1 + Antek
- [ ] T-146 Firecrawl: klucz z drugiego konta, scraping rzadszy, cała Warszawa — R2
- [ ] T-147 Pitch: wymagania funkcjonalne, aktorzy systemu, problem → rozwiązanie (uwagi mentorów) — R2

## Zmienione dokumenty
- [todo.md](../todo.md): T-140–T-147
- [stan.md](../stan.md): wpis ze spotkania
