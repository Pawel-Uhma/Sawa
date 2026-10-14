# Dziennik użycia AI

Regulamin (§4 ust. 4) pozwala używać narzędzi AI, jeśli zespół opisze w dokumentacji, w jakim zakresie z nich korzystał. Ten plik jest tym opisem.

Jak powstaje:
- Każdy prompt wysłany do Claude Code w tym repo dopisuje się sam (hook `UserPromptSubmit` w `.claude/hooks/log-prompt.sh`).
- Pod promptem Claude dopisuje krótko, co zrobił: jakie pliki zmienił i co wygenerował (instrukcja w `CLAUDE.md`).
- Jeśli używacie AI poza Claude Code (ChatGPT, Copilot, generator grafik), dopiszcie to ręcznie w sekcji „Inne narzędzia”.

Podsumowanie dla jury (do uzupełnienia na koniec hackathonu):
- Narzędzia: Claude Code (Claude Opus 5.5)
- Do czego: analiza regulaminu i danych, planowanie, generowanie kodu
- Co zespół robił sam: _uzupełnić_

## Inne narzędzia

_brak_

## Przygotowanie przed wydarzeniem (bez kodu aplikacji)

### 2026-09-26 · Paweł

> Wezme udzial z 3 kolegami w hackathonie : https://42warsaw.pl/pl/hackathon-otwarte-dane-warszawa/ , myslimy ktore wyzwanie wybrac , przeanalizuj mozliwosci

**AI:** Przeczytało stronę wydarzenia i regulamin (PDF) i pobrało katalog 19 zbiorów z dane.um.warszawa.pl. Porównało trzy wyzwania pod kątem kryteriów oceny. Rekomendacja: wyzwanie 2 jako pierwszy wybór, wyzwanie 3 jako drugi.

### 2026-09-26 · Paweł

> zrob tu folder docs/ gdzie bedzie dokumentacja ai i bedzie updatowane po kazdym prompcie i podstawowy szkielet aplikacji , zapisz to co zaproponowales

**AI:** Zapytało o szkielet, bo regulamin (§4 ust. 3) zabrania kodu przygotowanego przed wydarzeniem. Zespół wybrał: tylko dokumentacja i plan, stack Next.js + TypeScript. Utworzone: `docs/` (regulamin, analiza wyzwań, katalog danych z przykładami wywołań API w `docs/api/`, pomysły, plan architektury, plan dnia), `CLAUDE.md` oraz hook logujący prompty.

### 2026-10-13 11:24 · Pawel

> Nie, nie, nie, nie, nie. Po pierwsze, nie w artifactcie. Po drugie, obrzydliwa prezentacja. Mm, i najpierw nie chcę, żebyś robił jeszcze prezentacji. Usuń to. Najpierw ogarniemy styl awataru tej syrenki.


**AI:** Usunęło szkic prezentacji (artifact), bo Paweł go odrzucił; prezentację robimy później i nie jako artifact. Wcześniejszy prompt (pitch Sawy, repo jako „mózg” dla agentów, git bez konfliktów) nie zapisał się w logu; repo i git nie są jeszcze ustawione. Następny krok: styl awatara Sawy.

**AI:** Wygenerowało 10 szkiców awatara Sawy na fal.ai (10 modeli, 10 promptów). Kierunek: 3D, słodka, fintechowa, charakter „rówieśniczka”. Pliki, zestawienie i prompty są w `docs/awatar/`. To szkice do dyskusji, właściwy awatar powstanie 17.10.

### 2026-10-13 11:38 · Pawel

