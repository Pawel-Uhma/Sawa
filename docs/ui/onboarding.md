# Onboarding Sawy: analiza i projekt (R3, 17.10)

Cel z PRD: kilka sekund, bo onboarding przejdą widzowie na sali. Po nim od razu mapa.

## Co robią najlepsze onboardingi

| Aplikacja | Co działa | Co bierzemy |
|---|---|---|
| Duolingo | Maskotka prowadzi rozmowę w dymku; pytania o cel i poziom przed kontem; jedno pytanie na ekran; pasek postępu | Sawa mówi w dymku i komentuje wybory; pytanie o znajomość miasta; pasek 3 kroków |
| TikTok, Pinterest | Wybór zainteresowań z kafelków, po wyborze pojawiają się podobne | Kafelki z ikonami, etykieta „podobne” na kafelkach zamiast osobnej sekcji |
| Spotify | Wybór artystów: duże cele dotykowe, natychmiastowa reakcja | Kafelek reaguje przy naciśnięciu (scale 0.95), ikona „podskakuje” po zaznaczeniu |
| Headspace, Calm | Jedno spokojne pytanie, potem ekran „przygotowuję dla Ciebie” | Ekran „Układam Twoją Warszawę” z odhaczanymi liniami |
| Revolut, Monzo | Fintechowa maskotka i materiały 3D, mało tekstu, duży przycisk na dole | Glossy 3D Sawa i ikony w tym samym stylu (obraz 32) |
| Airbnb, Finch | Wartość przed rejestracją, personalizacja widoczna od razu | Bez logowania; na ekranie budowania widać, co wybrałeś |

Wzorce, które się powtarzają:

1. **Wartość przed wysiłkiem.** Pierwszy ekran mówi, co dostaniesz, i podaje koszt („3 pytania, ok. 15 sekund”).
2. **Jedno pytanie na ekran, tapnięcia zamiast pisania.** Wybór jednokrotny przechodzi dalej sam po 320 ms.
3. **Postać, która reaguje.** Dymek zmienia się po każdym wyborze („Dobry wybór! Może jeszcze architektura?”), więc odpowiedź ma widoczny skutek.
4. **Personalizacja na końcu jest widoczna.** Ekran budowania powtarza wybory, zanim pokaże mapę (efekt „wykonanej pracy”).
5. **Zawsze wyjście.** Wstecz na każdym pytaniu, „Pomiń” przy pytaniach opcjonalnych.

## Porównanie z poprzednią wersją

| Było | Jest |
|---|---|
| Ekran startowy z logo i jednym zdaniem | Powitanie z machającą Sawą, obietnica wartości i koszt w czasie |
| Tylko wybór zainteresowań z tekstowych pigułek | 3 pytania: znajomość miasta, zainteresowania (ikony 3D), styl opowieści |
| „Podobne” w osobnym pudełku pod listą | Koralowa etykieta „podobne” na kafelkach i podpowiedź w dymku Sawy |
| Przejście od razu na mapę | Ekran „Układam Twoją Warszawę” (ok. 2,5 s, można pominąć) |
| Animacje CSS (`.wejdz`) | Sprężyny `motion`, kierunkowe przejścia, przerywalne |

## Przepływ

| Krok | Sawa (poza, dymek) | Pytanie | Co użytkownik robi |
|---|---|---|---|
| 0. Powitanie | macha, „Cześć! Jestem Sawa, syrenka z herbu Warszawy.” | „Opowiem Ci o mieście za oknem tramwaju.” | „Poznajmy się” albo „Znam Sawę, przejdź do pytań” |
| 1. Imię | w sekrecie | Skąd moje imię? Wars + Sawa = Warszawa, legenda i herb | „Dalej” albo przesunięcie palcem |
| 2. Znajomość | z mapą | Jak dobrze znasz Warszawę? Pierwszy raz / Trochę znam / Mieszkam tu | 1 tapnięcie, przejście samo; „Pomiń” |
| 3. Co Ci da Sawa | radość, dymek odpowiada na wybór | Treść zależy od odpowiedzi z kroku 2 (`WHY` w `onboarding-intro.tsx`): pierwszy raz „Wsiadaj do tramwaju”, trochę znam „Reszta czeka za oknem”, mieszkam „Mieszkasz tu, ale znasz trzy miejsca?”, pominięte: wersja ogólna | „Jak to działa?” |
| 4. Jak to działa | z mapą | czas → przejazd ZTM → opowieść na głos; skąd dane i że tekst układa model | „Wybierzmy, o czym opowiem” |
| 5. Zainteresowania | myśli, dymek reaguje na kategorię | Co Cię ciekawi? 4 kategorie | 1–4 tapnięcia, „Dalej” |
| 6. Styl | mówi w sekrecie | Jak mam opowiadać? Krótko i z humorem / Z detalami / Same ciekawostki | 1 tapnięcie i od razu mapa; „Pomiń” |

Nic się nie wpisuje z klawiatury. Po stylu od razu mapa: udawany ekran „Układam Twoją Warszawę” usunięty (17.10, wieczór), bo trasę i tak liczy planer dopiero po „Wyznacz trasę”.

