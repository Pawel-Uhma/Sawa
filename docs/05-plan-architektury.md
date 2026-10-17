# Plan architektury

> **17.10, 11:45: częściowo nieaktualne.** Backend przeniesiony z route handlers Next.js do osobnej usługi Hono na Railway, kod w monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`). Aktualny stack, struktura i komendy startowe: [12-plan-mvp.md](12-plan-mvp.md). Zasady kodu: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md). Ten plik zostaje dla TTL cache i otwartych pytań.
>
> **Ten plik to plan, nie kod.** Zgodnie z regulaminem (§4 ust. 3) cały kod powstaje od 17.10, 11:00. Komendy poniżej odpalamy dopiero wtedy.

## Stack

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Aplikacja | **Next.js (App Router) + TypeScript** | Frontend i backend w jednym repo, jeden `npm run dev` |
| UI | Tailwind CSS + shadcn/ui | Szybko wygląda porządnie |
| Mapa | **Mapbox GL** (`react-map-gl`) z własnym stylem Mapbox | Decyzja 17.10 (R3): własny styl, nie wygląd Google Maps. Token Mapbox w `.env.local`, nigdy w repo |
| Backend | **Railway** (osobny serwis, płatne konto członka zespołu) | Proxy do API miasta, token tylko na serwerze, cache, LLM; bez limitów czasu funkcji Vercela, może pytać API co 10 s. Ustalone 17.10 |
| LLM | Bielik (polski model), zapasowo Claude | Plus u jurorki z Bielik.AI. **Przed wydarzeniem sprawdzić, gdzie jest hostowane API Bielika i jaki ma limit** |
| Baza miejsc | Supabase (darmowy plan, konto zespołu) | Miejsca ze współrzędnymi z Wikipedii, `historia/` i Google Places; ustalone 17.10 |
| Głos | TTS do wyboru (ElevenLabs lub open source) | Po MVP; sprawdzić jakość polskiego |
| Deploy | Frontend na Vercel, backend na Railway | Link na pitchu pod darmową subdomeną `*.vercel.app`, bez kupowania domeny (ustalone 17.10) |

## Przepływ danych

```
przeglądarka ──► /api/<zasób> (backend na Railway) ──► dane.um.warszawa.pl/api/action/<endpoint>
                     │                                   (nagłówek Authorization: token)
                     └── cache w pamięci, TTL = częstotliwość odświeżania zbioru
                         (pojazdy 10 s, parkingi 1 min, powietrze i pogoda 10 min, reszta 1 h)

przeglądarka ──► /api/chat ──► LLM (Bielik) z narzędziami: szukaj_wydarzen, pogoda, odjazdy ...
```

## Planowana struktura (tworzymy 17.10)

> **Zmiana 17.10:** backend (proxy `waw`, `chat`) idzie jako osobny serwis na Railway, nie jako route handlery na Vercelu. Struktura poniżej jest do przepisania, gdy R1 + R4 wybiorą framework serwisu.

```
app/
  page.tsx                 # mapa + panel planera
  api/
    waw/[zasob]/route.ts   # jeden proxy do wszystkich zbiorów: mapowanie nazwa → endpoint
    chat/route.ts          # rozmowa z LLM
lib/
  waw-client.ts            # fetch do dane.um.warszawa.pl + cache
  types.ts                 # typy odpowiedzi (z przykładów w docs/api/)
components/
  Map.tsx
  PlanCard.tsx
docs/                      # to, co jest teraz
.env.local                 # WAW_TOKEN=..., LLM_API_KEY=... (w .gitignore!)
```

## Komendy startowe (17.10, 11:00)

```bash
npx create-next-app@latest app --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"
cd app
npx shadcn@latest init
npm i mapbox-gl react-map-gl
git init && gh repo create <nazwa-zespolu> --public --source=. --push
```

Potem kopiujemy `docs/` i `CLAUDE.md` do repo. Pierwszy commit to czysta instalacja z generatora.

## Kolejność budowy (minimalna wersja najpierw)

1. Proxy `/api/waw/[zasob]` + jeden zbiór na mapie, działa end to end (do 13:00)
2. Pozostałe zbiory pomysłu na mapie (do 17:00)
3. Logika planera: filtr po czasie, odległości, pogodzie (do 22:00)
4. LLM i dopracowanie UI (w nocy)
5. Deploy, zamrożenie zmian o 9:00, potem już tylko pitch

## Otwarte pytania

- [x] Backend: Railway (17.10). Do ustalenia: framework serwisu i jak frontend go woła (CORS, URL w env)
- [ ] Zasady pracy z repo: gałęzie, PR, kto merge'uje (może agent na GitHubie)

- [ ] API Bielika: gdzie, jak szybkie, jakie limity? Zapasowy LLM?
- [ ] Czy API miasta ma limity zapytań na token? Każdy z nas ma własny token
- [ ] Google Places: każdy zakłada własny klucz (1000 darmowych zapytań), cache w Supabase. Czy wystarczy Wikipedia?
- [ ] Toalety: brak zbioru w portalu, sprawdzić OSM
- [ ] Jak z rozkładu i pozycji pojazdów przewidzieć, jakie miejsca będą za oknem za X sekund
- [ ] Które zbiory zwracają współrzędne (wydarzenia? zajęcia sportowe?). Sprawdzić w `docs/api/`
