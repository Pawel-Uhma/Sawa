# Tryb demo (pitch, sala pełna telefonów)

Kod: `apps/api/src/services/demo.ts`, pliki: `apps/api/data/demo/` (`stories.json`, `audio/*.mp3`), zmienna `DEMO_MODE` w API.

## Po co

Na pitchu ok. 100 telefonów z jednego Wi-Fi (jedno IP). Bez trybu demo każdy telefon płaci za LLM (OpenRouter), głos (ElevenLabs) i wyszukiwanie celu (Google Places), a limit 300 zapytań o opowieść na IP kończy się po kilku telefonach. 17.10, ok. 21:10 przy nagrywaniu: OpenRouter odpowiadał 429 (Gemini rate-limited), ElevenLabs miał 82 kredyty z 40 000.

## Co podmienia

| Usługa | `DEMO_MODE=replay` | `DEMO_MODE=record` |
|---|---|---|
| Opowieść (LLM) | z `stories.json` po `placeId`, profil i pamięć słuchacza ignorowane; brak w pliku → fakty miejsca czytane wprost | prawdziwy LLM, pierwsza opowieść miejsca zapisana (bez opowieści z faktów po błędzie LLM) |
| Research w sieci | wyłączony | jak zwykle |
| Głos (ElevenLabs) | mp3 z `audio/<hash tekstu>.mp3`; brak → pusty dźwięk, web pokazuje tekst na timerze | prawdziwy, cały klip naraz, zapisany |
| Cel trasy (Google Places) | stała lista ok. 20 celów (`DEMO_DESTINATIONS`) | to samo |
| Planer | prawdziwy + cache 60 s na tę samą trasę (start zaokrąglony do ok. 100 m). Start do 100 m od 42 Warsaw = start spod drzwi (`VENUE_RADIUS_M`), więc cała sala dzieli jeden plan na ustawienia; takie trasy API przelicza w tle co ok. 45 s przez 15 min od ostatniego pytania (najnowsze 24), a trasę ze sceny (`DEMO_WARM_RIDES`: 30/60/90 min, profil `/demo?scenario=stage`) i `/v1/routes/demo` liczy od startu serwera | to samo |
| Limit `/v1/stories*` | 20 000 / 10 min na IP | 300 / 10 min |
| Baza, ZTM, OSRM | na żywo (baza z cache #112) | na żywo |

`/health` zwraca `demoMode`. Web: głos jest domyślnie włączony, `?voice=0` w adresie go wyłącza.

## Jak nagrać

```bash
railway run -- env DEMO_MODE=record PORT=8799 WALK_ROUTER_URL= WALK_ROUTER_FALLBACK_URL= \
  node --import tsx apps/api/src/index.ts           # sekrety z Railway, nie z pliku
API_URL=http://localhost:8799 PLAN_API_URL=https://api-production-d213.up.railway.app \
  pnpm --filter @sawa/api demo:record -- --within 15 --parallel 4 --text
```

Skrypt planuje ok. 400 tras z 42 Warsaw i z Kercelaka (15–120 min, 6 zestawów zainteresowań, pieszo i komunikacją, 3 profile słuchacza, „Do celu” do każdego celu z listy) i dla każdego miejsca woła `POST /v1/stories/audio`. Najpierw miejsca słyszane najwcześniej. `--within N` bierze tylko miejsca z pierwszych N minut jakiejś trasy, `--dry` tylko liczy. `PLAN_API_URL` planuje na produkcji (ma OSRM, więc te same miejsca co na pitchu), opowieści nagrywa lokalne API. 18.10, 9:40: 988 miejsc na wszystkich trasach; 2 min → 18, 5 min → 46, 10 min → 80, 15 min → 141, 30 min → 315. Nagrane 18.10, 10:10: tekst 143 opowieści (`--within 15`, ok. 0,35 $ OpenRouter), **bez głosu**: oba klucze ElevenLabs (Railway i `.env.local`) wyczerpane, a Paweł zdecydował „na razie tylko tekst”. W replay pierwsze 10 min każdej sprawdzonej trasy spod 42 Warsaw ma nagraną opowieść. Głos dograsz bez `--text`, gdy będzie klucz z kredytami: nagrane teksty nie kosztują nic, brakujące klipy się dograją (ok. 300 znaków na miejsce). `--text` woła `POST /v1/stories` i nie dotyka ElevenLabs. Research w sieci często wraca pusty („OpenRouter answered without content”), wtedy opowieść jest z faktów z bazy, nadal pisana przez LLM. Miejsc cichych (bez faktów) nie zapisujemy. Można też przeklikać trasę pitchu w aplikacji z API w `record`: zapisze się dokładnie to, co pokażemy. Potem commit `apps/api/data/demo/` i `DEMO_MODE=replay` na Railway. Nagrywać lokalnie: dysk Railway znika przy restarcie.

## Ograniczenia

- Każdy słyszy tę samą opowieść o miejscu (nie zależy od zainteresowań, stylu ani tego, co już słyszał). „Więcej o tym miejscu” powtarza tę samą.
- Długość opowieści nie dopasowuje się do `windowSec`; skrypt nagrywa z najdłuższym oknem z zaplanowanych tras.
- Miejsca spoza nagranych tras (dalej niż ok. 10 min jazdy od 42 Warsaw): tekst z faktów, bez głosu.
- Tryb dla dzieci i angielski: ta sama (dorosła, polska) opowieść.
- Planowanie to ok. 0,4 s CPU na trasę (jeden wątek Node); 100 różnych tras naraz to ok. 40 s kolejki. Cache pomaga tylko przy tych samych ustawieniach.