**Wstęp (17.10, wieczór):** aplikacja nie ma landing page'a, a jury zobaczy ją pierwszy raz, więc onboarding to rozmowa: kim jest Sawa, kim jesteś Ty, co Ci da, jak działa, a dopiero potem wybory do trasy. Ekran „co Ci da” mówi do konkretnej osoby, dlatego stoi po pytaniu o znajomość miasta. Kod w `components/onboarding-intro.tsx`. Strony bez pytań przewija się też palcem (`drag="x"`, próg 64 px albo rzut; bez przy reduced motion). „Znam Sawę, przejdź do pytań” na powitaniu pomija strony bez pytań. Onboarding idzie tylko przy pierwszym wejściu (albo po „Zacznij od nowa”). Zmiana zainteresowań, znajomości miasta i stylu idzie przez modal (`components/profile-modal.tsx`) z menu i z panelu tras (przycisk „Zmień”): zapisuje jedno pole i zostawia resztę profilu bez zmian. Wybory są we wspólnym `components/profile-choices.tsx`. Teksty o legendzie z [pitch](../pitch/sawa-pitch.html), problem z [PRD](../10-prd.md).

## Ruch (apple-design)

- Wszystkie przejścia to sprężyny bez odbicia (`SPRING` z `lib/device.ts`: bounce 0, 0.45 s). Przerywalne: szybkie klikanie „Wstecz” i „Dalej” nie blokuje UI (`AnimatePresence mode="popLayout"`).
- Kierunek: dalej wjeżdża z prawej, wstecz wraca tą samą drogą w lewo.
- Sawa przy przejściu z powitania na pytania zmniejsza się i przesuwa w róg (`layout`), poza zmienia się przenikaniem ze skalą 0.92 → 1.
- Dymek rośnie od ogonka (origin przy Sawie), bo to ona mówi.
- Reakcja na naciśnięciu, nie na puszczeniu (`whileTap` scale 0.95–0.97); zaznaczenie to sprężynujący znaczek i lekki obrót ikony; wibracja 8 ms (Android).
- Pasek postępu: segmenty wypełniają się sprężyną `scaleX`.
- `prefers-reduced-motion`: same przenikania, bez przesunięć i skali; spinner stoi. `prefers-reduced-transparency`: tło bez rozmycia.
- Fokus przechodzi na nagłówek nowego kroku (czytnik ekranu czyta pytanie), dymek ma `aria-live`.

## Układ

- Telefon: Sawa i dymek u góry, pytanie pod nimi, przycisk przy kciuku (przy zainteresowaniach przyklejony do dołu). 16 px marginesu.
- Desktop (od `md`): dwie kolumny, po lewej duża Sawa z dymkiem, po prawej pytanie. Ten sam komponent, inne klasy.
- Komponent to pełnoekranowa warstwa `fixed` z matowym szkłem nad mapą, więc mapa prześwituje i po onboardingu „wyjeżdża” spod spodu.

## Grafiki (fal.ai, 17.10)

Wszystkie w `apps/web/public/onboarding/` jako WebP z przezroczystym tłem (wycięte przez `fal-ai/birefnet/v2`).

| Plik | Model | Prompt (skrót) |
|---|---|---|
| `sawa-macha`, `sawa-mapa`, `sawa-mysli`, `sawa-sekret`, `sawa-radosc` | `google/nano-banana-2.1/edit`, obraz 32 jako referencja | „Using this exact character (…) new pose: [macha / trzyma mapę / myśli z palcem przy brodzie / słuchawki i sekret / radość z rękami w górze]. Full body, pure white background.” |
| 8 ikon zainteresowań (`war_uprising.webp` …) | `google/nano-banana-2.1/edit`, materiał i paleta z obrazu 32 | siatka 8 ikon: tarcza z mieczem, kamienica, koło zębate z kominem, kopuła, menora, kawa z rogalikiem, spray, popiersie z laurem |
| `tram`, `first_time`, `know_a_bit`, `local` | jw. | tramwaj, walizka, mapa z pinezką, dom z kluczem |

Koszt: 7 generacji nano-banana-2.1 (ok. 0,05–0,10 $ każda, szacunek) i 7 wycięć tła, razem ok. 0,40–0,80 $.

## Co odpowiedzi zmieniają (17.10, 16:30)

| Pytanie | Wpływ |
|---|---|
| Znajomość miasta | Dobór trasy w planerze (R1): pierwszy raz dostaje miejsca z największą liczbą faktów, mieszkaniec mniej znane. Pierwszy raz słyszy też raz na temat tło (Powstanie, getto, przemysłowa Warszawa) |
| Zainteresowania | 4 kategorie z danych: Historia, Kultura, Sport, Przyroda (decyzja R1 #25). Planer i opowieści znają tylko je, więc 8 kafelków z tagami było złudzeniem wyboru. Sport i przyroda mają po 1–2 fakty na miejsce, więc podpis mówi „krótko” |
| Styl opowieści | Odstęp między miejscami (R1) oraz ton i długość opowieści (ciekawostki do 40 słów) |

**Pamięć** (`lib/memory.ts`, localStorage): po wysłuchaniu połowy opowieści telefon zapisuje, które fakty padły. Następna opowieść o tym miejscu mówi to, czego jeszcze nie było, zaczynając od najważniejszych faktów, więc mieszkaniec Żoliborza na Ursynowie usłyszy najpierw podstawy. Miejsca opowiedziane do końca planer omija, więc z czasem trasy schodzą do mniej oczywistych. Profil też zostaje w telefonie: kto wraca, od razu widzi mapę. Menu Sawy ma wiersz „Co już Ci opowiedziałam” z zapominaniem, a „Zacznij od nowa” czyści profil i pamięć.

## Otwarte

- Pamięć jest na jednym urządzeniu. Konto albo synchronizacja to temat po hackathonie.
