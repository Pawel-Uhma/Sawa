# Stack, repo i domena (17.10.2026, ok. 11:30)

**Kto:** Paweł i zespół (imion nie ma w transkrypcie). **Czas:** ok. 15 min.

## Ustalenia

- **Stack potwierdzony:** Next.js + Supabase (baza) + Vercel (hosting). Next.js dobrze się łączy z Vercelem.
- **Repo z dokumentacją wypchnięte** i wysłane na Discorda zespołu, razem z kluczem API do danych miasta (klucz każdy wkleja do `.env.local`, nie do repo).
- **Backend na Railway** (rozstrzygnięte po spotkaniu): ktoś z zespołu ma płatne konto, ruch będzie mały.
- **Domena: darmowa subdomena Vercela** (rozstrzygnięte po spotkaniu): nie kupujemy własnej.
- **Rejestracja zespołu:** osoba odpowiedzialna dostała kartę od organizatorów, wpisała nazwę zespołu i się podpisała.

## Otwarte kwestie

- **Zasady pracy z repo:** krótki git flow (gałęzie, PR, kto merge'uje), żeby 5 osób i ich agenci nie wchodzili sobie w drogę i żeby kod dało się później rozwijać komercyjnie. Pomysł: merge przez agenta na GitHubie. Rozstrzyga zespół.
- **Własny styl mapy:** ktoś zna darmowe API do customowych map (szerokie drogi, własne kolory, nie wygląd Google Maps); nazwa do ustalenia. Rozstrzygnięte 17.10: Mapbox (R3).
- **LLM:** padło „Claude”; w planie jest Bielik z Claude jako zapasowym. Bez zmiany do decyzji R4 (T-01).

## Zadania

- [ ] Spisać zasady pracy z repo (gałęzie, PR, merge) — zespół — 13:00
- [x] Nazwa API do customowej mapy: Mapbox (R3, 17.10)

## Zmienione dokumenty

- [05-plan-architektury.md](../05-plan-architektury.md): backend i deploy z otwartymi pytaniami (Railway, domena, styl mapy)
- [stan.md](../stan.md): nowe otwarte decyzje
- [todo.md](../todo.md): zadania T-62–T-65
