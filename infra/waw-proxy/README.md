# waw-proxy

Reverse proxy do `dane.um.warszawa.pl` z polskim IP, bo miasto nie wpuszcza ruchu z Railway ([#63](https://github.com/Pawel-Uhma/Sawa/issues/63)). Caddy w kontenerze, stawiany na home labie.

**Co przepuszcza:** tylko `POST /api/action/*` z nagłówkiem `X-Proxy-Key` równym `PROXY_KEY`. Wszystko inne to `403`. Nagłówek `X-Proxy-Key` jest zdejmowany przed wysłaniem do miasta, `Authorization` (token ZTM) i body idą dalej bez zmian. `GET /health` zwraca `ok`. Logów dostępu nie ma, więc token i klucz nie lądują na dysku.

## Uruchomienie

```bash
cp .env.example .env   # compose czyta .env do interpolacji
# wpisz PROXY_KEY=$(openssl rand -hex 32)
docker compose up -d --build
```

Kontener słucha na `${PROXY_PORT:-8080}` po HTTP. TLS robisz na brzegu (reverse proxy, Cloudflare). Bez `PROXY_KEY` (min. 32 znaki alfanumeryczne) kontener nie wstanie.

Cloudflare Tunnel zamiast otwierania portu: ustaw `TUNNEL_TOKEN` w `.env`, w panelu Cloudflare hostname → `http://waw-proxy:8080`, potem `docker compose --profile tunnel up -d`.

## Portainer

**Web editor (bez gita), z Cloudflare Tunnel:**
1. Cloudflare → Zero Trust → Networks → Tunnels → Create a tunnel (Cloudflared), skopiuj token z polecenia instalacji (ciąg po `--token`).
2. W tunelu: Public hostname, np. `waw.<domena>`, Service `HTTP`, URL `waw-proxy:8080`.
3. Portainer → Stacks → Add stack → Web editor, wklej [`compose.portainer.yaml`](compose.portainer.yaml). Environment variables: `PROXY_KEY`, `TUNNEL_TOKEN`. Deploy.
4. W Cloudflare tunel ma status Healthy; `curl https://waw.<domena>/health` zwraca `ok`.

Port 8080 jest wystawiony tylko na `127.0.0.1` hosta, przekierowanie portu na routerze nie jest potrzebne. Caddyfile jest w tym pliku inline, więc przy zmianie `Caddyfile` trzeba go zaktualizować ręcznie.

**Repository (po pushu na `main`):** Stacks → Add stack → Repository, URL `https://github.com/Pawel-Uhma/Sawa`, reference `refs/heads/main`, compose path `infra/waw-proxy/compose.yaml`, te same zmienne. Portainer zbuduje obraz z `Dockerfile`. Uwaga: tam `cloudflared` jest w profilu `tunnel`, którego Portainer sam nie włącza.

Kontener ma healthcheck (`healthy` w liście kontenerów). Logi: Containers → `waw-proxy` → Logs; przy krótkim `PROXY_KEY` kontener wychodzi z komunikatem i restartuje się w pętli.

## Test

```bash
curl -s -X POST https://<host>/api/action/get_ztm_lokalizacja_pojazdow \
  -H "X-Proxy-Key: $PROXY_KEY" -H "Authorization: $WAW_TOKEN" \
  -H 'Content-Type: application/json' -d '{"type":2}' | head -c 200
```

## Po stronie API (R1)

`WAW_API_BASE_URL=https://<host>` i `WAW_PROXY_KEY=<PROXY_KEY>` na Railway; adaptery w `apps/api/src/adapters/waw/` doklejają ścieżkę `/api/action/...` do bazy i wysyłają `X-Proxy-Key`.
