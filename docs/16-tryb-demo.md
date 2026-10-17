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
| Planer | prawdziwy + cache 60 s na tę samą trasę (start zaokrąglony do ok. 100 m) | to samo |
| Limit `/v1/stories*` | 20 000 / 10 min na IP | 300 / 10 min |
| Baza, ZTM, OSRM | na żywo (baza z cache #112) | na żywo |

`/health` zwraca `demoMode`. Web: `NEXT_PUBLIC_VOICE=1` na Vercelu włącza głos domyślnie (`?voice=0` wyłącza), ma sens tylko przy `replay`.

## Jak nagrać

```bash
DEMO_MODE=record pnpm --filter @sawa/api dev
pnpm --filter @sawa/api demo:record -- --max 40
```

Skrypt planuje trasy z 42 Warsaw i z Kercelaka (15/30/60 min, trzy zestawy zainteresowań) i dla każdego miejsca woła `POST /v1/stories/audio`. Można też przeklikać trasę pitchu w aplikacji z API w `record`: zapisze się dokładnie to, co pokażemy. Potem commit `apps/api/data/demo/` i `DEMO_MODE=replay` na Railway. Nagrywać lokalnie: dysk Railway znika przy restarcie.

## Ograniczenia

- Każdy słyszy tę samą opowieść o miejscu (nie zależy od zainteresowań, stylu ani tego, co już słyszał). „Więcej o tym miejscu” powtarza tę samą.
- Długość opowieści nie dopasowuje się do `windowSec`; skrypt nagrywa z najdłuższym oknem z zaplanowanych tras.
- Miejsca spoza nagranych tras: tekst z faktów, bez głosu.
- Tryb dla dzieci i angielski: ta sama (dorosła, polska) opowieść.
- Planowanie to ok. 0,4 s CPU na trasę (jeden wątek Node); 100 różnych tras naraz to ok. 40 s kolejki. Cache pomaga tylko przy tych samych ustawieniach.
