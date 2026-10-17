FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --chmod=755 entrypoint.sh /entrypoint.sh
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["/entrypoint.sh"]
