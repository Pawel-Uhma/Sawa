# Build context is the repo root (Railway: Root Directory "/", Config File Path apps/api/railway.json).
# One container, two processes: osrm-routed (walking paths, foot profile, Warsaw only) in the
# background on 127.0.0.1:5000 and the API in the foreground. The API runs the TypeScript
# sources with tsx, so there is no build step; apps/api/data/* ships with the sources.
ARG OSRM_IMAGE=ghcr.io/project-osrm/osrm-backend:v5.27.1

# 1a. OSM data cut to Warsaw. Before `COPY . .`, so a code change does not rebuild the graph.
FROM debian:bookworm-slim AS pbf
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl osmium-tool \
  && rm -rf /var/lib/apt/lists/*
ARG PBF_URL=https://download.geofabrik.de/europe/poland/mazowieckie-latest.osm.pbf
# Warsaw city limits with a margin (lng,lat of the SW and NE corners).
ARG WARSAW_BBOX=20.84,52.08,21.29,52.38
WORKDIR /data
RUN curl -fsSL "$PBF_URL" -o region.osm.pbf \
  && osmium extract --bbox "$WARSAW_BBOX" --strategy complete_ways region.osm.pbf -o map.osm.pbf \
  && rm region.osm.pbf

# 1b. The walking graph (foot profile, MLD).
FROM ${OSRM_IMAGE} AS osrm
WORKDIR /data
COPY --from=pbf /data/map.osm.pbf ./
RUN osrm-extract -p /opt/foot.lua map.osm.pbf \
  && osrm-partition map.osrm \
  && osrm-customize map.osrm \
  && rm map.osm.pbf

# 2. The API with its production dependencies.
FROM node:24-slim AS api
ENV NODE_ENV=production COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @sawa/api...

# 3. Final image: OSRM's (Debian bullseye, glibc 2.31; Node 24 needs 2.28) plus Node and the API.
FROM ${OSRM_IMAGE}
ENV NODE_ENV=production
COPY --from=api /usr/local/bin/node /usr/local/bin/node
COPY --from=osrm /data /data
COPY --from=api /app /app
WORKDIR /app/apps/api
# If osrm-routed dies nobody restarts it; the API keeps going on the fallback router or straight lines.
CMD ["sh", "-c", "osrm-routed --algorithm mld --ip 127.0.0.1 --port 5000 /data/map.osrm & exec node --import tsx src/index.ts"]
