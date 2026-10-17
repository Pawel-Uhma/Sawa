# Plan pitchu Sawy (5 min + 2 min pytań)

Wersja 1, 17.10.2026, w nocy. Paweł z agentem: research taktyk z artykułów, potem dwie rundy narady „rady” (sześć agentów wcielonych w Steve'a Jobsa, Nancy Duarte, Setha Godina, Orena Klaffa, Jony'ego Ive'a i Guya Kawasakiego). To jest plan, nie deck. Właściciel pitchu: R2 (T-50, T-114). Kto mówi, rozstrzyga zespół.

## 1. Rdzeń

| Co | Zdanie | Gdzie pada |
|---|---|---|
| Definicja (pierwsze 30 s) | „Sawa mówi Ci, co jest za oknem.” | otwarcie |
| Mantra | **„Za oknem jest historia. Sawa ją opowiada.”** | 3 razy: otwarcie, po demo, koniec |
| Puenta 2076 | „Warszawiakiem się nie rodzisz. Warszawiakiem się dojeżdżasz.” | raz, slajd 2076 |
| Na korytarz | „Ta syrenka, co wie, co masz za oknem tramwaju.” | nie mówimy, to ma powiedzieć jury |

**Bohaterka:** Ola, 29 lat, przyjechała z Kielc za pracą 14 miesięcy temu. Codziennie jeździ tramwajem w słuchawkach i zna dom, biuro i siłownię. Kiedy przyjeżdżają rodzice, nie umie im nic opowiedzieć o mieście. To ona niesie cały pitch: otwiera go, jedzie w filmie i domyka 2076. **Nie Olena:** aplikacja mówi po polsku i nie może wyglądać na produkt tylko dla cudzoziemców. Wersja ukraińska pojawia się jednym zdaniem jako następny krok. Sawa nie jest bohaterką, tylko mentorką i głosem: na ekranie widać ją najwyżej dwa razy.

**Różnica jednym zdaniem** (do Q&A, na scenie bez atakowania innych): „Przewodnik oprowadza turystę po trasie, którą ktoś wymyślił. Sawa jedzie z Tobą Twoim tramwajem, dziś, i wie, co za minutę będzie za oknem. Turysta jest tu dwa dni, Ola dwadzieścia lat.”

## 2. Na czym to stoi (research)

Źródła: YC Demo Day, AngelHack, HackerEarth, MLH, notatki jurora z dev.to, Devpost, Devfolio, materiały civic tech (Programujmy Miasta, Alameda, Waterloo).

- Jury wyrabia sobie zdanie w ok. 30 s, więc pierwsze zdanie mówi, co to jest i dla kogo.
- Trzeba mieć jedno zdanie-tożsamość. Projekty bez centrum przegrywają w naradzie jury.
- Problem dostaje 30–45 s i jedną konkretną osobę, a demo ok. połowę czasu: jedna ścieżka i jeden moment „wow”, bez wycieczki po funkcjach.
- Ścieżka demo jest ustalona na sztywno: stałe wejście, rozgrzane odpowiedzi LLM i TTS, hotspot, zapis offline, próba AV.
- Slajdów 4–7, na każdym jedna myśl.
- Mówimy o tym, czego nie widać: które zbiory połączyliśmy i po co.
- Wdrożenie to konkretny pilotaż z właścicielem po stronie miasta, bez nadmuchanych prognoz.
- Mówi jedna osoba, druga klika, mikrofon nie krąży po zespole.
- Za co jury obcina punkty: produkt pojawia się dopiero po minucie, mówienie o funkcji, której nie ma, zmyślone liczby, opowieść o stacku i o problemach z hackathonu, przekroczony czas.
- Jury z sektora publicznego ceni korzyść dla mieszkańców, dostępność, RODO i informację zwrotną o jakości zbiorów („w zbiorze X brakuje Y”).

## 3. Rozstrzygnięcia rady

| Spór | Decyzja | Głosy |
|---|---|---|
| Otwarcie | 8 s samego dźwięku na czerni, potem Ola | 6:0 |
| Demo | film z prawdziwego tramwaju (dowód) + ok. 70 s na żywo w `/demo` (potwierdzenie) + nagranie ekranu 1:1 jako cichy zapas | 6:0, Jobs chce dłuższe live, Kawasaki krótsze |
| Film | 45 s, kluczowe ujęcie bez cięcia, w którym ostrość przechodzi z ekranu telefonu na szybę | 6:0 |
| Mówcy | **2 + głos Sawy**: narrator mówi, demo prowadzi druga osoba, która odzywa się dwa razy. Reszta zespołu na Q&A w pierwszym rzędzie | 4:2 (Jobs i Ive: jeden mówca) |
| Moment, który jury zapamięta | Remis 3:3 (tramwaj obok 42 Warsaw kontra ujęcie z ostrością). **Synteza:** ujęcie z ostrością to pewny szczyt w filmie, a demo na żywo startuje z tej sali, więc pierwsza opowieść Sawy dotyczy Kercelaka, 150 m stąd. Sala dowiaduje się czegoś o miejscu, w którym siedzi, a opowieść jest w cache, więc nie zależy od API | — |
| 2076 | czarne tło, oś czasu samą typografią, bez renderu i maskotki | 6:0 po rundzie 2 |
| Zakończenie | zaproszenie do pilotażu zamiast żądania: bez „wybór należy do Pani”, linię wybiera miasto | 6:0 |
| Ostatnie słowo | Remis 3:3. **Decyzja:** człowiek mówi mantrę, a potem 2 s głosu Sawy („Do zobaczenia w tramwaju.”) i logo. Głos Sawy otwiera i zamyka pitch jak klamra | — |
| Fakty | nazwa modelu nie pada na scenie; ankieta tylko prawdziwa; koszty tylko w Q&A jako szacunek | 6:0 |

## 4. Scenariusz minuta po minucie (300 s)

**N** = narrator, **D** = osoba prowadząca demo (telefon z kopią obrazu na projektor), **S** = głos Sawy z nagłośnienia sali.

| Czas | Ekran | Kto i co mówi | Kryterium |
|---|---|---|---|
| 0:00–0:08 | czerń | S (nagranie z apki): szum tramwaju, dzwonek, potem Sawa: „Spójrz w prawo. Tam, gdzie dziś jest rondo, stał największy bazar przedwojennej Warszawy, a…” (urwane) | prezentacja |
| 0:08–0:35 | zdjęcie: szyba tramwaju, za nią Wola | N: „To była Sawa. **Sawa mówi Ci, co jest za oknem.** Zrobiliśmy ją dla Oli. Ola przyjechała z Kielc za pracą 14 miesięcy temu. Codziennie jedzie tramwajem do biura i mija kilkadziesiąt miejsc, w których wydarzyła się historia tego miasta. Nie zna żadnego. **Za oknem jest historia. Sawa ją opowiada.**” | realia |
| 0:35–0:55 | dwa slajdy, na każdym jedna liczba: „co piąty” i „390 tys.” | N: „Takich jak Ola jest coraz więcej. Według prognozy miasta w 2060 roku co piąty mieszkaniec będzie imigrantem albo dzieckiem imigranta. Codziennie 390 tysięcy osób dojeżdża tu do pracy spoza Warszawy. Diagnoza miasta pisze wprost o potrzebie »szeroko zakrojonych działań integracyjnych«. Pokażemy jedno takie działanie. Dzieje się samo, w tramwaju.” | realia, 2076 |
| 0:55–1:40 | **film, 45 s** (scenariusz w §5) | bez słów na żywo | innowacyjność |
| 1:40–2:50 | ekran telefonu na czarnym tle, ok. 85% wysokości (mirroring, bez ramki) | **Demo na żywo, `/demo`, start w 42 Warsaw.** D: profil „pierwszy raz w Warszawie” i „historia” (3 dotknięcia, 10 s), cel np. Plac Zamkowy. Suwak 15 → 45 min: najszybsza trasa wydłuża się na oczach jury w trasę krajoznawczą do tego samego celu. „Generuj”, potem tryb „Na żywo”: na mapie płynie tramwaj, a S opowiada o Kercelaku i słowa transkryptu ciemnieją w rytm głosu. D (jedyne dwa zdania): „Trasę policzył przed chwilą rozkład ZTM.” Potem: „Kercelak był 150 metrów od tej sali.” **3 s ciszy.** N: „Jutro Sawa tego nie powtórzy. Opowie Oli następny kawałek miasta.” | innowacyjność, dane |
| 2:50–3:25 | ciemna mapa Woli, warstwy wchodzą na kliknięcie: przystanki ZTM → rozkład → pojazdy na żywo (nagrany ruch) → 3700 miejsc → linia trasy | N: „Osobno każdy z tych zbiorów jest nudny. Pozycje pojazdów i przystanki z danych miasta mówią, gdzie jesteś. Rozkład mówi, kiedy dojedziesz. Prawie cztery tysiące miejsc z historią mówi, co tam się wydarzyło. Razem Sawa wie, **co i kiedy** będzie za oknem, i dobiera długość opowieści do czasu dojazdu do następnego miejsca, także w korku.” Nazwy zbiorów małym drukiem w stopce slajdu. | dane |
| 3:25–4:05 | czerń, trzy wiersze wchodzą po kolei: „2026 · Ola, rok w Warszawie” / „2060 · co piąty z nas przyjechał” / „2076 · Ola opowiada wnuczce, co jest za oknem” | N: „W 2076 roku tożsamość tego miasta zbudują ludzie, którzy się tu nie urodzili. Pytanie brzmi, czy będą tu tylko pracować, czy będą tu należeć. Ola będzie miała wtedy osiemdziesiąt lat i to ona będzie opowiadać wnuczce, co jest za oknem. Już nie jako przyjezdna, tylko jako ta, która zna to miasto.” Pauza. Slajd: **„Warszawiakiem się nie rodzisz. Warszawiakiem się dojeżdżasz.”** | 2076, realia |
| 4:05–4:45 | jeden slajd: „Pilotaż: 1 linia · 3 miesiące · 1 pytanie” | N: „Miasto ma już ekrany w tramwajach i aplikację 19115. Brakuje im głosu. Nie potrzeba instalacji ani konta, wystarczy link i kod QR w wagonie. Każdą opowieść generujemy raz, potem korzystają z niej wszyscy, więc koszt na pasażera to grosze. Proponujemy jedną linię na trzy miesiące, z linią wybraną przez miasto. Przed pilotażem i po nim zadajemy nowym mieszkańcom jedno pytanie: czy czujesz się stąd. Następne kroki to wersja ukraińska i angielska oraz polski model językowy.” | wdrożenie |
| 4:45–5:00 | czerń, potem logo „sawa.” | N: „Wszystko, co widzieliście, powstało od wczoraj, od jedenastej, na danych miasta. **Za oknem jest historia. Sawa ją opowiada.**” S (2 s): „Do zobaczenia w tramwaju.” Cisza. | prezentacja |

Czas na kryteria: innowacyjność ok. 115 s (film i demo), dane ok. 70 s (demo i warstwy), realia ok. 60 s, 2076 ok. 40 s, wdrożenie 40 s. Za prezentację odpowiada cały występ.

**Czego nie pokazujemy:** listy funkcji (ciemny motyw, gesty, PWA), onboardingu krok po kroku, nazw stacku i modeli (MapLibre, Hono, OpenRouter, Gemini, ElevenLabs), diagramu architektury, slajdu z zespołem, konkurencji, renderów 2076, słowa „metro”, przeprosin za niedospanie i błędy, liczby z ankiety, której nie było.

## 5. Film (45 s, w 0:55)

**Po co:** to dowód, że Sawa działa w prawdziwym mieście, czego scena nie pokaże. Służy też jako zapas, gdyby demo na żywo padło. Bez muzyki („muzyka by tu kłamała”).

| # | Czas | Kadr | Dźwięk | Napis |
|---|---|---|---|---|
| 1 | 0–5 s | czerń | dzwonek tramwaju, syk drzwi | „Ola. 14 miesięcy w Warszawie.” |
| 2 | 5–12 s | statyczny kadr z wagonu: szyba, za nią al. Solidarności w porannym świetle, Ola w słuchawkach, obojętna | cichy szum tramwaju | — |
| 3 | 12–18 s | zbliżenie: kciuk przesuwa suwak na „40 min” i stuka „Generuj”; ostrość na ekranie, szyba rozmyta | kliknięcia UI | — |
| 4 | 18–35 s | **jedno ujęcie bez cięcia**: telefon na pierwszym planie, słowa transkryptu ciemnieją, Sawa opowiada o miejscu za oknem (Kercelak albo Hala Mirowska). W chwili, gdy miejsce wjeżdża w kadr, ostrość przechodzi z ekranu na szybę | głos Sawy (czysty plik z aplikacji, podłożony w montażu) i cichy szum | — |
| 5 | 35–41 s | profil Oli przy szybie: zdejmuje jedną słuchawkę, patrzy przez okno, lekki uśmiech | głos Sawy cichnie | — |
| 6 | 41–45 s | czerń | cisza | „Pierwszy raz zobaczyłam swoją drogę do pracy.” → „sawa.” |

**Zdjęcia:** niedziela 7:30–8:30 (niski ruch, ciepłe światło), przed zamrożeniem kodu o 9:00. Dwie osoby: jedna kręci, druga gra Olę (ktoś z zespołu albo znajoma, nie aktorka). Przystanek przy Okopowej i al. Solidarności. Linię dobieramy z rozkładu tak, żeby jechała koło Kercelaka albo Hali Mirowskiej.

- Telefon w 4K/30, blokada ostrości i ekspozycji (przytrzymanie palcem), stabilizacja albo łokieć oparty o poręcz.
- Ekran aplikacji na maksymalnej jasności, Night Shift i True Tone wyłączone, motyw jasny.
- Odcinek przejeżdżamy 3–4 razy, każde przejście to inne podejście do ujęcia 4. Do tego 30 s samego dźwięku tramwaju.
- Głos Sawy: plik audio opowieści o tym miejscu wygenerowany przez aplikację, podłożony w montażu (CapCut lub iMovie, ok. 20 min).
- Eksport MP4 1080p, wersja z napisami na wypadek złego dźwięku. Plik trzymamy lokalnie na dwóch laptopach i na pendrivie.

**Uczciwość:** synchronizacja w filmie jest zmontowana, bo śledzenie pozycji na żywo (T-112) nie jest gotowe. Na scenie nie mówimy, że to surowe nagranie. Jeśli jury zapyta: „Trasa, opowieść i głos są prawdziwe z aplikacji. Dopasowanie do Twojej pozycji GPS w czasie jazdy kończymy.”

**Otwarcie 0:00–0:08** to osobny plik audio: 30 s ambientu tramwaju i pierwsze zdanie opowieści o Kercelaku z aplikacji, ucięte w pół słowa.

## 6. Demo na żywo: ustawienia i zapasy

**Wideo zapasowe (plan B) jest gotowe:** [wideo/sawa-demo.mp4](wideo/sawa-demo.mp4), ok. 87 s, Remotion ([tools/pitch-video](../../tools/pitch-video/README.md)). Na scenie `/demo` otwieramy z `?voice=1`, bez tego Sawa nie mówi.

- **Plan A:** `/demo` na telefonie, z kopią obrazu na projektor. Stała lokalizacja w 42 Warsaw, symulowana jazda (T-36, T-102), opowieści i głos rozgrzane w cache (T-94).
- **Plan B:** nagranie ekranu tego samego przebiegu 1:1, z dźwiękiem, gotowe na drugim laptopie. D przełącza bez słowa i nikt nie przeprasza.
- **Plan C:** padają wifi, API i Railway. Wtedy demo skraca się do 20 s z nagrania, a film niesie dowód.
- Do zrobienia w `/demo` (R3):
  - ukryć badż „N” Next.js i znaczek „i” w buildzie, który idzie na scenę;
  - powiększyć font transkryptu (ok. +20%), żeby był czytelny z ostatniego rzędu;
  - sprawdzić, jak ciemny motyw wygląda na projektorze.
- Do poprawy w danych (R2): śmieci w podpisach zdjęć (np. „sprawdzić na Comn…” w karcie Kercelaka). Podpis zdjęcia z autorem i licencją („1939 · Nieznany · domena publiczna”) zostaje widoczny, bo to szczegół, który pokazuje staranność.

**Checklista sali (30 min przed wejściem):**

- [ ] adapter HDMI/USB-C, rozdzielczość projektora, tryb lustra
- [ ] tryb „Nie przeszkadzać” na laptopie i telefonie, blokada ekranu wyłączona
- [ ] **dźwięk kablem do nagłośnienia sali**, nie z głośnika laptopa; głos Sawy trochę głośniej niż mówca, sprawdzony z ostatniego rzędu; w zapasie głośnik BT
- [ ] hotspot z drugiego telefonu zamiast wifi 42
- [ ] Railway według [przed-demo.md](../przed-demo.md): `VEHICLES_ALWAYS_ON=1`, `WAW_TOKEN`, graf na dziś, cache rozgrzany i bez restartu
- [ ] film, otwarcie i nagranie zapasowe odtwarzane offline, sprawdzone na laptopie, który idzie na scenę
- [ ] timer widoczny dla narratora

## 7. Deck (7 slajdów + film)

**Deck gotowy (17.10, wieczór):** https://claude.ai/artifact/5oTGXQm6WCL3Q8ZTtWaG1j (wersja 3 z 17.10 wieczorem: 13 slajdów + 2 ukryte na pytania, na slajdach tylko hasła, grafiki i duże zrzuty z aplikacji, bez slajdu o zespole; cały tekst do powiedzenia jest w notatkach mówcy; pobieranie PPTX/PDF z menu decku). Scenariusz w notatkach decku zastępuje §4 tam, gdzie się różnią. Zasoby: [deck/](deck/).

1. Czerń (otwarcie dźwiękiem), potem szyba tramwaju (Ola)
2. „co piąty” (2060) / „390 tys.” (dojeżdża do pracy; 600 tys. to wszyscy dodatkowi użytkownicy miasta razem z turystami): jedna liczba na slajd
3. Film
4. Ekran telefonu na czerni (demo)
5. Mapa z warstwami danych, źródła w stopce
6. 2076: oś czasu i puenta
7. Pilotaż, a potem logo „sawa.”

**Ukryte slajdy na Q&A:** architektura, model (Bielik), koszty jako szacunek, lista zbiorów z dane.um.warszawa.pl z licencjami, prywatność.

**Styl:**

- Plus Jakarta Sans w dwóch grubościach (ExtraBold i Regular), tracking nagłówków −2%, najwyżej 8 słów na slajd.
- Fredoka tylko w logo.
- Biel, czerń i Głębia `#17706F` to 90% decku. Mięta tylko w warstwach mapy, Koral raz na slajd.
- Sawa pojawia się na ekranie najwyżej dwa razy (jej głos słychać częściej).

## 8. Pytania jury (odpowiedź do 15 s, potem cisza)

| Pytanie | Odpowiedź | Kto |
|---|---|---|
| Kto to wdroży i kto zapłaci? | „Miasto, jako narzędzie integracji nowych mieszkańców. Kanał już jest: 19115 i ekrany w tramwajach. Pilotaż na jednej linii, bez instalacji.” | N |
| Ile to kosztuje? | „Każdą opowieść generujemy raz na miejsce i profil, potem jest w cache dla wszystkich, więc koszt na pasażera to grosze.” Liczba tylko, jeśli R1 policzy ją z cennika do 10:00, z dopiskiem „szacunek”. | Szczepan |
| Czemu nie Bielik? | „Fakty są nasze, prawie 4000 miejsc ze źródłami. Model tylko je opowiada, więc da się go wymienić. Dziś to szybki model ogólny, polski model to pierwszy kandydat na produkcję. Chętnie sprawdzimy to z Wami.” Nigdy „mamy Bielika”. | N |
| Halucynacje w historii? | „Model dostaje tylko fakty z bazy, każdy ze źródłem. Fakty niezweryfikowane pomija.” | R4/Jasiek |
| Prywatność lokalizacji, RODO? | „Bez konta. Pamięć Sawy leży w telefonie, nie trzymamy użytkowników w bazie.” | Paweł |
| API miasta padnie? | „Rozkład mamy lokalnie, opowieści w cache. Bez danych na żywo Sawa jedzie po rozkładzie i traci tylko korekty opóźnień.” | Szczepan |
| Czym różnicie się od Warsaw Polish Guide / drużyny X? | zdanie z §1 | N |
| Co to ma wspólnego z 2076? | „Miasto samo prognozuje, kim będą mieszkańcy w 2060. Tożsamości nie da się zaimportować, trzeba ją przekazać. Sawa robi to codziennie, w skali komunikacji miejskiej.” | N |
| Działa w prawdziwym tramwaju? | odpowiedź z §5 „Uczciwość” | Paweł |
| Co z danymi miasta było trudne? | jedno zdanie informacji zwrotnej o zbiorze (co brakuje, co by pomogło miastu). Do ustalenia przez R1, tylko prawdziwe | Szczepan |

## 9. Próby w niedzielę (2 h)

| Czas | Co |
|---|---|
| 20 min | narrator czyta tekst na głos z timerem, tniemy wszystko ponad 4:50 |
| 30 min | 3 pełne przebiegi z filmem i demo, ćwiczymy przejścia; ktoś liczy czas, ktoś zapisuje każde „yyy” |
| 20 min | Q&A pod presją: zespół gra jury i rzuca pytania z §8 |
| 20 min | przebieg awaryjny: w połowie demo odcinamy sieć i przechodzimy na plan B bez słowa |
| 20 min | przebieg generalny na sali, na tym sprzęcie i z tym dźwiękiem |
| 10 min | woda, nic już nie zmieniamy |

Uczymy się na pamięć 5 przejść, nie całego tekstu: 1) „To była Sawa”, 2) „Takich jak Ola…”, 3) „Trasę policzył rozkład ZTM”, 4) „Osobno każdy zbiór jest nudny”, 5) „W 2076…”.

