# Konta słuchaczy (#194)

Konto jest dodatkiem. Bez niego aplikacja działa jak dotąd: profil i pamięć opowieści leżą w localStorage urządzenia. Funkcja jest **domyślnie wyłączona**: dopóki nie ustawisz zmiennych z §3, web nie ładuje supabase-js i nie pokazuje logowania, więc wdrożenie bez migracji niczego nie zmienia.

## 1. Co robi

- **Logowanie** w menu Sawy (grupa „Konto”): link na e-mail (Supabase Auth, magic link, PKCE). Google opcjonalnie, gdy `NEXT_PUBLIC_AUTH_GOOGLE=true`.
- **Pierwsze logowanie:** profil z onboardingu i pamięć opowieści z localStorage (miejsca, fakty, wyjaśnione tło) idą na konto. Przy każdym kolejnym wejściu urządzenie i konto się scalają: na konto trafia to, czego konto nie zna, a na urządzenie historia z konta. Planer i opowieści dalej czytają lokalną pamięć (`heard`), więc na nowym urządzeniu też pomijają to, co już było.
- **Profil z konta wygrywa** z lokalnym. Kto ma profil na koncie, po zalogowaniu na nowym urządzeniu pomija onboarding.
- **„Moje trasy”:** każda ułożona przejażdżka (planer, gotowe przejażdżki) zapisuje się na koncie, lista pokazuje 20 ostatnich. „Powtórz” ustawia te same parametry (start, czas, cel albo pętla, pieszo/komunikacją) i liczy trasę od nowa, bo zapisane odjazdy są już nieaktualne.
- **Historia:** każda wysłuchana opowieść to wiersz w `visits`. „Zapomnij wszystko” przy zalogowanym koncie kasuje też historię na koncie.
- **Wylogowanie** zostawia dane na urządzeniu. **„Usuń konto i dane”** (dwa stuknięcia) usuwa konto w Supabase Auth, a kaskadą profil, trasy i historię; z urządzenia znika pamięć opowieści, profil z onboardingu zostaje.
- Na scenie (`/demo`) konta nie ma.

Kod: `apps/web/src/features/demo/lib/account.ts` (IO, stan), `lib/account-sync.ts` (czyste scalanie, testy obok), `components/account-modal.tsx`, wiersz w `sawa-menu.tsx`.

## 2. Baza

Migracja `supabase/migrations/20261020120000_accounts.sql`:

| Tabela | Co trzyma |
|---|---|
| `listener_profiles` | profil słuchacza (`familiarity`, `interests`, `story_style`, `audience`) i wyjaśnione tło (`context_ids`), klucz `user_id` |
| `saved_routes` | `request` (jsonb: `origin`, `durationMin`, `rideEnd`, `travel`), nazwy i id miejsc, `total_min`, `created_at` |
| `visits` | wysłuchana opowieść: `place_id`, `place_name`, `fact_ids`, `context_ids`, `heard_at`. Bez FK do `places`, żeby reseed nie kasował historii |

RLS włączone, jedna polityka na tabelę: rola `authenticated` widzi i zmienia tylko wiersze z `user_id = auth.uid()`. `anon` nie ma dostępu. Funkcja `delete_my_account()` (security definer, tylko dla `authenticated`) usuwa wiersz z `auth.users` zalogowanego; reszta znika przez `on delete cascade`.

**Odstępstwo od [11-zasady](11-zasady-pracy-i-kodu.md) §4 „Przeglądarka nie łączy się z Supabase”:** przy kontach przeglądarka mówi z Supabase sama, kluczem anon i z sesją użytkownika. Dotyczy tylko tych trzech tabel i Auth; miejsca i opowieści dalej idą przez API.

## 3. Jak włączyć

1. **Migracja** (R2, po merge do `main`): `supabase db push` albo wklej plik w SQL Editor. Sprawdź w Advisors, że nowe tabele nie mają ostrzeżeń RLS.
2. **Auth w Supabase** (Authentication):
   - Providers → Email: włączony, „Confirm email” może zostać.
   - URL Configuration → Site URL: `https://sawa-hackathon.vercel.app`. Redirect URLs: ten sam adres, `https://*-<zespół>.vercel.app/**` dla podglądów i `http://localhost:3000/**`. Link w mailu wraca na stronę, z której się logowano (`/` albo `/mapa`).
   - Wbudowany SMTP Supabase wysyła kilka maili na godzinę. Na publiczne użycie ustaw własny SMTP (Auth → SMTP Settings).
   - Google (opcjonalnie): Providers → Google, Client ID i Secret z Google Cloud, a w Google Cloud jako redirect URI adres callbacku z panelu Supabase.
3. **Zmienne na Vercelu** (web, `apps/web/.env.example`):

   | Zmienna | Wartość |
   |---|---|
   | `NEXT_PUBLIC_AUTH_ENABLED` | `true` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | klucz anon/publishable (nigdy `service_role`) |
   | `NEXT_PUBLIC_AUTH_GOOGLE` | `true` tylko po kroku z Google |

   Zmienne `NEXT_PUBLIC_*` wchodzą do kodu przy buildzie, więc po zmianie trzeba zrobić redeploy. Brak którejś z pierwszych trzech = konta wyłączone.
4. **Sprawdź:** menu → „Zaloguj się” → link z maila → menu pokazuje „Moje trasy” z adresem. Ułóż trasę, otwórz „Moje trasy”, stuknij „Powtórz”. Na koniec „Usuń konto i dane” i sprawdź w Authentication → Users, że konta nie ma.

Wyłączenie: `NEXT_PUBLIC_AUTH_ENABLED` puste i redeploy. Dane na koncie zostają w bazie.

## 4. RODO

Trasy mają punkt startu, a historia mówi, gdzie ktoś jechał, więc to dane osobowe o lokalizacji. Zbieramy je tylko po zalogowaniu, użytkownik może je skasować sam („Zapomnij wszystko”, „Usuń konto i dane”). Przed publicznym włączeniem potrzebna jest polityka prywatności (kto jest administratorem, cel, okres przechowywania, prawa użytkownika) i link do niej w oknie logowania. Tego jeszcze nie ma.
