-- Map marker finer than kind (PLACE_SUBKINDS in packages/shared, set by the seed in
-- scripts/historia/subkind.ts). No check constraint, like interests: new markers need no migration.
-- place_detail returns it already (to_jsonb(p)).

alter table public.places add column subkind text;

create index places_subkind_idx on public.places (subkind);

create or replace function public.places_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  filter_interests text[] default null
)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'id', p.id,
        'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(p.lng, p.lat)),
        'properties', jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'kind', p.kind,
          'subkind', p.subkind,
          'interests', to_jsonb(p.interests),
          'richness', p.richness
        )
      ) order by p.richness desc
    ), '[]'::jsonb)
  )
  from places p
  where p.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (filter_interests is null or p.interests && filter_interests);
$$;

-- The returned columns change, so the function is dropped first.
drop function public.places_near_line(jsonb, double precision, text[]);

create function public.places_near_line(
  line jsonb,
  radius_m double precision default 150,
  filter_interests text[] default null
)
returns table (
  id text,
  name text,
  kind text,
  subkind text,
  interests text[],
  richness smallint,
  lat double precision,
  lng double precision,
  distance_m double precision,
  fraction double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with l as (
    select st_setsrid(st_geomfromgeojson(line::text), 4326) as g
  )
  select
    p.id, p.name, p.kind, p.subkind, p.interests, p.richness, p.lat, p.lng,
    st_distance(p.geom, l.g::geography) as distance_m,
    st_linelocatepoint(l.g, p.geom::geometry) as fraction
  from places p, l
  where st_dwithin(p.geom, l.g::geography, radius_m)
    and (filter_interests is null or p.interests && filter_interests)
  order by fraction;
$$;

revoke execute on function public.places_in_bbox(double precision, double precision, double precision, double precision, text[]) from public, anon, authenticated;
revoke execute on function public.places_near_line(jsonb, double precision, text[]) from public, anon, authenticated;