## 10. Do zrobienia przed pitchem

- [ ] Kto mówi (narrator) i kto prowadzi demo — `zespół`
- [ ] Ankieta: 10 przyjezdnych znajomych, jedno pytanie (np. „Czy umiesz nazwać jedno miejsce z historią, które mijasz w drodze do pracy?”). Jeśli wyników nie będzie do 10:30, ankieta nie trafia do pitchu — `R2`
- [ ] Film: zdjęcia w niedzielę o 7:30, montaż do 9:30 — `zespół` (2 osoby)
- [ ] Audio otwarcia i plik opowieści o Kercelaku z aplikacji — `R3`/`R4`
- [ ] `/demo`: start w 42 Warsaw, pierwsza opowieść o Kercelaku, badż „N” ukryty, większy transkrypt, nagranie zapasowe 1:1 (T-36, T-94) — `R3`
- [ ] Slajd z warstwami danych: nagranie ruchu pojazdów z aplikacji — `R3`
- [ ] Koszt na pasażera z cenników ElevenLabs i OpenRouter, jako szacunek — `R1`
- [ ] Sprawdzić: która jednostka miasta byłaby właścicielem pilotażu; nazwy zbiorów z dane.um.warszawa.pl na stopkę; źródło prognozy „co piąty w 2060” ([08-badania-trendy.md](../08-badania-trendy.md)) — `R2`
- [ ] Śmieci w podpisach zdjęć w kartach miejsc z trasy demo — `R2`
- [ ] Deck według §7 — `R2`
- [ ] `/demo` na scenie: jazda w 90 s przeskakuje miejsca co kilka sekund i ucina opowieści, a odtwarzacz prosi o głos do wielu miejsc naraz (ElevenLabs 429). Następne miejsce dopiero po końcu opowieści (T-36) — `R3`
- [ ] LLM źle zapisuje lata słownie („tysiąc dziewięćdziesiątego dziewiątego” zamiast 1939, „osiemst”), a przy profilu „pierwszy raz” każda opowieść zaczyna się tym samym wstępem o Powstaniu — `R4`
- [ ] Kredyty ElevenLabs: nowy klucz na Railway od 17.10 wieczorem; sprawdzić zapas przed pokazem — `Paweł`