> ma byc ja cala widac , mniej ludzko bardziej jak meta muse : [Image #1]. zrob jeszcze 5 ale uzyj juz tych lepszych modeli, na teraz najlepsze prompty to 01 04 06 ale zaden nie jest dobry


**AI:** Runda 2 awatara: 5 szkiców (Nano Banana 2.1, GPT Image 2, Flux 3, Seedream 5 Pro, Meta Muse). Sawa jest widoczna w całości, nie jest ludzka i przypomina puchatą maskotkę z referencji. Pliki 11–15 i zestawienie są w `docs/awatar/szkice/`, opis w `docs/awatar/README.md`.

### 2026-10-13 11:44 · Pawel

> 12 , ale zeby wygladala jak czlowiek i bez bluzy, taki cute glossy wyglada jak realna syrena ale fintech style , nie taka bezosobowa przytulana jak muse. Tlo biale skupiamy sie tylko na charakterze, testujemy prompty na nanobanana lite (daj 5) i pozniej jak prompt bedzie spoko to potestujemy inne modele


**AI:** Runda 3 awatara: 5 promptów na `nano-banana-2-lite` (Sawa jak prawdziwa syrena, glossy, fintech, białe tło). Pliki 16–20 i zestawienie są w `docs/awatar/szkice/`, pełne prompty w `docs/awatar/README.md`.

### 2026-10-13 11:46 · Pawel

> 18 najlepszy ale kolejne 5 wariacji wygladu. przy okazji policz mi ile to wszystko kosztowalo


**AI:** Runda 4 awatara: 5 wariacji wyglądu na bazie 18 (`nano-banana-2-lite`, pliki 21–25). Szacunek kosztu całej eksploracji (25 obrazów) to ok. 0,90–1,70 USD; tabela jest w `docs/awatar/README.md`, a dokładna kwota w panelu fal.ai.

### 2026-10-13 11:48 · Pawel

> pdoba mi sie 18 ale bardziej chodzi o zmiane wyrazu twarzy/ rysy , taki bardziej charakter w srodku, daj jeden na sprobowanie z blond wlosami


**AI:** Runda 5 awatara: 1 test (`26-lite-blond-charakter.png`) to Sawa z 18 z blond włosami i nowym opisem twarzy (ciepła, ciekawa, bystra zamiast zadziornej). Prompt jest w `docs/awatar/README.md`.

### 2026-10-13 11:49 · Pawel

> wracamy do zielonych 5 wariacji 18 ale tylko inny charakter w srodku -rysy twarzy itd


**AI:** Runda 6 awatara: wygląd 18 bez zmian, 5 różnych charakterów w rysach twarzy (pliki 27–31). Opis jest w `docs/awatar/README.md`.

### 2026-10-13 11:51 · Pawel

> daj 31 , ten sam prompt ale 3 inne modele (te lepsze ale max 0.3$ za zdjecie)


**AI:** Runda 7 awatara: prompt 31 puszczony na Nano Banana 2.1, GPT Image 2 (medium) i Seedream 5 Pro (pliki 32–34, porównanie w `00-zestawienie-runda7.jpg`).

### 2026-10-13 11:54 · Pawel

> Na razie idziemy w 32, dobierz do tej postaci primary i secondary font i palete 2/3 koloroow, na tej podstawie przygotuj pitch prezentacje w pdf dla mojej druzyny. Layout ma byc wzorowany /apple-design. przedstaw tez wszystkie wygenerowane obrazki z 6-10 na slajd


**AI:** Wybrany awatar to 32. Z niego paleta (Głębia #17706F, Mięta #8ED1B5, Koral #F2755F) i fonty (Plus Jakarta Sans + Inter). Powstał 16-slajdowy pitch w stylu Apple: `docs/pitch/sawa-pitch.pdf` (źródło `sawa-pitch.html`, zmniejszone obrazy w `docs/pitch/img/`), w tym 4 slajdy z galerią wszystkich 34 szkiców.

### 2026-10-13 12:02 · Pawel

> super, ale nie podoba mi sie logo, i do konca styl prezenetacji . daj mi 5 propozycji logo - moze miec inna czcionke, fajnie jakby byla troche taka playfull, tez slajdy moga miec jasne tlo i troche bardziej playful czcionke czasami


### 2026-10-13 12:02 · Pawel

> super, ale nie podoba mi sie logo, i do konca styl prezenetacji . daj mi 5 propozycji logo - moze miec inna czcionke, fajnie jakby byla troche taka playfull, tez slajdy moga miec jasne tlo i troche bardziej playful czcionke czasami. dorzuc tez slajd o tym czym jest sawa - jest to syrena z legendy o powstaniu warszawy


### 2026-10-13 12:03 · Pawel

> ile kosztuje nanobanaana2.1 zdjecie


**AI:** Odpowiedź z cennika fal.ai: Nano Banana 2.1 kosztuje ok. $0,04 za zdjęcie 1K, $0,059 za 2K i $0,134 za 4K (rozliczenie tokenowe). Pliki projektu bez zmian.

**AI:** Pitch przerobiony: jasne tła, Fredoka jako font playful (zamiast Inter, baza zostaje Plus Jakarta Sans), nowy slajd 2 o legendzie (Wars i Sawa, herb, pomnik Nitschowej), slajd z 5 propozycjami logo (Fredoka, Baloo 2, Shrikhand, Gluten, Bagel Fat One) i ikonami aplikacji. Arkusz logo jest też w `docs/awatar/logo-propozycje.png`. PDF: `docs/pitch/sawa-pitch.pdf` (18 slajdów).

### 2026-10-13 12:07 · Pawel

> podoba mi sie to co teraz dales z logo : [Image #2] tylko ta czcionka nie ma poskiego znaku a z kreska wiec chyba nie moze byc uzywane jako primary tylko logo. Daj do aplikacji tez jak to wyglada jako ikona aplikacji i to bedzie glowa sawy


### 2026-10-13 12:09 · Pawel

> mozesz tez dodac taki fake screen z app stora jak ta apka by tam wygladala


### 2026-10-13 12:10 · Pawel

> Tez w prezentacji jest czesto ten naglowek jak : Warszawa rok 2076 ktorego czesto nie widac , wiec wydaje mi sie ze albo dajemy go wiekszego alebo dajemy tam cos to nie musi byc czytane bo np jak ktos tego nie przeczyta to pozniej nie wie o co chodzi: "miasto jak nowy jork, pelne ludzi.."


**AI:** Logo „sawa.” (Fredoka, koralowa kropka) zatwierdzone. Ikona aplikacji (głowa Sawy) wygenerowana przez nano-banana-2.1/edit z awatara 32. Dodane slajdy: logo i ikona na ekranie telefonu oraz makieta strony w sklepie z aplikacjami. Etykiety nad nagłówkami są większe (Fredoka 38 px, koral), a nagłówek o 2076 jest teraz zrozumiały bez etykiety. Sprawdzone: Fredoka ma polskie znaki. PDF ma 20 slajdów.

### 2026-10-13 12:12 · Pawel

> dalej ta czcionka nie ma polskich znakow " s z kreska, a z kreska itd" wiec oprocz logo musisz ja chyba zastapic tym plus jakarta sans. tez nie podoba misie ikona aplikacji, fajna byla ta z jasnym tlem i duzy zoom na glowe


**AI:** Fredoka zostaje tylko w logo „sawa.”, cała reszta prezentacji jest w Plus Jakarta Sans. Ikona aplikacji to teraz duże zbliżenie na głowę z obrazu 32 na jasnym tle (`docs/awatar/ikona/ikona-32-zoom.png`). Wersja z miętowym tłem odrzucona. PDF przerenderowany.

### 2026-10-13 12:14 · Pawel

> Dobra. Też chciałbym, żebyś na No Banana Light z tą syrenką, którą wybraliśmy, dał z pięć grafik do środka prezentacji, tak żeby było to fajne. Daj je w miejscach, które uważasz, ale tak, żeby ta postać też pokazywała w tej prezentacji różne rzeczy. Wybierz, które i jakie miejsca, ale razem z syrenką raczej albo z jakąś jej częścią.


**AI:** 5 scen z Sawą na `nano-banana-2-lite` (herb, wyglądanie z dołu, lupa i mapa, laptop na hackathonie, lista z kciukiem). Wstawione na slajdy 2, 3, 6, 8 i 20. Pliki są w `docs/awatar/sceny/`, a w `docs/pitch/img/scena-*.jpg` wersje przycięte i z wybielonym tłem. PDF przerenderowany.

### 2026-10-13 12:20 · Pawel

> [Image #3] w prezentacji zauwazylem ze czesto dalej taki background ktory sie naklada na siebie i jest prostokatny i to zle wyglada. Druga rzecz jest taka ze chodzilo mi bardziej o ikony ktore faktycznie cos pokazuja , czyli np warszawa 2076 to syrenka ktora patrzy na roj nowoczesny wiezowcow wokol palacu kultury , kazda rola ma swoja syrene, terazniejszosc i przeszlosc ma swoja syrene itd itp


**AI:** Naprawione szare prostokąty w PDF: usunięte mix-blend-mode, cienie i backdrop-filter, postacie wycięte do przezroczystych PNG. Dodanych 6 scen tematycznych z Sawą (2076 z wieżowcami wokół PKiN, trzy role, teraźniejszość z tramwajem, przeszłość z księgą). PDF zweryfikowany przez rasteryzację stron (PyMuPDF).

### 2026-10-14 19:13 · Pawel

> jakie dane sa dostepne z open data hackathon


**AI:** Odpowiedź z `docs/03-dane.md`: portal dane.um.warszawa.pl ma 19 zbiorów (transport ZTM, parkingi, utrudnienia, powietrze, pogoda, odpady, AED, boiska, zajęcia sportowe, wydarzenia, konsultacje, ceny nieruchomości). Bez zmian w plikach.

### 2026-10-14 19:24 · Pawel

> masz 5 min , wymysl pomysly problemow z jakimi moga mierzyc sie warszawiacy za 50lat


**AI:** Burza mózgów: 10 problemów Warszawy w 2076 (upały, starzenie, susza, ulewy, energia, parkingi, mieszkania, samotność, powietrze, partycypacja), każdy z dopasowanym zbiorem z portalu. Bez zmian w dokumentach, czeka na wybór zespołu.

### 2026-10-14 19:55 · Pawel

> podsumuj nasz brainstorm: 
> 
> [wklejony transkrypt środowego spotkania zespołu (14.10), pominięty w logu; podsumowanie w `docs/07-brainstorm-problemy.md`]


**AI:** Podsumowanie brainstormu z transkryptu: 21 problemów w grupach, inspiracje z maila, propozycja Sawy, kwestie otwarte i zadania. Zapisane w `docs/07-brainstorm-problemy.md`, link dodany w `docs/README.md`.

### 2026-10-14 19:57 · Pawel

> podsumuj nasz brainstorm: jest to czesc transkryptu ze spotkaina srodowego, nie uzywaj skilla do podsumowywania spotkan - on jest do spotkan teams . 
> 
> [wklejony transkrypt środowego spotkania zespołu (14.10), pominięty w logu; podsumowanie w `docs/07-brainstorm-problemy.md`]


**AI:** Podsumowanie środowego brainstormu (14.10) zapisane w `docs/07-brainstorm-problemy.md`: pomysł Sawy z uwagami zespołu, wątek rynku pracy juniorów, inspiracje z maila organizatorów i tabela 21 problemów z oznaczeniem, czy są do nich dane w portalu. Link był już w `docs/README.md`.

### 2026-10-14 20:14 · Pawel

> znajdz badania na temat warszawy z ostatnich 6 lat, czy widac w nich jakies tendencje ktore kieruja w jakiejs problemy


**AI:** Przegląd badań o Warszawie z lat 2020–2026 (diagnoza demograficzna miasta, Barometr Warszawski 2025, Warszawskie Badanie Ruchu 2025, PIE, CBOS, GUS) zapisany w `docs/08-badania-trendy.md` i dodany do `docs/README.md`. Najmocniejsze trendy z prognozą do 2060: starzenie, migracja i upały. Do tego rozlewanie się miasta, przewaga auta i ceny mieszkań.

### 2026-10-14 20:45 · Pawel

> napisz krotkiego maila do organiatora czy jednak mozemy zmienic wyzwanie z 1 na 2, zrob odrazu draft w gmailu


**AI:** Draft maila w Gmailu do hackathon@42warsaw.pl (odpowiedź w wątku „Potwierdzenie udziału”) z pytaniem o zmianę wyzwania z 1. „Warszawa 2076” na 2. „Złap oddech!”. Nie wysłany.

### 2026-10-14 20:50 · Pawel

> jeszcze raz jakie sa dane


**AI:** Ponowna lista 19 zbiorów z `docs/03-dane.md`, pogrupowana pod kątem wyzwania 2. Bez zmian w plikach.

### 2026-10-14 21:43 · Pawel

> zrob repo git publiczne


**AI:** Utworzone publiczne repo https://github.com/Pawel-Uhma/sawa (gałąź main, sama dokumentacja, bez kodu aplikacji). Przed publikacją dwa surowe transkrypty spotkania w `docs/ai-log.md` zastąpione krótką notatką, a do `.gitignore` dodany `.DS_Store`. Sekretów w repo nie ma, `.env*.local` jest ignorowany.
