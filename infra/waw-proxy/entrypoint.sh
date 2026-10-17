#!/bin/sh
# Bez długiego klucza proxy byłby otwarty, więc wtedy nie startujemy.
if [ "${#PROXY_KEY}" -lt 32 ]; then
	echo "PROXY_KEY musi mieć co najmniej 32 znaki (openssl rand -hex 32)" >&2
	exit 1
fi
case "$PROXY_KEY" in
	*[!A-Za-z0-9]*) echo "PROXY_KEY: tylko litery i cyfry" >&2; exit 1 ;;
esac
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
