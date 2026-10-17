-- Places with history around 42 Warsaw (docs/13-plan-bazy.md §3).
-- Source: docs/historia/sawa-historia.geojson, loaded by scripts/seed-historia.ts.

create extension if not exists postgis with schema extensions;

create table public.places (
  id                 text primary key,
  name               text not null,
  name_en            text,
  kind               text not null check (kind in (
                       'building', 'monument', 'plaque', 'street', 'site',
                       'mural', 'event', 'church', 'cemetery')),
  geom               extensions.geography(Point, 4326) not null,
  lat                double precision generated always as (extensions.st_y(geom::extensions.geometry)) stored,
  lng                double precision generated always as (extensions.st_x(geom::extensions.geometry)) stored,
  address_today      text,
  address_historic   text,
  period             text,
  still_exists       boolean,
  summary_en         text,
  facts              jsonb not null default '[]',  -- string[]
  trivia             jsonb not null default '[]',  -- string[]
  people             jsonb not null default '[]',  -- { name, role, wikiUrl? }[]
  former_names       jsonb not null default '[]',  -- { name, from?, to? }[]
  sources            jsonb not null default '[]',  -- { id: "s1", title, url }[]
  unverified_facts   jsonb not null default '[]',  -- { text, reason }[]
  interests          text[] not null default '{}',
  confidence         text check (confidence in ('high', 'medium', 'low')),
  location_precision text check (location_precision in ('exact', 'approx')),
  origin             text,                          -- curated | osm | google | warszawa1939
  richness           smallint not null default 0,   -- facts + trivia count
  notes              text,
  raw                jsonb not null,                -- original GeoJSON properties
  updated_at         timestamptz not null default now()
);

create index places_geom_gix on public.places using gist (geom);
create index places_interests_gin on public.places using gin (interests);

create table public.place_photos (
  id        bigserial primary key,
  place_id  text not null references public.places (id) on delete cascade,
  url       text not null,
  page_url  text,
  caption   text,
  year      text,
  author    text,
  source    text,
  license   text,
  unique (place_id, url)
);

create index place_photos_place_id_idx on public.place_photos (place_id);

create table public.story_cache (
  key        text primary key,
  place_id   text not null references public.places (id) on delete cascade,
  text       text not null,
  source_ids text[] not null default '{}',
  model      text not null,
  created_at timestamptz not null default now()
);

create index story_cache_place_id_idx on public.story_cache (place_id);

-- No policies: only service_role (the API on Railway) reads and writes (docs/12-plan-mvp.md Z3).
alter table public.places enable row level security;
alter table public.place_photos enable row level security;
alter table public.story_cache enable row level security;
