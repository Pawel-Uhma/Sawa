# Postęp przy pracy i wizyta mentora (17.10.2026, ok. 14:30)

**Kto:** Paweł, Szczepan, Jasiek, Antek; mentor (imię pomijamy). **Czas:** ok. 1 h, rozmowa przy pracy.

## Ustalenia
- Dziennik AI nie loguje już każdego promptu; na koniec jednorazowo opisujemy, do czego używaliśmy AI (w `main`: hook usunięty, archiwum `ai-log.md`, T-53).
- Planer (R1) nie używa RPC `places_near_line`; dopasowuje miejsca do trasy w pamięci API.
- Google Places: bez zapytań na żywo. Używamy danych pobranych wcześniej (ok. 3000 wpisów), wrzuconych do Supabase. Zgodne z T-06 w `main`.
- Supabase jest hostowany (nie lokalnie), MCP do Supabase jest skonfigurowany w repo. Sekrety idą przez komunikator, nigdy do repo.
- Głos: ElevenLabs wymaga płatnego planu do API (Starter, ok. 5 zł za pierwszy miesiąc). Testowane głosy: Asia, Maria, Magdalena. Liczby TTS czyta źle, LLM ma je pisać słownie.
- Pogoda nie jest widżetem na ekranie, tylko bierze ją pod uwagę planer.
- Bez landing page'a: wejście od razu w onboarding. Każde ładowanie ma animację (np. pływająca syrenka), nie biały ekran.
- Aplikacja webowa na telefon, nie App Store/Play: przegląd sklepu nie zmieści się w czasie.
- Sport: Jasiek dokłada zbiór miasta „Otwarte boiska” i mapuje go na `sports`.

## Uwagi mentora
- Inna drużyna ma zbliżony koncept (trasa po Warszawie + głos opowiadający o miejscach). Trzeba wyraźnie pokazać różnicę.
- Na obrzeżach jest mało miejsc. Odpowiedź zespołu: Wikipedia ma dane o tym, gdzie mieszkały znane osoby.
- Warto podeprzeć pomysł prostą ankietą (np. 10 znajomych, pytania ABC) i pokazać wynik w pitchu.
- Zdefiniować grupę docelową wprost. Jeśli szeroka: uwzględnić wiek (dzieci, seniorzy mają najwięcej czasu) i niepełnosprawności (ok. 10%, np. potrzeba prostszych komunikatów). Jeśli wąska: powiedzieć to na scenie.
- Poziomy szczegółowości jak w audioprzewodniku: podstawowy, rozszerzony, ekspert, z „dowiedz się więcej”.
- Rozszerzenia (newsletter, kartka pocztą dla seniorów) pokazać w pitchu jako kierunek rozwoju, nie w MVP.

## Otwarte kwestie
- Lista zainteresowań: onboarding pokazuje szczegółowe tematy (żydowska Warszawa, street art, architektura…), a planer w `main` przyjmuje 4 kategorie (`historical`, `cultural`, `sports`, `nature`). Mapowanie albo zmiana onboardingu — R3 + R1.
- Tryb dla dzieci (dojazdy ZTM do szkoły) — luźny pomysł, zespół.
- Poziomy szczegółowości opowieści (basic / rozszerzony / ekspert) — R4.
- Ankieta wśród znajomych do pitcha — R2.
- Własny głos Sawy (sklonowany głos Szczepana) — R4.
- Testy w CI (GitHub Actions, Vercel) kosztują przy częstych pushach do `main`; czy puszczać je tylko lokalnie — zespół.
- Dostęp do LLM w backendzie (opowieść w trakcie trasy) jeszcze nie istnieje — R4.

## Zadania
- [ ] Animacja ładowania zamiast białego ekranu — R3
- [ ] Wstępna wersja generowania trasy w `main`, żeby R4 testował generowanie podcastu i głos — R1
- [ ] `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` na Railway — R1
- [ ] Zbiór „Otwarte boiska” → `sports` (T-27) — R2
- [ ] Ankieta (ok. 10 osób) i jej wynik w pitchu — R2
- [ ] Na pitch: różnica wobec drużyny o podobnym koncepcie, grupa docelowa, kierunki rozwoju — R2

## Na przyszłość
- Połączyć agentów zespołu (np. bot na Discordzie) przed startem, żeby nie przekazywać wiadomości przez ludzi.
