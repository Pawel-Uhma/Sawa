# Sawa

Sawa, syrenka-przewodniczka, planuje przejazd komunikacją miejską i opowiada o miejscach, które mijasz za oknem. Projekt na Warsaw Open Data Hackathon 2026 (17–18.10, 42 Warsaw).

Dokumentacja zespołu: [docs/README.md](docs/README.md). PRD: [docs/10-prd.md](docs/10-prd.md). Plan MVP: [docs/12-plan-mvp.md](docs/12-plan-mvp.md). Zasady kodu: [docs/11-zasady-pracy-i-kodu.md](docs/11-zasady-pracy-i-kodu.md).

## Wymagania

| Narzędzie | Wersja | Sprawdź |
|---|---|---|
| Node.js | **24 LTS** (min. 24) | `node -v` |
| pnpm | **12.14.0** (zapisana w `package.json`, pole `packageManager`) | `pnpm -v` |
| Git | dowolna aktualna | `git --version` |

### 1. Node.js 24

**macOS** (Homebrew):

```bash
brew install node@24
brew link --force --overwrite node@24
```

**Windows** (PowerShell):

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

Potem zamknij i otwórz terminal (i edytor), żeby `node` był w `PATH`.

**Linux / alternatywa dla każdego systemu** ([nvm](https://github.com/nvm-sh/nvm)):

```bash
nvm install 24
nvm use 24
```

### 2. pnpm 12

Najprościej, na każdym systemie:

```bash
npm install -g pnpm@12.14.0
```

Albo przez Corepack (wbudowany w Node 24; sam bierze wersję z `packageManager`):

```bash
corepack enable
```

Na Windows `corepack enable` wymaga terminala uruchomionego jako administrator. Jeśli nie masz uprawnień, użyj `npm install -g`.

### 3. Sprawdzenie

```bash
node -v   # v24.x
pnpm -v   # 12.14.0
```

## Uruchomienie lokalne

```bash
git clone https://github.com/Pawel-Uhma/Sawa.git
cd Sawa
pnpm install
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:8787/health

Sekrety (token dane.um.warszawa.pl, klucze Supabase i LLM) wpisujesz tylko do `.env.local`. Ten plik nie trafia do git.

## Polecenia

| Polecenie | Co robi |
|---|---|
| `pnpm dev` | web i api naraz, z przeładowaniem |
| `pnpm test` | testy (Vitest) |
| `pnpm typecheck` | TypeScript we wszystkich pakietach |
| `pnpm lint` | Biome: lint i formatowanie (tylko sprawdza) |
| `pnpm format` | Biome: poprawia formatowanie i importy |
| `pnpm --filter @sawa/api add <pakiet>` | dodaje zależność do jednego pakietu (`@sawa/web`, `@sawa/shared`) |

Przed PR: `pnpm lint && pnpm typecheck && pnpm test`. To samo sprawdza CI.

## Struktura

```
apps/web         Next.js → Vercel
apps/api         Hono → Railway
packages/shared  kontrakt API (zod), funkcje geo
supabase/        migracje SQL
scripts/         seed danych i skrypty jednorazowe
docs/            dokumentacja i dane historyczne
```

## Problemy

- **`pnpm: command not found` po instalacji:** otwórz nowy terminal. Na Windows sprawdź, czy `%APPDATA%\npm` jest w `PATH`.
- **`ERR_PNPM_BAD_PM_VERSION` albo ostrzeżenie o wersji pnpm:** masz inną wersję niż 12.14.0, zainstaluj ją jak w punkcie 2.
- **Błędy po `git pull`:** ktoś zmienił zależności, odpal `pnpm install`.
- **Konflikt w `pnpm-lock.yaml`:** weź wersję z `main` i odpal `pnpm install`.
